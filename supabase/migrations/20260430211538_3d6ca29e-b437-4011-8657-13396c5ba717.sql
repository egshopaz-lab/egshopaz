-- Add VOEN field for sellers (phone already exists in profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voen text;

-- RPC: register as seller (auto-approve) with shop info + phone + voen
CREATE OR REPLACE FUNCTION public.register_seller(
  _shop_name text,
  _shop_city text,
  _phone text,
  _voen text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF coalesce(trim(_shop_name),'') = '' THEN RAISE EXCEPTION 'Mağaza adı daxil edin'; END IF;
  IF coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Telefon nömrəsi daxil edin'; END IF;

  INSERT INTO public.profiles (id, shop_name, shop_city, phone, voen)
  VALUES (_uid, left(trim(_shop_name),100), nullif(trim(_shop_city),''), trim(_phone), nullif(trim(_voen),''))
  ON CONFLICT (id) DO UPDATE SET
    shop_name = EXCLUDED.shop_name,
    shop_city = COALESCE(EXCLUDED.shop_city, public.profiles.shop_city),
    phone = EXCLUDED.phone,
    voen = COALESCE(EXCLUDED.voen, public.profiles.voen),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- RPC: register as PVZ staff (auto-approve) — links to a pickup_point
CREATE OR REPLACE FUNCTION public.register_pvz_staff(
  _full_name text,
  _phone text,
  _pickup_point_id uuid,
  _position text DEFAULT 'operator'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF coalesce(trim(_full_name),'') = '' THEN RAISE EXCEPTION 'Ad daxil edin'; END IF;
  IF coalesce(trim(_phone),'') = '' THEN RAISE EXCEPTION 'Telefon nömrəsi daxil edin'; END IF;
  IF _pickup_point_id IS NULL THEN RAISE EXCEPTION 'PVZ nöqtəsi seçin'; END IF;

  UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(trim(_full_name),''), full_name),
        phone = trim(_phone),
        updated_at = now()
    WHERE id = _uid;

  INSERT INTO public.pvz_staff (full_name, phone, pickup_point_id, position, is_active)
  VALUES (trim(_full_name), trim(_phone), _pickup_point_id, COALESCE(NULLIF(trim(_position),''),'operator'), true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'pvz'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;