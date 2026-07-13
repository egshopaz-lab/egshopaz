DROP POLICY IF EXISTS "Buyer can spend own bonus on checkout" ON public.bonus_transactions;

CREATE POLICY "Users can spend own bonus on checkout"
ON public.bonus_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND amount < 0
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = bonus_transactions.order_id
      AND o.buyer_id = auth.uid()
  )
);