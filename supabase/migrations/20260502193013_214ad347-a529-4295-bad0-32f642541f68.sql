REVOKE EXECUTE ON FUNCTION public.order_belongs_to_user(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_order(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_order_item(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_pvz_update_order_item(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.order_belongs_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_pvz_update_order_item(uuid, uuid) TO authenticated;