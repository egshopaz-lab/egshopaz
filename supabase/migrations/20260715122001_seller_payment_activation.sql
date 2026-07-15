create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  shop_name text not null check (char_length(shop_name) between 2 and 100),
  shop_city text,
  phone text,
  voen text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'payment_returned', 'suspended')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'success', 'error', 'returned', 'migrated')),
  registration_fee numeric(12, 2) not null default 20.00
    check (registration_fee = 20.00),
  currency text not null default 'AZN' check (currency = 'AZN'),
  paid_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.seller_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_order_id text not null unique
    check (char_length(merchant_order_id) between 1 and 128),
  amount numeric(12, 2) not null default 20.00 check (amount = 20.00),
  currency text not null default 'AZN' check (currency = 'AZN'),
  status text not null default 'new'
    check (status in ('new', 'success', 'returned', 'error', 'server_error')),
  provider_transaction_id text,
  message text,
  paid_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seller_payment_attempts_application_created_idx
  on public.seller_payment_attempts (application_id, created_at desc);
create index seller_payment_attempts_user_created_idx
  on public.seller_payment_attempts (user_id, created_at desc);

alter table public.seller_applications enable row level security;
alter table public.seller_payment_attempts enable row level security;

revoke all on table public.seller_applications from anon, authenticated;
revoke all on table public.seller_payment_attempts from anon, authenticated;
grant select on table public.seller_applications to authenticated;
grant select on table public.seller_payment_attempts to authenticated;
grant select, insert, update, delete on table public.seller_applications to service_role;
grant select, insert, update, delete on table public.seller_payment_attempts to service_role;

create policy "Seller applications owner read"
on public.seller_applications for select to authenticated
using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Seller payment attempts owner read"
on public.seller_payment_attempts for select to authenticated
using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Existing seller accounts are preserved. New accounts can only become active
-- through a signature-verified Epoint callback below.
insert into public.seller_applications (
  user_id, shop_name, shop_city, phone, voen, status, payment_status,
  registration_fee, currency, paid_at, activated_at
)
select
  r.user_id,
  coalesce(nullif(trim(p.shop_name), ''), 'Mövcud mağaza'),
  p.shop_city,
  p.phone,
  p.voen,
  'active',
  'migrated',
  20.00,
  'AZN',
  now(),
  now()
from public.user_roles r
left join public.profiles p on p.id = r.user_id
where r.role = 'seller'::public.app_role
on conflict (user_id) do nothing;

