
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
    stamp_url TEXT,
    is_hidden_admin BOOLEAN DEFAULT false
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
    default_break_start TEXT,
    default_break_end TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{"notify_logs": true, "notify_tasks": true, "task_categories": [{"id": "1", "color": "#f1f5f9", "label": "Všeobecné"}, {"id": "2", "color": "#ffedd5", "label": "Stavba"}, {"id": "3", "color": "#dbeafe", "label": "Administratíva"}]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_approved BOOLEAN DEFAULT true,
    job_title TEXT DEFAULT 'zamestnanec',
    show_wage_in_profile BOOLEAN DEFAULT true,
    avatar_url TEXT
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_break_start TEXT,
  ADD COLUMN IF NOT EXISTS default_break_end TEXT;

DO $check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_default_break_valid'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_default_break_valid CHECK (
  (default_break_start IS NULL AND default_break_end IS NULL)
  OR (
    default_break_start IS NOT NULL AND default_break_end IS NOT NULL
    AND default_break_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND default_break_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND default_break_end > default_break_start
  )
);

  END IF;
END;
$check$;

CREATE OR REPLACE FUNCTION public.protect_employee_default_break()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.default_break_start IS NOT DISTINCT FROM OLD.default_break_start
       AND NEW.default_break_end IS NOT DISTINCT FROM OLD.default_break_end THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND p.role = 'admin' AND p.organization_id = OLD.organization_id
        AND p.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Predvolený obed môže meniť iba administrátor danej firmy.';
    END IF;
  ELSIF NEW.default_break_start IS NOT NULL OR NEW.default_break_end IS NOT NULL THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND p.role = 'admin' AND p.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Predvolený obed môže nastaviť iba administrátor danej firmy.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER protect_employee_default_break
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_employee_default_break();

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
    break_start TEXT,
    break_end TEXT,
    break_minutes INTEGER NOT NULL DEFAULT 0,
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
    vat_rate NUMERIC DEFAULT 23
);

