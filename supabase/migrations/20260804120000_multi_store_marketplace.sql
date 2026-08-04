-- Multi-store marketplace foundation.
-- Existing seller profile/storefront data is preserved as the seller's primary shop.

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  slug text,
  description text,
  city text,
  address text,
  email text,
  logo_url text,
  banner_url text,
  lat numeric,
  lng numeric,
  is_active boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (city is null or btrim(city) <> ''),
  check (email is null or btrim(email) = '' or position('@' in email) > 1)
);

create index if not exists shops_seller_idx on public.shops(seller_id, created_at);
create index if not exists shops_city_idx on public.shops(city) where is_active;
create unique index if not exists shops_one_primary_per_seller_idx
  on public.shops(seller_id) where is_primary;
create unique index if not exists shops_slug_unique_idx
  on public.shops(lower(slug)) where slug is not null and btrim(slug) <> '';

alter table public.shops enable row level security;
revoke all on public.shops from public, anon, authenticated;
grant select on public.shops to anon, authenticated;
grant insert, update, delete on public.shops to authenticated;
grant all on public.shops to service_role;

drop policy if exists "Public reads active shops" on public.shops;
create policy "Public reads active shops" on public.shops
for select to anon, authenticated
using (
  (is_active and exists (
    select 1 from public.seller_storefronts_public storefront
    where storefront.id = shops.seller_id
  ))
  or seller_id = auth.uid()
  or coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)
);

drop policy if exists "Sellers create own shops" on public.shops;
create policy "Sellers create own shops" on public.shops
for insert to authenticated
with check (
  seller_id = auth.uid()
  and coalesce(public.has_role(auth.uid(), 'seller'::public.app_role), false)
);

drop policy if exists "Sellers update own shops" on public.shops;
create policy "Sellers update own shops" on public.shops
for update to authenticated
using (seller_id = auth.uid() or coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false))
with check (seller_id = auth.uid() or coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false));

drop policy if exists "Sellers delete own shops" on public.shops;
create policy "Sellers delete own shops" on public.shops
for delete to authenticated
using (seller_id = auth.uid() or coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false));

insert into public.shops (
  id, seller_id, name, description, city, address, email, logo_url, banner_url,
  lat, lng, is_active, is_primary, created_at, updated_at
)
select
  storefront.id,
  storefront.id,
  storefront.shop_name,
  storefront.shop_description,
  storefront.shop_city,
  storefront.shop_address,
  storefront.shop_email,
  storefront.shop_logo_url,
  storefront.shop_banner_url,
  storefront.shop_lat,
  storefront.shop_lng,
  true,
  true,
  storefront.created_at,
  now()
from public.seller_storefronts_public storefront
on conflict (id) do update set
  name = excluded.name,
  description = coalesce(public.shops.description, excluded.description),
  city = coalesce(public.shops.city, excluded.city),
  address = coalesce(public.shops.address, excluded.address),
  email = coalesce(public.shops.email, excluded.email),
  logo_url = coalesce(public.shops.logo_url, excluded.logo_url),
  banner_url = coalesce(public.shops.banner_url, excluded.banner_url),
  lat = coalesce(public.shops.lat, excluded.lat),
  lng = coalesce(public.shops.lng, excluded.lng),
  is_primary = true,
  updated_at = now();

-- Keep pending/administratively-authorized sellers usable too. They remain private
-- because the public directory view still requires an active public storefront.
insert into public.shops (
  id, seller_id, name, description, city, address, email, logo_url, banner_url,
  lat, lng, is_active, is_primary, created_at, updated_at
)
select
  profile.id, profile.id, profile.shop_name, profile.shop_description, profile.shop_city,
  profile.shop_address, profile.shop_email, profile.shop_logo_url, profile.shop_banner_url,
  profile.shop_lat, profile.shop_lng, true, true, profile.created_at, now()
from public.profiles profile
where profile.shop_name is not null
  and btrim(profile.shop_name) <> ''
  and exists(select 1 from public.user_roles role where role.user_id = profile.id and role.role = 'seller'::public.app_role)
on conflict (id) do nothing;

create or replace function public.touch_shop_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists shops_touch_updated_at on public.shops;
create trigger shops_touch_updated_at
before update on public.shops
for each row execute function public.touch_shop_updated_at();

