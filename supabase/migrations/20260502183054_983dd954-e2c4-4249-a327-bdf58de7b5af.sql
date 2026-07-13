-- Make order/PVZ flow deterministic and remove duplicate notification triggers

-- Realtime for status and notification tables
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pvz_notifications; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.pvz_notifications REPLICA IDENTITY FULL;

-- Safer participant visibility: PVZ staff only sees packages for their own pickup point
DROP POLICY IF EXISTS "Items visible to participants" ON public.order_items;
DROP POLICY IF EXISTS "Items visible to buyer/seller/admin" ON public.order_items;
CREATE POLICY "Items visible to participants"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.buyer_id = auth.uid()
  )
  OR seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.pvz_staff ps
    LEFT JOIN public.orders o ON o.id = order_items.order_id
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = COALESCE(order_items.pickup_point_id, o.pickup_point_id)
  )
);

DROP POLICY IF EXISTS "Order participants read" ON public.orders;
DROP POLICY IF EXISTS "Buyer sees own orders" ON public.orders;
CREATE POLICY "Order participants read"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = orders.id
      AND oi.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = orders.pickup_point_id
  )
);

-- Restrict updates: sellers can update own items, PVZ staff can update only items for their pickup point
DROP POLICY IF EXISTS "PVZ staff update order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers update own order items" ON public.order_items;
CREATE POLICY "Sellers update own order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "PVZ staff update own pickup items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pvz_staff ps
    LEFT JOIN public.orders o ON o.id = order_items.order_id
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = COALESCE(order_items.pickup_point_id, o.pickup_point_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pvz_staff ps
    LEFT JOIN public.orders o ON o.id = order_items.order_id
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = COALESCE(order_items.pickup_point_id, o.pickup_point_id)
  )
);

-- PVZ notifications are only visible/editable by staff of that point (and admin)
DROP POLICY IF EXISTS "PVZ notif staff read" ON public.pvz_notifications;
DROP POLICY IF EXISTS "PVZ notif admin update" ON public.pvz_notifications;
CREATE POLICY "PVZ notif staff read own point"
ON public.pvz_notifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = pvz_notifications.pickup_point_id
  )
);

CREATE POLICY "PVZ notif staff update own point"
ON public.pvz_notifications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = pvz_notifications.pickup_point_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = pvz_notifications.pickup_point_id
  )
);

-- Fill buyer contact info on items so seller/PVZ can see order owner details
CREATE OR REPLACE FUNCTION public.fill_order_item_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Keep the parent order status aligned with its items
CREATE OR REPLACE FUNCTION public.sync_order_status_from_items(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total integer;
  _delivered integer;
  _cancelled integer;
  _shipped_or_ready integer;
  _packed integer;
  _new_status public.order_status;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE delivered_at IS NOT NULL OR status = 'delivered'),
    count(*) FILTER (WHERE status = 'cancelled'),
    count(*) FILTER (WHERE accepted_at IS NOT NULL OR status = 'shipped'),
    count(*) FILTER (WHERE status = 'packed')
  INTO _total, _delivered, _cancelled, _shipped_or_ready, _packed
  FROM public.order_items
  WHERE order_id = _order_id;

  IF _total = 0 THEN
    RETURN;
  ELSIF _delivered = _total THEN
    _new_status := 'delivered'::public.order_status;
  ELSIF _cancelled = _total THEN
    _new_status := 'cancelled'::public.order_status;
  ELSIF _shipped_or_ready > 0 THEN
    _new_status := 'shipped'::public.order_status;
  ELSIF _packed > 0 THEN
    _new_status := 'packed'::public.order_status;
  ELSE
    _new_status := 'pending'::public.order_status;
  END IF;

  UPDATE public.orders
  SET status = _new_status
  WHERE id = _order_id
    AND status IS DISTINCT FROM _new_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_order_status_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_order_status_from_items(NEW.order_id);
  RETURN NEW;
END;
$$;

