-- Allow PVZ staff and sellers to read order_items they're involved with
DROP POLICY IF EXISTS "Items visible to buyer/seller/admin" ON public.order_items;
CREATE POLICY "Items visible to participants"
ON public.order_items FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()))
  OR seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pvz'::public.app_role)
);

-- Allow PVZ staff and sellers to read orders they're involved with
DROP POLICY IF EXISTS "Buyer sees own orders" ON public.orders;
CREATE POLICY "Order participants read"
ON public.orders FOR SELECT
USING (
  auth.uid() = buyer_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'pvz'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid())
);

-- Update notify trigger to also notify sellers on accept/deliver
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
    -- Notify seller
    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (NEW.seller_id,
        '📬 Paketiniz PVZ-yə qəbul edildi',
        NEW.title || ' — ' || COALESCE(_pvz_name,'PVZ') || ' qəbul etdi.',
        'pvz_accepted', '/seller', NEW.order_id, NEW.id);
    END IF;
  END IF;

  IF NEW.delivered_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.delivered_at IS NULL) THEN
    IF _buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (_buyer_id,
        '🎉 Sifarişiniz təhvil verildi',
        NEW.title || ' — uğurla təhvil aldınız. ⚠️ Diqqət: yalnız 3 gün ərzində qaytarma edə bilərsiniz!',
        'delivered', '/orders', NEW.order_id, NEW.id);

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
    -- Notify seller
    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, order_id, order_item_id)
      VALUES (NEW.seller_id,
        '🎉 Sifariş müştəriyə təhvil verildi',
        NEW.title || ' — uğurla təhvil verildi.',
        'delivered', '/seller', NEW.order_id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS trg_notify_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_order_item_status
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item_status();