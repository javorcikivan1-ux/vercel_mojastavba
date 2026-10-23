-- Run the entire file as one statement in a new Supabase SQL Editor query.
-- RLS is enabled inside this statement; no editor-generated RLS changes needed.
-- Does not change attendance hours, rates or payroll.
DO $install_absences$
BEGIN

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
END;
$install_absences$;

SELECT to_regclass('public.employee_absences') AS absences_table,
       to_regclass('public.employee_absence_notes') AS notes_table,
       to_regprocedure('public.save_employee_absence(jsonb,text)') AS save_function;
