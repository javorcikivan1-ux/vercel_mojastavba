-- Allow a custom position for temporary workers. Existing records remain unchanged.
BEGIN;
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

NOTIFY pgrst,'reload schema';
COMMIT;
