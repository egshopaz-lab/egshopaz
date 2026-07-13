DROP TRIGGER IF EXISTS trg_bonus_on_delivery ON public.order_items;
DROP TRIGGER IF EXISTS trg_fill_order_item_customer ON public.order_items;
DROP TRIGGER IF EXISTS trg_notify_order_item_status ON public.order_items;
DROP TRIGGER IF EXISTS trg_sync_order_status_from_items ON public.order_items;
DROP TRIGGER IF EXISTS trg_update_seller_tier ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_bonus_delivery ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_fill_customer ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_notify_status ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_seller_tier ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_sync_order_status ON public.order_items;

CREATE TRIGGER trg_fill_order_item_customer
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fill_order_item_customer();

CREATE TRIGGER trg_notify_order_item_status
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_item_status();

CREATE TRIGGER trg_sync_order_status_from_items
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_order_status_from_items();

CREATE TRIGGER trg_bonus_on_delivery
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.bonus_on_delivery();

CREATE TRIGGER trg_update_seller_tier
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_tier();