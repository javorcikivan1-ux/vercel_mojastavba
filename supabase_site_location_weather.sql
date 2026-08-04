-- Poloha zákazky pre automatické dopĺňanie počasia v denníku práce.
-- Bezpečná migrácia: iba pridáva nové voliteľné stĺpce, existujúce dáta nemení.

ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_label TEXT;

CREATE INDEX IF NOT EXISTS idx_sites_location
ON public.sites (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
