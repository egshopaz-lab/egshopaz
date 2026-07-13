
-- ============ PROFILES ============
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Profiles owner read"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Profiles admin read"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, shop_name, shop_description, shop_city,
       shop_email, shop_logo_url, shop_banner_url, seller_tier,
       seller_total_orders, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ============ COURIERS ============
DROP POLICY IF EXISTS "Couriers authenticated read active" ON public.couriers;

CREATE POLICY "Couriers self read"
  ON public.couriers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy "Couriers admin manage" already covers admin SELECT.

CREATE OR REPLACE VIEW public.couriers_public
WITH (security_invoker = false) AS
SELECT id, full_name, city, vehicle_type, lat, lng, last_seen_at,
       is_active, rating, total_deliveries
FROM public.couriers
WHERE is_active = true;

GRANT SELECT ON public.couriers_public TO anon, authenticated;

-- ============ PICKUP POINTS ============
-- Keep table SELECT for admin via existing "PVZ admin manage" policy.
-- Remove the broad public read; expose safe columns via view instead.
DROP POLICY IF EXISTS "PVZ public read" ON public.pickup_points;

-- Allow PVZ staff to read their own pickup point row (full, incl. phone)
CREATE POLICY "PVZ staff read own point"
  ON public.pickup_points FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pvz_staff ps
    WHERE ps.pickup_point_id = pickup_points.id
      AND ps.user_id = auth.uid()
      AND ps.is_active = true
  ));

CREATE OR REPLACE VIEW public.pickup_points_public
WITH (security_invoker = false) AS
SELECT id, name, city, address, working_hours, lat, lng,
       is_active, point_number, created_at
FROM public.pickup_points
WHERE is_active = true;

GRANT SELECT ON public.pickup_points_public TO anon, authenticated;

-- ============ PVZ MESSAGES ============
DROP POLICY IF EXISTS "PVZ msg recipient mark read" ON public.pvz_messages;

CREATE POLICY "PVZ msg recipient mark read"
  ON public.pvz_messages FOR UPDATE TO authenticated
  USING (
    (
      sender_role = 'buyer'
      AND EXISTS (
        SELECT 1 FROM public.pvz_staff ps
        WHERE ps.user_id = auth.uid()
          AND ps.is_active = true
          AND ps.pickup_point_id = pvz_messages.pickup_point_id
      )
    )
    OR (
      sender_role IN ('pvz','system')
      AND auth.uid() = buyer_id
    )
  );
