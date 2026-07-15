-- EG Trends monthly subscriptions, content lifecycle, payments, and administration.
create table if not exists public.eg_trends_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text,
  price numeric(10,2) not null default 5.00 check (price >= 0),
  duration_days integer not null default 30 check (duration_days between 1 and 3650),
  campaign_price numeric(10,2) check (campaign_price is null or campaign_price >= 0),
  campaign_starts_at timestamptz,
  campaign_ends_at timestamptz,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (campaign_ends_at is null or campaign_starts_at is null or campaign_ends_at > campaign_starts_at)
);

create unique index if not exists eg_trends_one_default_plan
  on public.eg_trends_plans (is_default) where is_default;

create table if not exists public.eg_trends_price_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.eg_trends_plans(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  old_campaign_price numeric(10,2),
  new_campaign_price numeric(10,2),
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.eg_trends_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.eg_trends_plans(id),
  status text not null default 'passive' check (status in ('active','passive','blocked')),
  status_reason text not null default 'not_subscribed' check (status_reason in ('not_subscribed','paid','free','renewed','extended','expired','stopped','blocked','restored')),
  access_type text not null default 'paid' check (access_type in ('paid','free')),
  starts_at timestamptz,
  ends_at timestamptz,
  next_payment_at timestamptz,
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id) on delete set null,
  admin_note text,
  warning_notified_at timestamptz,
  expiry_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.eg_trends_subscription_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.eg_trends_subscriptions(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.eg_trends_plans(id) on delete set null,
  event_type text not null check (event_type in ('activated','renewed','extended','stopped','blocked','restored','expired','free_granted','payment_created','payment_success','payment_failed')),
  access_type text check (access_type is null or access_type in ('paid','free')),
  amount numeric(10,2),
  starts_at timestamptz,
  ends_at timestamptz,
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.eg_trends_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.eg_trends_plans(id),
  merchant_order_id text not null unique,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'AZN' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'new' check (status in ('new','success','returned','error','server_error')),
  provider_transaction_id text,
  message text,
  paid_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eg_trends_posts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) between 3 and 3000),
  media_url text,
  link_url text,
  status text not null default 'hidden' check (status in ('visible','hidden','passive')),
  status_reason text not null default 'subscription_required',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists eg_trends_posts_feed_idx
  on public.eg_trends_posts (status, sort_order desc, published_at desc, created_at desc);
create index if not exists eg_trends_posts_seller_idx
  on public.eg_trends_posts (seller_id, created_at desc);
create index if not exists eg_trends_subscriptions_status_idx
  on public.eg_trends_subscriptions (status, ends_at);
create index if not exists eg_trends_history_seller_idx
  on public.eg_trends_subscription_history (seller_id, created_at desc);
create index if not exists eg_trends_payments_seller_idx
  on public.eg_trends_payments (seller_id, created_at desc);

insert into public.eg_trends_plans (slug, name, description, price, duration_days, is_active, is_default, sort_order)
values ('standard', 'EG Trends Aylıq', 'EG Trends panelinə və paylaşım lentinə 30 günlük giriş', 5.00, 30, true, true, 0)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  duration_days = excluded.duration_days,
  is_active = true,
  is_default = true;

