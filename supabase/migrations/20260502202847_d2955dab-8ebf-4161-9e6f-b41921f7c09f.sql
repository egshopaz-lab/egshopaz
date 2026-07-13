CREATE OR REPLACE FUNCTION public.is_buyer_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'buyer'::public.app_role
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_buyer_only(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_default_buyer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_default_buyer_role ON public.profiles;
CREATE TRIGGER profiles_assign_default_buyer_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_buyer_role();

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'buyer'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

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
WITH CHECK (
  public.is_buyer_only(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.buyer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Favorites buyer owner all" ON public.favorites;
CREATE POLICY "Favorites buyer owner all"
ON public.favorites
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()))
WITH CHECK ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()));

DROP POLICY IF EXISTS "Cart buyer owner all" ON public.cart_items;
CREATE POLICY "Cart buyer owner all"
ON public.cart_items
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()))
WITH CHECK ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()));