
revoke select on public.epoint_saved_cards from authenticated;
grant select(id,user_id,card_mask,card_name,status,purpose,is_default,last_used_at,created_at,updated_at)
  on public.epoint_saved_cards to authenticated;

revoke select on public.epoint_api_operations from authenticated;
grant select(id,user_id,kind,payment_intent_id,saved_card_id,payout_request_id,merchant_order_id,
  provider_invoice_id,amount,currency,status,provider_transaction_id,error_code,error_message,
  completed_at,created_by,created_at,updated_at)
  on public.epoint_api_operations to authenticated;

do $$
begin
  if to_regclass('public.customer_cards') is not null then
    revoke insert,update,delete on public.customer_cards from anon,authenticated;
    comment on table public.customer_cards is 'Deprecated. New cards must be tokenized through Epoint.';
  end if;
end $$;

