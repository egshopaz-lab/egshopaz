
-- Returns flow upgrade
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_point_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_code text DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  ADD COLUMN IF NOT EXISTS cost_paid_by text NOT NULL DEFAULT 'seller',
  ADD COLUMN IF NOT EXISTS buyer_explanation text,
  ADD COLUMN IF NOT EXISTS pvz_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS pvz_received_by uuid,
  ADD COLUMN IF NOT EXISTS seller_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount numeric;

-- PVZ staff can update returns at their pickup point
DROP POLICY IF EXISTS "Returns pvz update own point" ON public.returns;
CREATE POLICY "Returns pvz update own point"
ON public.returns FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = public.returns.pickup_point_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = public.returns.pickup_point_id
  )
);

DROP POLICY IF EXISTS "Returns pvz read own point" ON public.returns;
CREATE POLICY "Returns pvz read own point"
ON public.returns FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.user_id = auth.uid()
      AND ps.is_active = true
      AND ps.pickup_point_id = public.returns.pickup_point_id
  )
);

-- Storage bucket for return images
INSERT INTO storage.buckets (id, name, public)
VALUES ('return-images','return-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Return images public read" ON storage.objects;
CREATE POLICY "Return images public read" ON storage.objects FOR SELECT
USING (bucket_id = 'return-images');

DROP POLICY IF EXISTS "Return images auth upload" ON storage.objects;
CREATE POLICY "Return images auth upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'return-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Return images owner delete" ON storage.objects;
CREATE POLICY "Return images owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'return-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Notification trigger for returns lifecycle
CREATE OR REPLACE FUNCTION public.notify_on_return_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _title text;
  _pvz_name text;
BEGIN
  SELECT title INTO _title FROM public.order_items WHERE id = NEW.order_item_id;
  IF NEW.pickup_point_id IS NOT NULL THEN
    SELECT name INTO _pvz_name FROM public.pickup_points WHERE id = NEW.pickup_point_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Notify seller
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (NEW.seller_id, '↩️ Yeni qaytarma istəyi',
      COALESCE(_title,'Məhsul') || ' — səbəb: ' || NEW.reason,
      'return_request', '/seller');
    -- Notify buyer
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (NEW.buyer_id, '↩️ Qaytarma qeydə alındı',
      'Məhsulu PVZ-yə apararaq QR/kod (' || COALESCE(NEW.pickup_code,'-') || ') ilə təhvil verin.',
      'return_request', '/orders');
    -- Notify PVZ
    IF NEW.pickup_point_id IS NOT NULL THEN
      INSERT INTO public.pvz_notifications (pickup_point_id, title, body, type, order_id, order_item_id, pickup_code)
      VALUES (NEW.pickup_point_id, '↩️ Qaytarma gözlənilir',
        COALESCE(_title,'Məhsul') || ' — kod: ' || COALESCE(NEW.pickup_code,'-'),
        'return_incoming', NEW.order_id, NEW.order_item_id, NEW.pickup_code);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.pvz_received_at IS NOT NULL AND OLD.pvz_received_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.buyer_id, '✅ Qaytarma PVZ tərəfindən qəbul edildi',
        COALESCE(_title,'Məhsul') || ' — ' || COALESCE(_pvz_name,'PVZ') || ' qəbul etdi.',
        'return_pvz_received', '/orders');
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.seller_id, '📦 Qaytarma PVZ-də qəbul olundu',
        COALESCE(_title,'Məhsul') || ' — sizə geri göndəriləcək.',
        'return_pvz_received', '/seller');
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.buyer_id,
        CASE NEW.status
          WHEN 'approved' THEN '✅ Qaytarma təsdiqləndi'
          WHEN 'rejected' THEN '❌ Qaytarma rədd edildi'
          WHEN 'completed' THEN '🎉 Qaytarma tamamlandı'
          ELSE '↩️ Qaytarma yeniləndi'
        END,
        COALESCE(_title,'Məhsul'),
        'return_status', '/orders');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_return_change ON public.returns;
CREATE TRIGGER trg_notify_on_return_change
AFTER INSERT OR UPDATE ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.notify_on_return_change();
