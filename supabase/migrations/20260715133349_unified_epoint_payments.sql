-- One Epoint payment core for marketplace orders, PVZ onboarding and seller services.
-- Prices and ownership are resolved server-side; the browser never chooses an amount.

alter table public.system_settings
  add column if not exists pvz_registration_fee numeric(12,2) not null default 20.00,
  add column if not exists slot_product_fee numeric(12,2) not null default 1.00,
  add column if not exists slot_shop_fee numeric(12,2) not null default 1.00,
  add column if not exists slot_banner_fee numeric(12,2) not null default 1.00;

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type text not null check (service_type in (
    'product_order', 'pvz_registration', 'seller_package',
    'product_promotion', 'shop_promotion', 'banner_promotion',
    'slot_product', 'slot_shop', 'slot_banner'
  )),
  resource_id uuid,
  fulfilled_resource_id uuid,
  merchant_order_id text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'AZN' check (currency = upper(currency) and length(currency) = 3),
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'
  )),
  description text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_transaction_id text,
  provider_message text,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_intents_user_created_idx
  on public.payment_intents (user_id, created_at desc);
create index payment_intents_status_created_idx
  on public.payment_intents (status, created_at desc);
create index payment_intents_service_resource_idx
  on public.payment_intents (service_type, resource_id);

alter table public.payment_intents enable row level security;
revoke all on table public.payment_intents from public, anon, authenticated;
grant select on table public.payment_intents to authenticated;
grant select, insert, update, delete on table public.payment_intents to service_role;

create policy "Payment intent owner read"
on public.payment_intents for select to authenticated
using (
  (select auth.uid()) = user_id
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

-- PVZ data is kept pending until the verified payment callback activates it.
create table public.pvz_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  position text not null default 'operator',
  pickup_point_id uuid references public.pickup_points(id),
  new_pvz_name text,
  new_pvz_city text,
  new_pvz_address text,
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'active', 'payment_returned', 'suspended'
  )),
  payment_status text not null default 'pending' check (payment_status in (
    'pending', 'success', 'error', 'returned'
  )),
  registration_fee numeric(12,2) not null,
  currency text not null default 'AZN',
  paid_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    pickup_point_id is not null
    or (new_pvz_name is not null and new_pvz_city is not null and new_pvz_address is not null)
  )
);

create index pvz_applications_status_created_idx
  on public.pvz_applications (status, created_at desc);

alter table public.pvz_applications enable row level security;
revoke all on table public.pvz_applications from public, anon, authenticated;
grant select on table public.pvz_applications to authenticated;
grant select, insert, update, delete on table public.pvz_applications to service_role;

