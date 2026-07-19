
alter table public.system_settings
  add column if not exists epoint_split_user text,
  add column if not exists epoint_split_percent numeric(5,2) not null default 0
    check (epoint_split_percent between 0 and 100),
  add column if not exists epoint_advanced_payments_enabled boolean not null default true;

create table if not exists public.epoint_saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_card_id text not null unique,
  card_mask text,
  card_name text,
  status text not null default 'pending' check (status in ('pending','active','blocked','deleted')),
  purpose text not null default 'payment' check (purpose in ('payment','payout','both')),
  is_default boolean not null default false,
  provider_payload jsonb not null default '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.epoint_api_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  saved_card_id uuid references public.epoint_saved_cards(id) on delete set null,
  payout_request_id uuid references public.payout_requests(id) on delete set null,
  merchant_order_id text unique,
  provider_invoice_id text,
  amount numeric(12,2) check (amount is null or amount > 0),
  currency text not null default 'AZN' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'new' check (status in ('new','processing','success','returned','error','server_error','cancelled')),
  provider_transaction_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists epoint_saved_cards_user_status_idx on public.epoint_saved_cards(user_id,status);
create unique index if not exists epoint_saved_cards_one_default_idx on public.epoint_saved_cards(user_id) where is_default and status <> 'deleted';
create index if not exists epoint_api_operations_user_created_idx on public.epoint_api_operations(user_id,created_at desc);
create index if not exists epoint_api_operations_kind_status_idx on public.epoint_api_operations(kind,status);
create index if not exists epoint_api_operations_payment_intent_idx on public.epoint_api_operations(payment_intent_id);

alter table public.epoint_saved_cards enable row level security;
alter table public.epoint_api_operations enable row level security;

create policy "Users read own Epoint cards" on public.epoint_saved_cards for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role));
create policy "Users hide own Epoint cards" on public.epoint_saved_cards for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'deleted');
create policy "Admins manage Epoint cards" on public.epoint_saved_cards for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role))
with check (public.has_role(auth.uid(),'admin'::public.app_role));
create policy "Users read own Epoint operations" on public.epoint_api_operations for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role));
create policy "Admins manage Epoint operations" on public.epoint_api_operations for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role))
with check (public.has_role(auth.uid(),'admin'::public.app_role));

revoke insert,delete on public.epoint_saved_cards from anon,authenticated;
revoke insert,update,delete on public.epoint_api_operations from anon,authenticated;
grant select on public.epoint_saved_cards,public.epoint_api_operations to authenticated;
grant update(status) on public.epoint_saved_cards to authenticated;

create or replace function public.set_default_epoint_card(_card_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare _user uuid := auth.uid();
begin
  if _user is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.epoint_saved_cards where id=_card_id and user_id=_user and status='active') then
    raise exception 'card_not_found';
  end if;
  update public.epoint_saved_cards set is_default=false,updated_at=now() where user_id=_user and is_default;
  update public.epoint_saved_cards set is_default=true,updated_at=now() where id=_card_id and user_id=_user;
end; $$;
revoke all on function public.set_default_epoint_card(uuid) from public,anon;
grant execute on function public.set_default_epoint_card(uuid) to authenticated;

create or replace function public.process_epoint_card_callback(
  p_event_hash text,p_card_id text,p_status text,p_card_mask text,p_message text,p_payload jsonb
) returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare _card public.epoint_saved_cards%rowtype;
begin
  insert into public.epoint_payment_webhook_events(event_hash,merchant_order_id,provider_status,payload)
  values(p_event_hash,'card:'||left(p_card_id,100),p_status,coalesce(p_payload,'{}'::jsonb))
  on conflict(event_hash) do nothing;
  if not found then return 'duplicate'; end if;
  select * into _card from public.epoint_saved_cards where provider_card_id=p_card_id for update;
  if not found then return 'card_not_found'; end if;
  update public.epoint_saved_cards set
    status=case when p_status='success' then 'active' when p_status in ('error','server_error','returned') then 'blocked' else status end,
    card_mask=coalesce(p_card_mask,card_mask),provider_payload=coalesce(p_payload,'{}'::jsonb),
    is_default=case when p_status='success' and not exists(
      select 1 from public.epoint_saved_cards c where c.user_id=_card.user_id and c.is_default and c.status='active' and c.id<>_card.id
    ) then true else is_default end,updated_at=now()
  where id=_card.id;
  return 'card_'||p_status;
end; $$;

create or replace function public.process_epoint_operation_callback(
  p_event_hash text,p_merchant_order_id text,p_amount numeric,p_currency text,p_status text,
  p_provider_transaction_id text,p_message text,p_payload jsonb
) returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare _op public.epoint_api_operations%rowtype; _intent_order_id text; _result text;
begin
  insert into public.epoint_payment_webhook_events(event_hash,merchant_order_id,provider_transaction_id,provider_status,payload)
  values(p_event_hash,p_merchant_order_id,p_provider_transaction_id,p_status,coalesce(p_payload,'{}'::jsonb))
  on conflict(event_hash) do nothing;
  if not found then return 'duplicate'; end if;
  select * into _op from public.epoint_api_operations where merchant_order_id=p_merchant_order_id for update;
  if not found then return 'operation_not_found'; end if;
  if _op.amount is not null and (p_amount is null or p_amount<>_op.amount or upper(p_currency)<>_op.currency) then
    update public.epoint_api_operations set status='error',error_code='amount_or_currency_mismatch',
      error_message='Verified callback did not match the server-derived amount.',response_payload=coalesce(p_payload,'{}'::jsonb),updated_at=now(),completed_at=now()
    where id=_op.id;
    return 'operation_mismatch';
  end if;
  update public.epoint_api_operations set status=p_status,
    provider_transaction_id=coalesce(p_provider_transaction_id,provider_transaction_id),
    response_payload=coalesce(p_payload,'{}'::jsonb),error_message=p_message,
    completed_at=case when p_status in ('success','returned','error','server_error') then now() else completed_at end,updated_at=now()
  where id=_op.id;
  if _op.payment_intent_id is not null and _op.kind in ('execute_pay','card_registration_with_pay','split_request','split_execute_pay','split_card_registration_with_pay','wallet_payment')
     and p_status in ('success','returned','error','server_error') then
    select merchant_order_id into _intent_order_id from public.payment_intents where id=_op.payment_intent_id;
    if _intent_order_id is not null then
      select public.apply_payment_intent_callback(_intent_order_id,p_amount,p_currency,p_status,p_provider_transaction_id,p_message) into _result;
    end if;
  end if;
  if _op.saved_card_id is not null and p_status='success' then
    update public.epoint_saved_cards set last_used_at=now(),updated_at=now() where id=_op.saved_card_id;
  end if;
  return 'operation_'||p_status;
end; $$;

revoke all on function public.process_epoint_card_callback(text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.process_epoint_operation_callback(text,text,numeric,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_epoint_card_callback(text,text,text,text,text,jsonb) to service_role;
grant execute on function public.process_epoint_operation_callback(text,text,numeric,text,text,text,text,jsonb) to service_role;

comment on table public.epoint_saved_cards is 'Tokenized Epoint card references only; never stores PAN or CVV.';
comment on table public.epoint_api_operations is 'Auditable server-side journal for all Epoint API operations.';

