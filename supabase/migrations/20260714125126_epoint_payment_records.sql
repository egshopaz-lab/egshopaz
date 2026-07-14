create table public.epoint_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id text not null unique
    check (char_length(merchant_order_id) between 1 and 128),
  amount numeric(12, 2) not null
    check (amount > 0),
  currency text not null default 'AZN'
    check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'new'
    check (status in ('new', 'success', 'returned', 'error', 'server_error')),
  provider_transaction_id text,
  bank_transaction_id text,
  operation_code text,
  response_code text,
  rrn text,
  card_mask text,
  message text,
  last_callback_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index epoint_payment_transactions_provider_transaction_id_key
  on public.epoint_payment_transactions (provider_transaction_id)
  where provider_transaction_id is not null;

create table public.epoint_payment_webhook_events (
  id bigint generated always as identity primary key,
  event_hash text not null unique
    check (event_hash ~ '^[0-9a-f]{64}$'),
  merchant_order_id text not null,
  provider_transaction_id text,
  provider_status text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index epoint_payment_webhook_events_merchant_order_id_idx
  on public.epoint_payment_webhook_events (merchant_order_id);

alter table public.epoint_payment_transactions enable row level security;
alter table public.epoint_payment_webhook_events enable row level security;

revoke all on table public.epoint_payment_transactions from anon, authenticated;
revoke all on table public.epoint_payment_webhook_events from anon, authenticated;
revoke all on sequence public.epoint_payment_webhook_events_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.epoint_payment_transactions to service_role;
grant select, insert, update, delete on table public.epoint_payment_webhook_events to service_role;
grant usage, select on sequence public.epoint_payment_webhook_events_id_seq to service_role;

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
begin
  insert into public.epoint_payment_webhook_events (
    event_hash,
    merchant_order_id,
    provider_transaction_id,
    provider_status,
    payload
  ) values (
    p_event_hash,
    p_merchant_order_id,
    p_provider_transaction_id,
    p_status,
    p_payload
  )
  on conflict (event_hash) do nothing;

  event_was_inserted := found;
  if not event_was_inserted then
    return 'duplicate';
  end if;

  insert into public.epoint_payment_transactions (
    merchant_order_id,
    amount,
    currency,
    status,
    provider_transaction_id,
    bank_transaction_id,
    operation_code,
    response_code,
    rrn,
    card_mask,
    message,
    last_callback_payload,
    paid_at,
    returned_at
  ) values (
    p_merchant_order_id,
    p_amount,
    p_currency,
    p_status,
    p_provider_transaction_id,
    p_bank_transaction_id,
    p_operation_code,
    p_response_code,
    p_rrn,
    p_card_mask,
    p_message,
    p_payload,
    case when p_status = 'success' then now() else null end,
    case when p_status = 'returned' then now() else null end
  )
  on conflict (merchant_order_id) do update
  set amount = case
        when excluded.status in ('success', 'returned') then excluded.amount
        else epoint_payment_transactions.amount
      end,
      currency = case
        when excluded.status in ('success', 'returned') then excluded.currency
        else epoint_payment_transactions.currency
      end,
      status = case
        when (case excluded.status
          when 'new' then 10
          when 'error' then 20
          when 'server_error' then 30
          when 'success' then 40
          when 'returned' then 50
        end) >= (case epoint_payment_transactions.status
          when 'new' then 10
          when 'error' then 20
          when 'server_error' then 30
          when 'success' then 40
          when 'returned' then 50
        end) then excluded.status
        else epoint_payment_transactions.status
      end,
      provider_transaction_id = coalesce(excluded.provider_transaction_id, epoint_payment_transactions.provider_transaction_id),
      bank_transaction_id = coalesce(excluded.bank_transaction_id, epoint_payment_transactions.bank_transaction_id),
      operation_code = coalesce(excluded.operation_code, epoint_payment_transactions.operation_code),
      response_code = coalesce(excluded.response_code, epoint_payment_transactions.response_code),
      rrn = coalesce(excluded.rrn, epoint_payment_transactions.rrn),
      card_mask = coalesce(excluded.card_mask, epoint_payment_transactions.card_mask),
      message = coalesce(excluded.message, epoint_payment_transactions.message),
      last_callback_payload = excluded.last_callback_payload,
      paid_at = case
        when excluded.status = 'success' then coalesce(epoint_payment_transactions.paid_at, now())
        else epoint_payment_transactions.paid_at
      end,
      returned_at = case
        when excluded.status = 'returned' then coalesce(epoint_payment_transactions.returned_at, now())
        else epoint_payment_transactions.returned_at
      end,
      updated_at = now();

  return 'processed';
end;
$$;

revoke all on function public.process_epoint_callback(
  text, text, numeric, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.process_epoint_callback(
  text, text, numeric, text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

comment on table public.epoint_payment_transactions is
  'Server-only Epoint payment state. Browser roles have no access.';

comment on table public.epoint_payment_webhook_events is
  'Immutable, idempotent log of signature-verified Epoint callbacks.';
