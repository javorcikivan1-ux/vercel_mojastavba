
export const SETUP_SQL = `
-- 1. RESET (VYMAZANIE VŠETKÉHO)
drop table if exists support_requests cascade;
drop table if exists diary_records cascade;
drop table if exists quote_items cascade;
drop table if exists quotes cascade;
drop table if exists attendance_logs cascade;
drop table if exists materials cascade;
drop table if exists transactions cascade;
drop table if exists tasks cascade;
drop table if exists sites cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;

-- 2. VYTVORENIE TABULIEK
create table organizations (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  pin_code text default '0000',
  logo_url text,
  stamp_url text,
  subscription_plan text default 'free_trial', 
  subscription_status text default 'trialing',
  trial_ends_at timestamp with time zone default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text
);

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  role text default 'employee',
  full_name text,
  organization_id uuid references organizations(id),
  hourly_rate numeric(10,2) default 0,
  phone text,
  is_active boolean default true,
  settings jsonb default '{"notify_tasks": true, "notify_logs": true}', 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table support_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  organization_id uuid references organizations(id),
  user_id uuid references profiles(id),
  user_name text,
  org_name text,
  message text not null,
  status text default 'new'
);

create table sites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  client_name text,
  status text default 'lead',
  lead_stage text default 'new',
  budget numeric(12,2) default 0,
  organization_id uuid references organizations(id) not null,
  notes text
);

create table diary_records (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references sites(id) on delete cascade not null,
  organization_id uuid references organizations(id) not null,
  date date not null,
  weather text,
  temperature_morning text,
  temperature_noon text,
  notes text,
  mechanisms text,
  status text default 'draft',
  photos text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table quotes (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) not null,
  site_id uuid references sites(id) on delete cascade,
  quote_number text,
  client_name text,
  client_address text,
  total_amount numeric(12,2) default 0,
  issue_date date default CURRENT_DATE,
  valid_until date,
  status text check (status in ('draft', 'sent', 'accepted', 'rejected')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table quote_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit text default 'ks',
  unit_price numeric(10,2) default 0,
  total_price numeric(12,2) default 0
);

create table transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade,
  organization_id uuid references organizations(id) not null,
  type text not null check (type in ('invoice', 'expense')),
  category text not null,
  amount numeric(12,2) not null default 0,
  date date not null,
  description text,
  is_paid boolean default false
);

create table materials (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade not null,
  organization_id uuid references organizations(id) not null,
  name text not null,
  quantity numeric(10,2) default 0,
  unit text default 'ks',
  unit_price numeric(10,2) default 0,
  total_price numeric(12,2) default 0,
  supplier text,
  purchase_date date
);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id uuid references sites(id) on delete cascade,
  organization_id uuid references organizations(id) not null,
  title text not null,
  description text,
  status text default 'todo',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  color text default '#f97316',
  assigned_to uuid references profiles(id)
);

create table attendance_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  site_id uuid references sites(id),
  organization_id uuid references organizations(id) not null,
  hours numeric(10,2) not null default 0,
  hourly_rate_snapshot numeric(10,2) default 0,
  description text,
  date date default CURRENT_DATE,
  start_time text, 
  end_time text,   
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. AUTOMATIZÁCIA (TRIGGERS)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
begin
  if new.raw_user_meta_data->>'company_name' is not null then
    insert into public.organizations (name, created_by)
    values (new.raw_user_meta_data->>'company_name', new.id)
    returning id into org_id;
    insert into public.profiles (id, email, full_name, role, organization_id, hourly_rate)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin', org_id, 0);
  elsif new.raw_user_meta_data->>'company_id' is not null then
    insert into public.profiles (id, email, full_name, role, organization_id, hourly_rate)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'employee', (new.raw_user_meta_data->>'company_id')::uuid, 0);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. BEZPEČNOSŤ (RLS)
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table sites enable row level security;
alter table diary_records enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table transactions enable row level security;
alter table materials enable row level security;
alter table tasks enable row level security;
alter table attendance_logs enable row level security;
alter table support_requests enable row level security;

create or replace function get_my_org_id()
returns uuid as $$
  select organization_id from profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- POLITIKY
create policy "Allow public check existence" on organizations for select using (true);
create policy "Manage own org" on organizations for all using (id = get_my_org_id() OR created_by = auth.uid());

create policy "Org Access Profiles" on profiles for all using (organization_id = get_my_org_id() OR id = auth.uid());
create policy "Org Access Sites" on sites for all using (organization_id = get_my_org_id());
create policy "Org Access Diary" on diary_records for all using (organization_id = get_my_org_id());
create policy "Org Access Quotes" on quotes for all using (organization_id = get_my_org_id());
create policy "Org Access Items" on quote_items for all using (quote_id in (select id from quotes where organization_id = get_my_org_id()));
create policy "Org Access Transactions" on transactions for all using (organization_id = get_my_org_id());
create policy "Org Access Materials" on materials for all using (organization_id = get_my_org_id());
create policy "Org Access Tasks" on tasks for all using (organization_id = get_my_org_id());
create policy "Org Access Logs" on attendance_logs for all using (organization_id = get_my_org_id());

-- Povolit support vkladanie
create policy "Allow support insert" on support_requests for insert with check (true);

-- Povolit inserty
create policy "Org Insert Sites" on sites for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Diary" on diary_records for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Quotes" on quotes for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Transactions" on transactions for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Materials" on materials for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Tasks" on tasks for insert with check (organization_id = get_my_org_id());
create policy "Org Insert Logs" on attendance_logs for insert with check (organization_id = get_my_org_id());

NOTIFY pgrst, 'reload schema';
`;
