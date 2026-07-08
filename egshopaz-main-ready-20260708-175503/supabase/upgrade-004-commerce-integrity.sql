-- Data integrity and storefront behavior fixes.

-- Repeated "add to cart" upserts now increase quantity instead of resetting it to 1.
create or replace function public.increment_cart_quantity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.quantity = 1 then
    new.quantity := old.quantity + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists cart_quantity_on_upsert on public.cart_items;
create trigger cart_quantity_on_upsert
  before update on public.cart_items
  for each row execute function public.increment_cart_quantity();

-- Never trust price, product name or seller id sent by the browser.
create or replace function public.secure_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.products%rowtype;
begin
  select * into item from public.products where id = new.product_id and active = true for update;
  if item.id is null then raise exception 'Məhsul mövcud deyil'; end if;
  if item.stock < new.quantity then raise exception 'Kifayət qədər stok yoxdur: %', item.name; end if;

  new.product_name := item.name;
  new.price := item.price;
  new.seller_id := item.seller_id;
  update public.products set stock = stock - new.quantity, updated_at = now() where id = item.id;
  return new;
end;
$$;

drop trigger if exists secure_order_item_before_insert on public.order_items;
create trigger secure_order_item_before_insert
  before insert on public.order_items
  for each row execute function public.secure_order_item();

-- Recalculate order totals from trusted order items.
create or replace function public.recalculate_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders
  set total = coalesce((select sum(price * quantity) from public.order_items where order_id = target_order), 0)
  where id = target_order;
  return coalesce(new, old);
end;
$$;

drop trigger if exists order_total_after_item_change on public.order_items;
create trigger order_total_after_item_change
  after insert or update or delete on public.order_items
  for each row execute function public.recalculate_order_total();

-- Keep grants explicit after migrations.
grant select on public.categories, public.products to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.cart_items,
  public.orders, public.order_items, public.favorites, public.seller_applications to authenticated;
