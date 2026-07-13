-- Lock down trigger-only order flow functions so they are not callable as public RPCs
REVOKE ALL ON FUNCTION public.fill_order_item_customer() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_order_item_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_status_from_items(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sync_order_status_from_items() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bonus_on_delivery() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_seller_tier() FROM PUBLIC, anon, authenticated;