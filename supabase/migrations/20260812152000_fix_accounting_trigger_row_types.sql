-- Keep table-specific NEW fields inside their own PL/pgSQL branches.
-- SQL boolean expressions are not guaranteed to short-circuit, so combining
-- TG_TABLE_NAME checks with NEW.payment_status broke tables that only expose
-- a `status` column (notably eg_trends_payments).
create or replace function public.accounting_operations_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  case tg_table_name
    when 'orders' then
      perform public.accounting_record_paid_order(new.id);

    when 'seller_applications' then
      if new.payment_status in ('paid', 'success') then
        perform public.accounting_record_simple_event(
          'seller_applications', new.id::text, 'payment_recognized',
          coalesce(new.paid_at::date, new.created_at::date),
          'Satıcı qeydiyyat xidməti', '222-1', '601-2',
          new.registration_fee, new.user_id, null
        );
      end if;

    when 'seller_subscriptions' then
      if new.payment_status in ('paid', 'success') then
        perform public.accounting_record_simple_event(
          'seller_subscriptions', new.id::text, 'payment_recognized',
          new.created_at::date, 'Reklam paketi xidməti',
          '222-1', '601-3', new.amount, new.seller_id, null
        );
      end if;

    when 'eg_trends_payments' then
      if new.status in ('success', 'paid', 'completed') then
        perform public.accounting_record_simple_event(
          'eg_trends_payments', new.id::text, 'payment_recognized',
          coalesce(new.paid_at::date, new.created_at::date),
          'EG Trends xidməti', '222-1', '601-4',
          new.amount, new.seller_id, null
        );
      end if;

    when 'payout_requests' then
      if new.status = 'paid' then
        perform public.accounting_record_simple_event(
          'payout_requests', new.id::text, 'payout_paid',
          coalesce(new.paid_at::date, new.created_at::date),
          'Satıcıya payout ödənişi', '531-1', '223-1',
          new.amount, new.seller_id, null
        );
      end if;

    else
      null;
  end case;

  return new;
end;
$$;
