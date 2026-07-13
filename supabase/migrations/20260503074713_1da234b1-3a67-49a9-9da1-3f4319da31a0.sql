CREATE OR REPLACE FUNCTION public.register_seller(_shop_name text, _shop_city text DEFAULT NULL::text, _phone text DEFAULT NULL::text, _voen text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF coalesce(trim(_shop_name),'') = '' THEN RAISE EXCEPTION 'Mağaza adı daxil edin'; END IF;

  UPDATE public.profiles
    SET shop_name = trim(_shop_name),
        shop_city = nullif(trim(coalesce(_shop_city,'')), ''),
        phone = coalesce(nullif(trim(coalesce(_phone,'')), ''), phone),
        voen = nullif(trim(coalesce(_voen,'')), ''),
        updated_at = now()
    WHERE id = _uid;

  DELETE FROM public.user_roles
  WHERE user_id = _uid
    AND role = 'buyer'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;