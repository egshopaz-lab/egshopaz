-- External courier delivery confirmation. Delivery providers are intentionally
-- abstract so EG Shop courier, PVZ, QR, OTP, e-signature and GPS can be added
-- without changing orders or payout semantics.

alter table public.system_settings
  add column if not exists delivery_confirmation_hours integer not null default 48;

alter table public.system_settings drop constraint if exists system_settings_delivery_confirmation_hours_check;
alter table public.system_settings add constraint system_settings_delivery_confirmation_hours_check
  check (delivery_confirmation_hours between 1 and 720);

create table public.external_courier_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  contact_phone text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_courier_name_check check (length(trim(name)) between 2 and 100),
  constraint external_courier_code_check check (code ~ '^[a-z0-9_]{2,50}$')
);

insert into public.external_courier_companies(name,code,sort_order) values
  ('Wolt','wolt',10),('Bolt','bolt',20),('Uber','uber',30),
  ('Yerli kuryer','local_courier',40),('Digər','other',50)
on conflict (code) do nothing;

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  provider_type text not null default 'external',
  external_courier_company_id uuid references public.external_courier_companies(id) on delete set null,
  courier_name text,
  courier_phone text,
  tracking_number text,
  note text,
  status text not null default 'new',
  confirmation_status text not null default 'not_requested',
  delivered_at timestamptz,
  confirmation_deadline timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliveries_provider_type_check check (
    provider_type in ('external','egshop_courier','pvz','qr','otp','esign','gps')
  ),
  constraint deliveries_status_check check (
    status in ('new','preparing','handed_to_courier','in_transit','delivered','completed','cancelled','returned','disputed')
  ),
  constraint deliveries_confirmation_check check (
    confirmation_status in ('not_requested','pending','confirmed','rejected','auto_confirmed','admin_confirmed')
  )
);

