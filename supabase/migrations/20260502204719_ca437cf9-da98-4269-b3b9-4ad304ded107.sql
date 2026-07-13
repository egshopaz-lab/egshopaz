
-- orders: allow any authenticated user to create their own order
DROP POLICY IF EXISTS "Buyer only creates orders" ON public.orders;
CREATE POLICY "Authenticated users create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- order_items: allow inserting items into one's own order
DROP POLICY IF EXISTS "Items inserted by buyer only" ON public.order_items;
CREATE POLICY "Items inserted by order owner"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.buyer_id = auth.uid()
    )
  );

-- cart_items: own cart only
DROP POLICY IF EXISTS "Cart buyer owner all" ON public.cart_items;
CREATE POLICY "Cart owner all"
  ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- favorites: own favorites only
DROP POLICY IF EXISTS "Favorites buyer owner all" ON public.favorites;
CREATE POLICY "Favorites owner all"
  ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
