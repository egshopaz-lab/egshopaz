-- PVZ ↔ Buyer order-scoped messages
CREATE TABLE public.pvz_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid,
  buyer_id uuid NOT NULL,
  pickup_point_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','pvz','system')),
  sender_id uuid,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pvz_messages_order ON public.pvz_messages(order_id, created_at);
CREATE INDEX idx_pvz_messages_buyer ON public.pvz_messages(buyer_id, created_at DESC);
CREATE INDEX idx_pvz_messages_pvz ON public.pvz_messages(pickup_point_id, created_at DESC);

ALTER TABLE public.pvz_messages ENABLE ROW LEVEL SECURITY;

-- Buyer reads own
CREATE POLICY "PVZ msg buyer read" ON public.pvz_messages
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

-- PVZ staff (any authenticated) reads all PVZ messages – matches existing pvz_notifications policy
CREATE POLICY "PVZ msg staff read" ON public.pvz_messages
  FOR SELECT TO authenticated USING (true);

-- Buyer sends (must own the order)
CREATE POLICY "PVZ msg buyer send" ON public.pvz_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'buyer'
    AND auth.uid() = buyer_id
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
  );

-- PVZ staff sends
CREATE POLICY "PVZ msg staff send" ON public.pvz_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_role IN ('pvz','system') AND auth.uid() IS NOT NULL);

-- Mark read
CREATE POLICY "PVZ msg recipient mark read" ON public.pvz_messages
  FOR UPDATE TO authenticated
  USING (
    (sender_role = 'buyer' AND auth.uid() IS NOT NULL) OR
    (sender_role IN ('pvz','system') AND auth.uid() = buyer_id)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.pvz_messages;

-- Update notify trigger: when PVZ accepts, insert auto chat message + notification (already exists)
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
        'ready', '/messages-pvz?order=' || NEW.order_id, NEW.order_id, NEW.id, NEW.pickup_code);

      -- Auto chat message from PVZ
      IF _pvz_id IS NOT NULL THEN
        INSERT INTO public.pvz_messages (order_id, order_item_id, buyer_id, pickup_point_id, sender_role, body)
        VALUES (NEW.order_id, NEW.id, _buyer_id, _pvz_id, 'system',
          '✅ Paketiniz "' || NEW.title || '" PVZ-yə qəbul edildi. ' || COALESCE(_pvz_name,'') || ' (' || COALESCE(_pvz_addr,'') || '). Götürmə kodu: ' || COALESCE(NEW.pickup_code,'-') || '. İş saatlarında bizə yaza bilərsiniz.');
      END IF;
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

DROP TRIGGER IF EXISTS trg_notify_on_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_on_order_item_status
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item_status();