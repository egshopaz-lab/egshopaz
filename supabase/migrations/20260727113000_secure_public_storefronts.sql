create table if not exists public.seller_storefronts_public (
  id uuid primary key,
  shop_name text not null,
  full_name text,
  shop_description text,
  shop_city text,
  shop_email text,
  shop_logo_url text,
  shop_banner_url text,
  shop_address text,
  shop_lat numeric,
  shop_lng numeric,
  seller_tier text,
  seller_total_orders integer not null default 0,
  created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

alter table public.seller_storefronts_public enable row level security;

drop policy if exists "Public reads seller storefront directory"
  on public.seller_storefronts_public;
create policy "Public reads seller storefront directory"
on public.seller_storefronts_public
for select
to anon, authenticated
using (true);

revoke all on public.seller_storefronts_public from public, anon, authenticated;
grant select on public.seller_storefronts_public to anon, authenticated;

create or replace function public.sync_public_seller_storefront()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_user_id uuid;
begin
  if tg_table_name = 'profiles' then
    target_user_id := coalesce(new.id, old.id);
  else
    target_user_id := coalesce(new.user_id, old.user_id);
  end if;

  insert into public.seller_storefronts_public (
    id, shop_name, full_name, shop_description, shop_city, shop_email,
    shop_logo_url, shop_banner_url, shop_address, shop_lat, shop_lng,
    seller_tier, seller_total_orders, created_at, synced_at
  )
  select
    p.id, p.shop_name, p.full_name, p.shop_description, p.shop_city, p.shop_email,
    p.shop_logo_url, p.shop_banner_url, p.shop_address, p.shop_lat, p.shop_lng,
    p.seller_tier, coalesce(p.seller_total_orders, 0), p.created_at, now()
  from public.profiles p
  join public.seller_applications sa on sa.user_id = p.id
  where p.id = target_user_id
    and p.account_status = 'active'
    and p.shop_name is not null
    and btrim(p.shop_name) <> ''
    and sa.status = 'active'
    and sa.payment_status in ('success', 'migrated')
  on conflict (id) do update set
    shop_name = excluded.shop_name,
    full_name = excluded.full_name,
    shop_description = excluded.shop_description,
    shop_city = excluded.shop_city,
    shop_email = excluded.shop_email,
    shop_logo_url = excluded.shop_logo_url,
    shop_banner_url = excluded.shop_banner_url,
    shop_address = excluded.shop_address,
    shop_lat = excluded.shop_lat,
    shop_lng = excluded.shop_lng,
    seller_tier = excluded.seller_tier,
    seller_total_orders = excluded.seller_total_orders,
    created_at = excluded.created_at,
    synced_at = excluded.synced_at;

  if not found then
    delete from public.seller_storefronts_public where id = target_user_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_public_seller_storefront()
  from public, anon, authenticated;

drop trigger if exists sync_public_storefront_from_profile on public.profiles;
create trigger sync_public_storefront_from_profile
after insert or update or delete on public.profiles
for each row execute function public.sync_public_seller_storefront();

drop trigger if exists sync_public_storefront_from_application on public.seller_applications;
create trigger sync_public_storefront_from_application
after insert or update or delete on public.seller_applications
for each row execute function public.sync_public_seller_storefront();

insert into public.seller_storefronts_public (
  id, shop_name, full_name, shop_description, shop_city, shop_email,
  shop_logo_url, shop_banner_url, shop_address, shop_lat, shop_lng,
  seller_tier, seller_total_orders, created_at, synced_at
)
select
  p.id, p.shop_name, p.full_name, p.shop_description, p.shop_city, p.shop_email,
  p.shop_logo_url, p.shop_banner_url, p.shop_address, p.shop_lat, p.shop_lng,
  p.seller_tier, coalesce(p.seller_total_orders, 0), p.created_at, now()
from public.profiles p
join public.seller_applications sa on sa.user_id = p.id
where p.account_status = 'active'
  and p.shop_name is not null
  and btrim(p.shop_name) <> ''
  and sa.status = 'active'
  and sa.payment_status in ('success', 'migrated')
on conflict (id) do update set
  shop_name = excluded.shop_name,
  full_name = excluded.full_name,
  shop_description = excluded.shop_description,
  shop_city = excluded.shop_city,
  shop_email = excluded.shop_email,
  shop_logo_url = excluded.shop_logo_url,
  shop_banner_url = excluded.shop_banner_url,
  shop_address = excluded.shop_address,
  shop_lat = excluded.shop_lat,
  shop_lng = excluded.shop_lng,
  seller_tier = excluded.seller_tier,
  seller_total_orders = excluded.seller_total_orders,
  created_at = excluded.created_at,
  synced_at = excluded.synced_at;

create or replace view public.active_seller_storefronts
with (security_invoker = true)
as
select
  id, shop_name, full_name, shop_description, shop_city, shop_email,
  shop_logo_url, shop_banner_url, shop_address, shop_lat, shop_lng,
  seller_tier, seller_total_orders, created_at
from public.seller_storefronts_public;

revoke all on public.active_seller_storefronts from public, anon, authenticated;
grant select on public.active_seller_storefronts to anon, authenticated;
