-- Adds atomic settlement saving. Existing records are preserved.
BEGIN;
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
COMMIT;
