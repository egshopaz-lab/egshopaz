CREATE OR REPLACE FUNCTION public.become_seller(_shop_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe_shop_name text := nullif(trim(coalesce(_shop_name, '')), '');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Giriş tələb olunur';
  END IF;

  IF _safe_shop_name IS NULL OR char_length(_safe_shop_name) < 2 THEN
    RAISE EXCEPTION 'Mağaza adı daxil edin';
  END IF;

  INSERT INTO public.profiles (id, shop_name)
  VALUES (_uid, left(_safe_shop_name, 100))
  ON CONFLICT (id) DO UPDATE
  SET shop_name = excluded.shop_name,
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'buyer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'seller'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.become_seller(text) TO authenticated;

DROP POLICY IF EXISTS "Sellers insert own products" ON public.products;
DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
DROP POLICY IF EXISTS "Sellers delete own products" ON public.products;

CREATE POLICY "Authenticated sellers create own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'::public.app_role));

CREATE POLICY "Authenticated sellers update own products"
ON public.products
FOR UPDATE
TO authenticated
USING ((auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'::public.app_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'::public.app_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated sellers delete own products"
ON public.products
FOR DELETE
TO authenticated
USING ((auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'::public.app_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can self-assign seller role" ON public.user_roles;

CREATE POLICY "Users can self-assign seller role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'seller'::public.app_role);

DROP POLICY IF EXISTS "Sellers upload own product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers delete own product images" ON storage.objects;

CREATE POLICY "Authenticated sellers upload own product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

CREATE POLICY "Authenticated sellers update own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
)
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

CREATE POLICY "Authenticated sellers delete own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

NOTIFY pgrst, 'reload schema';