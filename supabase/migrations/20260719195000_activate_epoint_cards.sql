
create or replace function public.process_epoint_operation_callback(
  p_event_hash text,p_merchant_order_id text,p_amount numeric,p_currency text,p_status text,
  p_provider_transaction_id text,p_message text,p_payload jsonb
) returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare _op public.epoint_api_operations%rowtype; _intent_order_id text; _result text; _card_user uuid;
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
    select user_id into _card_user from public.epoint_saved_cards where id=_op.saved_card_id for update;
    update public.epoint_saved_cards set
      status=case when _op.kind in ('card_registration_with_pay','split_card_registration_with_pay') then 'active' else status end,
      card_mask=coalesce(p_payload->>'card_mask',card_mask),card_name=coalesce(p_payload->>'card_name',card_name),last_used_at=now(),
      is_default=case when _op.kind in ('card_registration_with_pay','split_card_registration_with_pay') and not exists(
        select 1 from public.epoint_saved_cards c where c.user_id=_card_user and c.is_default and c.status='active' and c.id<>_op.saved_card_id
      ) then true else is_default end,updated_at=now()
    where id=_op.saved_card_id;
  end if;
  return 'operation_'||p_status;
end; $$;
revoke all on function public.process_epoint_operation_callback(text,text,numeric,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_epoint_operation_callback(text,text,numeric,text,text,text,text,jsonb) to service_role;

