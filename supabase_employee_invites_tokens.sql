-- Security upgrade for employee invitations.
-- Safe to run repeatedly. It does not delete existing invitations.

alter table public.employee_invites
  add column if not exists token_hash text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_used_at timestamptz;

create unique index if not exists employee_invites_token_hash_unique
  on public.employee_invites(token_hash)
  where token_hash is not null;

create or replace function public.mark_employee_invite_registered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'employee'
    and new.organization_id is not null
    and new.email is not null
  then
    update public.employee_invites
       set status = 'registered',
           registered_at = coalesce(registered_at, now()),
           token_used_at = coalesce(token_used_at, now()),
           updated_at = now()
     where organization_id = new.organization_id
       and lower(email) = lower(new.email)
       and status in ('invited', 'cancelled');
  end if;

  return new;
end;
$$;

drop trigger if exists mark_employee_invite_registered_on_profile on public.profiles;

create trigger mark_employee_invite_registered_on_profile
after insert or update of email, organization_id, role
on public.profiles
for each row
execute function public.mark_employee_invite_registered();
