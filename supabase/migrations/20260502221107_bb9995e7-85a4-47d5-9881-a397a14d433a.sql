DROP POLICY IF EXISTS "Authenticated users create own orders" ON public.orders;
DROP POLICY IF EXISTS "Buyer creates orders" ON public.orders;
DROP POLICY IF EXISTS "Buyer only creates orders" ON public.orders;

CREATE POLICY "Customers create their own orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = buyer_id
);

DROP POLICY IF EXISTS "Items inserted by order owner" ON public.order_items;
DROP POLICY IF EXISTS "Items inserted by buyer only" ON public.order_items;

CREATE POLICY "Customers add items to their own orders"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.buyer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can spend own bonus on checkout" ON public.bonus_transactions;
DROP POLICY IF EXISTS "Buyer can spend own bonus on checkout" ON public.bonus_transactions;

CREATE POLICY "Customers spend own bonus on checkout"
ON public.bonus_transactions
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND amount < 0
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = bonus_transactions.order_id
      AND o.buyer_id = auth.uid()
  )
);