
-- 1. profiles: remove blanket public SELECT, restrict to authenticated
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. couriers: remove anon access; only authenticated can list active couriers
DROP POLICY IF EXISTS "Couriers public read active" ON public.couriers;
CREATE POLICY "Couriers authenticated read active"
  ON public.couriers FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() = user_id);

-- 3. pvz_messages: scope staff read/send to their own pickup point
DROP POLICY IF EXISTS "PVZ msg staff read" ON public.pvz_messages;
DROP POLICY IF EXISTS "PVZ msg staff send" ON public.pvz_messages;

CREATE POLICY "PVZ msg staff read"
  ON public.pvz_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pvz_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.is_active = true
        AND ps.pickup_point_id = pvz_messages.pickup_point_id
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "PVZ msg staff send"
  ON public.pvz_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = ANY (ARRAY['pvz'::text, 'system'::text])
    AND EXISTS (
      SELECT 1 FROM public.pvz_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.is_active = true
        AND ps.pickup_point_id = pvz_messages.pickup_point_id
    )
  );

-- 4. user_roles: remove self-assign; become_seller() RPC handles role grants
DROP POLICY IF EXISTS "Users can self-assign seller role" ON public.user_roles;

-- 5. return-images: tighten storage policy (bucket flipped to private separately)
DROP POLICY IF EXISTS "Return images public read" ON storage.objects;
CREATE POLICY "Return images participants read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'return-images'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.returns r
        WHERE (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
          AND name LIKE '%' || r.id::text || '%'
      )
    )
  );
