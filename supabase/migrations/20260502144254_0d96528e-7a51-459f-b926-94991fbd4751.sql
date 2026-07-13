-- Separate account roles so buyer/seller/PVZ registrations do not mix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_count integer;
  _ref_code text;
  _referrer_id uuid;
  _input_ref text;
  _account_role text;
  _role public.app_role;
BEGIN
  _ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _input_ref := NEW.raw_user_meta_data->>'referral_code';
  _account_role := lower(coalesce(NEW.raw_user_meta_data->>'account_role', 'buyer'));

  IF _account_role NOT IN ('buyer', 'seller', 'pvz') THEN
    _account_role := 'buyer';
  END IF;
  _role := _account_role::public.app_role;

  INSERT INTO public.profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    _ref_code
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Apply referral bonus only for customer accounts
  IF _role = 'buyer'::public.app_role AND _input_ref IS NOT NULL AND length(_input_ref) > 0 THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = upper(_input_ref) LIMIT 1;
    IF _referrer_id IS NOT NULL AND _referrer_id <> NEW.id THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE id = NEW.id;
      INSERT INTO public.referrals (referrer_id, referred_id, bonus_awarded) VALUES (_referrer_id, NEW.id, 500);
      INSERT INTO public.bonus_transactions (user_id, amount, reason) VALUES (_referrer_id, 500, 'Dəvət bonusu');
      INSERT INTO public.bonus_transactions (user_id, amount, reason) VALUES (NEW.id, 500, 'Xoş gəldiniz bonusu (dəvət)');
      UPDATE public.profiles SET bonus_balance = COALESCE(bonus_balance,0) + 500 WHERE id = _referrer_id;
      UPDATE public.profiles SET bonus_balance = COALESCE(bonus_balance,0) + 500 WHERE id = NEW.id;
    END IF;
  END IF;

  SELECT count(*) INTO _user_count FROM auth.users;
  IF _user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

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

  DELETE FROM public.user_roles
  WHERE user_id = _uid
    AND role = 'buyer'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_seller(
  _shop_name text,
  _shop_city text,
  _phone text,
  _voen text DEFAULT NULL
)
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
  IF coalesce(trim(_shop_city),'') = '' THEN RAISE EXCEPTION 'Şəhər daxil edin'; END IF;
  IF coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Telefon nömrəsi daxil edin'; END IF;

  UPDATE public.profiles
    SET shop_name = trim(_shop_name),
        shop_city = trim(_shop_city),
        phone = trim(_phone),
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

CREATE OR REPLACE FUNCTION public.register_pvz_staff(
  _full_name text,
  _phone text,
  _pickup_point_id uuid,
  _position text DEFAULT 'operator',
  _new_pvz_name text DEFAULT NULL,
  _new_pvz_city text DEFAULT NULL,
  _new_pvz_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _final_pvz uuid := _pickup_point_id;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF coalesce(trim(_full_name),'') = '' THEN RAISE EXCEPTION 'Ad daxil edin'; END IF;
  IF coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Telefon nömrəsi daxil edin'; END IF;

  IF _final_pvz IS NULL THEN
    IF coalesce(trim(_new_pvz_name),'') = '' OR coalesce(trim(_new_pvz_city),'') = '' OR coalesce(trim(_new_pvz_address),'') = '' THEN
      RAISE EXCEPTION 'PVZ punkt məlumatları (ad, şəhər, ünvan) tam daxil edilməlidir';
    END IF;
    INSERT INTO public.pickup_points (name, city, address, phone, is_active)
    VALUES ('PVZ PUNKT — ' || trim(_new_pvz_name), trim(_new_pvz_city), trim(_new_pvz_address), trim(_phone), true)
    RETURNING id INTO _final_pvz;
  END IF;

  UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(trim(_full_name),''), full_name),
        phone = trim(_phone),
        updated_at = now()
    WHERE id = _uid;

  INSERT INTO public.pvz_staff (full_name, phone, pickup_point_id, position, is_active)
  VALUES (trim(_full_name), trim(_phone), _final_pvz, COALESCE(NULLIF(trim(_position),''),'operator'), true);

  DELETE FROM public.user_roles
  WHERE user_id = _uid
    AND role = 'buyer'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'pvz'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _final_pvz;
END;
$function$;

DELETE FROM public.user_roles ur
WHERE ur.role = 'buyer'::public.app_role
  AND EXISTS (
    SELECT 1
    FROM public.user_roles other
    WHERE other.user_id = ur.user_id
      AND other.role IN ('seller'::public.app_role, 'pvz'::public.app_role)
  );

GRANT EXECUTE ON FUNCTION public.become_seller(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_seller(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_pvz_staff(text, text, uuid, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.become_seller(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_seller(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_pvz_staff(text, text, uuid, text, text, text, text) FROM anon;

NOTIFY pgrst, 'reload schema';