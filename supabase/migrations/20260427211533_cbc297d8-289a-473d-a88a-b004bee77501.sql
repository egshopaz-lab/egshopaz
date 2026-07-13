CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can self-assign seller role" ON public.user_roles;

CREATE POLICY "Users see own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can self-assign seller role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'seller'::public.app_role);

CREATE OR REPLACE FUNCTION public.become_seller(_shop_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.become_seller(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.become_seller(text) FROM anon;

NOTIFY pgrst, 'reload schema';