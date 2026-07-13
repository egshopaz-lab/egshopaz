
-- Drop permissive insert policies; trigger uses SECURITY DEFINER and bypasses RLS as table owner
DROP POLICY IF EXISTS "Notif system insert" ON public.notifications;
DROP POLICY IF EXISTS "PVZ notif system insert" ON public.pvz_notifications;

-- Restrict PVZ notif update to admins (PVZ panel staff are admin-managed in this app)
DROP POLICY IF EXISTS "PVZ notif staff update" ON public.pvz_notifications;
CREATE POLICY "PVZ notif admin update" ON public.pvz_notifications
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure trigger function bypasses RLS by being owned by postgres (default) and SECURITY DEFINER (already set)
ALTER FUNCTION public.notify_on_order_item_status() OWNER TO postgres;
