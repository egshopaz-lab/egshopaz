-- 1) Returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | completed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Returns buyer create" ON public.returns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Returns participants read" ON public.returns
  FOR SELECT TO authenticated USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Returns seller update" ON public.returns
  FOR UPDATE TO authenticated USING (
    auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER returns_touch BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Seller balances
CREATE TABLE IF NOT EXISTS public.seller_balances (
  seller_id uuid PRIMARY KEY,
  available numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bal seller read own" ON public.seller_balances
  FOR SELECT TO authenticated USING (
    auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Bal admin manage" ON public.seller_balances
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) Payouts log
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  amount numeric NOT NULL,
  commission numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payouts seller read own" ON public.payouts
  FOR SELECT TO authenticated USING (
    auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Payouts admin manage" ON public.payouts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) Order items extra columns
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_name text;

-- 5) Update notification trigger to include 3-day return reminder
CREATE OR REPLACE FUNCTION public.notify_on_order_item_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _buyer_id uuid;
  _pvz_id uuid;
  _pvz_name text;
  _pvz_addr text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.accepted_at IS NOT DISTINCT FROM NEW.accepted_at
     AND OLD.delivered_at IS NOT DISTINCT FROM NEW.delivered_at THEN
    RETURN NEW;
  END IF;

  SELECT o.buyer_id, COALESCE(NEW.pickup_point_id, o.pickup_point_id)
    INTO _buyer_id, _pvz_id
  FROM public.orders o WHERE o.id = NEW.order_id;

  IF _pvz_id IS NOT NULL THEN
    SELECT name, city || ', ' || address INTO _pvz_name, _pvz_addr
    FROM public.pickup_points WHERE id = _pvz_id;
  END IF;

  IF NEW.status = 'shipped' AND (TG_OP = 'INSERT' OR OLD.status <> 'shipped') THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '📦 Sifarişiniz göndərildi',
        NEW.title || ' — satıcı paketi göndərdi. PVZ: ' || COALESCE(_pvz_name,'(təyin olunmayıb)') || '. Götürmə kodu: ' || COALESCE(NEW.pickup_code,'-'),
        'shipped', '/orders', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
    IF _pvz_id IS NOT NULL THEN
      INSERT INTO public.pvz_notifications (pickup_point_id, title, body, type, order_id, order_item_id, pickup_code)
      VALUES (_pvz_id,
        '🚚 Yeni paket gözlənilir',
        NEW.title || ' — kod: ' || COALESCE(NEW.pickup_code,'-') || '. Qəbul üçün QR-ı skan edin.',
        'incoming', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
  END IF;

  IF NEW.accepted_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.accepted_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '✅ Paketiniz PVZ-də hazırdır',
        NEW.title || ' — ' || COALESCE(_pvz_name,'PVZ') || ' (' || COALESCE(_pvz_addr,'') || '). Götürmək üçün QR/kodu göstərin: ' || COALESCE(NEW.pickup_code,'-'),
        'ready', '/messages-pvz?order=' || NEW.order_id, NEW.order_id, NEW.id, NEW.pickup_code);

      IF _pvz_id IS NOT NULL THEN
        INSERT INTO public.pvz_messages (order_id, order_item_id, buyer_id, pickup_point_id, sender_role, body)
        VALUES (NEW.order_id, NEW.id, _buyer_id, _pvz_id, 'system',
          '✅ Paketiniz "' || NEW.title || '" PVZ-yə qəbul edildi. ' || COALESCE(_pvz_name,'') || ' (' || COALESCE(_pvz_addr,'') || '). Götürmə kodu: ' || COALESCE(NEW.pickup_code,'-') || '. İş saatlarında bizə yaza bilərsiniz.');
      END IF;
    END IF;
  END IF;

  IF NEW.delivered_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.delivered_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '🎉 Sifarişiniz təhvil verildi',
        NEW.title || ' — uğurla təhvil aldınız. ⚠️ Diqqət: yalnız 3 gün ərzində qaytarma edə bilərsiniz!',
        'delivered', '/orders', NEW.order_id, NEW.id);

      -- Separate clear return-window reminder
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '↩️ Qaytarma müddəti: 3 gün',
        '"' || NEW.title || '" üçün qaytarma müddəti bu gündən başlayır. 3 gün ərzində qaytarma istəyi göndərə bilərsiniz, sonra qaytarma qəbul olunmur.',
        'return_window', '/orders', NEW.order_id, NEW.id);

      IF _pvz_id IS NOT NULL THEN
        INSERT INTO public.pvz_messages (order_id, order_item_id, buyer_id, pickup_point_id, sender_role, body)
        VALUES (NEW.order_id, NEW.id, _buyer_id, _pvz_id, 'system',
          '🎉 "' || NEW.title || '" sifarişiniz təhvil verildi. Bizi seçdiyiniz üçün təşəkkür edirik!');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6) Auto payout function: 3 days after delivery, no return → payout to seller
