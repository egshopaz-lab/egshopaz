
-- 1) Add Silver tier ad package
INSERT INTO public.ad_packages (tier, name, price, banner_slots, sponsored_product_slots, duration_days, sort_order, color, features, is_active)
VALUES ('silver', 'Silver', 9, 1, 2, 30, 0, '#9ca3af',
  '["Ana səhifədə 1 banner", "2 önə çəkilmiş məhsul", "Mağaza reklamı (1)", "30 gün müddət", "Ucuz başlanğıc paket"]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- 2) Add shop_promo_slots column to ad_packages
ALTER TABLE public.ad_packages ADD COLUMN IF NOT EXISTS shop_promo_slots integer NOT NULL DEFAULT 0;
UPDATE public.ad_packages SET shop_promo_slots = CASE tier
  WHEN 'silver'  THEN 1
  WHEN 'premium' THEN 1
  WHEN 'gold'    THEN 3
  WHEN 'vip'     THEN 10
  ELSE 0 END;

-- 3) Shop followers table
CREATE TABLE IF NOT EXISTS public.shop_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, seller_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_followers TO authenticated;
GRANT SELECT ON public.shop_followers TO anon;
GRANT ALL ON public.shop_followers TO service_role;
ALTER TABLE public.shop_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop followers public read" ON public.shop_followers FOR SELECT USING (true);
CREATE POLICY "Shop followers owner insert" ON public.shop_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND user_id <> seller_id);
CREATE POLICY "Shop followers owner delete" ON public.shop_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS shop_followers_user_idx ON public.shop_followers(user_id);
CREATE INDEX IF NOT EXISTS shop_followers_seller_idx ON public.shop_followers(seller_id);

-- 4) Sponsored shops table (mağaza reklamı)
CREATE TABLE IF NOT EXISTS public.sponsored_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.seller_subscriptions(id) ON DELETE CASCADE,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsored_shops TO authenticated;
GRANT SELECT ON public.sponsored_shops TO anon;
GRANT ALL ON public.sponsored_shops TO service_role;
ALTER TABLE public.sponsored_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sponsored shops public read active" ON public.sponsored_shops FOR SELECT
  USING ((is_active = true AND ends_at > now()) OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sponsored shops seller manage own" ON public.sponsored_shops FOR ALL TO authenticated
  USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
