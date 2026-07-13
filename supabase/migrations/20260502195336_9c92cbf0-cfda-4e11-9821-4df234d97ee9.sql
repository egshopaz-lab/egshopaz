CREATE OR REPLACE FUNCTION public.is_buyer_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND public.has_role(_user_id, 'buyer'::public.app_role)
    AND NOT public.has_role(_user_id, 'seller'::public.app_role)
    AND NOT public.has_role(_user_id, 'pvz'::public.app_role)
    AND NOT public.has_role(_user_id, 'admin'::public.app_role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_buyer_only(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_belongs_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_pvz_update_order_item(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Buyer only creates orders" ON public.orders;
CREATE POLICY "Buyer only creates orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = buyer_id) AND public.is_buyer_only(auth.uid()));

DROP POLICY IF EXISTS "Favorites buyer owner all" ON public.favorites;
CREATE POLICY "Favorites buyer owner all"
ON public.favorites
FOR ALL
TO authenticated
USING ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()))
WITH CHECK ((auth.uid() = user_id) AND public.is_buyer_only(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product_uidx
ON public.favorites (user_id, product_id);

DROP TRIGGER IF EXISTS fill_order_item_customer_before_insert ON public.order_items;
CREATE TRIGGER fill_order_item_customer_before_insert
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fill_order_item_customer();

DROP TRIGGER IF EXISTS sync_order_status_after_item_change ON public.order_items;
CREATE TRIGGER sync_order_status_after_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_order_status_from_items();

DROP TRIGGER IF EXISTS notify_order_item_status_after_change ON public.order_items;
CREATE TRIGGER notify_order_item_status_after_change
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_item_status();

DROP TRIGGER IF EXISTS bonus_on_delivery_after_item_update ON public.order_items;
CREATE TRIGGER bonus_on_delivery_after_item_update
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.bonus_on_delivery();

DROP TRIGGER IF EXISTS seller_tier_after_item_delivery ON public.order_items;
CREATE TRIGGER seller_tier_after_item_delivery
AFTER INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_tier();

DROP TRIGGER IF EXISTS sync_items_after_order_cancel ON public.orders;
CREATE TRIGGER sync_items_after_order_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_items_from_order_status();