export const SETUP_SQL = `
-- 1. ÚPLNÝ RESET SCHÉMY
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. NASTAVENIE PRÁV PRE SUPABASE API
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 3. TVORBA TABULIEK
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
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    hourly_rate NUMERIC DEFAULT 0,
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

CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    hours NUMERIC NOT NULL DEFAULT 0,
    hourly_rate_snapshot NUMERIC DEFAULT 0,
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
    user_id REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- 4. INDEXY PRE VÝKON (Kritické pre RLS a Filtre)
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_sites_org ON public.sites(organization_id);
CREATE INDEX idx_attendance_org ON public.attendance_logs(organization_id);
CREATE INDEX idx_attendance_user ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_site ON public.attendance_logs(site_id);
CREATE INDEX idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX idx_diary_site ON public.diary_records(site_id);
CREATE INDEX idx_diary_date ON public.diary_records(date);
CREATE INDEX idx_fuel_site ON public.fuel_logs(site_id);
CREATE INDEX idx_fuel_date ON public.fuel_logs(date);
CREATE INDEX idx_materials_site ON public.materials(site_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_transactions_site ON public.transactions(site_id);
CREATE INDEX idx_quotes_org ON public.quotes(organization_id);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX idx_adv_settle_adv ON public.advance_settlements(advance_id);

-- 5. FINANČNÝ POHĽAD S BEZPEČNOSŤOU (Zobrazuje reálne náklady)
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
                ELSE al.hours * COALESCE(NULLIF(al.hourly_rate_snapshot, 0), (SELECT hourly_rate FROM public.profiles WHERE id = al.user_id), 0)
            END
        ) 
        FROM public.attendance_logs al 
        WHERE al.site_id = s.id
    ), 0) as total_labor_cost
FROM public.sites s;

-- 6. BEZPEČNOSŤ (RLS)
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

CREATE OR REPLACE FUNCTION public.get_my_org()
RETURNS uuid AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = (SELECT auth.uid());
  RETURN _org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- IZOLAČNÉ PRAVIDLÁ (Vysoký výkon cez Subquery)
CREATE POLICY "iso_profiles" ON public.profiles FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_org_update" ON public.organizations FOR UPDATE TO authenticated USING (id = (SELECT public.get_my_org())) WITH CHECK (id = (SELECT public.get_my_org()));
CREATE POLICY "iso_org_delete" ON public.organizations FOR DELETE TO authenticated USING (id = (SELECT public.get_my_org()));
CREATE POLICY "iso_org_lookup" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "iso_sites" ON public.sites FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_attendance" ON public.attendance_logs FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_diary" ON public.diary_records FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_fuel" ON public.fuel_logs FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_materials" ON public.materials FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_advances" ON public.advances FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_tasks" ON public.tasks FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_transactions" ON public.transactions FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_quotes" ON public.quotes FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));
CREATE POLICY "iso_support" ON public.support_requests FOR ALL TO authenticated USING (organization_id = (SELECT public.get_my_org())) WITH CHECK (organization_id = (SELECT public.get_my_org()));

-- OPRAVENÉ PRAVIDLÁ PRE POLOŽKY (S pevnou kontrolou subquery)
CREATE POLICY "iso_quote_items" ON public.quote_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = (SELECT public.get_my_org()))) WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.organization_id = (SELECT public.get_my_org())));
CREATE POLICY "iso_advance_settlements" ON public.advance_settlements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.advances a WHERE a.id = advance_id AND a.organization_id = (SELECT public.get_my_org()))) WITH CHECK (EXISTS (SELECT 1 FROM public.advances a WHERE a.id = advance_id AND a.organization_id = (SELECT public.get_my_org())));

-- 7. AUTH TRIGGER (Zabezpečuje prepojenie profilu s firmou)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'admin' THEN
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'Moja Firma'))
    RETURNING id INTO new_org_id;
    INSERT INTO public.profiles (id, organization_id, email, full_name, role, is_active)
    VALUES (new.id, new_org_id, new.email, new.raw_user_meta_data->>'full_name', 'admin', true);
  ELSE
    INSERT INTO public.profiles (id, organization_id, email, full_name, role, is_active)
    VALUES (new.id, (new.raw_user_meta_data->>'company_id')::UUID, new.email, new.raw_user_meta_data->>'full_name', 'employee', true);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. STORAGE (Bucket a Bezpečnostné pravidlá)
INSERT INTO storage.buckets (id, name, public) VALUES ('diary-photos', 'diary-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'diary-photos');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-photos');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'diary-photos');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diary-photos');

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.v_site_financials TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
`;
