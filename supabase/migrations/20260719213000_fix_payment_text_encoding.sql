-- Repair mojibake in payment descriptions produced for Epoint and payment history.
CREATE OR REPLACE FUNCTION public.prepare_payment_intent(_user_id uuid, _service_type text, _resource_id uuid DEFAULT NULL::uuid, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(payment_id uuid, merchant_order_id text, amount numeric, currency text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$;