create or replace function public.prepare_seller_payment(
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
security definer
set search_path = pg_catalog, public
as $$
declare
  _uid uuid := auth.uid();
  _application_id uuid;
  _merchant_order_id text;
  _safe_shop_name text := nullif(trim(coalesce(_shop_name, '')), '');
  _current_status text;
begin
  if _uid is null then
    raise exception 'Giriş tələb olunur';
  end if;
  if _safe_shop_name is null or char_length(_safe_shop_name) < 2 then
    raise exception 'Mağaza adı minimum 2 simvol olmalıdır';
  end if;

  select sa.id, sa.status
    into _application_id, _current_status
  from public.seller_applications sa
  where sa.user_id = _uid
  for update;

  if _current_status = 'active' then
    raise exception 'Satıcı hesabı artıq aktivdir';
  end if;

  insert into public.profiles (id, shop_name, shop_city, phone, voen)
  values (
    _uid,
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
    insert into public.seller_applications (
      user_id, shop_name, shop_city, phone, voen
    ) values (
      _uid,
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
    _application_id, _uid, _merchant_order_id, 20.00, 'AZN'
  );

  return query
  select _application_id, _merchant_order_id, 20.00::numeric, 'AZN'::text, 'pending_payment'::text;
end;
$$;

revoke all on function public.prepare_seller_payment(text, text, text, text)
  from public, anon;
grant execute on function public.prepare_seller_payment(text, text, text, text)
  to authenticated;

-- Disable the former free self-activation paths.
revoke execute on function public.become_seller(text) from public, anon, authenticated;
revoke execute on function public.register_seller(text, text, text, text) from public, anon, authenticated;

create or replace function public.is_active_seller(_user_id uuid)
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

revoke all on function public.is_active_seller(uuid) from public, anon;
grant execute on function public.is_active_seller(uuid) to authenticated;

drop policy if exists "Authenticated sellers create own products" on public.products;
drop policy if exists "Authenticated sellers update own products" on public.products;
drop policy if exists "Authenticated sellers delete own products" on public.products;

create policy "Active sellers create own products"
on public.products for insert to authenticated
with check (
  (select auth.uid()) = seller_id
  and public.is_active_seller((select auth.uid()))
);

create policy "Active sellers update own products"
on public.products for update to authenticated
using (
  ((select auth.uid()) = seller_id and public.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  ((select auth.uid()) = seller_id and public.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create policy "Active sellers delete own products"
on public.products for delete to authenticated
using (
  ((select auth.uid()) = seller_id and public.is_active_seller((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create or replace function public.process_epoint_callback(
  p_event_hash text,
  p_merchant_order_id text,
  p_amount numeric,
  p_currency text,
  p_status text,
  p_provider_transaction_id text,
  p_bank_transaction_id text,
  p_operation_code text,
  p_response_code text,
  p_rrn text,
  p_card_mask text,
  p_message text,
  p_payload jsonb
)
returns text
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  event_was_inserted boolean;
  _attempt public.seller_payment_attempts%rowtype;
  _final_attempt_status text;
begin
  insert into public.epoint_payment_webhook_events (
    event_hash, merchant_order_id, provider_transaction_id, provider_status, payload
  ) values (
    p_event_hash, p_merchant_order_id, p_provider_transaction_id, p_status, p_payload
  )
  on conflict (event_hash) do nothing;

  event_was_inserted := found;
  if not event_was_inserted then
    return 'duplicate';
  end if;

  insert into public.epoint_payment_transactions (
    merchant_order_id, amount, currency, status, provider_transaction_id,
    bank_transaction_id, operation_code, response_code, rrn, card_mask,
    message, last_callback_payload, paid_at, returned_at
  ) values (
    p_merchant_order_id, p_amount, p_currency, p_status, p_provider_transaction_id,
    p_bank_transaction_id, p_operation_code, p_response_code, p_rrn, p_card_mask,
    p_message, p_payload,
    case when p_status = 'success' then now() else null end,
    case when p_status = 'returned' then now() else null end
  )
  on conflict (merchant_order_id) do update
  set status = case
        when (case excluded.status when 'new' then 10 when 'error' then 20 when 'server_error' then 30 when 'success' then 40 when 'returned' then 50 end)
          >= (case epoint_payment_transactions.status when 'new' then 10 when 'error' then 20 when 'server_error' then 30 when 'success' then 40 when 'returned' then 50 end)
        then excluded.status else epoint_payment_transactions.status end,
      provider_transaction_id = coalesce(excluded.provider_transaction_id, epoint_payment_transactions.provider_transaction_id),
      bank_transaction_id = coalesce(excluded.bank_transaction_id, epoint_payment_transactions.bank_transaction_id),
      operation_code = coalesce(excluded.operation_code, epoint_payment_transactions.operation_code),
      response_code = coalesce(excluded.response_code, epoint_payment_transactions.response_code),
      rrn = coalesce(excluded.rrn, epoint_payment_transactions.rrn),
      card_mask = coalesce(excluded.card_mask, epoint_payment_transactions.card_mask),
      message = coalesce(excluded.message, epoint_payment_transactions.message),
      last_callback_payload = excluded.last_callback_payload,
      paid_at = case when excluded.status = 'success' then coalesce(epoint_payment_transactions.paid_at, now()) else epoint_payment_transactions.paid_at end,
      returned_at = case when excluded.status = 'returned' then coalesce(epoint_payment_transactions.returned_at, now()) else epoint_payment_transactions.returned_at end,
      updated_at = now();

  select * into _attempt
  from public.seller_payment_attempts
  where merchant_order_id = p_merchant_order_id
  for update;

  if not found then
    return 'processed';
  end if;

  if p_amount <> _attempt.amount or upper(p_currency) <> _attempt.currency then
    update public.seller_payment_attempts
    set status = case when status = 'new' then 'error' else status end,
        message = 'amount_or_currency_mismatch',
        updated_at = now()
    where id = _attempt.id;
    return 'seller_payment_mismatch';
  end if;

  update public.seller_payment_attempts
  set status = case
        when (case p_status when 'new' then 10 when 'error' then 20 when 'server_error' then 30 when 'success' then 40 when 'returned' then 50 end)
          >= (case status when 'new' then 10 when 'error' then 20 when 'server_error' then 30 when 'success' then 40 when 'returned' then 50 end)
        then p_status else status end,
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      message = coalesce(p_message, message),
      paid_at = case when p_status = 'success' then coalesce(paid_at, now()) else paid_at end,
      returned_at = case when p_status = 'returned' then coalesce(returned_at, now()) else returned_at end,
      updated_at = now()
  where id = _attempt.id
  returning status into _final_attempt_status;

  if _final_attempt_status = 'success' then
    update public.seller_applications
    set status = 'active', payment_status = 'success',
        paid_at = coalesce(paid_at, now()),
        activated_at = coalesce(activated_at, now()),
        updated_at = now()
    where id = _attempt.application_id;

    delete from public.user_roles
    where user_id = _attempt.user_id and role = 'buyer'::public.app_role;

    insert into public.user_roles (user_id, role)
    values (_attempt.user_id, 'seller'::public.app_role)
    on conflict (user_id, role) do nothing;
  elsif _final_attempt_status = 'returned' and not exists (
    select 1 from public.seller_payment_attempts spa
    where spa.application_id = _attempt.application_id
      and spa.id <> _attempt.id
      and spa.status = 'success'
  ) then
    update public.seller_applications
    set status = 'payment_returned', payment_status = 'returned', updated_at = now()
    where id = _attempt.application_id;

    delete from public.user_roles
    where user_id = _attempt.user_id and role = 'seller'::public.app_role;
  elsif _final_attempt_status in ('error', 'server_error') then
    update public.seller_applications
    set payment_status = case when status = 'active' then payment_status else 'error' end,
        updated_at = now()
    where id = _attempt.application_id;
  end if;

  return 'seller_payment_' || _final_attempt_status;
end;
$$;

revoke all on function public.process_epoint_callback(
  text, text, numeric, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.process_epoint_callback(
  text, text, numeric, text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

comment on table public.seller_applications is
  'Seller onboarding state. Only a verified Epoint callback can activate a new seller.';
comment on table public.seller_payment_attempts is
  'Server-created 20 AZN seller registration payment attempts.';
