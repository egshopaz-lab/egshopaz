
CREATE OR REPLACE VIEW public.seller_shops_public
WITH (security_invoker = false) AS
SELECT id, shop_name, shop_city, shop_address, shop_lat, shop_lng,
       shop_logo_url, shop_description, seller_tier, seller_total_orders
FROM public.profiles
WHERE shop_name IS NOT NULL;

GRANT SELECT ON public.seller_shops_public TO anon, authenticated;