-- One notification trigger only: seller, buyer and PVZ all get the right status updates
CREATE OR REPLACE FUNCTION public.notify_on_order_item_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _buyer_id uuid;
  _pvz_id uuid;
  _pvz_name text;
  _pvz_addr text;
  _buyer_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.accepted_at IS NOT DISTINCT FROM NEW.accepted_at
     AND OLD.delivered_at IS NOT DISTINCT FROM NEW.delivered_at THEN
    RETURN NEW;
  END IF;

  SELECT o.buyer_id, COALESCE(NEW.pickup_point_id, o.pickup_point_id), COALESCE(o.recipient_name, p.full_name)
    INTO _buyer_id, _pvz_id, _buyer_name
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.buyer_id
  WHERE o.id = NEW.order_id;

  IF _pvz_id IS NOT NULL THEN
    SELECT name, city || ', ' || address INTO _pvz_name, _pvz_addr
    FROM public.pickup_points WHERE id = _pvz_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (NEW.seller_id,
        '🛒 Yeni sifariş gəldi',
        NEW.title || ' — ' || NEW.quantity || ' ədəd. Müştəri: ' || COALESCE(_buyer_name, '—') || '. PVZ: ' || COALESCE(_pvz_name, 'təyin olunmayıb') || '.',
        'new_order', '/seller', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;

    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '✅ Sifarişiniz qəbul edildi',
        NEW.title || ' — sifariş satıcıya göndərildi. Statusu hesabınızdan izləyə bilərsiniz.',
        'order_created', '/orders', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
  END IF;

  IF NEW.status = 'packed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'packed') THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '📦 Sifarişiniz qablaşdırıldı',
        NEW.title || ' — satıcı paketi hazırladı. Növbəti addım PVZ-yə göndərişdir.',
        'packed', '/orders', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
  END IF;

  IF NEW.status = 'shipped' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'shipped') THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (_buyer_id,
        '🚚 Sifarişiniz PVZ-yə göndərildi',
        NEW.title || ' — satıcı paketi göndərdi. PVZ: ' || COALESCE(_pvz_name,'təyin olunmayıb') || '. Götürmə kodu: ' || COALESCE(NEW.pickup_code,'-'),
        'shipped', '/orders', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;

    IF _pvz_id IS NOT NULL THEN
      INSERT INTO public.pvz_notifications (pickup_point_id, title, body, type, order_id, order_item_id, pickup_code)
      VALUES (_pvz_id,
        '🚚 Yeni paket gözlənilir',
        NEW.title || ' — kod: ' || COALESCE(NEW.pickup_code,'-') || '. Qəbul üçün QR/kodu yoxlayın.',
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
          '✅ Paketiniz "' || NEW.title || '" PVZ-yə qəbul edildi. ' || COALESCE(_pvz_name,'') || ' (' || COALESCE(_pvz_addr,'') || '). Götürmə kodu: ' || COALESCE(NEW.pickup_code,'-') || '.');
      END IF;
    END IF;

    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id, pickup_code)
      VALUES (NEW.seller_id,
        '📬 Paket PVZ-yə qəbul edildi',
        NEW.title || ' — ' || COALESCE(_pvz_name,'PVZ') || ' paketi qəbul etdi.',
        'pvz_accepted', '/seller', NEW.order_id, NEW.id, NEW.pickup_code);
    END IF;
  END IF;

  IF NEW.delivered_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.delivered_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '🎉 Sifarişiniz təhvil verildi',
        NEW.title || ' — uğurla təhvil aldınız. Qaytarma üçün 3 gün müddətiniz var.',
        'delivered', '/orders', NEW.order_id, NEW.id);

      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '↩️ Qaytarma müddəti: 3 gün',
        '"' || NEW.title || '" üçün qaytarma müddəti bu gündən başlayır.',
        'return_window', '/orders', NEW.order_id, NEW.id);

      IF _pvz_id IS NOT NULL THEN
        INSERT INTO public.pvz_messages (order_id, order_item_id, buyer_id, pickup_point_id, sender_role, body)
        VALUES (NEW.order_id, NEW.id, _buyer_id, _pvz_id, 'system',
          '🎉 "' || NEW.title || '" sifarişiniz təhvil verildi.');
      END IF;
    END IF;

    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (NEW.seller_id,
        '🎉 Sifariş müştəriyə təhvil verildi',
        NEW.title || ' — uğurla təhvil verildi.',
        'delivered', '/seller', NEW.order_id, NEW.id);
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id, '❌ Sifariş ləğv edildi', NEW.title || ' — sifariş ləğv edildi.', 'cancelled', '/orders', NEW.order_id, NEW.id);
    END IF;
    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (NEW.seller_id, '❌ Sifariş ləğv edildi', NEW.title || ' — sifariş ləğv edildi.', 'cancelled', '/seller', NEW.order_id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove duplicate/old trigger names and recreate exactly one status notification trigger
DROP TRIGGER IF EXISTS trg_notify_on_order_item_status ON public.order_items;
DROP TRIGGER IF EXISTS trg_notify_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_order_item_status
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item_status();

DROP TRIGGER IF EXISTS trg_sync_order_status_from_items ON public.order_items;
CREATE TRIGGER trg_sync_order_status_from_items
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_order_status_from_items();

DROP TRIGGER IF EXISTS trg_fill_order_item_customer ON public.order_items;
CREATE TRIGGER trg_fill_order_item_customer
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.fill_order_item_customer();

-- Backfill current parent order statuses from existing items
DO $$
DECLARE
  _r record;
BEGIN
  FOR _r IN SELECT DISTINCT order_id FROM public.order_items LOOP
    PERFORM public.sync_order_status_from_items(_r.order_id);
  END LOOP;
END $$;