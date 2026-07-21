-- Automatic accounting recognition for successful operational events.

create or replace function public.accounting_record_simple_event(
  _source_table text,_source_id text,_source_event text,_entry_date date,_description text,
  _debit_code text,_credit_code text,_amount numeric,_seller_id uuid default null,_order_id uuid default null
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare _entry_id uuid; _debit_id uuid; _credit_id uuid;
begin
  if coalesce(_amount,0)<=0 then return null; end if;
  if exists(select 1 from public.accounting_journal_entries where source_table=_source_table and source_id=_source_id and source_event=_source_event) then return null; end if;
  if exists(select 1 from public.accounting_periods where status='closed' and _entry_date between starts_on and ends_on) then return null; end if;
  select id into _debit_id from public.accounting_accounts where code=_debit_code and is_active;
  select id into _credit_id from public.accounting_accounts where code=_credit_code and is_active;
  if _debit_id is null or _credit_id is null then raise exception 'Mühasibat hesabı tapılmadı: % / %',_debit_code,_credit_code; end if;
  insert into public.accounting_journal_entries(entry_date,description,status,source_table,source_id,source_event,posted_at)
  values(_entry_date,_description,'draft',_source_table,_source_id,_source_event,now()) returning id into _entry_id;
  insert into public.accounting_journal_lines(entry_id,account_id,debit,credit,seller_id,order_id,memo) values
    (_entry_id,_debit_id,_amount,0,_seller_id,_order_id,_description),
    (_entry_id,_credit_id,0,_amount,_seller_id,_order_id,_description);
  update public.accounting_journal_entries set status='posted',posted_at=now(),updated_at=now() where id=_entry_id;
  return _entry_id;
exception when unique_violation then return null;
end $$;

create or replace function public.accounting_record_paid_order(_order_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare _o public.orders%rowtype; _entry_id uuid; _transit uuid; _payable uuid; _revenue uuid; _commission_rate numeric; _commission numeric; _seller_net numeric;
begin
  select * into _o from public.orders where id=_order_id;
  if not found or not (_o.payment_status='paid' or _o.status::text in ('paid','delivered','completed')) or _o.total<=0 then return null; end if;
  if exists(select 1 from public.accounting_journal_entries where source_table='orders' and source_id=_order_id::text and source_event='payment_recognized') then return null; end if;
  if exists(select 1 from public.accounting_periods where status='closed' and coalesce(_o.paid_at::date,_o.created_at::date) between starts_on and ends_on) then return null; end if;
  select coalesce(commission_percent,10) into _commission_rate from public.system_settings limit 1;
  _commission:=round(_o.total*_commission_rate/100,2); _seller_net:=_o.total-_commission;
  select id into _transit from public.accounting_accounts where code='222-1';
  select id into _payable from public.accounting_accounts where code='531-1';
  select id into _revenue from public.accounting_accounts where code='601-1';
  insert into public.accounting_journal_entries(entry_date,description,status,source_table,source_id,source_event,posted_at)
  values(coalesce(_o.paid_at::date,_o.created_at::date),'Marketplace sifariş ödənişinin tanınması','draft','orders',_order_id::text,'payment_recognized',now()) returning id into _entry_id;
  insert into public.accounting_journal_lines(entry_id,account_id,debit,credit,order_id,memo) values
    (_entry_id,_transit,_o.total,0,_order_id,'Epoint üzrə yolda olan vəsait'),
    (_entry_id,_payable,0,_seller_net,_order_id,'Satıcılara ödəniləcək net məbləğ'),
    (_entry_id,_revenue,0,_commission,_order_id,'Marketplace komissiya gəliri');
  update public.accounting_journal_entries set status='posted',posted_at=now(),updated_at=now() where id=_entry_id;
  return _entry_id;
exception when unique_violation then return null;
end $$;

create or replace function public.accounting_operations_trigger()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_table_name='orders' then
    perform public.accounting_record_paid_order(new.id);
  elsif tg_table_name='seller_applications' and new.payment_status in ('paid','success') then
    perform public.accounting_record_simple_event('seller_applications',new.id::text,'payment_recognized',coalesce(new.paid_at::date,new.created_at::date),'Satıcı qeydiyyat xidməti','222-1','601-2',new.registration_fee,new.user_id,null);
  elsif tg_table_name='seller_subscriptions' and new.payment_status in ('paid','success') then
    perform public.accounting_record_simple_event('seller_subscriptions',new.id::text,'payment_recognized',new.created_at::date,'Reklam paketi xidməti','222-1','601-3',new.amount,new.seller_id,null);
  elsif tg_table_name='eg_trends_payments' and new.status in ('success','paid','completed') then
    perform public.accounting_record_simple_event('eg_trends_payments',new.id::text,'payment_recognized',coalesce(new.paid_at::date,new.created_at::date),'EG Trends xidməti','222-1','601-4',new.amount,new.seller_id,null);
  elsif tg_table_name='payout_requests' and new.status='paid' then
    perform public.accounting_record_simple_event('payout_requests',new.id::text,'payout_paid',coalesce(new.paid_at::date,new.created_at::date),'Satıcıya payout ödənişi','531-1','223-1',new.amount,new.seller_id,null);
  end if;
  return new;
end $$;

drop trigger if exists accounting_orders_event on public.orders;
create trigger accounting_orders_event after insert or update of payment_status,status on public.orders for each row execute function public.accounting_operations_trigger();
drop trigger if exists accounting_seller_application_event on public.seller_applications;
create trigger accounting_seller_application_event after insert or update of payment_status on public.seller_applications for each row execute function public.accounting_operations_trigger();
drop trigger if exists accounting_seller_subscription_event on public.seller_subscriptions;
create trigger accounting_seller_subscription_event after insert or update of payment_status on public.seller_subscriptions for each row execute function public.accounting_operations_trigger();
drop trigger if exists accounting_trends_payment_event on public.eg_trends_payments;
create trigger accounting_trends_payment_event after insert or update of status on public.eg_trends_payments for each row execute function public.accounting_operations_trigger();
drop trigger if exists accounting_payout_event on public.payout_requests;
create trigger accounting_payout_event after insert or update of status on public.payout_requests for each row execute function public.accounting_operations_trigger();

do $$ declare r record; begin
  for r in select id from public.orders where payment_status='paid' or status::text in ('paid','delivered','completed') loop perform public.accounting_record_paid_order(r.id); end loop;
  for r in select * from public.seller_applications where payment_status in ('paid','success') loop perform public.accounting_record_simple_event('seller_applications',r.id::text,'payment_recognized',coalesce(r.paid_at::date,r.created_at::date),'Satıcı qeydiyyat xidməti','222-1','601-2',r.registration_fee,r.user_id,null); end loop;
  for r in select * from public.seller_subscriptions where payment_status in ('paid','success') loop perform public.accounting_record_simple_event('seller_subscriptions',r.id::text,'payment_recognized',r.created_at::date,'Reklam paketi xidməti','222-1','601-3',r.amount,r.seller_id,null); end loop;
  for r in select * from public.eg_trends_payments where status in ('success','paid','completed') loop perform public.accounting_record_simple_event('eg_trends_payments',r.id::text,'payment_recognized',coalesce(r.paid_at::date,r.created_at::date),'EG Trends xidməti','222-1','601-4',r.amount,r.seller_id,null); end loop;
  for r in select * from public.payout_requests where status='paid' loop perform public.accounting_record_simple_event('payout_requests',r.id::text,'payout_paid',coalesce(r.paid_at::date,r.created_at::date),'Satıcıya payout ödənişi','531-1','223-1',r.amount,r.seller_id,null); end loop;
end $$;

revoke all on function public.accounting_record_simple_event(text,text,text,date,text,text,text,numeric,uuid,uuid),public.accounting_record_paid_order(uuid) from public,anon,authenticated;