create or replace function public.eg_trends_effective_price(_plan_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p.campaign_price is not null
      and (p.campaign_starts_at is null or p.campaign_starts_at <= now())
      and (p.campaign_ends_at is null or p.campaign_ends_at > now())
    then p.campaign_price
    else p.price
  end
  from public.eg_trends_plans p
  where p.id = _plan_id and p.is_active;
$$;

create or replace function public.eg_trends_has_access(_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.eg_trends_subscriptions s
    where s.seller_id = _seller_id
      and s.status = 'active'
      and s.blocked_at is null
      and s.starts_at <= now()
      and s.ends_at > now()
  );
$$;

create or replace function public.eg_trends_set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists eg_trends_plans_updated_at on public.eg_trends_plans;
create trigger eg_trends_plans_updated_at before update on public.eg_trends_plans
for each row execute function public.eg_trends_set_updated_at();
drop trigger if exists eg_trends_subscriptions_updated_at on public.eg_trends_subscriptions;
create trigger eg_trends_subscriptions_updated_at before update on public.eg_trends_subscriptions
for each row execute function public.eg_trends_set_updated_at();
drop trigger if exists eg_trends_payments_updated_at on public.eg_trends_payments;
create trigger eg_trends_payments_updated_at before update on public.eg_trends_payments
for each row execute function public.eg_trends_set_updated_at();
drop trigger if exists eg_trends_posts_updated_at on public.eg_trends_posts;
create trigger eg_trends_posts_updated_at before update on public.eg_trends_posts
for each row execute function public.eg_trends_set_updated_at();

create or replace function public.eg_trends_record_price_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.price is distinct from new.price or old.campaign_price is distinct from new.campaign_price then
    insert into public.eg_trends_price_history (
      plan_id, old_price, new_price, old_campaign_price, new_campaign_price, changed_by
    ) values (
      new.id, old.price, new.price, old.campaign_price, new.campaign_price, new.updated_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists eg_trends_plan_price_history on public.eg_trends_plans;
create trigger eg_trends_plan_price_history after update on public.eg_trends_plans
for each row execute function public.eg_trends_record_price_change();

create or replace function public.eg_trends_normalize_post()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.eg_trends_has_access(new.seller_id) then
    new.status := 'visible';
    new.status_reason := 'active_subscription';
    new.published_at := coalesce(new.published_at, now());
  elsif exists (
    select 1 from public.eg_trends_subscriptions s
    where s.seller_id = new.seller_id and (s.status = 'blocked' or s.status_reason in ('stopped','blocked'))
  ) then
    new.status := 'passive';
    new.status_reason := 'account_passive';
  else
    new.status := 'hidden';
    new.status_reason := 'subscription_required';
  end if;
  return new;
end;
$$;

drop trigger if exists eg_trends_normalize_post on public.eg_trends_posts;
create trigger eg_trends_normalize_post before insert or update of title, body, media_url, link_url
on public.eg_trends_posts for each row execute function public.eg_trends_normalize_post();

create or replace function public.eg_trends_sync_subscription_posts()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'active' and new.blocked_at is null and new.ends_at > now() then
    update public.eg_trends_posts
      set status = 'visible', status_reason = 'active_subscription', published_at = coalesce(published_at, now()), updated_at = now()
      where seller_id = new.seller_id and status <> 'visible';
  elsif new.status = 'blocked' or new.status_reason in ('stopped','blocked') then
    update public.eg_trends_posts
      set status = 'passive', status_reason = 'account_passive', updated_at = now()
      where seller_id = new.seller_id and status <> 'passive';
  else
    update public.eg_trends_posts
      set status = 'hidden', status_reason = 'subscription_expired', updated_at = now()
      where seller_id = new.seller_id and status <> 'hidden';
  end if;
  return new;
end;
$$;

drop trigger if exists eg_trends_sync_subscription_posts on public.eg_trends_subscriptions;
create trigger eg_trends_sync_subscription_posts after insert or update of status, status_reason, starts_at, ends_at, blocked_at
on public.eg_trends_subscriptions for each row execute function public.eg_trends_sync_subscription_posts();

create or replace function public.refresh_eg_trends_subscriptions()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _expired_count integer := 0;
begin
  insert into public.notifications (user_id, title, body, type, link)
  select s.seller_id, 'EG Trends abunəliyi bitməyə yaxındır',
    'Abunəliyiniz 3 gün ərzində bitəcək. Paylaşımlarınızın görünməsi üçün abunəliyi yeniləyin.',
    'eg_trends_warning', '/seller'
  from public.eg_trends_subscriptions s
  where s.status = 'active' and s.blocked_at is null
    and s.ends_at > now() and s.ends_at <= now() + interval '3 days'
    and s.warning_notified_at is null;

  update public.eg_trends_subscriptions
    set warning_notified_at = now()
    where status = 'active' and blocked_at is null
      and ends_at > now() and ends_at <= now() + interval '3 days'
      and warning_notified_at is null;

  with expired as (
    update public.eg_trends_subscriptions
      set status = 'passive', status_reason = 'expired', expiry_notified_at = now()
      where status = 'active' and ends_at <= now()
      returning id, seller_id, plan_id, access_type, starts_at, ends_at
  ), history as (
    insert into public.eg_trends_subscription_history (
      subscription_id, seller_id, plan_id, event_type, access_type, starts_at, ends_at, note
    ) select id, seller_id, plan_id, 'expired', access_type, starts_at, ends_at, 'Abunə müddəti avtomatik bitdi'
      from expired
    returning seller_id
  )
  insert into public.notifications (user_id, title, body, type, link)
    select seller_id, 'EG Trends abunəliyi bitdi',
      'Paylaşımlarınız silinməyib, yalnız gizlədilib. Yenidən ödəniş etdikdə avtomatik görünəcək.',
      'eg_trends_expired', '/seller'
    from history;

  get diagnostics _expired_count = row_count;
  return _expired_count;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-eg-trends-subscriptions';

select cron.schedule(
  'refresh-eg-trends-subscriptions',
  '*/15 * * * *',
  'select public.refresh_eg_trends_subscriptions();'
);

create or replace function public.prepare_eg_trends_payment(_plan_id uuid)
returns table (payment_id uuid, merchant_order_id text, amount numeric, currency text, duration_days integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _uid uuid := auth.uid();
  _plan public.eg_trends_plans%rowtype;
  _amount numeric;
  _payment_id uuid;
  _order_id text;
begin
  if _uid is null then raise exception 'Giriş tələb olunur'; end if;
  if not public.has_role(_uid, 'seller'::public.app_role) then raise exception 'Satıcı hesabı tələb olunur'; end if;
  if exists (select 1 from public.eg_trends_subscriptions s where s.seller_id = _uid and s.status = 'blocked') then
    raise exception 'EG Trends girişi admin tərəfindən bloklanıb';
  end if;

  select * into _plan from public.eg_trends_plans where id = _plan_id and is_active;
  if not found then raise exception 'Aktiv paket tapılmadı'; end if;
  _amount := public.eg_trends_effective_price(_plan.id);
  _order_id := 'trends_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.eg_trends_payments (seller_id, plan_id, merchant_order_id, amount, currency)
  values (_uid, _plan.id, _order_id, _amount, 'AZN') returning id into _payment_id;

  insert into public.eg_trends_subscription_history (seller_id, plan_id, event_type, access_type, amount, note, actor_id)
  values (_uid, _plan.id, 'payment_created', 'paid', _amount, 'Epoint ödənişi yaradıldı', _uid);

  return query select _payment_id, _order_id, _amount, 'AZN'::text, _plan.duration_days;
end;
$$;

create or replace function public.process_eg_trends_callback(
  p_event_hash text, p_merchant_order_id text, p_amount numeric, p_currency text, p_status text,
  p_provider_transaction_id text, p_message text, p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _payment public.eg_trends_payments%rowtype;
  _plan public.eg_trends_plans%rowtype;
  _subscription public.eg_trends_subscriptions%rowtype;
  _starts timestamptz;
  _ends timestamptz;
begin
  insert into public.epoint_payment_webhook_events (event_hash, merchant_order_id, provider_transaction_id, provider_status, payload)
  values (p_event_hash, p_merchant_order_id, p_provider_transaction_id, p_status, p_payload)
  on conflict (event_hash) do nothing;
  if not found then return 'duplicate'; end if;

  insert into public.epoint_payment_transactions (
    merchant_order_id, amount, currency, status, provider_transaction_id, message, last_callback_payload, paid_at, returned_at
  ) values (
    p_merchant_order_id, p_amount, upper(p_currency), p_status, p_provider_transaction_id, p_message, p_payload,
    case when p_status = 'success' then now() end,
    case when p_status = 'returned' then now() end
  ) on conflict (merchant_order_id) do update set
    status = excluded.status,
    provider_transaction_id = coalesce(excluded.provider_transaction_id, epoint_payment_transactions.provider_transaction_id),
    message = coalesce(excluded.message, epoint_payment_transactions.message),
    last_callback_payload = excluded.last_callback_payload,
    paid_at = case when excluded.status = 'success' then coalesce(epoint_payment_transactions.paid_at, now()) else epoint_payment_transactions.paid_at end,
    returned_at = case when excluded.status = 'returned' then coalesce(epoint_payment_transactions.returned_at, now()) else epoint_payment_transactions.returned_at end,
    updated_at = now();

  select * into _payment from public.eg_trends_payments where merchant_order_id = p_merchant_order_id for update;
  if not found then return 'trends_payment_not_found'; end if;
  if p_amount <> _payment.amount or upper(p_currency) <> _payment.currency then
    update public.eg_trends_payments set status = 'error', message = 'amount_or_currency_mismatch' where id = _payment.id;
    return 'trends_payment_mismatch';
  end if;

  update public.eg_trends_payments set
    status = p_status,
    provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
    message = coalesce(p_message, message),
    paid_at = case when p_status = 'success' then coalesce(paid_at, now()) else paid_at end,
    returned_at = case when p_status = 'returned' then coalesce(returned_at, now()) else returned_at end
  where id = _payment.id;

  if p_status = 'success' then
    select * into _plan from public.eg_trends_plans where id = _payment.plan_id;
    select * into _subscription from public.eg_trends_subscriptions where seller_id = _payment.seller_id for update;
    _starts := now();
    _ends := greatest(now(), coalesce(_subscription.ends_at, now())) + make_interval(days => _plan.duration_days);

    insert into public.eg_trends_subscriptions (
      seller_id, plan_id, status, status_reason, access_type, starts_at, ends_at, next_payment_at,
      blocked_at, blocked_by, warning_notified_at, expiry_notified_at
    ) values (
      _payment.seller_id, _plan.id, 'active',
      case when _subscription.id is null then 'paid' else 'renewed' end,
      'paid', _starts, _ends, _ends, null, null, null, null
    ) on conflict (seller_id) do update set
      plan_id = excluded.plan_id, status = 'active', status_reason = 'renewed', access_type = 'paid',
      starts_at = case when eg_trends_subscriptions.ends_at is null or eg_trends_subscriptions.ends_at <= now() then now() else eg_trends_subscriptions.starts_at end,
      ends_at = _ends, next_payment_at = _ends, blocked_at = null, blocked_by = null,
      warning_notified_at = null, expiry_notified_at = null, updated_by = _payment.seller_id;

    select * into _subscription from public.eg_trends_subscriptions where seller_id = _payment.seller_id;
    insert into public.eg_trends_subscription_history (
      subscription_id, seller_id, plan_id, event_type, access_type, amount, starts_at, ends_at, note, actor_id
    ) values (
      _subscription.id, _payment.seller_id, _plan.id,
      case when _subscription.status_reason = 'paid' then 'activated' else 'renewed' end,
      'paid', _payment.amount, _subscription.starts_at, _subscription.ends_at, 'Epoint ödənişi təsdiqləndi', _payment.seller_id
    );
    insert into public.notifications (user_id, title, body, type, link)
    values (_payment.seller_id, 'EG Trends aktivləşdirildi',
      'Ödəniş təsdiqləndi. EG Trends paneli və bütün əvvəlki paylaşımlarınız yenidən aktivdir.',
      'eg_trends_activated', '/seller');
  elsif p_status in ('error','server_error','returned') then
    insert into public.eg_trends_subscription_history (seller_id, plan_id, event_type, access_type, amount, note)
    values (_payment.seller_id, _payment.plan_id, 'payment_failed', 'paid', _payment.amount, coalesce(p_message, p_status));
  end if;

  return 'trends_payment_' || p_status;
end;
$$;

create or replace function public.admin_manage_eg_trends_subscription(
  _seller_id uuid,
  _action text,
  _plan_id uuid default null,
  _days integer default null,
  _note text default null
)
returns public.eg_trends_subscriptions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _admin_id uuid := auth.uid();
  _plan public.eg_trends_plans%rowtype;
  _subscription public.eg_trends_subscriptions%rowtype;
  _event text;
  _duration integer;
  _base timestamptz;
begin
  if _admin_id is null or not public.has_role(_admin_id, 'admin'::public.app_role) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;
  if not exists (select 1 from public.user_roles where user_id = _seller_id and role = 'seller'::public.app_role) then
    raise exception 'Satıcı tapılmadı';
  end if;

  select * into _subscription from public.eg_trends_subscriptions where seller_id = _seller_id for update;
  select * into _plan from public.eg_trends_plans
    where id = coalesce(_plan_id, _subscription.plan_id, (select id from public.eg_trends_plans where is_default limit 1));
  if not found then raise exception 'EG Trends paketi tapılmadı'; end if;
  _duration := greatest(1, coalesce(_days, _plan.duration_days));

  if _action in ('activate','free','restore') then
    _base := greatest(now(), coalesce(_subscription.ends_at, now()));
    insert into public.eg_trends_subscriptions (
      seller_id, plan_id, status, status_reason, access_type, starts_at, ends_at, next_payment_at,
      blocked_at, blocked_by, admin_note, warning_notified_at, expiry_notified_at, updated_by
    ) values (
      _seller_id, _plan.id, 'active',
      case _action when 'free' then 'free' when 'restore' then 'restored' else 'paid' end,
      case when _action = 'free' then 'free' else coalesce(_subscription.access_type, 'paid') end,
      now(), now() + make_interval(days => _duration), now() + make_interval(days => _duration),
      null, null, _note, null, null, _admin_id
    ) on conflict (seller_id) do update set
      plan_id = excluded.plan_id, status = 'active', status_reason = excluded.status_reason,
      access_type = excluded.access_type,
      starts_at = case when eg_trends_subscriptions.ends_at is null or eg_trends_subscriptions.ends_at <= now() then now() else eg_trends_subscriptions.starts_at end,
      ends_at = case when _action = 'restore' and eg_trends_subscriptions.ends_at > now()
        then eg_trends_subscriptions.ends_at else _base + make_interval(days => _duration) end,
      next_payment_at = case when _action = 'restore' and eg_trends_subscriptions.ends_at > now()
        then eg_trends_subscriptions.ends_at else _base + make_interval(days => _duration) end,
      blocked_at = null, blocked_by = null, admin_note = _note,
      warning_notified_at = null, expiry_notified_at = null, updated_by = _admin_id;
    _event := case _action when 'free' then 'free_granted' when 'restore' then 'restored' else 'activated' end;
  elsif _action = 'extend' then
    if _subscription.id is null then raise exception 'Əvvəlcə abunə aktivləşdirilməlidir'; end if;
    _base := greatest(now(), coalesce(_subscription.ends_at, now()));
    update public.eg_trends_subscriptions set
      status = 'active', status_reason = 'extended', ends_at = _base + make_interval(days => _duration),
      next_payment_at = _base + make_interval(days => _duration), blocked_at = null, blocked_by = null,
      admin_note = _note, warning_notified_at = null, expiry_notified_at = null, updated_by = _admin_id
    where id = _subscription.id;
    _event := 'extended';
  elsif _action = 'stop' then
    if _subscription.id is null then raise exception 'Abunə tapılmadı'; end if;
    update public.eg_trends_subscriptions set status = 'passive', status_reason = 'stopped',
      next_payment_at = null, admin_note = _note, updated_by = _admin_id where id = _subscription.id;
    _event := 'stopped';
  elsif _action = 'block' then
    if _subscription.id is null then
      insert into public.eg_trends_subscriptions (
        seller_id, plan_id, status, status_reason, access_type, blocked_at, blocked_by, admin_note, updated_by
      ) values (_seller_id, _plan.id, 'blocked', 'blocked', 'paid', now(), _admin_id, _note, _admin_id);
    else
      update public.eg_trends_subscriptions set status = 'blocked', status_reason = 'blocked',
        blocked_at = now(), blocked_by = _admin_id, admin_note = _note, updated_by = _admin_id
      where id = _subscription.id;
    end if;
    _event := 'blocked';
  else
    raise exception 'Naməlum əməliyyat';
  end if;

  select * into _subscription from public.eg_trends_subscriptions where seller_id = _seller_id;
  insert into public.eg_trends_subscription_history (
    subscription_id, seller_id, plan_id, event_type, access_type, starts_at, ends_at, note, actor_id
  ) values (
    _subscription.id, _seller_id, _subscription.plan_id, _event, _subscription.access_type,
    _subscription.starts_at, _subscription.ends_at, _note, _admin_id
  );
  insert into public.notifications (user_id, title, body, type, link)
  values (
    _seller_id, 'EG Trends abunəliyi yeniləndi',
    case _event
      when 'blocked' then 'EG Trends girişiniz admin tərəfindən bloklandı.'
      when 'stopped' then 'EG Trends abunəliyiniz admin tərəfindən dayandırıldı.'
      when 'extended' then 'EG Trends abunəliyiniz uzadıldı.'
      when 'free_granted' then 'Sizə ödənişsiz EG Trends girişi verildi.'
      else 'EG Trends girişiniz aktivləşdirildi.'
    end,
    'eg_trends_admin', '/seller'
  );
  return _subscription;
end;
$$;

alter table public.eg_trends_plans enable row level security;
alter table public.eg_trends_price_history enable row level security;
alter table public.eg_trends_subscriptions enable row level security;
alter table public.eg_trends_subscription_history enable row level security;
alter table public.eg_trends_payments enable row level security;
alter table public.eg_trends_posts enable row level security;

create policy "Public reads active EG Trends plans" on public.eg_trends_plans
for select to anon, authenticated using (is_active or public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Admins manage EG Trends plans" on public.eg_trends_plans
for all to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Admins read EG Trends price history" on public.eg_trends_price_history
for select to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Sellers read own EG Trends subscription" on public.eg_trends_subscriptions
for select to authenticated using ((select auth.uid()) = seller_id or public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Admins manage EG Trends subscriptions" on public.eg_trends_subscriptions
for all to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Sellers read own EG Trends history" on public.eg_trends_subscription_history
for select to authenticated using ((select auth.uid()) = seller_id or public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "Sellers read own EG Trends payments" on public.eg_trends_payments
for select to authenticated using ((select auth.uid()) = seller_id or public.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Public reads visible EG Trends posts" on public.eg_trends_posts
for select to anon, authenticated using (
  (status = 'visible' and public.eg_trends_has_access(seller_id))
  or (select auth.uid()) = seller_id
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Active sellers create EG Trends posts" on public.eg_trends_posts
for insert to authenticated with check ((select auth.uid()) = seller_id and public.eg_trends_has_access((select auth.uid())));
create policy "Active sellers update EG Trends posts" on public.eg_trends_posts
for update to authenticated using (
  ((select auth.uid()) = seller_id and public.eg_trends_has_access((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
) with check (
  ((select auth.uid()) = seller_id and public.eg_trends_has_access((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Active sellers delete EG Trends posts" on public.eg_trends_posts
for delete to authenticated using (
  ((select auth.uid()) = seller_id and public.eg_trends_has_access((select auth.uid())))
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

grant select on public.eg_trends_plans to anon, authenticated;
grant select on public.eg_trends_posts to anon, authenticated;
grant insert, update, delete on public.eg_trends_posts to authenticated;
grant select, insert, update, delete on public.eg_trends_subscriptions to authenticated;
grant select on public.eg_trends_subscription_history, public.eg_trends_payments, public.eg_trends_price_history to authenticated;
grant insert, update, delete on public.eg_trends_plans to authenticated;
grant execute on function public.eg_trends_effective_price(uuid), public.eg_trends_has_access(uuid) to anon, authenticated;
revoke all on function public.prepare_eg_trends_payment(uuid) from public, anon;
grant execute on function public.prepare_eg_trends_payment(uuid) to authenticated;
revoke all on function public.admin_manage_eg_trends_subscription(uuid,text,uuid,integer,text) from public, anon;
grant execute on function public.admin_manage_eg_trends_subscription(uuid,text,uuid,integer,text) to authenticated;
revoke all on function public.process_eg_trends_callback(text,text,numeric,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.process_eg_trends_callback(text,text,numeric,text,text,text,text,jsonb) to service_role;
revoke all on function public.refresh_eg_trends_subscriptions() from public, anon, authenticated;
grant execute on function public.refresh_eg_trends_subscriptions() to service_role;

do $$ begin
  alter publication supabase_realtime add table public.eg_trends_plans;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.eg_trends_subscriptions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.eg_trends_posts;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.eg_trends_payments;
exception when duplicate_object then null; end $$;

