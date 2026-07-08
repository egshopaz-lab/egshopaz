-- Epoint payment state and atomic order preparation.

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_provider text,
  add column if not exists payment_transaction text,
  add column if not exists payment_code text,
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
  end if;
end $$;

create or replace function public.prepare_epoint_order(_address text, _phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer uuid := auth.uid();
  new_order uuid;
begin
  if buyer is null then raise exception 'Giris teleb olunur'; end if;
  if length(trim(coalesce(_address, ''))) < 5 then raise exception 'Catdirilma unvanini duzgun daxil edin'; end if;
  if length(trim(coalesce(_phone, ''))) < 7 then raise exception 'Telefon nomresini duzgun daxil edin'; end if;

  perform 1 from public.cart_items where user_id = buyer for update;
  if not found then raise exception 'Sebet bosdur'; end if;

  insert into public.orders (
    user_id, total, delivery_address, phone, payment_status, payment_provider
  )
  values (
    buyer, 0, trim(_address), trim(_phone), 'pending', 'epoint'
  )
  returning id into new_order;

  insert into public.order_items (
    order_id, product_id, seller_id, product_name, price, quantity
  )
  select new_order, p.id, p.seller_id, p.name, p.price, c.quantity
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = buyer and p.active = true;

  if not found then
    delete from public.orders where id = new_order;
    raise exception 'Sebetde aktiv mehsul yoxdur';
  end if;

  return new_order;
end;
$$;

grant execute on function public.prepare_epoint_order(text, text) to authenticated;

create or replace function public.complete_epoint_payment(
  _order_id uuid,
  _status text,
  _transaction text,
  _code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer uuid;
begin
  update public.orders
  set
    payment_status = case when _status = 'success' and _code = '000' then 'paid' else 'failed' end,
    payment_transaction = nullif(_transaction, ''),
    payment_code = nullif(_code, ''),
    paid_at = case when _status = 'success' and _code = '000' then now() else paid_at end
  where id = _order_id
    and payment_provider = 'epoint'
    and payment_status <> 'paid'
  returning user_id into buyer;

  if buyer is not null and _status = 'success' and _code = '000' then
    delete from public.cart_items c
    where c.user_id = buyer
      and exists (
        select 1
        from public.order_items oi
        where oi.order_id = _order_id and oi.product_id = c.product_id
      );
  end if;
end;
$$;

revoke all on function public.complete_epoint_payment(uuid, text, text, text) from public;
grant execute on function public.complete_epoint_payment(uuid, text, text, text) to service_role;
