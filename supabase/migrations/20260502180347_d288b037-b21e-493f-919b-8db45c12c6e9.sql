DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_pickup_point_id_fkey') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_pickup_point_id_fkey
      FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='order_items_product_id_fkey') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='order_items_pickup_point_id_fkey') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_pickup_point_id_fkey
      FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='order_items_seller_id_fkey') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cart_items_product_id_fkey') THEN
    ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_seller_id_fkey') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_category_id_fkey') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pvz_staff_pickup_point_id_fkey') THEN
    ALTER TABLE public.pvz_staff ADD CONSTRAINT pvz_staff_pickup_point_id_fkey
      FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id) ON DELETE SET NULL;
  END IF;
END $$;