CREATE OR REPLACE FUNCTION public.is_buyer_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'buyer'::public.app_role
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
    )
$$;

REVOKE EXECUTE ON FUNCTION public.is_buyer_only(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_buyer_only(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_buyer_only(uuid) TO authenticated;

DROP POLICY IF EXISTS "Buyer only creates orders" ON public.orders;
CREATE POLICY "Buyer only creates orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = buyer_id) AND public.is_buyer_only(auth.uid()));

DROP POLICY IF EXISTS "Items inserted by buyer only" ON public.order_items;
CREATE POLICY "Items inserted by buyer only"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_buyer_only(auth.uid()) AND public.order_belongs_to_user(order_id, auth.uid()));

DROP POLICY IF EXISTS "Favorites buyer owner all" ON public.favorites;
CREATE POLICY "Favorites buyer owner all"
ON public.favorites
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()))
WITH CHECK ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()));

NOTIFY pgrst, 'reload schema';