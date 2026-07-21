-- Public marketplace storefronts must only contain active, paid sellers.
-- The view exposes a deliberately limited, non-sensitive profile projection.

create or replace view public.active_seller_storefronts
with (security_invoker = false) as
select
  p.id,
  p.shop_name,
  p.full_name,
  p.shop_description,
  p.shop_city,
  p.shop_email,
  p.shop_logo_url,
  p.shop_banner_url,
  p.shop_address,
  p.shop_lat,
  p.shop_lng,
  p.seller_tier,
  p.seller_total_orders,
  p.created_at
from public.profiles p
join public.seller_applications sa on sa.user_id = p.id
where p.account_status = 'active'
  and p.shop_name is not null
  and btrim(p.shop_name) <> ''
  and sa.status = 'active'
  and sa.payment_status in ('success', 'migrated');

revoke all on public.active_seller_storefronts from public, anon, authenticated;
grant select on public.active_seller_storefronts to anon, authenticated;

comment on view public.active_seller_storefronts is
  'Safe public projection of marketplace shops whose seller registration is active and paid.';
