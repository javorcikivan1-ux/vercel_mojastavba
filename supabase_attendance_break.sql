-- Obedná/pracovná prestávka pri evidencii dochádzky.
-- Spustite raz v Supabase SQL Editore pred nasadením novej verzie aplikácie.
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS break_start TEXT,
  ADD COLUMN IF NOT EXISTS break_end TEXT,
  ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.attendance_logs.break_start IS 'Začiatok prestávky vo formáte HH:MM';
COMMENT ON COLUMN public.attendance_logs.break_end IS 'Koniec prestávky vo formáte HH:MM';
COMMENT ON COLUMN public.attendance_logs.break_minutes IS 'Dĺžka prestávky odpočítaná z odpracovaného času';
