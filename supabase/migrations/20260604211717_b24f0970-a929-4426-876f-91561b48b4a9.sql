
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS single_product_promo_price numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS single_product_promo_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS single_shop_promo_price numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS single_shop_promo_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS promo_terms_text text NOT NULL DEFAULT 'Reklam ödənildikdən sonra aktivləşir və göstərilən müddət ərzində ana səhifədə görünür. Geri qaytarılmır.';

-- Allow seller-paid one-off sponsored products/shops without an active package subscription
ALTER TABLE public.sponsored_products ALTER COLUMN subscription_id DROP NOT NULL;
ALTER TABLE public.sponsored_shops ALTER COLUMN subscription_id DROP NOT NULL;
