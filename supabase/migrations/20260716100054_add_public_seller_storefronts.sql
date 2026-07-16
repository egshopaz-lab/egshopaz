create schema if not exists private;

create table if not exists public.seller_storefronts (
  id uuid primary key references public.profiles(id) on delete cascade,
  shop_name text,
  shop_logo_url text,
  shop_banner_url text,
  shop_city text,
  shop_description text,
  updated_at timestamptz not null default now()
);

alter table public.seller_storefronts enable row level security;

revoke all on table public.seller_storefronts from public, anon, authenticated;
grant select on table public.seller_storefronts to anon, authenticated;
grant select, insert, update, delete on table public.seller_storefronts to service_role;

drop policy if exists "Seller storefronts public read" on public.seller_storefronts;
create policy "Seller storefronts public read"
  on public.seller_storefronts
  for select
  to anon, authenticated
  using (true);

create or replace function private.sync_seller_storefront()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.shop_name is null or btrim(new.shop_name) = '' then
    delete from public.seller_storefronts where id = new.id;
    return new;
  end if;

  insert into public.seller_storefronts (
    id,
    shop_name,
    shop_logo_url,
    shop_banner_url,
    shop_city,
    shop_description,
    updated_at
  ) values (
    new.id,
    new.shop_name,
    new.shop_logo_url,
    new.shop_banner_url,
    new.shop_city,
    new.shop_description,
    now()
  )
  on conflict (id) do update set
    shop_name = excluded.shop_name,
    shop_logo_url = excluded.shop_logo_url,
    shop_banner_url = excluded.shop_banner_url,
    shop_city = excluded.shop_city,
    shop_description = excluded.shop_description,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke execute on function private.sync_seller_storefront() from public, anon, authenticated, service_role;

drop trigger if exists sync_seller_storefront on public.profiles;
create trigger sync_seller_storefront
after insert or update of shop_name, shop_logo_url, shop_banner_url, shop_city, shop_description
on public.profiles
for each row
execute function private.sync_seller_storefront();

insert into public.seller_storefronts (
  id,
  shop_name,
  shop_logo_url,
  shop_banner_url,
  shop_city,
  shop_description,
  updated_at
)
select
  id,
  shop_name,
  shop_logo_url,
  shop_banner_url,
  shop_city,
  shop_description,
  now()
from public.profiles
where shop_name is not null and btrim(shop_name) <> ''
on conflict (id) do update set
  shop_name = excluded.shop_name,
  shop_logo_url = excluded.shop_logo_url,
  shop_banner_url = excluded.shop_banner_url,
  shop_city = excluded.shop_city,
  shop_description = excluded.shop_description,
  updated_at = excluded.updated_at;
