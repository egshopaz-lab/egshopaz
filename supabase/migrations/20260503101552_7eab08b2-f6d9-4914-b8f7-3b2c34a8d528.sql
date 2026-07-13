ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.notify_on_return_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _title text;
  _pvz_name text;
BEGIN
  SELECT title INTO _title FROM public.order_items WHERE id = NEW.order_item_id;
  IF NEW.pickup_point_id IS NOT NULL THEN
    SELECT name INTO _pvz_name FROM public.pickup_points WHERE id = NEW.pickup_point_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (NEW.seller_id, '↩️ Yeni qaytarma istəyi (təsdiq lazımdır)',
      COALESCE(_title,'Məhsul') || ' — səbəb: ' || NEW.reason || '. Panelinizdən qəbul/rədd edin.',
      'return_request', '/seller');
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (NEW.buyer_id, '⏳ Qaytarma istəyiniz qeydə alındı',
      'Satıcı baxır. Təsdiqdən sonra QR kod sizə göndəriləcək.',
      'return_request', '/orders');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.seller_approved_at IS NOT NULL AND OLD.seller_approved_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link, pickup_code)
      VALUES (NEW.buyer_id, '✅ Qaytarma təsdiqləndi — QR kodunuz hazırdır',
        COALESCE(_title,'Məhsul') || ' — PVZ-ə apararaq QR/kod (' || COALESCE(NEW.pickup_code,'-') || ') göstərin.',
        'return_approved', '/orders', NEW.pickup_code);

      IF NEW.pickup_point_id IS NOT NULL THEN
        INSERT INTO public.pvz_notifications (pickup_point_id, title, body, type, order_id, order_item_id, pickup_code)
        VALUES (NEW.pickup_point_id, '↩️ Qaytarma gözlənilir',
          COALESCE(_title,'Məhsul') || ' — kod: ' || COALESCE(NEW.pickup_code,'-') || '. Müştəri gələndə skan edin.',
          'return_incoming', NEW.order_id, NEW.order_item_id, NEW.pickup_code);
      END IF;
    END IF;

    IF NEW.pvz_received_at IS NOT NULL AND OLD.pvz_received_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.buyer_id, '📦 Məhsulunuz PVZ-də qəbul olundu',
        COALESCE(_title,'Məhsul') || ' — ' || COALESCE(_pvz_name,'PVZ') || ' qəbul etdi. Satıcıya göndəriləcək.',
        'return_pvz_received', '/orders');
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.seller_id, '📦 Qaytarma PVZ-də qəbul olundu',
        COALESCE(_title,'Məhsul') || ' — kuryer ilə sizə göndəriləcək.',
        'return_pvz_received', '/seller');
    END IF;

    IF NEW.shipped_to_seller_at IS NOT NULL AND OLD.shipped_to_seller_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.seller_id, '🚚 Qaytarma sizə göndərildi',
        COALESCE(_title,'Məhsul') || ' — kuryer götürdü. Məhsul sizə çatanda paneldən "qəbul edildi" qeyd edin.',
        'return_shipped', '/seller');
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.buyer_id, '🚚 Qaytarma yoldadır',
        COALESCE(_title,'Məhsul') || ' — satıcıya göndərildi.',
        'return_shipped', '/orders');
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'rejected' THEN
        INSERT INTO public.notifications (user_id, title, body, type, link)
        VALUES (NEW.buyer_id, '❌ Qaytarma rədd edildi',
          COALESCE(_title,'Məhsul') || ' — satıcı qaytarmanı rədd etdi.' ||
          CASE WHEN COALESCE(NEW.rejection_reason,'') <> '' THEN ' Səbəb: ' || NEW.rejection_reason ELSE '' END,
          'return_status', '/orders');
      ELSIF NEW.status = 'completed' THEN
        INSERT INTO public.notifications (user_id, title, body, type, link)
        VALUES (NEW.buyer_id, '🎉 Qaytarma tamamlandı',
          COALESCE(_title,'Məhsul') || ' — satıcı məhsulu qəbul etdi. Pul/bonus hesabınıza qaytarılır.',
          'return_status', '/orders');
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;