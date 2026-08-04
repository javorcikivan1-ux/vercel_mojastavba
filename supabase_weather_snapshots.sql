-- Automaticke pocasie pre zakazky.
-- Spustit v Supabase SQL editore pred nasadenim cron endpointu.

ALTER TABLE public.diary_records
ADD COLUMN IF NOT EXISTS temperature_evening TEXT;

ALTER TABLE public.diary_records
ADD COLUMN IF NOT EXISTS weather_morning TEXT,
ADD COLUMN IF NOT EXISTS weather_noon TEXT,
ADD COLUMN IF NOT EXISTS weather_evening TEXT;

ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_label TEXT;

CREATE INDEX IF NOT EXISTS idx_sites_location
ON public.sites (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.site_weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  weather_date DATE NOT NULL,
  location_label TEXT,
  weather TEXT,
  weather_morning TEXT,
  weather_noon TEXT,
  weather_evening TEXT,
  temperature_morning TEXT,
  temperature_noon TEXT,
  temperature_evening TEXT,
  source TEXT NOT NULL DEFAULT 'open-meteo',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, weather_date)
);

ALTER TABLE public.site_weather_snapshots
ADD COLUMN IF NOT EXISTS weather_morning TEXT,
ADD COLUMN IF NOT EXISTS weather_noon TEXT,
ADD COLUMN IF NOT EXISTS weather_evening TEXT,
ADD COLUMN IF NOT EXISTS temperature_evening TEXT;

CREATE INDEX IF NOT EXISTS idx_site_weather_snapshots_org_date
ON public.site_weather_snapshots (organization_id, weather_date DESC);

CREATE INDEX IF NOT EXISTS idx_site_weather_snapshots_site_date
ON public.site_weather_snapshots (site_id, weather_date DESC);

ALTER TABLE public.site_weather_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_weather_snapshots_select_own_org" ON public.site_weather_snapshots;
CREATE POLICY "site_weather_snapshots_select_own_org"
ON public.site_weather_snapshots
FOR SELECT
TO authenticated
USING (organization_id = public.get_my_org());

DROP POLICY IF EXISTS "site_weather_snapshots_service_all" ON public.site_weather_snapshots;
CREATE POLICY "site_weather_snapshots_service_all"
ON public.site_weather_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
