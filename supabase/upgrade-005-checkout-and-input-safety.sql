-- Atomic checkout and input hardening.

create or replace function public.checkout_cart(_address text, _phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer uuid := auth.uid();
  new_order uuid;
  item_count integer;
begin
  if buyer is null then raise exception 'Giriş tələb olunur'; end if;
  if length(trim(coalesce(_address, ''))) < 5 then raise exception 'Çatdırılma ünvanını düzgün daxil edin'; end if;
  if length(trim(coalesce(_phone, ''))) < 7 then raise exception 'Telefon nömrəsini düzgün daxil edin'; end if;

  select count(*) into item_count
  from public.cart_items
  where user_id = buyer
  for update;
  if item_count = 0 then raise exception 'Səbət boşdur'; end if;

  insert into public.orders (user_id, total, delivery_address, phone)
  values (buyer, 0, trim(_address), trim(_phone))
  returning id into new_order;

  insert into public.order_items (order_id, product_id, seller_id, product_name, price, quantity)
  select new_order, p.id, p.seller_id, p.name, p.price, c.quantity
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer;

  delete from public.cart_items where user_id = buyer;
  return new_order;
end;
$$;

grant execute on function public.checkout_cart(text, text) to authenticated;

-- Stop newly entered marketplace content from breaking out of HTML attributes/templates.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_safe_name') then
    alter table public.products add constraint products_safe_name
      check (length(trim(name)) between 1 and 200 and position('<' in name) = 0 and position('>' in name) = 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_safe_image_url') then
    alter table public.products add constraint products_safe_image_url
      check (image_url is null or (position('"' in image_url) = 0 and position(chr(39) in image_url) = 0 and position('<' in image_url) = 0 and position('>' in image_url) = 0)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'seller_applications_safe_store') then
    alter table public.seller_applications add constraint seller_applications_safe_store
      check (position('<' in store_name) = 0 and position('>' in store_name) = 0) not valid;
  end if;
end $$;