CREATE OR REPLACE FUNCTION public.auto_payout_after_3_days()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _commission_pct numeric;
  _processed integer := 0;
  _row record;
  _gross numeric;
  _commission numeric;
  _net numeric;
  _has_return boolean;
BEGIN
  SELECT commission_percent INTO _commission_pct FROM public.system_settings LIMIT 1;
  _commission_pct := COALESCE(_commission_pct, 10);

  FOR _row IN
    SELECT oi.id, oi.seller_id, oi.price, oi.quantity, oi.delivered_at
    FROM public.order_items oi
    WHERE oi.delivered_at IS NOT NULL
      AND oi.delivered_at < now() - interval '3 days'
      AND oi.payout_status = 'pending'
  LOOP
    -- Skip if there is any active (non-rejected) return
    SELECT EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.order_item_id = _row.id
        AND r.status IN ('pending','approved','completed')
    ) INTO _has_return;

    IF _has_return THEN
      UPDATE public.order_items SET payout_status = 'blocked_return' WHERE id = _row.id;
      CONTINUE;
    END IF;

    _gross := _row.price * _row.quantity;
    _commission := round(_gross * _commission_pct / 100.0, 2);
    _net := _gross - _commission;

    INSERT INTO public.payouts (seller_id, order_item_id, amount, commission, net_amount, status)
    VALUES (_row.seller_id, _row.id, _gross, _commission, _net, 'completed');

    INSERT INTO public.seller_balances (seller_id, available, total_earned)
    VALUES (_row.seller_id, _net, _net)
    ON CONFLICT (seller_id) DO UPDATE
      SET available = public.seller_balances.available + EXCLUDED.available,
          total_earned = public.seller_balances.total_earned + EXCLUDED.total_earned,
          updated_at = now();

    UPDATE public.order_items
      SET payout_status = 'paid', payout_at = now()
      WHERE id = _row.id;

    -- Notify seller
    INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
    VALUES (_row.seller_id,
      '💰 Pul balansınıza köçürüldü',
      'Sifariş tamamlandı və ' || _net || ' AZN balansınıza köçürüldü (komissiya: ' || _commission || ' AZN).',
      'payout', '/seller', NULL, _row.id);

    _processed := _processed + 1;
  END LOOP;

  RETURN _processed;
END;
$function$;

-- 7) Updated PVZ staff registration: support address & creating new pickup point
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

  -- If no existing pickup chosen, create a new one from address fields
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'pvz'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _final_pvz;
END;
$function$;

-- 8) Trigger: capture customer name & phone on order item insert
CREATE OR REPLACE FUNCTION public.fill_order_item_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.customer_name IS NULL OR NEW.customer_phone IS NULL THEN
    SELECT COALESCE(o.recipient_name, p.full_name), COALESCE(o.recipient_phone, p.phone)
      INTO NEW.customer_name, NEW.customer_phone
    FROM public.orders o
    LEFT JOIN public.profiles p ON p.id = o.buyer_id
    WHERE o.id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_fill_order_item_customer ON public.order_items;
CREATE TRIGGER trg_fill_order_item_customer
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fill_order_item_customer();

-- Ensure status notification trigger is attached
DROP TRIGGER IF EXISTS trg_notify_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_order_item_status
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item_status();

-- Ensure delivery bonus trigger
DROP TRIGGER IF EXISTS trg_bonus_on_delivery ON public.order_items;
CREATE TRIGGER trg_bonus_on_delivery
  AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.bonus_on_delivery();

-- Ensure tier update trigger
DROP TRIGGER IF EXISTS trg_update_seller_tier ON public.order_items;
CREATE TRIGGER trg_update_seller_tier
  AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_seller_tier();

-- 9) Schedule auto payout every hour
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-payout-3days');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-payout-3days',
  '7 * * * *',
  $$ SELECT public.auto_payout_after_3_days(); $$
);