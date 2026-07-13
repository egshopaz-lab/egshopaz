
-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Product images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Sellers can upload their own (folder = user id)
CREATE POLICY "Sellers upload own product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'seller'::app_role)
);

CREATE POLICY "Sellers update own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers delete own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add multiple images, sku, discount to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS weight numeric;

-- Allow sellers to update order_items status (per item shipping)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

CREATE POLICY "Sellers update own order items"
ON public.order_items FOR UPDATE
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
