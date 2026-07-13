
-- Re-enable public read of active pickup points so embedded joins (orders → pickup_points) work,
-- but hide the phone column at the column-privilege level.
CREATE POLICY "PVZ public read"
  ON public.pickup_points FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT (phone) ON public.pickup_points FROM anon, authenticated;
GRANT  SELECT (phone) ON public.pickup_points TO service_role;

-- Admin helper to fetch pickup-point phone numbers when needed
CREATE OR REPLACE FUNCTION public.admin_get_pickup_phones()
RETURNS TABLE(id uuid, phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, phone
  FROM public.pickup_points
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_pickup_phones() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_pickup_phones() TO authenticated;
