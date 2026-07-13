ALTER TABLE public.pvz_staff ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_pvz_staff_user_id ON public.pvz_staff(user_id);

UPDATE public.pvz_staff s
SET user_id = p.id
FROM public.profiles p
WHERE s.user_id IS NULL
  AND p.phone IS NOT NULL
  AND trim(p.phone) = trim(s.phone);

DROP POLICY IF EXISTS "PVZ staff self read" ON public.pvz_staff;
CREATE POLICY "PVZ staff self read"
ON public.pvz_staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP FUNCTION IF EXISTS public.register_pvz_staff(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.register_pvz_staff(text, text, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_pvz_staff(
  _full_name text, _phone text, _pickup_point_id uuid,
  _position text DEFAULT 'operator'::text,
  _new_pvz_name text DEFAULT NULL::text,
  _new_pvz_city text DEFAULT NULL::text,
  _new_pvz_address text DEFAULT NULL::text
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

  IF EXISTS (SELECT 1 FROM public.pvz_staff WHERE user_id = _uid) THEN
    UPDATE public.pvz_staff
      SET full_name = trim(_full_name),
          phone = trim(_phone),
          pickup_point_id = _final_pvz,
          position = COALESCE(NULLIF(trim(_position),''),'operator'),
          is_active = true
      WHERE user_id = _uid;
  ELSE
    INSERT INTO public.pvz_staff (user_id, full_name, phone, pickup_point_id, position, is_active)
    VALUES (_uid, trim(_full_name), trim(_phone), _final_pvz, COALESCE(NULLIF(trim(_position),''),'operator'), true);
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role = 'buyer'::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'pvz'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _final_pvz;
END;
$function$;

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
  _pickup_point_id uuid;
  _new_pvz_name text;
  _new_pvz_city text;
  _new_pvz_address text;
  _position text;
BEGIN
  _ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _input_ref := NEW.raw_user_meta_data->>'referral_code';
  _account_role := lower(coalesce(NEW.raw_user_meta_data->>'account_role', 'buyer'));

  IF _account_role NOT IN ('buyer', 'seller', 'pvz') THEN
    _account_role := 'buyer';
  END IF;
  _role := _account_role::public.app_role;

  INSERT INTO public.profiles (
    id, full_name, phone, referral_code,
    shop_name, shop_city, voen
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    _ref_code,
    CASE WHEN _role = 'seller'::public.app_role THEN NULLIF(NEW.raw_user_meta_data->>'shop_name', '') ELSE NULL END,
    CASE WHEN _role = 'seller'::public.app_role THEN NULLIF(NEW.raw_user_meta_data->>'shop_city', '') ELSE NULL END,
    CASE WHEN _role = 'seller'::public.app_role THEN NULLIF(NEW.raw_user_meta_data->>'voen', '') ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      shop_name = COALESCE(EXCLUDED.shop_name, public.profiles.shop_name),
      shop_city = COALESCE(EXCLUDED.shop_city, public.profiles.shop_city),
      voen = COALESCE(EXCLUDED.voen, public.profiles.voen),
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'pvz'::public.app_role THEN
    _position := COALESCE(NULLIF(NEW.raw_user_meta_data->>'position', ''), 'operator');
    _new_pvz_name := NULLIF(NEW.raw_user_meta_data->>'new_pvz_name', '');
    _new_pvz_city := NULLIF(NEW.raw_user_meta_data->>'new_pvz_city', '');
    _new_pvz_address := NULLIF(NEW.raw_user_meta_data->>'new_pvz_address', '');

    BEGIN
      _pickup_point_id := NULLIF(NEW.raw_user_meta_data->>'pickup_point_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      _pickup_point_id := NULL;
    END;

    IF _pickup_point_id IS NULL AND _new_pvz_name IS NOT NULL AND _new_pvz_city IS NOT NULL AND _new_pvz_address IS NOT NULL THEN
      INSERT INTO public.pickup_points (name, city, address, phone, is_active)
      VALUES ('PVZ PUNKT — ' || trim(_new_pvz_name), trim(_new_pvz_city), trim(_new_pvz_address), NULLIF(NEW.raw_user_meta_data->>'phone', ''), true)
      RETURNING id INTO _pickup_point_id;
    END IF;

    IF _pickup_point_id IS NOT NULL THEN
      INSERT INTO public.pvz_staff (user_id, full_name, phone, pickup_point_id, position, is_active)
      VALUES (
        NEW.id,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
        _pickup_point_id,
        _position,
        true
      );
    END IF;
  END IF;

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