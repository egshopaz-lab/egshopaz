CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

DROP TRIGGER IF EXISTS trg_order_items_fill_customer ON public.order_items;
CREATE TRIGGER trg_order_items_fill_customer
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fill_order_item_customer();

DROP TRIGGER IF EXISTS trg_order_items_notify_status ON public.order_items;
CREATE TRIGGER trg_order_items_notify_status
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_item_status();

DROP TRIGGER IF EXISTS trg_order_items_sync_order_status ON public.order_items;
CREATE TRIGGER trg_order_items_sync_order_status
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_order_status_from_items();

DROP TRIGGER IF EXISTS trg_order_items_bonus_delivery ON public.order_items;
CREATE TRIGGER trg_order_items_bonus_delivery
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.bonus_on_delivery();

DROP TRIGGER IF EXISTS trg_order_items_seller_tier ON public.order_items;
CREATE TRIGGER trg_order_items_seller_tier
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_tier();

DROP POLICY IF EXISTS "Buyer can spend own bonus on checkout" ON public.bonus_transactions;
CREATE POLICY "Buyer can spend own bonus on checkout"
ON public.bonus_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND amount < 0
  AND public.is_buyer_only(auth.uid())
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = bonus_transactions.order_id
      AND o.buyer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Buyer can cancel own pending orders" ON public.orders;
CREATE POLICY "Buyer can cancel own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = buyer_id
  AND status IN ('pending'::public.order_status, 'paid'::public.order_status)
)
WITH CHECK (
  auth.uid() = buyer_id
  AND status = 'cancelled'::public.order_status
);

UPDATE public.order_items oi
SET pickup_point_id = COALESCE(oi.pickup_point_id, o.pickup_point_id),
    customer_name = COALESCE(oi.customer_name, o.recipient_name, p.full_name),
    customer_phone = COALESCE(oi.customer_phone, o.recipient_phone, p.phone)
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.buyer_id
WHERE oi.order_id = o.id
  AND (
    (oi.pickup_point_id IS NULL AND o.pickup_point_id IS NOT NULL)
    OR oi.customer_name IS NULL
    OR oi.customer_phone IS NULL
  );