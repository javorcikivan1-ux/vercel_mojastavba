
export const SETUP_SQL = `
-- 1. ÚPLNÝ RESET SCHÉMY (POZOR: Zmaže existujúce dáta v public schéme)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. NASTAVENIE PRÁV PRE SUPABASE API
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 3. ZABEZPEČENÉ POMOCNÉ FUNKCIE (SECURITY DEFINER + SEARCH_PATH)
-- Tieto funkcie eliminujú RLS rekurziu a sú chránené pred search-path útokmi
CREATE OR REPLACE FUNCTION public.get_my_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Obmedzenie spustenia len pre prihlásených a systémovú rolu
REVOKE ALL ON FUNCTION public.get_my_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_org() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

-- 4. TVORBA TABULIEK

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    pin_code TEXT DEFAULT '0000',
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'free_trial',
    subscription_status TEXT DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    ico TEXT,
    dic TEXT,
    ic_dph TEXT,
    is_vat_payer BOOLEAN DEFAULT false,
    address_type TEXT DEFAULT 'sidlo',
    business_address TEXT,
    stamp_url TEXT
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    full_name TEXT,
    nickname TEXT UNIQUE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    hourly_rate NUMERIC DEFAULT 0,
    cost_rate NUMERIC DEFAULT 0,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{"notify_logs": true, "notify_tasks": true, "task_categories": [{"id": "1", "color": "#f1f5f9", "label": "Všeobecné"}, {"id": "2", "color": "#ffedd5", "label": "Stavba"}, {"id": "3", "color": "#dbeafe", "label": "Administratíva"}]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_approved BOOLEAN DEFAULT true,
    job_title TEXT DEFAULT 'zamestnanec',
    show_wage_in_profile BOOLEAN DEFAULT true,
    avatar_url TEXT
);

CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    address TEXT,
    client_name TEXT,
    status TEXT DEFAULT 'lead',
    budget NUMERIC DEFAULT 0,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    notes TEXT,
    lead_stage TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS public.site_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_manage_diary BOOLEAN DEFAULT false,
    can_manage_finance BOOLEAN DEFAULT false,
    UNIQUE(site_id, user_id)
);

CREATE TABLE public.site_worker_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hourly_rate NUMERIC,
    cost_rate NUMERIC,
    UNIQUE(site_id, user_id)
);

CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    hours NUMERIC NOT NULL DEFAULT 0,
    hourly_rate_snapshot NUMERIC DEFAULT 0,
    cost_rate_snapshot NUMERIC DEFAULT 0,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    start_time TEXT,
    end_time TEXT,
    payment_type TEXT DEFAULT 'hourly',
    fixed_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.diary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weather TEXT,
    temperature_morning TEXT,
    temperature_noon TEXT,
    notes TEXT,
    mechanisms TEXT,
    status TEXT DEFAULT 'draft',
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(site_id, date)
);

CREATE TABLE public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL DEFAULT 0,
    liters NUMERIC DEFAULT 0,
    vehicle TEXT,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'ks',
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    supplier TEXT,
    purchase_date DATE
);

CREATE TABLE public.advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    settled_at TIMESTAMPTZ,
    settled_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.advance_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID NOT NULL REFERENCES public.advances(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    org_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    user_email TEXT,
    user_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    color TEXT DEFAULT '#f97316',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    description TEXT,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    quote_number TEXT NOT NULL,
    client_name TEXT,
    client_address TEXT,
    total_amount NUMERIC DEFAULT 0,
    issue_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    notes TEXT,
    status TEXT DEFAULT 'draft'
);

CREATE TABLE public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'ks',
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    vat_rate NUMERIC DEFAULT 20
);

-- 5. INDEXY PRE MAXIMÁLNY VÝKON
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_sites_org ON public.sites(organization_id);
CREATE INDEX idx_attendance_org ON public.attendance_logs(organization_id);
CREATE INDEX idx_attendance_user ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX idx_diary_site ON public.diary_records(site_id);
CREATE INDEX idx_materials_site ON public.materials(site_id);
CREATE INDEX idx_site_perms_user ON public.site_permissions(user_id);

-- 6. POHĽAD PRE FINANCIE (security_invoker zabezpečí rešpektovanie RLS)
CREATE OR REPLACE VIEW public.v_site_financials 
WITH (security_invoker = true)
AS
SELECT 
    s.id as site_id,
    COALESCE((SELECT SUM(amount) FROM public.transactions WHERE site_id = s.id AND type = 'invoice' AND is_paid = true), 0) as total_income,
    COALESCE((SELECT SUM(amount) FROM public.transactions WHERE site_id = s.id AND type = 'expense'), 0) as total_direct_expenses,
    COALESCE((SELECT SUM(total_price) FROM public.materials WHERE site_id = s.id), 0) as total_material_cost,
    COALESCE((SELECT SUM(amount) FROM public.fuel_logs WHERE site_id = s.id), 0) as total_fuel_cost,
    COALESCE((
        SELECT SUM(
            CASE 
                WHEN al.payment_type = 'fixed' THEN COALESCE(al.fixed_amount, 0)
                ELSE al.hours * COALESCE(NULLIF(al.cost_rate_snapshot, 0), NULLIF(al.hourly_rate_snapshot, 0), 0)
            END
        ) 
        FROM public.attendance_logs al 
        WHERE al.site_id = s.id
    ), 0) as total_labor_cost
FROM public.sites s;

-- 7. ZAPNUTIE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_worker_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_permissions ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLITIKY (HARDENED - Master Key pre Ivana)

-- PROFILY
CREATE POLICY "profiles_select_secure" ON public.profiles FOR SELECT TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated 
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated 
USING ((organization_id = public.get_my_org() AND public.get_my_role() = 'admin') OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- ORGANIZÁCIE
CREATE POLICY "org_select_secure" ON public.organizations FOR SELECT TO authenticated 
USING (id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "org_update_secure" ON public.organizations FOR UPDATE TO authenticated 
USING ((id = public.get_my_org() AND public.get_my_role() = 'admin') OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- STAVBY
CREATE POLICY "sites_secure" ON public.sites FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- SITE PERMISSIONS
CREATE POLICY "site_perms_secure" ON public.site_permissions FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- DOCHÁDZKA
CREATE POLICY "attendance_secure" ON public.attendance_logs FOR ALL TO authenticated 
USING (
    (organization_id = public.get_my_org() AND (public.get_my_role() = 'admin' OR user_id = auth.uid()))
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

-- STAVEBNÝ DENNÍK
CREATE POLICY "diary_secure" ON public.diary_records FOR ALL TO authenticated 
USING (
    (organization_id = public.get_my_org() AND (
        public.get_my_role() = 'admin' 
        OR EXISTS (
            SELECT 1 FROM public.site_permissions sp 
            WHERE sp.site_id = diary_records.site_id 
            AND sp.user_id = auth.uid() 
            AND sp.can_manage_diary = true
        )
    ))
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

-- MATERIÁL
CREATE POLICY "materials_secure" ON public.materials FOR ALL TO authenticated 
USING (
    (organization_id = public.get_my_org() AND (
        public.get_my_role() = 'admin' 
        OR EXISTS (
            SELECT 1 FROM public.site_permissions sp 
            WHERE sp.site_id = materials.site_id 
            AND sp.user_id = auth.uid() 
            AND sp.can_manage_finance = true
        )
    ))
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

-- PHM
CREATE POLICY "fuel_secure" ON public.fuel_logs FOR ALL TO authenticated 
USING (
    (organization_id = public.get_my_org() AND (
        public.get_my_role() = 'admin' 
        OR EXISTS (
            SELECT 1 FROM public.site_permissions sp 
            WHERE sp.site_id = fuel_logs.site_id 
            AND sp.user_id = auth.uid() 
            AND sp.can_manage_finance = true
        )
    ))
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

-- SUPPORT REQUESTS
CREATE POLICY "support_select_secure" ON public.support_requests FOR SELECT TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "support_insert_secure" ON public.support_requests FOR INSERT TO authenticated 
WITH CHECK (organization_id = public.get_my_org());

CREATE POLICY "support_update_secure" ON public.support_requests FOR UPDATE TO authenticated 
USING ((organization_id = public.get_my_org() AND public.get_my_role() = 'admin') OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- OSTATNÉ (Základná izolácia firmy + Ivan)
CREATE POLICY "transactions_secure" ON public.transactions FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "quotes_secure" ON public.quotes FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "quote_items_secure" ON public.quote_items FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = public.get_my_org())
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

CREATE POLICY "tasks_secure" ON public.tasks FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "advances_secure" ON public.advances FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

CREATE POLICY "adv_settlements_secure" ON public.advance_settlements FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.advances a WHERE a.id = advance_id AND a.organization_id = public.get_my_org())
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

CREATE POLICY "site_rates_secure" ON public.site_worker_rates FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

-- 9. AUTH TRIGGER (Automatická tvorba profilu a firmy)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'admin' THEN
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'Moja Firma'))
    RETURNING id INTO new_org_id;
    
    INSERT INTO public.profiles (id, organization_id, email, full_name, nickname, role, is_active)
    VALUES (new.id, new_org_id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'admin', true);
  ELSE
    INSERT INTO public.profiles (id, organization_id, email, full_name, nickname, role, is_active)
    VALUES (new.id, (new.raw_user_meta_data->>'company_id')::UUID, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'employee', true);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. STORAGE (Bucket a Politiky)
INSERT INTO storage.buckets (id, name, public) VALUES ('diary-photos', 'diary-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage Politiky (Zohľadňujú Ivana)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'diary-photos');

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-photos');

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated 
USING (
    (bucket_id = 'diary-photos' AND public.get_my_role() = 'admin')
    OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com'
);

-- KONIEC TRANSAKCIE
COMMIT;

NOTIFY pgrst, 'reload schema';
`
