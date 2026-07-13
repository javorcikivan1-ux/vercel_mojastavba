create table if not exists public.quote_item_library (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    normalized_key text not null,
    description text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, normalized_key)
);

create index if not exists idx_quote_item_library_org
on public.quote_item_library(organization_id, updated_at desc);

alter table public.quote_item_library enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'quote_item_library'
          and policyname = 'quote_item_library_secure'
    ) then
        create policy "quote_item_library_secure" on public.quote_item_library
        for all to authenticated
        using (
            organization_id = public.get_my_org()
            or auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
        )
        with check (
            organization_id = public.get_my_org()
            or auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
        );
    end if;
end $$;
