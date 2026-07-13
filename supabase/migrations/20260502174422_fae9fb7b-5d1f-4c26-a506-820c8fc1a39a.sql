
-- 1. Merge duplicate pickup_points (same name+city+address)
DO $$
DECLARE
  r record;
  keep_id uuid;
BEGIN
  FOR r IN
    SELECT lower(trim(name)) AS n, lower(trim(city)) AS c, lower(trim(address)) AS a,
           array_agg(id ORDER BY point_number NULLS LAST, created_at) AS ids
    FROM public.pickup_points
    GROUP BY lower(trim(name)), lower(trim(city)), lower(trim(address))
    HAVING count(*) > 1
  LOOP
    keep_id := r.ids[1];
    -- repoint references
    UPDATE public.order_items SET pickup_point_id = keep_id
      WHERE pickup_point_id = ANY(r.ids[2:]);
    UPDATE public.orders SET pickup_point_id = keep_id
      WHERE pickup_point_id = ANY(r.ids[2:]);
    UPDATE public.pvz_staff SET pickup_point_id = keep_id
      WHERE pickup_point_id = ANY(r.ids[2:]);
    UPDATE public.pvz_messages SET pickup_point_id = keep_id
      WHERE pickup_point_id = ANY(r.ids[2:]);
    UPDATE public.pvz_notifications SET pickup_point_id = keep_id
      WHERE pickup_point_id = ANY(r.ids[2:]);
    DELETE FROM public.pickup_points WHERE id = ANY(r.ids[2:]);
  END LOOP;
END $$;

-- 2. Resequence point_number
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY point_number NULLS LAST, created_at) AS rn
  FROM public.pickup_points
)
UPDATE public.pickup_points p SET point_number = o.rn FROM ordered o WHERE p.id = o.id;

-- 3. Unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS pickup_points_unique_addr
  ON public.pickup_points (lower(trim(name)), lower(trim(city)), lower(trim(address)));

-- 4. Update handle_new_user to reuse existing pickup_point if same address exists
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
  _full_name_norm text;
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
      _full_name_norm := 'PVZ PUNKT — ' || trim(_new_pvz_name);
      -- try find existing
      SELECT id INTO _pickup_point_id
      FROM public.pickup_points
      WHERE lower(trim(name)) = lower(_full_name_norm)
        AND lower(trim(city)) = lower(trim(_new_pvz_city))
        AND lower(trim(address)) = lower(trim(_new_pvz_address))
      LIMIT 1;

      IF _pickup_point_id IS NULL THEN
        INSERT INTO public.pickup_points (name, city, address, phone, is_active)
        VALUES (_full_name_norm, trim(_new_pvz_city), trim(_new_pvz_address), NULLIF(NEW.raw_user_meta_data->>'phone', ''), true)
        RETURNING id INTO _pickup_point_id;
      END IF;
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
      )
      ON CONFLICT DO NOTHING;
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

-- Also update register_pvz_staff RPC to dedupe
CREATE OR REPLACE FUNCTION public.register_pvz_staff(_full_name text, _phone text, _pickup_point_id uuid DEFAULT NULL::uuid, _position text DEFAULT 'operator'::text, _new_pvz_name text DEFAULT NULL::text, _new_pvz_city text DEFAULT NULL::text, _new_pvz_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _final_pvz uuid := _pickup_point_id;
  _name_norm text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF coalesce(trim(_full_name),'') = '' THEN RAISE EXCEPTION 'Ad daxil edin'; END IF;
  IF coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Telefon nömrəsi daxil edin'; END IF;

  IF _final_pvz IS NULL THEN
    IF coalesce(trim(_new_pvz_name),'') = '' OR coalesce(trim(_new_pvz_city),'') = '' OR coalesce(trim(_new_pvz_address),'') = '' THEN
      RAISE EXCEPTION 'PVZ punkt məlumatları (ad, şəhər, ünvan) tam daxil edilməlidir';
    END IF;
    _name_norm := 'PVZ PUNKT — ' || trim(_new_pvz_name);
    SELECT id INTO _final_pvz
    FROM public.pickup_points
    WHERE lower(trim(name)) = lower(_name_norm)
      AND lower(trim(city)) = lower(trim(_new_pvz_city))
      AND lower(trim(address)) = lower(trim(_new_pvz_address))
    LIMIT 1;
    IF _final_pvz IS NULL THEN
      INSERT INTO public.pickup_points (name, city, address, phone, is_active)
      VALUES (_name_norm, trim(_new_pvz_city), trim(_new_pvz_address), trim(_phone), true)
      RETURNING id INTO _final_pvz;
    END IF;
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
