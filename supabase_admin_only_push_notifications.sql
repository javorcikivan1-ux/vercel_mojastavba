-- Dodatočné zabezpečenie: kalendárové push notifikácie sú iba pre admin účty.
-- Tento skript nemení úlohy, dochádzku, zákazky ani používateľské účty.

begin;

-- Odstráni iba technické push odbery a čakajúce pripomienky neadmin účtov.
delete from public.push_subscriptions as subscription
using public.profiles as profile
where subscription.user_id = profile.id
  and profile.role <> 'admin';

delete from public.task_reminder_jobs as reminder
using public.profiles as profile
where reminder.user_id = profile.id
  and profile.role <> 'admin';

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

revoke all on function public.upsert_push_subscription(text, text, text, text) from public;
grant execute on function public.upsert_push_subscription(text, text, text, text) to authenticated;

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

commit;
