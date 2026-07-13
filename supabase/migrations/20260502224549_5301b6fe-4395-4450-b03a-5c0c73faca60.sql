-- Remove duplicate triggers on order_items and orders to prevent duplicate notifications
DROP TRIGGER IF EXISTS bonus_on_delivery_after_item_update ON public.order_items;
DROP TRIGGER IF EXISTS seller_tier_after_item_delivery ON public.order_items;
DROP TRIGGER IF EXISTS notify_order_item_status_after_change ON public.order_items;
DROP TRIGGER IF EXISTS sync_order_status_after_item_change ON public.order_items;
DROP TRIGGER IF EXISTS sync_items_after_order_cancel ON public.orders;