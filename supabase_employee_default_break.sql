-- Run once in Supabase SQL Editor before deploying the application changes.
BEGIN;
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
COMMIT;