create or replace function public.create_my_shop(
  _name text,
  _city text,
  _address text default null,
  _description text default null,
  _email text default null
)
returns public.shops
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result public.shops;
  make_primary boolean;
begin
  if auth.uid() is null or not coalesce(public.has_role(auth.uid(), 'seller'::public.app_role), false) then
    raise exception 'Yalnız aktiv satıcı mağaza yarada bilər';
  end if;
  if char_length(btrim(coalesce(_name, ''))) < 2 then
    raise exception 'Mağaza adı minimum 2 simvol olmalıdır';
  end if;
  if char_length(btrim(coalesce(_city, ''))) < 2 then
    raise exception 'Mağazanın şəhəri mütləq seçilməlidir';
  end if;
  if (select count(*) from public.shops where seller_id = auth.uid()) >= 10 then
    raise exception 'Bir satıcı maksimum 10 mağaza yarada bilər';
  end if;

  make_primary := not exists(select 1 from public.shops where seller_id = auth.uid());
  insert into public.shops(seller_id, name, city, address, description, email, is_primary)
  values (auth.uid(), btrim(_name), btrim(_city), nullif(btrim(_address), ''),
          nullif(btrim(_description), ''), nullif(btrim(_email), ''), make_primary)
  returning * into result;
  return result;
end;
$$;

create or replace function public.set_my_primary_shop(_shop_id uuid)
returns public.shops
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare result public.shops;
begin
  if not exists(select 1 from public.shops where id = _shop_id and seller_id = auth.uid()) then
    raise exception 'Mağaza tapılmadı və ya icazəniz yoxdur';
  end if;
  update public.shops set is_primary = false where seller_id = auth.uid() and id <> _shop_id;
  update public.shops set is_primary = true where id = _shop_id returning * into result;
  update public.profiles set
    shop_name = result.name,
    shop_description = result.description,
    shop_city = result.city,
    shop_address = result.address,
    shop_email = result.email,
    shop_logo_url = result.logo_url,
    shop_banner_url = result.banner_url,
    shop_lat = result.lat,
    shop_lng = result.lng
  where id = auth.uid();
  return result;
end;
$$;

