
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_days_min integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delivery_days_max integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_city text DEFAULT 'Bakı',
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fast_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON public.products(delivery_days_max);
CREATE INDEX IF NOT EXISTS idx_products_delivery_city ON public.products(delivery_city);
CREATE INDEX IF NOT EXISTS idx_products_free_shipping ON public.products(free_shipping);
CREATE INDEX IF NOT EXISTS idx_products_fast_delivery ON public.products(fast_delivery);