CREATE TABLE public.quote_item_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    normalized_key TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, normalized_key)
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
CREATE INDEX idx_quote_item_library_org ON public.quote_item_library(organization_id, updated_at DESC);

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
ALTER TABLE public.quote_item_library ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "quote_item_library_secure" ON public.quote_item_library FOR ALL TO authenticated 
USING (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com')
WITH CHECK (organization_id = public.get_my_org() OR auth.jwt() ->> 'email' = 'javorcik.ivan1@gmail.com');

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
    
    INSERT INTO public.profiles (id, organization_id, email, full_name, nickname, phone, role, is_active)
    VALUES (new.id, new_org_id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', NULLIF(new.raw_user_meta_data->>'phone', ''), 'admin', true);
  ELSE
    INSERT INTO public.profiles (id, organization_id, email, full_name, nickname, phone, role, is_active)
    VALUES (new.id, (new.raw_user_meta_data->>'company_id')::UUID, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', NULLIF(new.raw_user_meta_data->>'phone', ''), 'employee', true);
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

CREATE TABLE IF NOT EXISTS public.employee_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pn','ocr','doctor','accompaniment','vacation','compensatory','unpaid','parental','other')),
  start_date DATE NOT NULL,
  end_date DATE,
  all_day BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_absences_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT employee_absences_times CHECK (
    (all_day AND start_time IS NULL AND end_time IS NULL)
    OR (NOT all_day AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Internal notes have separate permissions; employees never receive them.
CREATE TABLE IF NOT EXISTS public.employee_absence_notes (
  absence_id UUID PRIMARY KEY REFERENCES public.employee_absences(id) ON DELETE CASCADE,
  note TEXT NOT NULL CHECK (char_length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS employee_absences_org_dates_idx ON public.employee_absences(organization_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS employee_absences_user_dates_idx ON public.employee_absences(user_id, start_date);

CREATE OR REPLACE FUNCTION public.validate_employee_absence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Serializes absence changes for one worker, including concurrent requests.
  PERFORM 1 FROM public.profiles WHERE id = NEW.user_id AND organization_id = NEW.organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zamestnanec nepatrí do tejto firmy.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.employee_absences a
    WHERE a.user_id = NEW.user_id AND a.id <> NEW.id
      AND a.start_date <= COALESCE(NEW.end_date, 'infinity'::date)
      AND NEW.start_date <= COALESCE(a.end_date, 'infinity'::date)
      AND (a.all_day OR NEW.all_day OR (a.start_time < NEW.end_time AND NEW.start_time < a.end_time))
  ) THEN
    RAISE EXCEPTION 'V tomto období už má zamestnanec prekrývajúcu sa neprítomnosť. Najprv upravte alebo ukončite pôvodný záznam.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id <> OLD.organization_id OR NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Zamestnanca ani firmu existujúcej neprítomnosti nemožno zmeniť.';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  ELSE
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER validate_employee_absence
BEFORE INSERT OR UPDATE ON public.employee_absences
FOR EACH ROW EXECUTE FUNCTION public.validate_employee_absence();

ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_absence_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_absences, public.employee_absence_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_absences, public.employee_absence_notes TO authenticated;
GRANT ALL ON public.employee_absences, public.employee_absence_notes TO service_role;

DO $policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_absences' AND policyname = 'absence_read') THEN
    CREATE POLICY absence_read ON public.employee_absences FOR SELECT TO authenticated
    USING (organization_id = public.get_my_org() AND (user_id = auth.uid() OR public.get_my_role() = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_absences' AND policyname = 'absence_admin') THEN
    CREATE POLICY absence_admin ON public.employee_absences FOR ALL TO authenticated
    USING (organization_id = public.get_my_org() AND public.get_my_role() = 'admin')
    WITH CHECK (organization_id = public.get_my_org() AND public.get_my_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employee_absence_notes' AND policyname = 'absence_notes_admin') THEN
    CREATE POLICY absence_notes_admin ON public.employee_absence_notes FOR ALL TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.employee_absences a WHERE a.id = absence_id AND a.organization_id = public.get_my_org()))
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.employee_absences a WHERE a.id = absence_id AND a.organization_id = public.get_my_org()));
  END IF;
END;
$policies$;

-- One transaction saves the record and private note together.
CREATE OR REPLACE FUNCTION public.save_employee_absence(p_absence JSONB, p_note TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved_id UUID;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin'
     OR (p_absence->>'organization_id')::uuid IS DISTINCT FROM public.get_my_org() THEN
    RAISE EXCEPTION 'Neprítomnosti môže spravovať iba administrátor danej firmy.';
  END IF;
  IF NULLIF(p_absence->>'id', '') IS NULL THEN
    INSERT INTO public.employee_absences (organization_id, user_id, kind, start_date, end_date, all_day, start_time, end_time)
    VALUES ((p_absence->>'organization_id')::uuid, (p_absence->>'user_id')::uuid, p_absence->>'kind', (p_absence->>'start_date')::date,
      NULLIF(p_absence->>'end_date', '')::date, (p_absence->>'all_day')::boolean,
      NULLIF(p_absence->>'start_time', '')::time, NULLIF(p_absence->>'end_time', '')::time)
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.employee_absences SET kind = p_absence->>'kind', start_date = (p_absence->>'start_date')::date,
      end_date = NULLIF(p_absence->>'end_date', '')::date, all_day = (p_absence->>'all_day')::boolean,
      start_time = NULLIF(p_absence->>'start_time', '')::time, end_time = NULLIF(p_absence->>'end_time', '')::time
    WHERE id = (p_absence->>'id')::uuid AND user_id = (p_absence->>'user_id')::uuid
      AND organization_id = (p_absence->>'organization_id')::uuid
    RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Záznam sa nenašiel alebo k nemu nemáte prístup.'; END IF;
  END IF;
  IF NULLIF(btrim(p_note), '') IS NULL THEN
    DELETE FROM public.employee_absence_notes WHERE absence_id = saved_id;
  ELSE
    INSERT INTO public.employee_absence_notes(absence_id, note) VALUES (saved_id, btrim(p_note))
    ON CONFLICT(absence_id) DO UPDATE SET note = EXCLUDED.note;
  END IF;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_employee_absence(JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_employee_absence(JSONB, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Adds atomic settlement saving. Existing records are preserved.
CREATE OR REPLACE FUNCTION public.settle_employee_advance(
  p_advance_id UUID, p_amount NUMERIC, p_date DATE
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_advance public.advances%ROWTYPE;
  v_org UUID;
  v_role TEXT;
BEGIN
  SELECT organization_id, role INTO v_org, v_role
  FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Splátku môže zúčtovať iba administrátor.';
  END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount <= 0 OR p_amount <> round(p_amount, 2) OR p_date IS NULL THEN
    RAISE EXCEPTION 'Zadajte platnú kladnú sumu s najviac dvoma desatinnými miestami a dátum.';
  END IF;
  SELECT * INTO v_advance FROM public.advances
  WHERE id = p_advance_id AND organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Záloha sa nenašla alebo k nej nemáte prístup.'; END IF;
  IF v_advance.status IS DISTINCT FROM 'pending'
     OR p_amount > v_advance.amount - v_advance.settled_amount THEN
    RAISE EXCEPTION 'Splátka presahuje aktuálny zostatok zálohy. Obnovte prehľad.';
  END IF;
  INSERT INTO public.advance_settlements (advance_id, amount, date)
  VALUES (p_advance_id, p_amount, p_date);
  UPDATE public.advances SET
    settled_amount = v_advance.settled_amount + p_amount,
    status = CASE WHEN v_advance.settled_amount + p_amount = v_advance.amount THEN 'settled' ELSE 'pending' END,
    settled_at = CASE WHEN v_advance.settled_amount + p_amount = v_advance.amount THEN now() ELSE NULL END
  WHERE id = p_advance_id;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_employee_advance(UUID, NUMERIC, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_employee_advance(UUID, NUMERIC, DATE) TO authenticated;
NOTIFY pgrst, 'reload schema';


-- KONIEC TRANSAKCIE
COMMIT;

NOTIFY pgrst, 'reload schema';
`
