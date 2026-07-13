DROP POLICY IF EXISTS "Buyer only creates orders" ON public.orders;
CREATE POLICY "Buyer only creates orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'buyer'::public.app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Items inserted by buyer only" ON public.order_items;
CREATE POLICY "Items inserted by buyer only"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.buyer_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'buyer'::public.app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Favorites buyer owner all" ON public.favorites;
CREATE POLICY "Favorites buyer owner all"
ON public.favorites
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'buyer'::public.app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'buyer'::public.app_role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
  )
);

NOTIFY pgrst, 'reload schema';