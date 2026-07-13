
-- Customer notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'order',
  link text,
  order_id uuid,
  order_item_id uuid,
  pickup_code text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif owner read" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Notif owner update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Notif system insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- PVZ notifications (addressed to a pickup point)
CREATE TABLE IF NOT EXISTS public.pvz_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_point_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'incoming',
  order_id uuid,
  order_item_id uuid,
  pickup_code text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pvz_notifications ENABLE ROW LEVEL SECURITY;

-- Any authenticated PVZ staff member can read/update; in this app PVZ panel is staff-only UI
CREATE POLICY "PVZ notif staff read" ON public.pvz_notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "PVZ notif staff update" ON public.pvz_notifications
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "PVZ notif system insert" ON public.pvz_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pvz_notif ON public.pvz_notifications(pickup_point_id, is_read, created_at DESC);

-- Trigger: when order_items.status changes, create notifications
CREATE OR REPLACE FUNCTION public.notify_on_order_item_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer_id uuid;
  _pvz_id uuid;
  _pvz_name text;
  _pvz_addr text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT o.buyer_id, COALESCE(NEW.pickup_point_id, o.pickup_point_id)
    INTO _buyer_id, _pvz_id
  FROM public.orders o WHERE o.id = NEW.order_id;

  IF _pvz_id IS NOT NULL THEN
    SELECT name, city || ', ' || address INTO _pvz_name, _pvz_addr
    FROM public.pickup_points WHERE id = _pvz_id;
  END IF;

  -- Seller marked as shipped
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

  -- PVZ accepted
  IF NEW.accepted_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.accepted_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '✅ Paketiniz PVZ-də hazırdır',
        NEW.title || ' — ' || COALESCE(_pvz_name,'PVZ') || ' (' || COALESCE(_pvz_addr,'') || '). Götürmək üçün QR/kodu göstərin: ' || COALESCE(NEW.pickup_code,'-'),
        'ready', '/orders', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
  END IF;

  -- PVZ delivered
  IF NEW.delivered_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.delivered_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '🎉 Sifarişiniz təhvil verildi',
        NEW.title || ' — uğurla təhvil aldınız. Rəyinizi bizimlə paylaşın!',
        'delivered', '/my-reviews', NEW.order_id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_on_order_item_status
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item_status();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvz_notifications;
