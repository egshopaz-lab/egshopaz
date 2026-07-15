create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_active_seller(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.seller_applications sa
    join public.user_roles ur
      on ur.user_id = sa.user_id
     and ur.role = 'seller'::public.app_role
    where sa.user_id = _user_id
      and sa.status = 'active'
      and sa.payment_status in ('success', 'migrated')
  );
$$;

revoke all on function private.is_active_seller(uuid) from public, anon;
grant execute on function private.is_active_seller(uuid) to authenticated, service_role;

drop policy if exists "Active sellers create own products" on public.products;
drop policy if exists "Active sellers update own products" on public.products;
drop policy if exists "Active sellers delete own products" on public.products;

create policy "Active sellers create own products"
on public.products for insert to authenticated
with check (
  (select auth.uid()) = seller_id
  and private.is_active_seller((select auth.uid()))
);

create policy "Active sellers update own products"
on public.products for update to authenticated
using (
  ((select auth.uid()) = seller_id and private.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  ((select auth.uid()) = seller_id and private.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create policy "Active sellers delete own products"
on public.products for delete to authenticated
using (
  ((select auth.uid()) = seller_id and private.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop function public.is_active_seller(uuid);
drop function public.prepare_seller_payment(text, text, text, text);

create function public.prepare_seller_payment(
  _user_id uuid,
  _shop_name text,
  _shop_city text default null,
  _phone text default null,
  _voen text default null
)
returns table (
  application_id uuid,
  merchant_order_id text,
  amount numeric,
  currency text,
  application_status text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  _application_id uuid;
  _merchant_order_id text;
  _safe_shop_name text := nullif(trim(coalesce(_shop_name, '')), '');
  _current_status text;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'İstifadəçi tapılmadı';
  end if;
  if _safe_shop_name is null or char_length(_safe_shop_name) < 2 then
    raise exception 'Mağaza adı minimum 2 simvol olmalıdır';
  end if;

  select sa.id, sa.status
    into _application_id, _current_status
  from public.seller_applications sa
  where sa.user_id = _user_id
  for update;

  if _current_status = 'active' then
    raise exception 'Satıcı hesabı artıq aktivdir';
  end if;

  insert into public.profiles (id, shop_name, shop_city, phone, voen)
  values (
    _user_id,
    left(_safe_shop_name, 100),
    nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
    nullif(left(trim(coalesce(_phone, '')), 30), ''),
    nullif(left(trim(coalesce(_voen, '')), 32), '')
  )
  on conflict (id) do update
  set shop_name = excluded.shop_name,
      shop_city = excluded.shop_city,
      phone = coalesce(excluded.phone, profiles.phone),
      voen = excluded.voen,
      updated_at = now();

  if _application_id is null then
    insert into public.seller_applications (user_id, shop_name, shop_city, phone, voen)
    values (
      _user_id,
      left(_safe_shop_name, 100),
      nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
      nullif(left(trim(coalesce(_phone, '')), 30), ''),
      nullif(left(trim(coalesce(_voen, '')), 32), '')
    )
    returning id into _application_id;
  else
    update public.seller_applications
    set shop_name = left(_safe_shop_name, 100),
        shop_city = nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
        phone = nullif(left(trim(coalesce(_phone, '')), 30), ''),
        voen = nullif(left(trim(coalesce(_voen, '')), 32), ''),
        status = 'pending_payment',
        payment_status = 'pending',
        updated_at = now()
    where id = _application_id;
  end if;

  _merchant_order_id := 'seller_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.seller_payment_attempts (
    application_id, user_id, merchant_order_id, amount, currency
  ) values (
    _application_id, _user_id, _merchant_order_id, 20.00, 'AZN'
  );

  return query
  select _application_id, _merchant_order_id, 20.00::numeric, 'AZN'::text, 'pending_payment'::text;
end;
$$;

revoke all on function public.prepare_seller_payment(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.prepare_seller_payment(uuid, text, text, text, text)
  to service_role;
