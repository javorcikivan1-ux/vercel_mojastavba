alter table public.organizations
add column if not exists is_hidden_admin boolean default false;
