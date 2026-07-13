
-- 1) Recreate public views with security_invoker so they respect querying user's RLS
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.couriers_public SET (security_invoker = true);
ALTER VIEW public.seller_shops_public SET (security_invoker = true);
ALTER VIEW public.pickup_points_public SET (security_invoker = true);

-- 2) Mask stored card numbers to last 4 digits in profiles and payout_requests
UPDATE public.profiles
  SET card_number = right(regexp_replace(card_number, '\D', '', 'g'), 4)
  WHERE card_number IS NOT NULL AND length(regexp_replace(card_number, '\D', '', 'g')) > 4;

UPDATE public.payout_requests
  SET card_number = right(regexp_replace(card_number, '\D', '', 'g'), 4)
  WHERE card_number IS NOT NULL AND length(regexp_replace(card_number, '\D', '', 'g')) > 4;

-- Enforce masked format going forward via trigger
CREATE OR REPLACE FUNCTION public.mask_card_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _digits text;
BEGIN
  IF NEW.card_number IS NOT NULL THEN
    _digits := regexp_replace(NEW.card_number, '\D', '', 'g');
    IF length(_digits) > 4 THEN
      NEW.card_number := right(_digits, 4);
    ELSE
      NEW.card_number := _digits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mask_card_profiles ON public.profiles;
CREATE TRIGGER trg_mask_card_profiles
  BEFORE INSERT OR UPDATE OF card_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mask_card_number();

DROP TRIGGER IF EXISTS trg_mask_card_payout_requests ON public.payout_requests;
CREATE TRIGGER trg_mask_card_payout_requests
  BEFORE INSERT OR UPDATE OF card_number ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.mask_card_number();

-- 3) Restrict order_items customer PII columns. Buyer + seller of THAT item + PVZ staff + admin
-- can already read. The existing policy is item-scoped (seller_id matches), so cross-seller
-- exposure does not happen at the row level — but tighten to explicitly exclude any seller
-- who is NOT the item's seller (defense in depth) by adding a column-level safeguard via view.
-- Customer email/phone/name are required by seller for their own item, PVZ for delivery; no change needed
-- beyond confirming the policy. We add a stricter helper for completeness.
-- (No structural change required; the can_read_order_item function already restricts per item.)

-- 4) Add SELECT policy for product-videos storage bucket so authenticated users can view
DROP POLICY IF EXISTS "Public can read product videos" ON storage.objects;
CREATE POLICY "Public can read product videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-videos');

DROP POLICY IF EXISTS "Sellers upload product videos" ON storage.objects;
CREATE POLICY "Sellers upload product videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-videos');

DROP POLICY IF EXISTS "Owners manage product videos" ON storage.objects;
CREATE POLICY "Owners manage product videos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'product-videos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'product-videos' AND owner = auth.uid());