create policy "PVZ application owner read"
on public.pvz_applications for select to authenticated
using (
  (select auth.uid()) = user_id
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create or replace function public.prepare_payment_intent(
  _user_id uuid,
  _service_type text,
  _resource_id uuid default null,
  _payload jsonb default '{}'::jsonb
)
returns table (
  payment_id uuid,
  merchant_order_id text,
  amount numeric,
  currency text,
  description text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _amount numeric(12,2);
  _description text;
  _canonical jsonb := '{}'::jsonb;
  _merchant text;
  _settings public.system_settings%rowtype;
  _package public.ad_packages%rowtype;
  _order public.orders%rowtype;
  _product public.products%rowtype;
  _subscription public.seller_subscriptions%rowtype;
  _application public.pvz_applications%rowtype;
  _payment_id uuid;
  _subtotal numeric(12,2);
  _discount numeric(12,2) := 0;
  _shipping numeric(12,2) := 0;
  _bonus_discount numeric(12,2) := 0;
  _profile_bonus integer;
  _promo public.promo_codes%rowtype;
begin
  if _user_id is null then raise exception 'authentication_required'; end if;
  select * into _settings from public.system_settings limit 1;
  if not found then raise exception 'system_settings_missing'; end if;

  case _service_type
    when 'product_order' then
      select * into _order from public.orders
      where id = _resource_id and buyer_id = _user_id for update;
      if not found then raise exception 'order_not_found'; end if;
      if _order.payment_status = 'paid' then raise exception 'order_already_paid'; end if;
      select coalesce(sum(p.price * oi.quantity), 0)
      into _subtotal
      from public.order_items oi
      join public.products p on p.id = oi.product_id and p.is_active = true
      where oi.order_id = _order.id and oi.quantity > 0;
      if _subtotal <= 0 then raise exception 'empty_order'; end if;
      if exists (
        select 1 from public.order_items oi join public.products p on p.id = oi.product_id
        where oi.order_id = _order.id and (not p.is_active or p.stock < oi.quantity)
      ) then raise exception 'insufficient_stock'; end if;

      if _order.promo_code is not null then
        select * into _promo from public.promo_codes
        where code = _order.promo_code and is_active
          and (expires_at is null or expires_at > now())
          and (usage_limit is null or used_count < usage_limit)
          and min_order <= _subtotal;
        if found then
          _discount := least(
            _subtotal,
            coalesce(_promo.discount_amount, round(_subtotal * coalesce(_promo.discount_percent, 0) / 100, 2))
          );
        end if;
      end if;
      select bonus_balance into _profile_bonus from public.profiles where id = _user_id;
      if _order.bonus_used > coalesce(_profile_bonus, 0) then raise exception 'insufficient_bonus'; end if;
      _bonus_discount := round(_order.bonus_used * _settings.bonus_to_azn, 2);
      _shipping := case
        when _order.pickup_point_id is null and _subtotal < 50 then 5
        when _order.pickup_point_id is not null and _subtotal < 30 then 2
        else 0
      end;
      _amount := greatest(0.01, _subtotal - _discount - _bonus_discount + _shipping);
      update public.orders set total = _amount, discount = _discount + _bonus_discount,
        payment_status = 'pending', payment_method = 'epoint'
      where id = _order.id;
      _description := 'EG Shop sifarişi #' || left(_order.id::text, 8);
      _canonical := jsonb_build_object(
        'order_id', _order.id, 'subtotal', _subtotal, 'shipping', _shipping,
        'promo_discount', _discount, 'bonus_discount', _bonus_discount
      );

    when 'pvz_registration' then
      if coalesce(trim(_payload->>'full_name'), '') = ''
        or coalesce(trim(_payload->>'phone'), '') = '' then
        raise exception 'pvz_fields_required';
      end if;
      if nullif(_payload->>'pickup_point_id', '') is null and (
        coalesce(trim(_payload->>'new_pvz_name'), '') = ''
        or coalesce(trim(_payload->>'new_pvz_city'), '') = ''
        or coalesce(trim(_payload->>'new_pvz_address'), '') = ''
      ) then raise exception 'pvz_location_required'; end if;

      insert into public.pvz_applications (
        user_id, full_name, phone, position, pickup_point_id,
        new_pvz_name, new_pvz_city, new_pvz_address,
        status, payment_status, registration_fee, currency
      ) values (
        _user_id, left(trim(_payload->>'full_name'), 150), left(trim(_payload->>'phone'), 30),
        left(coalesce(nullif(trim(_payload->>'position'), ''), 'operator'), 50),
        nullif(_payload->>'pickup_point_id', '')::uuid,
        nullif(left(trim(_payload->>'new_pvz_name'), 150), ''),
        nullif(left(trim(_payload->>'new_pvz_city'), 100), ''),
        nullif(left(trim(_payload->>'new_pvz_address'), 300), ''),
        'pending_payment', 'pending', _settings.pvz_registration_fee, 'AZN'
      )
      on conflict (user_id) do update set
        full_name = excluded.full_name, phone = excluded.phone, position = excluded.position,
        pickup_point_id = excluded.pickup_point_id, new_pvz_name = excluded.new_pvz_name,
        new_pvz_city = excluded.new_pvz_city, new_pvz_address = excluded.new_pvz_address,
        status = case when pvz_applications.status = 'active' then 'active' else 'pending_payment' end,
        payment_status = case when pvz_applications.status = 'active' then pvz_applications.payment_status else 'pending' end,
        updated_at = now()
      returning * into _application;
      if _application.status = 'active' then raise exception 'pvz_already_active'; end if;
      _resource_id := _application.id;
      _amount := _settings.pvz_registration_fee;
      _description := 'EG Shop PVZ qeydiyyat haqqı';
      _canonical := jsonb_build_object('application_id', _application.id);

    when 'seller_package' then
      if not public.has_role(_user_id, 'seller'::public.app_role) then raise exception 'seller_required'; end if;
      select * into _package from public.ad_packages
      where id = _resource_id and is_active = true;
      if not found then raise exception 'package_not_found'; end if;
      _amount := _package.price;
      _description := _package.name || ' paketi (' || _package.duration_days || ' gün)';
      _canonical := jsonb_build_object('package_id', _package.id, 'duration_days', _package.duration_days);

    when 'product_promotion' then
      if not public.has_role(_user_id, 'seller'::public.app_role) then raise exception 'seller_required'; end if;
      select * into _product from public.products
      where id = _resource_id and seller_id = _user_id and is_active = true;
      if not found then raise exception 'product_not_found'; end if;
      _amount := _settings.single_product_promo_price;
      _description := 'Məhsul reklamı: ' || left(_product.title, 150);
      _canonical := jsonb_build_object('product_id', _product.id, 'duration_days', _settings.single_product_promo_days);

    when 'shop_promotion' then
      if not public.has_role(_user_id, 'seller'::public.app_role) then raise exception 'seller_required'; end if;
      _amount := _settings.single_shop_promo_price;
      _description := 'Mağaza reklamı';
      _canonical := jsonb_build_object('duration_days', _settings.single_shop_promo_days);

    when 'banner_promotion' then
      if not public.has_role(_user_id, 'seller'::public.app_role) then raise exception 'seller_required'; end if;
      if coalesce(trim(_payload->>'title'), '') = '' then raise exception 'banner_title_required'; end if;
      _amount := _settings.single_banner_price;
      _description := 'Banner reklamı: ' || left(trim(_payload->>'title'), 150);
      _canonical := jsonb_build_object(
        'title', left(trim(_payload->>'title'), 200),
        'image_url', nullif(left(trim(_payload->>'image_url'), 1000), ''),
        'video_url', nullif(left(trim(_payload->>'video_url'), 1000), ''),
        'link_url', nullif(left(trim(_payload->>'link_url'), 1000), ''),
        'duration_days', _settings.single_banner_days
      );

    when 'slot_product' then
      select * into _product from public.products
      where id = _resource_id and seller_id = _user_id and is_active = true;
      if not found then raise exception 'product_not_found'; end if;
      select * into _subscription from public.seller_subscriptions
      where seller_id = _user_id and is_active and ends_at > now()
      order by ends_at desc limit 1;
      if not found then raise exception 'active_package_required'; end if;
      _amount := _settings.slot_product_fee;
      _description := 'Paket slotu: ' || left(_product.title, 150);
      _canonical := jsonb_build_object('product_id', _product.id, 'subscription_id', _subscription.id);

    when 'slot_shop' then
      select * into _subscription from public.seller_subscriptions
      where seller_id = _user_id and is_active and ends_at > now()
      order by ends_at desc limit 1;
      if not found then raise exception 'active_package_required'; end if;
      _amount := _settings.slot_shop_fee;
      _description := 'Paket slotu: mağaza reklamı';
      _canonical := jsonb_build_object('subscription_id', _subscription.id);

    when 'slot_banner' then
      select * into _subscription from public.seller_subscriptions
      where seller_id = _user_id and is_active and ends_at > now()
      order by ends_at desc limit 1;
      if not found then raise exception 'active_package_required'; end if;
      if coalesce(trim(_payload->>'title'), '') = '' then raise exception 'banner_title_required'; end if;
      _amount := _settings.slot_banner_fee;
      _description := 'Paket slotu: banner';
      _canonical := jsonb_build_object(
        'subscription_id', _subscription.id,
        'title', left(trim(_payload->>'title'), 200),
        'image_url', nullif(left(trim(_payload->>'image_url'), 1000), ''),
        'video_url', nullif(left(trim(_payload->>'video_url'), 1000), ''),
        'link_url', nullif(left(trim(_payload->>'link_url'), 1000), '')
      );
    else
      raise exception 'unsupported_service_type';
  end case;

  if _amount is null or _amount <= 0 then raise exception 'invalid_service_price'; end if;
  _merchant := 'pay_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payment_intents (
    user_id, service_type, resource_id, merchant_order_id,
    amount, currency, status, description, payload
  ) values (
    _user_id, _service_type, _resource_id, _merchant,
    _amount, 'AZN', 'pending', _description, _canonical
  ) returning id into _payment_id;

  return query select _payment_id, _merchant, _amount, 'AZN'::text, _description;
end;
$$;

revoke all on function public.prepare_payment_intent(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_payment_intent(uuid, text, uuid, jsonb)
  to service_role;

create or replace function public.apply_payment_intent_callback(
  _merchant_order_id text,
  _amount numeric,
  _currency text,
  _status text,
  _provider_transaction_id text,
  _message text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _intent public.payment_intents%rowtype;
  _final_status text;
  _ends_at timestamptz;
  _pvz_id uuid;
  _fulfilled_id uuid;
  _item record;
  _order public.orders%rowtype;
begin
  select * into _intent from public.payment_intents
  where merchant_order_id = _merchant_order_id for update;
  if not found then return 'not_found'; end if;

  if _amount <> _intent.amount or upper(_currency) <> _intent.currency then
    update public.payment_intents
    set status = case when status = 'paid' then status else 'failed' end,
        provider_message = 'amount_or_currency_mismatch', failed_at = now(), updated_at = now()
    where id = _intent.id;
    return 'payment_mismatch';
  end if;

  _final_status := case
    when _status = 'success' then 'paid'
    when _status = 'returned' then 'refunded'
    when _status in ('error', 'server_error') then 'failed'
    else 'processing'
  end;

  if _intent.status = 'refunded' then return 'already_refunded'; end if;
  if _intent.status = 'paid' and _final_status = 'paid' then return 'already_paid'; end if;

  update public.payment_intents set
    status = _final_status,
    provider_transaction_id = coalesce(_provider_transaction_id, provider_transaction_id),
    provider_message = coalesce(_message, provider_message),
    paid_at = case when _final_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
    failed_at = case when _final_status = 'failed' then coalesce(failed_at, now()) else failed_at end,
    refunded_at = case when _final_status = 'refunded' then coalesce(refunded_at, now()) else refunded_at end,
    updated_at = now()
  where id = _intent.id;

  if _final_status = 'paid' then
    case _intent.service_type
      when 'product_order' then
        select * into _order from public.orders
        where id = _intent.resource_id and buyer_id = _intent.user_id for update;
        if not found then raise exception 'order_not_found'; end if;
        for _item in
          select oi.product_id, oi.quantity
          from public.order_items oi where oi.order_id = _order.id
          order by oi.product_id for update of oi
        loop
          update public.products set stock = stock - _item.quantity, updated_at = now()
          where id = _item.product_id and stock >= _item.quantity and is_active;
          if not found then raise exception 'insufficient_stock_after_payment'; end if;
        end loop;
        if _order.bonus_used > 0 then
          update public.profiles set bonus_balance = bonus_balance - _order.bonus_used, updated_at = now()
          where id = _intent.user_id and bonus_balance >= _order.bonus_used;
          if not found then raise exception 'insufficient_bonus_after_payment'; end if;
          insert into public.bonus_transactions (user_id, amount, reason, order_id)
          values (_intent.user_id, -_order.bonus_used, 'Sifariş ödənişi', _order.id);
        end if;
        if _order.promo_code is not null then
          update public.promo_codes set used_count = used_count + 1
          where code = _order.promo_code and is_active
            and (usage_limit is null or used_count < usage_limit);
        end if;
        update public.orders set payment_status = 'paid', payment_method = 'epoint',
          paid_at = coalesce(paid_at, now()), status = 'paid'::public.order_status
        where id = _intent.resource_id and buyer_id = _intent.user_id and payment_status <> 'paid';
        delete from public.cart_items where user_id = _intent.user_id;
        _fulfilled_id := _intent.resource_id;

      when 'pvz_registration' then
        select coalesce(pa.pickup_point_id, null) into _pvz_id
        from public.pvz_applications pa where pa.id = _intent.resource_id for update;
        if _pvz_id is null then
          insert into public.pickup_points (name, city, address, phone, is_active)
          select 'PVZ PUNKT — ' || new_pvz_name, new_pvz_city, new_pvz_address, phone, true
          from public.pvz_applications where id = _intent.resource_id
          returning id into _pvz_id;
        end if;
        update public.pvz_staff staff set
          full_name = app.full_name, phone = app.phone, pickup_point_id = _pvz_id,
          position = app.position, is_active = true
        from public.pvz_applications app
        where app.id = _intent.resource_id and staff.user_id = app.user_id;
        if not found then
          insert into public.pvz_staff (user_id, full_name, phone, pickup_point_id, position, is_active)
          select user_id, full_name, phone, _pvz_id, position, true
          from public.pvz_applications where id = _intent.resource_id;
        end if;
        update public.pvz_applications set status = 'active', payment_status = 'success',
          pickup_point_id = _pvz_id, paid_at = coalesce(paid_at, now()),
          activated_at = coalesce(activated_at, now()), updated_at = now()
        where id = _intent.resource_id;
        delete from public.user_roles where user_id = _intent.user_id and role = 'buyer'::public.app_role;
        insert into public.user_roles (user_id, role) values (_intent.user_id, 'pvz'::public.app_role)
        on conflict (user_id, role) do nothing;
        _fulfilled_id := _intent.resource_id;

      when 'seller_package' then
        _ends_at := now() + make_interval(days => (_intent.payload->>'duration_days')::int);
        insert into public.seller_subscriptions (
          seller_id, package_id, starts_at, ends_at, payment_status, payment_method, amount, is_active
        ) values (
          _intent.user_id, (_intent.payload->>'package_id')::uuid, now(), _ends_at,
          'completed', 'epoint', _intent.amount, true
        ) returning id into _fulfilled_id;

      when 'product_promotion' then
        _ends_at := now() + make_interval(days => (_intent.payload->>'duration_days')::int);
        insert into public.sponsored_products (seller_id, product_id, position, ends_at, is_active)
        values (_intent.user_id, (_intent.payload->>'product_id')::uuid, 'catalog_top', _ends_at, true)
        returning id into _fulfilled_id;

      when 'shop_promotion' then
        _ends_at := now() + make_interval(days => (_intent.payload->>'duration_days')::int);
        insert into public.sponsored_shops (seller_id, ends_at, is_active)
        values (_intent.user_id, _ends_at, true) returning id into _fulfilled_id;

      when 'banner_promotion' then
        _ends_at := now() + make_interval(days => (_intent.payload->>'duration_days')::int);
        insert into public.banners (
          seller_id, title, image_url, video_url, link_url, position, is_active, starts_at, ends_at
        ) values (
          _intent.user_id, _intent.payload->>'title', _intent.payload->>'image_url',
          _intent.payload->>'video_url', _intent.payload->>'link_url', 'home_top', true, now(), _ends_at
        ) returning id into _fulfilled_id;

      when 'slot_product' then
        select ends_at into _ends_at from public.seller_subscriptions
        where id = (_intent.payload->>'subscription_id')::uuid and seller_id = _intent.user_id;
        insert into public.sponsored_products (seller_id, subscription_id, product_id, position, ends_at, is_active)
        values (_intent.user_id, (_intent.payload->>'subscription_id')::uuid,
          (_intent.payload->>'product_id')::uuid, 'catalog_top', _ends_at, true)
        returning id into _fulfilled_id;

      when 'slot_shop' then
        select ends_at into _ends_at from public.seller_subscriptions
        where id = (_intent.payload->>'subscription_id')::uuid and seller_id = _intent.user_id;
        insert into public.sponsored_shops (seller_id, subscription_id, ends_at, is_active)
        values (_intent.user_id, (_intent.payload->>'subscription_id')::uuid, _ends_at, true)
        returning id into _fulfilled_id;

      when 'slot_banner' then
        select ends_at into _ends_at from public.seller_subscriptions
        where id = (_intent.payload->>'subscription_id')::uuid and seller_id = _intent.user_id;
        insert into public.banners (
          seller_id, subscription_id, title, image_url, video_url, link_url,
          position, is_active, starts_at, ends_at
        ) values (
          _intent.user_id, (_intent.payload->>'subscription_id')::uuid,
          _intent.payload->>'title', _intent.payload->>'image_url', _intent.payload->>'video_url',
          _intent.payload->>'link_url', 'home_top', true, now(), _ends_at
        ) returning id into _fulfilled_id;
    end case;

    update public.payment_intents set fulfilled_resource_id = _fulfilled_id, updated_at = now()
    where id = _intent.id;

    if _intent.service_type not in ('product_order', 'pvz_registration') then
      insert into public.payment_transactions (
        seller_id, subscription_id, amount, status, method, description
      ) values (
        _intent.user_id,
        case when _intent.service_type in ('slot_product','slot_shop','slot_banner')
          then (_intent.payload->>'subscription_id')::uuid else null end,
        _intent.amount, 'completed', 'epoint', _intent.description
      );
    end if;
  elsif _final_status = 'refunded' then
    case _intent.service_type
      when 'product_order' then
        update public.orders set payment_status = 'refunded', payment_note = 'Epoint qaytarılması'
        where id = _intent.resource_id;
      when 'pvz_registration' then
        update public.pvz_applications set status = 'payment_returned', payment_status = 'returned', updated_at = now()
        where id = _intent.resource_id;
        update public.pvz_staff set is_active = false where user_id = _intent.user_id;
        delete from public.user_roles where user_id = _intent.user_id and role = 'pvz'::public.app_role;
      when 'seller_package' then
        update public.seller_subscriptions set is_active = false, payment_status = 'refunded', updated_at = now()
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'product_promotion' then
        update public.sponsored_products set is_active = false
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'slot_product' then
        update public.sponsored_products set is_active = false
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'shop_promotion' then
        update public.sponsored_shops set is_active = false
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'slot_shop' then
        update public.sponsored_shops set is_active = false
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'banner_promotion' then
        update public.banners set is_active = false, updated_at = now()
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
      when 'slot_banner' then
        update public.banners set is_active = false, updated_at = now()
        where id = _intent.fulfilled_resource_id and seller_id = _intent.user_id;
    end case;
  elsif _final_status = 'failed' and _intent.service_type = 'pvz_registration' then
    update public.pvz_applications set payment_status = 'error', updated_at = now()
    where id = _intent.resource_id and status <> 'active';
  end if;

  return 'payment_' || _final_status;
end;
$$;

revoke all on function public.apply_payment_intent_callback(text, numeric, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_payment_intent_callback(text, numeric, text, text, text, text)
  to service_role;

-- Paid services must never be created or activated directly by a browser session.
drop policy if exists "Subs seller create own" on public.seller_subscriptions;
drop policy if exists "Sponsored seller manage own" on public.sponsored_products;
drop policy if exists "Sponsored shops seller manage own" on public.sponsored_shops;
drop policy if exists "Banners seller insert own" on public.banners;
drop policy if exists "Banners seller update own" on public.banners;
drop policy if exists "Tx seller create own" on public.payment_transactions;

revoke insert, update, delete on public.seller_subscriptions from authenticated;
revoke insert, update, delete on public.sponsored_products from authenticated;
revoke insert, update, delete on public.sponsored_shops from authenticated;
revoke insert, update on public.banners from authenticated;
revoke insert, update, delete on public.payment_transactions from authenticated;

-- The legacy mock payment RPC and direct PVZ activation are no longer public APIs.
revoke execute on function public.process_card_payment(uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.register_pvz_staff(text, text, uuid, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.increment_promo_used_count(text)
  from public, anon, authenticated;

comment on table public.payment_intents is
  'Server-priced payment state shared by all Epoint-funded services.';
