-- Spustite raz v Supabase SQL Editore.
-- Zachova existujucu registraciu a doplni ukladanie nepovinneho telefonu.
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
    VALUES (
      new.id,
      new_org_id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nickname',
      NULLIF(new.raw_user_meta_data->>'phone', ''),
      'admin',
      true
    );
  ELSE
    INSERT INTO public.profiles (id, organization_id, email, full_name, nickname, phone, role, is_active)
    VALUES (
      new.id,
      (new.raw_user_meta_data->>'company_id')::UUID,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nickname',
      NULLIF(new.raw_user_meta_data->>'phone', ''),
      'employee',
      true
    );
  END IF;

  RETURN new;
END;
$$;
