create table if not exists public.employee_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  employee_name text,
  status text not null default 'invited' check (status in ('invited', 'registered', 'cancelled')),
  invited_by uuid references public.profiles(id) on delete set null,
  sent_count integer not null default 1 check (sent_count >= 0),
  last_sent_at timestamptz not null default now(),
  registered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_invites_organization_email_key unique (organization_id, email)
);

create index if not exists employee_invites_organization_status_idx
  on public.employee_invites (organization_id, status, last_sent_at desc);

create or replace function public.set_employee_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employee_invites_updated_at on public.employee_invites;
create trigger set_employee_invites_updated_at
before update on public.employee_invites
for each row
execute function public.set_employee_invites_updated_at();

alter table public.employee_invites enable row level security;

drop policy if exists "Admins can view employee invites" on public.employee_invites;
create policy "Admins can view employee invites"
on public.employee_invites
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = employee_invites.organization_id
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can update employee invites" on public.employee_invites;
create policy "Admins can update employee invites"
on public.employee_invites
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = employee_invites.organization_id
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = employee_invites.organization_id
      and p.role = 'admin'
  )
);