create or replace function public.delete_my_shop(_shop_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare was_primary boolean; replacement uuid;
begin
  select is_primary into was_primary from public.shops
  where id = _shop_id and seller_id = auth.uid();
  if not found then raise exception 'Mağaza tapılmadı və ya icazəniz yoxdur'; end if;
  if (select count(*) from public.shops where seller_id = auth.uid()) <= 1 then
    raise exception 'Son mağazanı silmək olmaz';
  end if;
  if exists(select 1 from public.products where shop_id = _shop_id) then
    raise exception 'Məhsulu olan mağazanı silmək olmaz. Məhsulları başqa mağazaya köçürün';
  end if;
  delete from public.shops where id = _shop_id;
  if was_primary then
    select id into replacement from public.shops where seller_id = auth.uid()
    order by created_at limit 1;
    perform public.set_my_primary_shop(replacement);
  end if;
  return true;
end;
$$;

revoke all on function public.create_my_shop(text,text,text,text,text) from public, anon;
revoke all on function public.set_my_primary_shop(uuid) from public, anon;
revoke all on function public.delete_my_shop(uuid) from public, anon;
grant execute on function public.create_my_shop(text,text,text,text,text) to authenticated;
grant execute on function public.set_my_primary_shop(uuid) to authenticated;
grant execute on function public.delete_my_shop(uuid) to authenticated;

alter table public.products add column if not exists shop_id uuid references public.shops(id) on delete restrict;
create index if not exists products_shop_idx on public.products(shop_id, created_at desc);
update public.products product set shop_id = shop.id
from public.shops shop
where product.shop_id is null and shop.seller_id = product.seller_id and shop.is_primary;

create or replace function public.assign_and_validate_product_shop()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.shop_id is null then
    select id into new.shop_id from public.shops
    where seller_id = new.seller_id order by is_primary desc, created_at limit 1;
  end if;
  if new.shop_id is not null and not exists(
    select 1 from public.shops where id = new.shop_id and seller_id = new.seller_id
  ) then
    raise exception 'Məhsul yalnız satıcının öz mağazasına bağlana bilər';
  end if;
  return new;
end;
$$;

drop trigger if exists products_assign_shop on public.products;
create trigger products_assign_shop
before insert or update of seller_id, shop_id on public.products
for each row execute function public.assign_and_validate_product_shop();

alter table public.order_items add column if not exists shop_id uuid references public.shops(id) on delete set null;
create index if not exists order_items_shop_idx on public.order_items(shop_id, id desc);
update public.order_items item set shop_id = product.shop_id
from public.products product where item.shop_id is null and item.product_id = product.id;

alter table public.shop_followers add column if not exists shop_id uuid references public.shops(id) on delete cascade;
update public.shop_followers follower set shop_id = shop.id
from public.shops shop where follower.shop_id is null and shop.seller_id = follower.seller_id and shop.is_primary;
alter table public.shop_followers drop constraint if exists shop_followers_user_id_seller_id_key;
create unique index if not exists shop_followers_user_shop_unique_idx
  on public.shop_followers(user_id, shop_id) where shop_id is not null;
create index if not exists shop_followers_shop_idx on public.shop_followers(shop_id);

drop policy if exists "Shop followers owner insert" on public.shop_followers;
create policy "Shop followers owner insert" on public.shop_followers
for insert to authenticated
with check (
  auth.uid() = user_id
  and user_id <> seller_id
  and (shop_id is null or exists(
    select 1 from public.shops shop where shop.id = shop_id and shop.seller_id = seller_id
  ))
);

alter table public.shop_messages add column if not exists shop_id uuid references public.shops(id) on delete set null;
update public.shop_messages message set shop_id = shop.id
from public.shops shop where message.shop_id is null and shop.seller_id = message.seller_id and shop.is_primary;
create index if not exists shop_messages_shop_idx on public.shop_messages(shop_id, created_at desc);

alter table public.reservation_resources add column if not exists shop_id uuid references public.shops(id) on delete restrict;
update public.reservation_resources resource set shop_id = shop.id
from public.shops shop where resource.shop_id is null and shop.seller_id = resource.seller_id and shop.is_primary;
create index if not exists reservation_resources_shop_idx on public.reservation_resources(shop_id, created_at desc);

alter table public.reservations add column if not exists shop_id uuid references public.shops(id) on delete restrict;
update public.reservations reservation set shop_id = resource.shop_id
from public.reservation_resources resource
where reservation.shop_id is null and reservation.resource_id = resource.id;
create index if not exists reservations_shop_idx on public.reservations(shop_id, created_at desc);

alter table public.sponsored_shops add column if not exists shop_id uuid references public.shops(id) on delete cascade;
update public.sponsored_shops sponsored set shop_id = shop.id
from public.shops shop where sponsored.shop_id is null and shop.seller_id = sponsored.seller_id and shop.is_primary;
create index if not exists sponsored_shops_shop_idx on public.sponsored_shops(shop_id, ends_at desc);

-- The legacy view exposes seller_id as its first column. PostgreSQL does not
-- allow CREATE OR REPLACE VIEW to reorder/rename existing columns, so rebuild
-- it explicitly for the shop-first public contract.
drop view if exists public.active_seller_storefronts;

create view public.active_seller_storefronts
with (security_invoker = true)
as
select
  shop.id,
  shop.seller_id,
  shop.name as shop_name,
  storefront.full_name,
  shop.description as shop_description,
  shop.city as shop_city,
  coalesce(shop.email, storefront.shop_email) as shop_email,
  shop.logo_url as shop_logo_url,
  shop.banner_url as shop_banner_url,
  shop.address as shop_address,
  shop.lat as shop_lat,
  shop.lng as shop_lng,
  storefront.seller_tier,
  storefront.seller_total_orders,
  shop.is_primary,
  shop.created_at
from public.shops shop
join public.seller_storefronts_public storefront on storefront.id = shop.seller_id
where shop.is_active;

revoke all on public.active_seller_storefronts from public, anon, authenticated;
grant select on public.active_seller_storefronts to anon, authenticated;

comment on table public.shops is 'A seller can own multiple marketplace shops; products and reservations belong to a specific shop.';
