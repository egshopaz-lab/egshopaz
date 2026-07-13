-- Couriers table
CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  phone text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'car',
  city text NOT NULL DEFAULT 'Bakı',
  is_active boolean NOT NULL DEFAULT true,
  rating numeric NOT NULL DEFAULT 5.0,
  total_deliveries integer NOT NULL DEFAULT 0,
  current_route text,
  earnings numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couriers admin manage" ON public.couriers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Couriers public read active" ON public.couriers FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_couriers_updated BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Warehouses table
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  capacity integer NOT NULL DEFAULT 1000,
  occupied integer NOT NULL DEFAULT 0,
  manager_name text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Warehouses admin manage" ON public.warehouses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PVZ staff table
CREATE TABLE public.pvz_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_point_id uuid REFERENCES public.pickup_points(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  position text NOT NULL DEFAULT 'operator',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pvz_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PVZ staff admin manage" ON public.pvz_staff FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  buyer_id uuid NOT NULL,
  seller_id uuid,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  decided_for text,
  compensation numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disputes admin manage" ON public.disputes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Disputes participants read" ON public.disputes FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Disputes buyer create" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Banners / ad campaigns
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  link_url text,
  position text NOT NULL DEFAULT 'home_top',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners admin manage" ON public.banners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Banners public read active" ON public.banners FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- System settings (single-row config)
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_percent numeric NOT NULL DEFAULT 10,
  delivery_base_fee numeric NOT NULL DEFAULT 3,
  storage_fee_per_day numeric NOT NULL DEFAULT 0.5,
  maintenance_mode boolean NOT NULL DEFAULT false,
  min_payout numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings admin manage" ON public.system_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Settings public read" ON public.system_settings FOR SELECT USING (true);
INSERT INTO public.system_settings (commission_percent) VALUES (10);
