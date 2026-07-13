-- Fix order visibility without recursive RLS lookups
CREATE OR REPLACE FUNCTION public.order_belongs_to_user(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.buyer_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = _order_id
        AND o.buyer_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = _order_id
        AND oi.seller_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.pvz_staff ps
        ON ps.pickup_point_id = o.pickup_point_id
      WHERE o.id = _order_id
        AND ps.user_id = _user_id
        AND ps.is_active = true
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_order_item(_item_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = _item_id
        AND o.buyer_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.id = _item_id
        AND oi.seller_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.pvz_staff ps
        ON ps.pickup_point_id = COALESCE(oi.pickup_point_id, o.pickup_point_id)
      WHERE oi.id = _item_id
        AND ps.user_id = _user_id
        AND ps.is_active = true
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_pvz_update_order_item(_item_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.pvz_staff ps
      ON ps.pickup_point_id = COALESCE(oi.pickup_point_id, o.pickup_point_id)
    WHERE oi.id = _item_id
      AND ps.user_id = _user_id
      AND ps.is_active = true
  )
$$;

-- Replace recursive policies with security-definer checks
DROP POLICY IF EXISTS "Order participants read" ON public.orders;
CREATE POLICY "Order participants read"
ON public.orders
FOR SELECT
TO authenticated
USING (public.can_read_order(id, auth.uid()));

DROP POLICY IF EXISTS "Items visible to participants" ON public.order_items;
CREATE POLICY "Items visible to participants"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.can_read_order_item(id, auth.uid()));

DROP POLICY IF EXISTS "Items inserted by buyer only" ON public.order_items;
CREATE POLICY "Items inserted by buyer only"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_buyer_only(auth.uid())
  AND public.order_belongs_to_user(order_id, auth.uid())
);

DROP POLICY IF EXISTS "PVZ staff update own pickup items" ON public.order_items;
CREATE POLICY "PVZ staff update own pickup items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (public.can_pvz_update_order_item(id, auth.uid()))
WITH CHECK (public.can_pvz_update_order_item(id, auth.uid()));

DROP POLICY IF EXISTS "Sellers update own order items" ON public.order_items;
CREATE POLICY "Sellers update own order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'::public.app_role))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'::public.app_role))
);

-- Keep status sync valid for existing enum values
CREATE OR REPLACE FUNCTION public.sync_order_status_from_items(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total integer;
  _delivered integer;
  _cancelled integer;
  _shipped_or_ready integer;
  _packed integer;
  _new_status public.order_status;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE delivered_at IS NOT NULL OR status = 'delivered'),
    count(*) FILTER (WHERE status = 'cancelled'),
    count(*) FILTER (WHERE accepted_at IS NOT NULL OR status = 'shipped'),
    count(*) FILTER (WHERE status = 'packed')
  INTO _total, _delivered, _cancelled, _shipped_or_ready, _packed
  FROM public.order_items
  WHERE order_id = _order_id;

  IF _total = 0 THEN
    RETURN;
  ELSIF _delivered = _total THEN
    _new_status := 'delivered'::public.order_status;
  ELSIF _cancelled = _total THEN
    _new_status := 'cancelled'::public.order_status;
  ELSIF _shipped_or_ready > 0 THEN
    _new_status := 'shipped'::public.order_status;
  ELSIF _packed > 0 THEN
    _new_status := 'packed'::public.order_status;
  ELSE
    _new_status := 'pending'::public.order_status;
  END IF;

  UPDATE public.orders
  SET status = _new_status
  WHERE id = _order_id
    AND status IS DISTINCT FROM _new_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_order_status_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_order_status_from_items(OLD.order_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_order_status_from_items(NEW.order_id);
  RETURN NEW;
END;
$$;

-- Recreate missing order triggers
DROP TRIGGER IF EXISTS trg_fill_order_item_customer ON public.order_items;
CREATE TRIGGER trg_fill_order_item_customer
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fill_order_item_customer();

DROP TRIGGER IF EXISTS trg_notify_on_order_item_status ON public.order_items;
CREATE TRIGGER trg_notify_on_order_item_status
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at, pickup_point_id ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_item_status();

DROP TRIGGER IF EXISTS trg_sync_order_status_from_items ON public.order_items;
CREATE TRIGGER trg_sync_order_status_from_items
AFTER INSERT OR UPDATE OF status, accepted_at, delivered_at OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_order_status_from_items();

DROP TRIGGER IF EXISTS trg_bonus_on_delivery ON public.order_items;
CREATE TRIGGER trg_bonus_on_delivery
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
WHEN (NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL)
EXECUTE FUNCTION public.bonus_on_delivery();

DROP TRIGGER IF EXISTS trg_update_seller_tier ON public.order_items;
CREATE TRIGGER trg_update_seller_tier
AFTER UPDATE OF delivered_at ON public.order_items
FOR EACH ROW
WHEN (NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL)
EXECUTE FUNCTION public.update_seller_tier();

-- Make sure existing rows have the metadata needed by seller/PVZ/customer panels
UPDATE public.order_items oi
SET
  pickup_point_id = COALESCE(oi.pickup_point_id, o.pickup_point_id),
  customer_name = COALESCE(oi.customer_name, o.recipient_name, p.full_name),
  customer_phone = COALESCE(oi.customer_phone, o.recipient_phone, p.phone)
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.buyer_id
WHERE oi.order_id = o.id
  AND (
    oi.pickup_point_id IS NULL
    OR oi.customer_name IS NULL
    OR oi.customer_phone IS NULL
  );

-- Re-sync existing parent order statuses from their items
DO $$
DECLARE
  _order record;
BEGIN
  FOR _order IN SELECT DISTINCT order_id FROM public.order_items LOOP
    PERFORM public.sync_order_status_from_items(_order.order_id);
  END LOOP;
END;
$$;