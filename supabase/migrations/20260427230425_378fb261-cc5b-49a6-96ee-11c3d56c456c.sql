REVOKE ALL ON FUNCTION public.get_owner_admin_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_admin_lock() FROM PUBLIC, anon, authenticated;