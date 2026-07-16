-- Route verified Epoint callbacks to the unified payment-intent fulfiller while
-- preserving the legacy seller-registration callback path.
do $migration$
begin
  if to_regprocedure('public.process_epoint_callback_legacy(text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb)') is null
     and to_regprocedure('public.process_epoint_callback(text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb)') is not null then
    alter function public.process_epoint_callback(
      text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb
    ) rename to process_epoint_callback_legacy;
  end if;
end
$migration$;

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
as $function$
declare
  _legacy_result text;
  _intent_result text;
begin
  _legacy_result := public.process_epoint_callback_legacy(
    p_event_hash, p_merchant_order_id, p_amount, p_currency, p_status,
    p_provider_transaction_id, p_bank_transaction_id, p_operation_code,
    p_response_code, p_rrn, p_card_mask, p_message, p_payload
  );

  _intent_result := public.apply_payment_intent_callback(
    p_merchant_order_id, p_amount, p_currency, p_status,
    p_provider_transaction_id, p_message
  );

  if _intent_result <> 'not_found' then
    return _intent_result;
  end if;
  return _legacy_result;
end;
$function$;

revoke all on function public.process_epoint_callback(
  text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.process_epoint_callback(
  text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb
) to service_role;

revoke all on function public.process_epoint_callback_legacy(
  text,text,numeric,text,text,text,text,text,text,text,text,text,jsonb
) from public, anon, authenticated;
revoke all on function public.apply_payment_intent_callback(
  text,numeric,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.process_card_payment(uuid,uuid,jsonb)
from public, anon, authenticated;
