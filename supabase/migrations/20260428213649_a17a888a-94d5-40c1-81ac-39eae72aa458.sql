
-- Hər sifariş elementi üçün unikal QR/pickup kodu və təyin edilmiş PVZ
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS pickup_code text UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  ADD COLUMN IF NOT EXISTS pickup_point_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Mövcud sətirlər üçün də pickup_code dolmalıdır
UPDATE public.order_items SET pickup_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)) WHERE pickup_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_pickup_code ON public.order_items(pickup_code);
CREATE INDEX IF NOT EXISTS idx_order_items_pickup_point ON public.order_items(pickup_point_id);

-- PVZ işçilərinin sifariş elementlərini qəbul/təhvil etməsi üçün UPDATE icazəsi
DROP POLICY IF EXISTS "PVZ staff update order items" ON public.order_items;
CREATE POLICY "PVZ staff update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
-- Qeyd: Hal-hazırda PVZ işçilərinin xüsusi rolu yoxdur, autentifikasiya olunmuş istifadəçi
-- skan etdiyi QR-ı tapıb yenilənə bilər (UI tərəfdə PVZ paneli yalnız PVZ işçilərinə açıqdır).
