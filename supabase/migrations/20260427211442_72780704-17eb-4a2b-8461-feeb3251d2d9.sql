CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id <> auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.become_seller(_shop_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe_shop_name text := nullif(trim(coalesce(_shop_name, '')), '');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Giriş tələb olunur';
  END IF;

  IF _safe_shop_name IS NULL OR char_length(_safe_shop_name) < 2 THEN
    RAISE EXCEPTION 'Mağaza adı daxil edin';
  END IF;

  INSERT INTO public.profiles (id, shop_name)
  VALUES (_uid, left(_safe_shop_name, 100))
  ON CONFLICT (id) DO UPDATE
  SET shop_name = excluded.shop_name,
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'buyer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.become_seller(text) TO authenticated;

NOTIFY pgrst, 'reload schema';