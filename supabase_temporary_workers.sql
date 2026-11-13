-- Preserve existing profiles, attendance and joins; allow explicitly temporary profiles without a login.
BEGIN;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temporary_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_payment_type TEXT,
  ADD COLUMN IF NOT EXISTS default_fixed_amount NUMERIC;

UPDATE public.profiles SET auth_user_id = id WHERE NOT is_temporary AND auth_user_id IS NULL;
DO $$
DECLARE fk RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_auth_user_link') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_link FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_unique UNIQUE(auth_user_id);
  END IF;
  -- Replace only the old profiles.id -> auth.users.id link. Other foreign keys remain untouched.
  FOR fk IN SELECT conname FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND confrelid='auth.users'::regclass
    AND contype='f' AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.profiles'::regclass AND attname='id')]::smallint[]
  LOOP EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', fk.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_worker_account_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_worker_account_valid CHECK (
      (is_temporary AND role='employee' AND auth_user_id IS NULL AND email IS NULL)
      OR (NOT is_temporary AND auth_user_id IS NOT NULL AND auth_user_id=id)
    );
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_temporary_defaults_valid CHECK (
      (default_payment_type IS NULL OR default_payment_type IN ('hourly','fixed'))
      AND (default_fixed_amount IS NULL OR (default_fixed_amount >= 0 AND default_fixed_amount::text NOT IN ('NaN','Infinity','-Infinity')))
      AND jsonb_typeof(temporary_periods)='array'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_worker_account() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p JSONB; start_day DATE; end_day DATE;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.is_temporary IS DISTINCT FROM OLD.is_temporary) THEN
    RAISE EXCEPTION 'Typ pracovníka ani jeho identifikátor nemožno zmeniť.';
  END IF;
  IF NEW.is_temporary THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND organization_id=NEW.organization_id) THEN
      RAISE EXCEPTION 'Dočasných pracovníkov môže spravovať iba administrátor danej firmy.';
    END IF;
    IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Firmu pracovníka nemožno zmeniť.';
    END IF;
    NEW.auth_user_id := NULL;
    NEW.email := NULL;
    NEW.show_wage_in_profile := false;
    IF NEW.full_name IS NULL OR length(btrim(NEW.full_name))=0 THEN RAISE EXCEPTION 'Zadajte meno pracovníka.'; END IF;
    IF NEW.hourly_rate < 0 OR NEW.cost_rate < 0 OR NEW.hourly_rate::text IN ('NaN','Infinity','-Infinity') OR NEW.cost_rate::text IN ('NaN','Infinity','-Infinity') THEN
      RAISE EXCEPTION 'Sadzby musia byť platné nezáporné čísla.';
    END IF;
    IF jsonb_typeof(NEW.temporary_periods) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.temporary_periods)>100 THEN RAISE EXCEPTION 'Neplatné obdobia spolupráce.'; END IF;
    FOR p IN SELECT value FROM jsonb_array_elements(NEW.temporary_periods) LOOP
      IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR NOT COALESCE(p->>'start_date','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Zadajte dátum začiatku spolupráce.'; END IF;
      start_day := (p->>'start_date')::date;
      end_day := NULLIF(p->>'end_date','')::date;
      IF end_day < start_day THEN RAISE EXCEPTION 'Koniec spolupráce nemôže byť pred začiatkom.'; END IF;
    END LOOP;
  ELSE
    NEW.auth_user_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER validate_worker_account BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_worker_account();

CREATE OR REPLACE FUNCTION public.save_temporary_worker(p_worker JSONB) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org UUID; v_role TEXT; v_id UUID; v_saved UUID;
BEGIN
  SELECT organization_id, role INTO v_org,v_role FROM public.profiles WHERE id=auth.uid();
  IF v_role IS DISTINCT FROM 'admin' OR v_org IS NULL THEN RAISE EXCEPTION 'Dočasného pracovníka môže uložiť iba administrátor.'; END IF;
  v_id := NULLIF(p_worker->>'id','')::uuid;
  IF length(btrim(COALESCE(p_worker->>'full_name','')))=0 OR length(p_worker->>'full_name')>120 THEN RAISE EXCEPTION 'Zadajte meno do 120 znakov.'; END IF;
  IF length(btrim(COALESCE(p_worker->>'job_title','')))>120 THEN RAISE EXCEPTION 'Zadajte pozíciu do 120 znakov.'; END IF;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO public.profiles(id,organization_id,role,is_temporary,full_name,email,is_active,show_wage_in_profile)
      VALUES(v_id,v_org,'employee',true,btrim(p_worker->>'full_name'),NULL,true,false);
  END IF;
  UPDATE public.profiles SET full_name=btrim(p_worker->>'full_name'),phone=NULLIF(btrim(p_worker->>'phone'),''),
    is_active=CASE WHEN COALESCE((p_worker->>'reactivate')::boolean,false) THEN true ELSE is_active END,
    job_title=COALESCE(NULLIF(btrim(p_worker->>'job_title'),''),'Dočasný pracovník'),
    hourly_rate=COALESCE(NULLIF(p_worker->>'hourly_rate','')::numeric,0),cost_rate=COALESCE(NULLIF(p_worker->>'cost_rate','')::numeric,0),
    default_payment_type=NULLIF(p_worker->>'default_payment_type',''),default_fixed_amount=NULLIF(p_worker->>'default_fixed_amount','')::numeric,
    temporary_periods=COALESCE(p_worker->'temporary_periods','[]'::jsonb)
    WHERE id=v_id AND organization_id=v_org AND is_temporary RETURNING id INTO v_saved;
  IF v_saved IS NULL THEN RAISE EXCEPTION 'Dočasný pracovník sa nenašiel alebo patrí inej firme.'; END IF;
  RETURN v_saved;
END;
$$;
REVOKE ALL ON FUNCTION public.save_temporary_worker(JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_temporary_worker(JSONB) TO authenticated;

-- Date-based archive without deleting records or requiring a scheduled job.
CREATE OR REPLACE VIEW public.team_worker_directory WITH (security_invoker=true) AS
SELECT p.*,
  COALESCE(p.is_active,false) AND
  CASE WHEN p.is_temporary AND jsonb_array_length(p.temporary_periods)>0 THEN
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.temporary_periods) AS period
      WHERE NULLIF(period->>'end_date','') IS NULL
         OR (period->>'end_date')::date >= (now() AT TIME ZONE 'Europe/Bratislava')::date
    )
  ELSE true END AS effective_is_active
FROM public.profiles p;
REVOKE ALL ON public.team_worker_directory FROM PUBLIC,anon;
GRANT SELECT ON public.team_worker_directory TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
