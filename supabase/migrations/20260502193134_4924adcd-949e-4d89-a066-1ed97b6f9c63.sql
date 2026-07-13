CREATE OR REPLACE FUNCTION public.sync_order_items_from_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled'::public.order_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.order_items
    SET status = 'cancelled'
    WHERE order_id = NEW.id
      AND status IS DISTINCT FROM 'cancelled'
      AND delivered_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_items_from_order_status ON public.orders;
CREATE TRIGGER trg_sync_order_items_from_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_items_from_order_status();