-- PWA Web Push pripomienky kalendárových úloh
-- Spustite celý súbor v Supabase SQL Editore.

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id, is_active);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view own push subscriptions" on public.push_subscriptions;
create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_role text;
  v_subscription_id uuid;
begin
  if v_user_id is null then
    raise exception 'Používateľ nie je prihlásený.';
  end if;

  select organization_id, role
    into v_organization_id, v_role
    from public.profiles
   where id = v_user_id;

  if v_organization_id is null then
    raise exception 'Používateľ nemá priradenú organizáciu.';
  end if;

  if v_role <> 'admin' then
    raise exception 'Notifikácie sú dostupné iba pre administrátorov.';
  end if;

  insert into public.push_subscriptions (
    user_id, organization_id, endpoint, p256dh, auth, user_agent, is_active, updated_at
  ) values (
    v_user_id, v_organization_id, p_endpoint, p_p256dh, p_auth, p_user_agent, true, now()
  )
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    organization_id = excluded.organization_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    is_active = true,
    updated_at = now()
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_subscriptions
   where endpoint = p_endpoint
     and user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, text, text) from public;
revoke all on function public.remove_push_subscription(text) from public;
grant execute on function public.upsert_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

create table if not exists public.task_reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_minutes integer not null check (reminder_minutes in (60, 15, 0)),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id, reminder_minutes)
);

create index if not exists task_reminder_jobs_due_idx
  on public.task_reminder_jobs (status, due_at);

alter table public.task_reminder_jobs enable row level security;

create or replace function public.sync_task_reminder_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.task_reminder_jobs
   where task_id = new.id
     and (
       new.assigned_to is null
       or new.status <> 'todo'
       or not exists (
         select 1 from public.profiles
          where id = new.assigned_to
            and role = 'admin'
       )
     );

  if new.assigned_to is null
     or new.status <> 'todo'
     or not exists (
       select 1 from public.profiles
        where id = new.assigned_to
          and role = 'admin'
     ) then
    return new;
  end if;

  -- Pri zmene termínu alebo priradenej osoby sa všetky tri pripomienky pripravia nanovo.
  delete from public.task_reminder_jobs
   where task_id = new.id
     and user_id <> new.assigned_to;

  insert into public.task_reminder_jobs (task_id, user_id, reminder_minutes, due_at)
  select
    new.id,
    new.assigned_to,
    reminder_minutes,
    new.start_date - make_interval(mins => reminder_minutes)
  from unnest(array[60, 15, 0]) as reminders(reminder_minutes)
  on conflict (task_id, user_id, reminder_minutes) do update set
    due_at = excluded.due_at,
    status = 'pending',
    attempts = 0,
    last_error = null,
    sent_at = null,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists tasks_create_reminder_jobs on public.tasks;
create trigger tasks_create_reminder_jobs
after insert on public.tasks
for each row execute function public.sync_task_reminder_jobs();

drop trigger if exists tasks_update_reminder_jobs on public.tasks;
create trigger tasks_update_reminder_jobs
after update of start_date, assigned_to, status on public.tasks
for each row
when (
  old.start_date is distinct from new.start_date
  or old.assigned_to is distinct from new.assigned_to
  or old.status is distinct from new.status
)
execute function public.sync_task_reminder_jobs();

-- Pripraví pripomienky aj pre už existujúce budúce úlohy.
insert into public.task_reminder_jobs (task_id, user_id, reminder_minutes, due_at)
select
  task.id,
  task.assigned_to,
  reminder_minutes,
  task.start_date - make_interval(mins => reminder_minutes)
from public.tasks as task
cross join unnest(array[60, 15, 0]) as reminders(reminder_minutes)
where task.assigned_to is not null
  and task.status = 'todo'
  and task.start_date > now()
  and exists (
    select 1 from public.profiles
     where id = task.assigned_to
       and role = 'admin'
  )
on conflict (task_id, user_id, reminder_minutes) do nothing;
