-- Trigger functions are invoked by PostgreSQL and must not be callable as RPCs.
revoke all on function public.protect_profile_control_fields() from public, anon, authenticated;
revoke all on function public.audit_admin_table_change() from public, anon, authenticated;
