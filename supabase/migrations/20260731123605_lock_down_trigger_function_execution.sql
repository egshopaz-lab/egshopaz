-- Trigger functions are invoked by PostgreSQL triggers, never directly by a
-- browser client. Remove the default PUBLIC/anon RPC permission without
-- changing the privileges of the tables or triggers themselves.
revoke all on function public.accounting_operations_trigger() from public, anon, authenticated;
revoke all on function public.enforce_product_moderation() from public, anon, authenticated;
revoke all on function public.fulfill_paid_reservation() from public, anon, authenticated;
revoke all on function public.on_reservation_changed() from public, anon, authenticated;
revoke all on function public.prepare_shop_message_report() from public, anon, authenticated;
revoke all on function public.sync_advertising_catalog_to_settings() from public, anon, authenticated;
revoke all on function public.sync_advertising_settings_to_catalog() from public, anon, authenticated;