create table public.delivery_events (
  id bigint generated always as identity primary key,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index deliveries_buyer_created_idx on public.deliveries(buyer_id,created_at desc);
create index deliveries_seller_created_idx on public.deliveries(seller_id,created_at desc);
create index deliveries_status_deadline_idx on public.deliveries(status,confirmation_deadline)
  where status='delivered' and confirmation_status='pending';
create index delivery_events_delivery_created_idx on public.delivery_events(delivery_id,created_at desc);
create unique index if not exists payouts_order_item_unique_idx on public.payouts(order_item_id);
create unique index delivery_open_dispute_item_idx on public.disputes(order_item_id)
  where order_item_id is not null and status='open' and reason='delivery_not_received';

alter table public.external_courier_companies enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;

create policy "Courier companies public read active" on public.external_courier_companies
for select to anon,authenticated using (is_active or (select public.has_role((select auth.uid()),'admin'::public.app_role)));
create policy "Courier companies admin manage" on public.external_courier_companies
for all to authenticated
using ((select public.has_role((select auth.uid()),'admin'::public.app_role)))
with check ((select public.has_role((select auth.uid()),'admin'::public.app_role)));

create policy "Delivery participants read" on public.deliveries for select to authenticated
using (
  (select auth.uid())=buyer_id or (select auth.uid())=seller_id
  or (select public.has_role((select auth.uid()),'admin'::public.app_role))
);
create policy "Delivery events participants read" on public.delivery_events for select to authenticated
using (exists (
  select 1 from public.deliveries d where d.id=delivery_id and (
    d.buyer_id=(select auth.uid()) or d.seller_id=(select auth.uid())
    or (select public.has_role((select auth.uid()),'admin'::public.app_role))
  )
));

revoke all on public.external_courier_companies,public.deliveries,public.delivery_events from public,anon,authenticated;
grant select on public.external_courier_companies to anon,authenticated;
grant insert,update,delete on public.external_courier_companies to authenticated;
grant select on public.deliveries,public.delivery_events to authenticated;

create or replace function public.sync_order_status_from_items(_order_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare _new_status public.order_status; _current public.order_status;
begin
  select status into _current from public.orders where id=_order_id for update;
  if not found then return; end if;
  if not exists(select 1 from public.order_items where order_id=_order_id) then return; end if;

  if exists(select 1 from public.order_items where order_id=_order_id and status='disputed') then _new_status:='disputed';
  elsif not exists(select 1 from public.order_items where order_id=_order_id and status<>'completed') then _new_status:='completed';
  elsif not exists(select 1 from public.order_items where order_id=_order_id and status not in ('delivered','completed')) then _new_status:='delivered';
  elsif not exists(select 1 from public.order_items where order_id=_order_id and status<>'returned') then _new_status:='returned';
  elsif not exists(select 1 from public.order_items where order_id=_order_id and status<>'cancelled') then _new_status:='cancelled';
  elsif exists(select 1 from public.order_items where order_id=_order_id and status='in_transit') then _new_status:='in_transit';
  elsif exists(select 1 from public.order_items where order_id=_order_id and status='handed_to_courier') then _new_status:='handed_to_courier';
  elsif exists(select 1 from public.order_items where order_id=_order_id and status='shipped') then _new_status:='shipped';
  elsif exists(select 1 from public.order_items where order_id=_order_id and status in ('preparing','packed')) then _new_status:='preparing';
  elsif _current='paid' then _new_status:='paid';
  else _new_status:='pending'; end if;
  update public.orders set status=_new_status where id=_order_id and status is distinct from _new_status;
end $$;

create or replace function private.credit_delivery_order_item(_delivery_id uuid,_confirmation_kind text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare _d public.deliveries%rowtype; _oi public.order_items%rowtype; _pct numeric; _gross numeric; _fee numeric; _net numeric;
begin
  select * into _d from public.deliveries where id=_delivery_id for update;
  if not found then raise exception 'Çatdırılma tapılmadı'; end if;
  select * into _oi from public.order_items where id=_d.order_item_id for update;
  if not found then raise exception 'Sifariş məhsulu tapılmadı'; end if;

  if _oi.payout_status='paid' then
    update public.deliveries set status='completed',updated_at=now() where id=_delivery_id;
    return jsonb_build_object('already_paid',true);
  end if;

  _gross:=round(_oi.price*_oi.quantity,2);
  select commission_percent into _pct from public.system_settings limit 1;
  _pct:=coalesce(_pct,10); _fee:=round(_gross*_pct/100.0,2); _net:=_gross-_fee;

  if _oi.seller_id is not null then
    insert into public.payouts(seller_id,order_item_id,amount,commission,net_amount,status)
    values(_oi.seller_id,_oi.id,_gross,_fee,_net,'completed') on conflict(order_item_id) do nothing;
    insert into public.seller_balances(seller_id,available,total_earned)
    values(_oi.seller_id,_net,_net) on conflict(seller_id) do update set
      available=public.seller_balances.available+excluded.available,
      total_earned=public.seller_balances.total_earned+excluded.total_earned,updated_at=now();
    insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
    values(_oi.seller_id,'Ödəniş təsdiqləndi',
      _net||' AZN balansınıza əlavə edildi. Platforma komissiyası: '||_fee||' AZN.',
      'delivery_completed','/seller',_oi.order_id,_oi.id);
  end if;

  update public.order_items set status='completed',payout_status='paid',payout_at=now() where id=_oi.id;
  update public.deliveries set status='completed',
    confirmation_status=_confirmation_kind,confirmed_at=coalesce(confirmed_at,now()),updated_at=now()
  where id=_delivery_id;
  insert into public.delivery_events(delivery_id,actor_user_id,actor_role,event_type,from_status,to_status,data)
  values(_delivery_id,case when _confirmation_kind='confirmed' then _d.buyer_id else null end,
    case when _confirmation_kind='confirmed' then 'customer' else 'system' end,
    'delivery_completed',_d.status,'completed',jsonb_build_object('gross',_gross,'commission',_fee,'net',_net,'confirmation',_confirmation_kind));
  perform public.sync_order_status_from_items(_oi.order_id);
  return jsonb_build_object('gross',_gross,'commission',_fee,'net',_net);
end $$;
revoke all on function private.credit_delivery_order_item(uuid,text) from public,anon,authenticated;

create or replace function public.seller_handoff_external_delivery(
  _order_item_id uuid,_company_id uuid default null,_courier_name text default null,
  _courier_phone text default null,_tracking_number text default null,_note text default null
) returns public.deliveries language plpgsql security definer set search_path=pg_catalog,public as $$
declare _oi public.order_items%rowtype; _order public.orders%rowtype; _d public.deliveries%rowtype;
begin
  select * into _oi from public.order_items where id=_order_item_id for update;
  if not found or _oi.seller_id is distinct from auth.uid() then raise exception 'Satıcı icazəsi tələb olunur'; end if;
  if _oi.status not in ('pending','paid','preparing','packed','shipped','handed_to_courier') or _oi.delivered_at is not null then
    raise exception 'Bu sifariş kuryerə verilə bilməz';
  end if;
  select * into _order from public.orders where id=_oi.order_id;
  if _company_id is not null and not exists(select 1 from public.external_courier_companies where id=_company_id and is_active) then
    raise exception 'Aktiv kuryer şirkəti tapılmadı';
  end if;
  insert into public.deliveries(order_id,order_item_id,buyer_id,seller_id,provider_type,
    external_courier_company_id,courier_name,courier_phone,tracking_number,note,status)
  values(_oi.order_id,_oi.id,_order.buyer_id,_oi.seller_id,'external',_company_id,
    nullif(left(trim(_courier_name),100),''),nullif(left(trim(_courier_phone),30),''),
    nullif(left(trim(_tracking_number),100),''),nullif(left(trim(_note),500),''),'handed_to_courier')
  on conflict(order_item_id) do update set
    external_courier_company_id=excluded.external_courier_company_id,courier_name=excluded.courier_name,
    courier_phone=excluded.courier_phone,tracking_number=excluded.tracking_number,note=excluded.note,
    status='handed_to_courier',updated_at=now()
  returning * into _d;
  update public.order_items set status='handed_to_courier' where id=_oi.id;
  insert into public.delivery_events(delivery_id,actor_user_id,actor_role,event_type,from_status,to_status,note)
  values(_d.id,auth.uid(),'seller','courier_handoff',_oi.status,'handed_to_courier',_note);
  perform public.sync_order_status_from_items(_oi.order_id);
  return _d;
end $$;
revoke all on function public.seller_handoff_external_delivery(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.seller_handoff_external_delivery(uuid,uuid,text,text,text,text) to authenticated;

create or replace function public.seller_update_external_delivery_status(_delivery_id uuid,_status text,_note text default null)
returns public.deliveries language plpgsql security definer set search_path=pg_catalog,public as $$
declare _d public.deliveries%rowtype; _hours integer; _result public.deliveries%rowtype;
begin
  select * into _d from public.deliveries where id=_delivery_id for update;
  if not found or _d.seller_id is distinct from auth.uid() then raise exception 'Satıcı icazəsi tələb olunur'; end if;
  if (_d.status='handed_to_courier' and _status not in ('in_transit','delivered'))
     or (_d.status='in_transit' and _status<>'delivered') then raise exception 'Status keçidi düzgün deyil'; end if;
  if _d.status not in ('handed_to_courier','in_transit') then raise exception 'Bu çatdırılmanın statusu dəyişdirilə bilməz'; end if;
  if _status='delivered' then
    select delivery_confirmation_hours into _hours from public.system_settings limit 1;
    update public.deliveries set status='delivered',delivered_at=now(),
      confirmation_status='pending',confirmation_deadline=now()+make_interval(hours=>coalesce(_hours,48)),updated_at=now()
    where id=_delivery_id returning * into _result;
    update public.order_items set status='delivered',delivered_at=now() where id=_d.order_item_id;
    if _d.buyer_id is not null then
      insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
      values(_d.buyer_id,'Sifarişinizi təhvil almısınız?',
        'Çatdırılmanı Bəli və ya Xeyr seçərək təsdiqləyin.','delivery_confirmation','/orders',_d.order_id,_d.order_item_id);
    end if;
  else
    update public.deliveries set status='in_transit',updated_at=now() where id=_delivery_id returning * into _result;
    update public.order_items set status='in_transit' where id=_d.order_item_id;
  end if;
  insert into public.delivery_events(delivery_id,actor_user_id,actor_role,event_type,from_status,to_status,note)
  values(_delivery_id,auth.uid(),'seller','status_changed',_d.status,_status,nullif(left(trim(_note),500),''));
  perform public.sync_order_status_from_items(_d.order_id);
  return _result;
end $$;
revoke all on function public.seller_update_external_delivery_status(uuid,text,text) from public,anon;
grant execute on function public.seller_update_external_delivery_status(uuid,text,text) to authenticated;

create or replace function public.customer_confirm_delivery(_delivery_id uuid,_received boolean,_note text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare _d public.deliveries%rowtype; _dispute_id uuid; _payout jsonb;
begin
  select * into _d from public.deliveries where id=_delivery_id for update;
  if not found or _d.buyer_id is distinct from auth.uid() then raise exception 'Müştəri icazəsi tələb olunur'; end if;
  if _d.status<>'delivered' or _d.confirmation_status<>'pending' then raise exception 'Təsdiq artıq bağlanıb'; end if;
  if _received then
    update public.deliveries set confirmed_by=auth.uid(),confirmed_at=now() where id=_delivery_id;
    _payout:=private.credit_delivery_order_item(_delivery_id,'confirmed');
    if _d.seller_id is not null then
      insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
      values(_d.seller_id,'Müştəri təhvili təsdiqlədi','Sifariş tamamlandı və ödəniş hesablandı.',
        'delivery_confirmed','/seller',_d.order_id,_d.order_item_id);
    end if;
    return jsonb_build_object('status','completed','payout',_payout);
  end if;

  update public.deliveries set status='disputed',confirmation_status='rejected',confirmed_by=auth.uid(),
    confirmed_at=now(),updated_at=now() where id=_delivery_id;
  update public.order_items set status='disputed',payout_status='blocked_dispute' where id=_d.order_item_id;
  insert into public.disputes(order_id,order_item_id,buyer_id,seller_id,reason,description,status)
  values(_d.order_id,_d.order_item_id,_d.buyer_id,_d.seller_id,'delivery_not_received',
    coalesce(nullif(left(trim(_note),1000),''),'Müştəri sifarişi təhvil almadığını bildirdi.'),'open')
  on conflict(order_item_id) where order_item_id is not null and status='open' and reason='delivery_not_received'
  do update set description=excluded.description,updated_at=now() returning id into _dispute_id;
  insert into public.delivery_events(delivery_id,actor_user_id,actor_role,event_type,from_status,to_status,note,data)
  values(_delivery_id,auth.uid(),'customer','delivery_rejected','delivered','disputed',_note,jsonb_build_object('dispute_id',_dispute_id));
  if _d.seller_id is not null then
    insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
    values(_d.seller_id,'Çatdırılma mübahisəyə keçdi','Müştəri sifarişi almadığını bildirib. Admin araşdıracaq.',
      'delivery_dispute','/seller',_d.order_id,_d.order_item_id);
  end if;
  insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
  select ur.user_id,'Yeni çatdırılma mübahisəsi','Müştəri sifarişi almadığını bildirib.',
    'delivery_dispute','/admin',_d.order_id,_d.order_item_id
  from public.user_roles ur where ur.role='admin'::public.app_role;
  perform public.sync_order_status_from_items(_d.order_id);
  return jsonb_build_object('status','disputed','dispute_id',_dispute_id);
end $$;
revoke all on function public.customer_confirm_delivery(uuid,boolean,text) from public,anon;
grant execute on function public.customer_confirm_delivery(uuid,boolean,text) to authenticated;

create or replace function public.admin_manage_delivery(_delivery_id uuid,_status text,_note text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare _d public.deliveries%rowtype; _hours integer; _result jsonb;
begin
  if not public.has_role(auth.uid(),'admin'::public.app_role) then raise exception 'Admin icazəsi tələb olunur'; end if;
  if _status not in ('handed_to_courier','in_transit','delivered','completed','cancelled','returned','disputed') then raise exception 'Status düzgün deyil'; end if;
  select * into _d from public.deliveries where id=_delivery_id for update;
  if not found then raise exception 'Çatdırılma tapılmadı'; end if;
  if _status='completed' then
    _result:=private.credit_delivery_order_item(_delivery_id,'admin_confirmed');
  else
    select delivery_confirmation_hours into _hours from public.system_settings limit 1;
    update public.deliveries set status=_status,
      delivered_at=case when _status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
      confirmation_status=case when _status='delivered' then 'pending' when _status in ('cancelled','returned','disputed') then 'rejected' else confirmation_status end,
      confirmation_deadline=case when _status='delivered' then now()+make_interval(hours=>coalesce(_hours,48)) else confirmation_deadline end,
      updated_at=now() where id=_delivery_id;
    update public.order_items set status=_status,
      delivered_at=case when _status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
      payout_status=case when _status in ('cancelled','returned','disputed') then 'blocked_'||_status else payout_status end
    where id=_d.order_item_id;
    _result:=jsonb_build_object('status',_status);
  end if;
  insert into public.delivery_events(delivery_id,actor_user_id,actor_role,event_type,from_status,to_status,note)
  values(_delivery_id,auth.uid(),'admin','admin_status_changed',_d.status,_status,nullif(left(trim(_note),500),''));
  perform public.sync_order_status_from_items(_d.order_id);
  return _result;
end $$;
revoke all on function public.admin_manage_delivery(uuid,text,text) from public,anon;
grant execute on function public.admin_manage_delivery(uuid,text,text) to authenticated;

create or replace function public.auto_confirm_external_deliveries()
returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare _d record; _count integer:=0;
begin
  for _d in select id from public.deliveries where status='delivered' and confirmation_status='pending'
    and confirmation_deadline<=now() order by confirmation_deadline for update skip locked
  loop
    perform private.credit_delivery_order_item(_d.id,'auto_confirmed'); _count:=_count+1;
  end loop;
  return _count;
end $$;
revoke all on function public.auto_confirm_external_deliveries() from public,anon,authenticated;
grant execute on function public.auto_confirm_external_deliveries() to service_role;

create or replace function public.protect_external_delivery_item_fields()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if current_user in ('postgres','service_role')
     or public.has_role(auth.uid(),'admin'::public.app_role) then return new; end if;
  if new.payout_status is distinct from old.payout_status or new.payout_at is distinct from old.payout_at then
    raise exception 'Ödəniş statusunu birbaşa dəyişmək olmaz';
  end if;
  if new.status is distinct from old.status and new.status in
    ('handed_to_courier','in_transit','completed','disputed','returned') then
    raise exception 'Çatdırılma statusunu təhlükəsiz əməliyyat vasitəsilə dəyişin';
  end if;
  if new.status is distinct from old.status and new.status='delivered'
     and not public.has_role(auth.uid(),'pvz'::public.app_role) then
    raise exception 'Təhvil statusunu təhlükəsiz əməliyyat vasitəsilə dəyişin';
  end if;
  return new;
end $$;
drop trigger if exists protect_external_delivery_item_fields on public.order_items;
create trigger protect_external_delivery_item_fields before update on public.order_items
for each row execute function public.protect_external_delivery_item_fields();
revoke all on function public.protect_external_delivery_item_fields() from public,anon,authenticated;

-- Legacy PVZ deliveries without a modular delivery record keep their old
-- three-day settlement. External deliveries are settled only by confirmation.
create or replace function public.auto_payout_after_3_days()
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare _commission_pct numeric; _processed integer:=0; _row record; _gross numeric; _commission numeric; _net numeric;
begin
  select commission_percent into _commission_pct from public.system_settings limit 1;
  for _row in select oi.* from public.order_items oi where oi.delivered_at<now()-interval '3 days'
    and oi.payout_status='pending' and not exists(select 1 from public.deliveries d where d.order_item_id=oi.id)
    for update skip locked
  loop
    if exists(select 1 from public.returns r where r.order_item_id=_row.id and r.status in ('pending','approved','completed')) then
      update public.order_items set payout_status='blocked_return' where id=_row.id; continue;
    end if;
    _gross:=round(_row.price*_row.quantity,2); _commission:=round(_gross*coalesce(_commission_pct,10)/100.0,2); _net:=_gross-_commission;
    if _row.seller_id is not null then
      insert into public.payouts(seller_id,order_item_id,amount,commission,net_amount,status)
      values(_row.seller_id,_row.id,_gross,_commission,_net,'completed') on conflict(order_item_id) do nothing;
      insert into public.seller_balances(seller_id,available,total_earned) values(_row.seller_id,_net,_net)
      on conflict(seller_id) do update set available=public.seller_balances.available+excluded.available,
        total_earned=public.seller_balances.total_earned+excluded.total_earned,updated_at=now();
    end if;
    update public.order_items set payout_status='paid',payout_at=now() where id=_row.id;
    _processed:=_processed+1;
  end loop; return _processed;
end $$;

-- Idempotent cron job, every ten minutes.
do $$ begin
  if exists(select 1 from cron.job where jobname='egshop-auto-confirm-deliveries') then
    perform cron.unschedule('egshop-auto-confirm-deliveries');
  end if;
  perform cron.schedule('egshop-auto-confirm-deliveries','*/10 * * * *','select public.auto_confirm_external_deliveries();');
end $$;

-- Realtime UI and audit coverage.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='deliveries') then
    alter publication supabase_realtime add table public.deliveries;
  end if;
end $$;

drop trigger if exists audit_admin_change on public.external_courier_companies;
create trigger audit_admin_change after insert or update or delete on public.external_courier_companies
for each row execute function public.audit_admin_table_change();
drop trigger if exists audit_admin_change on public.deliveries;
create trigger audit_admin_change after insert or update or delete on public.deliveries
for each row execute function public.audit_admin_table_change();

revoke all on function public.sync_order_status_from_items(uuid) from public,anon;
grant execute on function public.sync_order_status_from_items(uuid) to authenticated,service_role;

-- Legacy delivery side effects must wait for buyer/admin/automatic confirmation
-- when an order item uses the modular delivery workflow.
create or replace function public.bonus_on_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  _buyer uuid; _earn integer:=0; _percent numeric:=2; _has_modular_delivery boolean;
begin
  select exists(select 1 from public.deliveries where order_item_id=new.id)
    into _has_modular_delivery;

  if _has_modular_delivery then
    if new.status<>'completed' or old.status='completed' then return new; end if;
  elsif new.delivered_at is null or old.delivered_at is not null then
    return new;
  end if;

  select buyer_id into _buyer from public.orders where id=new.order_id;
  select bonus_earn_percent into _percent from public.system_settings limit 1;
  _earn:=floor(new.price*new.quantity*coalesce(_percent,2)/100)::integer;
  if _buyer is not null and _earn>0 then
    insert into public.bonus_transactions(user_id,amount,reason,order_id)
      values(_buyer,_earn,'Sifariş təsdiqləndi',new.order_id);
    update public.profiles set bonus_balance=coalesce(bonus_balance,0)+_earn where id=_buyer;
    update public.orders set bonus_earned=coalesce(bonus_earned,0)+_earn where id=new.order_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_bonus_on_delivery on public.order_items;
create trigger trg_bonus_on_delivery
after update of delivered_at,status on public.order_items
for each row execute function public.bonus_on_delivery();

create or replace function public.cod_collect_on_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
declare _ord record; _total numeric; _undelivered integer; _pvz uuid;
begin
  if new.delivered_at is null then return new; end if;
  if tg_op='UPDATE' and old.delivered_at is not null then return new; end if;
  if exists(select 1 from public.deliveries where order_item_id=new.id) then return new; end if;
  select * into _ord from public.orders where id=new.order_id;
  if _ord.id is null or _ord.payment_method<>'cod_pvz' or _ord.payment_status='paid' then return new; end if;
  select count(*) into _undelivered from public.order_items
    where order_id=new.order_id and delivered_at is null and status not in ('cancelled');
  if _undelivered>0 then return new; end if;
  _pvz:=coalesce(new.pickup_point_id,_ord.pickup_point_id); _total:=_ord.total;
  update public.orders set payment_status='paid',paid_at=now(),collected_by_pvz_id=_pvz
    where id=new.order_id and payment_status='unpaid';
  insert into public.treasury_transactions(kind,direction,amount,order_id,pickup_point_id,note)
    values('cash_in_pvz','in',_total,new.order_id,_pvz,
      'PVZ-də nağd qəbul (sifariş #'||substr(new.order_id::text,1,8)||')');
  return new;
end $$;
