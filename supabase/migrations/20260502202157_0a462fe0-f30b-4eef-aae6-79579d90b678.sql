CREATE OR REPLACE FUNCTION public.increment_promo_used_count(promo_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE code = promo_code AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_stock(product_id UUID, qty INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - qty)
  WHERE id = product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_used_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) TO authenticated;