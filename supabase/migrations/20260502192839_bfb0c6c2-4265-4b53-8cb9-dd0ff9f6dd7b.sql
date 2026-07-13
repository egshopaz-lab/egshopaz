-- Remove old duplicate notification trigger so notifications are not created twice
DROP TRIGGER IF EXISTS trg_notify_order_item_status ON public.order_items;

-- Prevent anonymous execution of RLS helper functions while keeping authenticated policy access
REVOKE EXECUTE ON FUNCTION public.order_belongs_to_user(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_read_order(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_read_order_item(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_pvz_update_order_item(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.order_belongs_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_pvz_update_order_item(uuid, uuid) TO authenticated;