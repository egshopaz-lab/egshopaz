do $$
begin
  if to_regclass('public.epoint_payment_transactions') is null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'payment_transactions'
         and column_name = 'merchant_order_id'
     ) then
    alter table public.payment_transactions rename to epoint_payment_transactions;
    alter table public.epoint_payment_transactions
      rename constraint payment_transactions_pkey to epoint_payment_transactions_pkey;
    alter table public.epoint_payment_transactions
      rename constraint payment_transactions_merchant_order_id_key to epoint_payment_transactions_merchant_order_id_key;
    alter index public.payment_transactions_provider_transaction_id_key
      rename to epoint_payment_transactions_provider_transaction_id_key;
  end if;

  if to_regclass('public.epoint_payment_webhook_events') is null
     and to_regclass('public.payment_webhook_events') is not null then
    alter table public.payment_webhook_events rename to epoint_payment_webhook_events;
    alter table public.epoint_payment_webhook_events
      rename constraint payment_webhook_events_pkey to epoint_payment_webhook_events_pkey;
    alter table public.epoint_payment_webhook_events
      rename constraint payment_webhook_events_event_hash_key to epoint_payment_webhook_events_event_hash_key;
    alter index public.payment_webhook_events_merchant_order_id_idx
      rename to epoint_payment_webhook_events_merchant_order_id_idx;
  end if;
end;
$$;

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
