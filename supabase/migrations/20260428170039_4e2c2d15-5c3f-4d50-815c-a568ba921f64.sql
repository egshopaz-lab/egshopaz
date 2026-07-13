-- Allow sellers to create/manage their own banners tied to a subscription
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;

CREATE INDEX IF NOT EXISTS idx_banners_seller ON public.banners(seller_id);
CREATE INDEX IF NOT EXISTS idx_banners_position_active ON public.banners(position, is_active);

-- Sellers can read their own banners (even inactive)
DROP POLICY IF EXISTS "Banners seller read own" ON public.banners;
CREATE POLICY "Banners seller read own"
  ON public.banners FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- Sellers can insert banners for themselves (must be a seller; admin policy still allows admins)
DROP POLICY IF EXISTS "Banners seller insert own" ON public.banners;
CREATE POLICY "Banners seller insert own"
  ON public.banners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND has_role(auth.uid(), 'seller'::app_role));

-- Sellers can update their own banners
DROP POLICY IF EXISTS "Banners seller update own" ON public.banners;
CREATE POLICY "Banners seller update own"
  ON public.banners FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own banners
DROP POLICY IF EXISTS "Banners seller delete own" ON public.banners;
CREATE POLICY "Banners seller delete own"
  ON public.banners FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);
