-- Ad packages catalog
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL UNIQUE,
  price numeric NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  banner_slots integer NOT NULL DEFAULT 0,
  sponsored_product_slots integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  color text NOT NULL DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packages public read" ON public.ad_packages
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Packages admin manage" ON public.ad_packages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seller subscriptions
CREATE TABLE public.seller_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'mock',
  amount numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subs seller read own" ON public.seller_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Subs seller create own" ON public.seller_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id AND has_role(auth.uid(), 'seller'::app_role));
CREATE POLICY "Subs admin manage" ON public.seller_subscriptions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_seller_subscriptions BEFORE UPDATE ON public.seller_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sponsored products
CREATE TABLE public.sponsored_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.seller_subscriptions(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT 'catalog_top',
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsored public read active" ON public.sponsored_products
  FOR SELECT USING (is_active = true AND ends_at > now() OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sponsored seller manage own" ON public.sponsored_products
  FOR ALL TO authenticated USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

-- Payment transactions (mock)
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.seller_subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  method text NOT NULL DEFAULT 'mock_card',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tx seller read own" ON public.payment_transactions
  FOR SELECT TO authenticated USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tx seller create own" ON public.payment_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Tx admin manage" ON public.payment_transactions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed 3 default packages
INSERT INTO public.ad_packages (name, tier, price, duration_days, banner_slots, sponsored_product_slots, features, color, sort_order) VALUES
('Premium', 'premium', 29, 30, 1, 5, '["1 banner ana səhifədə","5 məhsul önə çəkilmiş","30 gün müddət","Əsas analitika"]'::jsonb, '#3b82f6', 1),
('Gold', 'gold', 79, 30, 3, 15, '["3 banner ana səhifədə","15 məhsul önə çəkilmiş","Kataloqda yuxarı sıra","Ana səhifədə görsənmə","Detallı analitika"]'::jsonb, '#eab308', 2),
('VIP', 'vip', 199, 30, 10, 50, '["Limitsiz banner","50 məhsul önə çəkilmiş","Kateqoriyada 1-ci sıra","VIP nişanı","Tam analitika","Prioritet dəstək"]'::jsonb, '#a855f7', 3);