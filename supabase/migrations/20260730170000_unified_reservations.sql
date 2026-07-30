-- Unified reservation engine shared by all booking-based business modules.
create table if not exists public.reservation_resources (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  module_code text not null references public.business_modules(code) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 160),
  resource_type text not null check (resource_type in (
    'table','staff','service','vehicle','doctor','room','course','tour','event'
  )),
  description text,
  capacity integer not null default 1 check (capacity between 1 and 10000),
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 43200),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 1440),
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'AZN' check (currency ~ '^[A-Z]{3}$'),
  online_payment_enabled boolean not null default false,
  onsite_payment_enabled boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (online_payment_enabled or onsite_payment_enabled),
  check (module_code in (
    'restaurant','beauty_salon','services','rent_a_car','clinic',
    'hotel','course_center','tourism','events_tickets'
  ))
);

create table if not exists public.reservation_schedules (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.reservation_resources(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 1440),
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.reservation_blocks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.reservation_resources(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique default (
    'RSV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  module_code text not null references public.business_modules(code) on delete restrict,
  resource_id uuid not null references public.reservation_resources(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  party_size integer not null default 1 check (party_size between 1 and 10000),
  status text not null default 'requested' check (
    status in ('requested','confirmed','cancelled','completed','no_show')
  ),
  payment_method text not null default 'onsite' check (payment_method in ('online','onsite')),
  payment_status text not null default 'pending' check (
    payment_status in ('pending','paid','failed','refunded','not_required')
  ),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'AZN' check (currency ~ '^[A-Z]{3}$'),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 160),
  customer_email text not null check (position('@' in customer_email) > 1),
  customer_phone text not null check (char_length(trim(customer_phone)) between 7 and 30),
  notes text,
  cancellation_reason text,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_notification_queue (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  recipient_email text,
  channel text not null check (channel in ('email')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reservation_resources_seller_module_idx
  on public.reservation_resources(seller_id,module_code,is_active);
create index if not exists reservation_schedules_resource_day_idx
  on public.reservation_schedules(resource_id,day_of_week,is_active);
create index if not exists reservation_blocks_resource_time_idx
  on public.reservation_blocks(resource_id,starts_at,ends_at);
create index if not exists reservations_resource_time_idx
  on public.reservations(resource_id,starts_at,ends_at)
  where status in ('requested','confirmed');
create index if not exists reservations_customer_created_idx
  on public.reservations(customer_id,created_at desc);
create index if not exists reservations_seller_start_idx
  on public.reservations(seller_id,starts_at desc);
create index if not exists reservation_history_reservation_idx
  on public.reservation_status_history(reservation_id,created_at);
create index if not exists reservation_notification_pending_idx
  on public.reservation_notification_queue(status,created_at)
  where status = 'pending';

alter table public.reservation_resources enable row level security;
alter table public.reservation_schedules enable row level security;
alter table public.reservation_blocks enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.reservation_notification_queue enable row level security;

create policy "Public reads active reservation resources"
on public.reservation_resources for select
using (
  is_active
  or seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Sellers create own reservation resources"
on public.reservation_resources for insert to authenticated
with check (
  seller_id = (select auth.uid())
  and private.is_active_seller((select auth.uid()))
  and exists (
    select 1 from public.seller_business_modules sbm
    where sbm.seller_id = (select auth.uid()) and sbm.module_code = reservation_resources.module_code
  )
);
create policy "Sellers update own reservation resources"
on public.reservation_resources for update to authenticated
using (
  seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Sellers delete own reservation resources"
on public.reservation_resources for delete to authenticated
using (
  seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create policy "Public reads active reservation schedules"
on public.reservation_schedules for select
using (
  exists (
    select 1 from public.reservation_resources rr
    where rr.id = reservation_schedules.resource_id
      and (
        rr.is_active
        or rr.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);
create policy "Sellers manage own reservation schedules"
on public.reservation_schedules for all to authenticated
using (
  exists (
    select 1 from public.reservation_resources rr
    where rr.id = reservation_schedules.resource_id
      and (
        rr.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
)
with check (
  exists (
    select 1 from public.reservation_resources rr
    where rr.id = reservation_schedules.resource_id
      and (
        rr.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

create policy "Sellers manage own reservation blocks"
on public.reservation_blocks for all to authenticated
using (
  exists (
    select 1 from public.reservation_resources rr
    where rr.id = reservation_blocks.resource_id
      and (
        rr.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
)
with check (
  exists (
    select 1 from public.reservation_resources rr
    where rr.id = reservation_blocks.resource_id
      and (
        rr.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

create policy "Reservation participants read"
on public.reservations for select to authenticated
using (
  customer_id = (select auth.uid())
  or seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

create policy "Reservation participants read history"
on public.reservation_status_history for select to authenticated
using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_status_history.reservation_id
      and (
        r.customer_id = (select auth.uid())
        or r.seller_id = (select auth.uid())
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

create policy "Users read own reservation notification queue"
on public.reservation_notification_queue for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

grant select on public.reservation_resources,public.reservation_schedules to anon,authenticated;
grant select,insert,update,delete on public.reservation_resources,public.reservation_schedules,public.reservation_blocks to authenticated;
grant select on public.reservations,public.reservation_status_history,public.reservation_notification_queue to authenticated;

create or replace function public.get_reservation_availability(
  _resource_id uuid,
  _date date
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog,public
as $function$
  with resource as (
    select rr.id,rr.duration_minutes,rr.buffer_minutes
    from public.reservation_resources rr
    where rr.id = _resource_id and rr.is_active
  ),
  windows as (
    select
      ((_date::text || ' ' || rs.start_time::text)::timestamp at time zone 'Asia/Baku') as window_start,
      ((_date::text || ' ' || rs.end_time::text)::timestamp at time zone 'Asia/Baku') as window_end,
      rs.slot_interval_minutes,
      r.duration_minutes,
      r.buffer_minutes
    from public.reservation_schedules rs
    join resource r on r.id = rs.resource_id
    where rs.is_active
      and rs.day_of_week = extract(dow from _date)::smallint
      and (rs.valid_from is null or rs.valid_from <= _date)
      and (rs.valid_until is null or rs.valid_until >= _date)
  ),
  slots as (
    select
      slot_start as starts_at,
      slot_start + make_interval(mins => w.duration_minutes) as ends_at,
      w.buffer_minutes
    from windows w
    cross join lateral generate_series(
      w.window_start,
      w.window_end - make_interval(mins => w.duration_minutes),
      make_interval(mins => w.slot_interval_minutes)
    ) slot_start
  )
  select s.starts_at,s.ends_at
  from slots s
  where s.starts_at > now()
    and not exists (
      select 1 from public.reservation_blocks b
      where b.resource_id = _resource_id
        and tstzrange(b.starts_at,b.ends_at,'[)') &&
            tstzrange(s.starts_at,s.ends_at + make_interval(mins => s.buffer_minutes),'[)')
    )
    and not exists (
      select 1 from public.reservations r
      where r.resource_id = _resource_id
        and r.status in ('requested','confirmed')
        and (
          r.status = 'confirmed'
          or r.payment_method = 'onsite'
          or r.payment_status = 'paid'
          or r.hold_expires_at > now()
        )
        and tstzrange(r.starts_at,r.ends_at,'[)') &&
            tstzrange(s.starts_at,s.ends_at + make_interval(mins => s.buffer_minutes),'[)')
    )
  order by s.starts_at;
$function$;

revoke all on function public.get_reservation_availability(uuid,date) from public;
grant execute on function public.get_reservation_availability(uuid,date) to anon,authenticated;

create or replace function public.create_reservation(
  _resource_id uuid,
  _starts_at timestamptz,
  _party_size integer,
  _payment_method text,
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = pg_catalog,public
as $function$
declare
  _user uuid := auth.uid();
  _resource public.reservation_resources%rowtype;
  _ends_at timestamptz;
  _result public.reservations%rowtype;
begin
  if _user is null then raise exception 'authentication_required'; end if;
  if _starts_at <= now() then raise exception 'reservation_must_be_future'; end if;
  if coalesce(_party_size,0) < 1 then raise exception 'invalid_party_size'; end if;
  if _payment_method not in ('online','onsite') then raise exception 'invalid_payment_method'; end if;
  if char_length(trim(coalesce(_customer_name,''))) < 2
     or position('@' in coalesce(_customer_email,'')) <= 1
     or char_length(trim(coalesce(_customer_phone,''))) < 7 then
    raise exception 'customer_contact_required';
  end if;

  select * into _resource
  from public.reservation_resources
  where id = _resource_id and is_active
  for share;
  if not found then raise exception 'resource_not_found'; end if;
  if _party_size > _resource.capacity then raise exception 'capacity_exceeded'; end if;
  if _payment_method = 'online' and not _resource.online_payment_enabled then
    raise exception 'online_payment_unavailable';
  end if;
  if _payment_method = 'onsite' and not _resource.onsite_payment_enabled then
    raise exception 'onsite_payment_unavailable';
  end if;

  _ends_at := _starts_at + make_interval(mins => _resource.duration_minutes);
  -- Lock the whole resource (not only one slot) so overlapping slot starts
  -- cannot be booked concurrently when duration exceeds the slot interval.
  perform pg_advisory_xact_lock(hashtextextended(_resource_id::text,0));

  if not exists (
    select 1
    from public.get_reservation_availability(_resource_id,(_starts_at at time zone 'Asia/Baku')::date) a
    where a.starts_at = _starts_at and a.ends_at = _ends_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.reservations (
    seller_id,customer_id,module_code,resource_id,starts_at,ends_at,party_size,
    payment_method,payment_status,amount,currency,
    customer_name,customer_email,customer_phone,notes,hold_expires_at
  ) values (
    _resource.seller_id,_user,_resource.module_code,_resource.id,_starts_at,_ends_at,_party_size,
    _payment_method,case when _resource.price = 0 then 'not_required' else 'pending' end,
    _resource.price,_resource.currency,
    left(trim(_customer_name),160),left(lower(trim(_customer_email)),255),
    left(trim(_customer_phone),30),nullif(left(trim(coalesce(_notes,'')),2000),''),
    case when _payment_method = 'online' and _resource.price > 0 then now() + interval '30 minutes' else null end
  )
  returning * into _result;

  return _result;
end;
$function$;

revoke all on function public.create_reservation(uuid,timestamptz,integer,text,text,text,text,text) from public,anon;
grant execute on function public.create_reservation(uuid,timestamptz,integer,text,text,text,text,text) to authenticated;

create or replace function public.update_reservation_status(
  _reservation_id uuid,
  _new_status text,
  _note text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = pg_catalog,public
as $function$
declare
  _user uuid := auth.uid();
  _reservation public.reservations%rowtype;
  _is_admin boolean;
  _allowed boolean := false;
begin
  if _user is null then raise exception 'authentication_required'; end if;
  if _new_status not in ('requested','confirmed','cancelled','completed','no_show') then
    raise exception 'invalid_status';
  end if;

  select * into _reservation from public.reservations
  where id = _reservation_id for update;
  if not found then raise exception 'reservation_not_found'; end if;
  _is_admin := public.has_role(_user,'admin'::public.app_role);

  if _is_admin then
    _allowed := true;
  elsif _user = _reservation.customer_id then
    _allowed := _new_status = 'cancelled' and _reservation.status in ('requested','confirmed');
  elsif _user = _reservation.seller_id then
    _allowed := (
      (_reservation.status = 'requested' and _new_status in ('confirmed','cancelled'))
      or (_reservation.status = 'confirmed' and _new_status in ('completed','cancelled','no_show'))
    );
  end if;

  if not _allowed then raise exception 'status_transition_not_allowed'; end if;
  if _reservation.status = _new_status then return _reservation; end if;

  update public.reservations
  set status = _new_status,
      cancellation_reason = case when _new_status = 'cancelled' then nullif(left(trim(coalesce(_note,'')),1000),'') else cancellation_reason end,
      confirmed_at = case when _new_status = 'confirmed' then now() else confirmed_at end,
      cancelled_at = case when _new_status = 'cancelled' then now() else cancelled_at end,
      completed_at = case when _new_status = 'completed' then now() else completed_at end,
      updated_at = now()
  where id = _reservation_id
  returning * into _reservation;

  return _reservation;
end;
$function$;

revoke all on function public.update_reservation_status(uuid,text,text) from public,anon;
grant execute on function public.update_reservation_status(uuid,text,text) to authenticated;

create or replace function public.prepare_reservation_payment_intent(
  _user_id uuid,
  _resource_id uuid
)
returns table(payment_id uuid,merchant_order_id text,amount numeric,currency text,description text)
language plpgsql
security definer
set search_path = pg_catalog,public
as $function$
declare
  _reservation public.reservations%rowtype;
  _payment_id uuid;
  _merchant text;
  _description text;
begin
  select * into _reservation
  from public.reservations
  where id = _resource_id and customer_id = _user_id
  for update;
  if not found then raise exception 'reservation_not_found'; end if;
  if _reservation.status = 'cancelled' then raise exception 'reservation_cancelled'; end if;
  if _reservation.payment_method <> 'online' then raise exception 'online_payment_not_selected'; end if;
  if _reservation.payment_status = 'paid' then raise exception 'reservation_already_paid'; end if;
  if _reservation.amount <= 0 then raise exception 'payment_not_required'; end if;
  if _reservation.hold_expires_at is not null and _reservation.hold_expires_at <= now() then
    raise exception 'reservation_hold_expired';
  end if;

  _merchant := 'pay_' || replace(gen_random_uuid()::text,'-','');
  _description := 'EG Shop rezervasiya ' || _reservation.reservation_code;

  insert into public.payment_intents (
    user_id,service_type,resource_id,merchant_order_id,amount,currency,status,description,payload
  ) values (
    _user_id,'reservation',_reservation.id,_merchant,_reservation.amount,_reservation.currency,
    'pending',_description,jsonb_build_object('reservation_id',_reservation.id)
  ) returning id into _payment_id;
  update public.reservations
  set hold_expires_at = greatest(coalesce(hold_expires_at,now()),now() + interval '2 hours'),
      updated_at = now()
  where id = _reservation.id;

  return query
  select _payment_id,_merchant,_reservation.amount,_reservation.currency,_description;
end;
$function$;

revoke all on function public.prepare_reservation_payment_intent(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_reservation_payment_intent(uuid,uuid) to service_role;

create or replace function public.on_reservation_changed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog,public
as $function$
declare
  _seller_name text;
  _resource_name text;
  _title text;
  _body text;
begin
  select coalesce(p.shop_name,p.full_name,'Satıcı'),rr.name
  into _seller_name,_resource_name
  from public.reservation_resources rr
  left join public.profiles p on p.id = rr.seller_id
  where rr.id = new.resource_id;

  if tg_op = 'INSERT' then
    insert into public.reservation_status_history(reservation_id,old_status,new_status,changed_by,note)
    values(new.id,null,new.status,new.customer_id,'Rezervasiya yaradıldı');
    _title := 'Yeni rezervasiya';
    _body := new.reservation_code || ' — ' || coalesce(_resource_name,'Rezervasiya') || ', ' ||
      to_char(new.starts_at at time zone 'Asia/Baku','DD.MM.YYYY HH24:MI');
    insert into public.notifications(user_id,title,body,type,link)
    values
      (new.seller_id,_title,_body,'reservation','/dashboard?section=reservations'),
      (new.customer_id,'Rezervasiya qəbul edildi',_seller_name || ': ' || _body,'reservation','/reservations');
    insert into public.reservation_notification_queue(
      reservation_id,user_id,recipient_email,channel,event_type,payload
    ) values (
      new.id,new.customer_id,new.customer_email,'email','created',
      jsonb_build_object('title','Rezervasiya qəbul edildi','body',_seller_name || ': ' || _body)
    );
    insert into public.reservation_notification_queue(
      reservation_id,user_id,recipient_email,channel,event_type,payload
    )
    select new.id,new.seller_id,coalesce(nullif(p.shop_email,''),u.email),'email','created',
      jsonb_build_object('title',_title,'body',_body)
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = new.seller_id and coalesce(nullif(p.shop_email,''),u.email) is not null;
  elsif old.status is distinct from new.status then
    insert into public.reservation_status_history(reservation_id,old_status,new_status,changed_by,note)
    values(new.id,old.status,new.status,auth.uid(),new.cancellation_reason);
    _title := case new.status
      when 'confirmed' then 'Rezervasiya təsdiqləndi'
      when 'cancelled' then 'Rezervasiya ləğv edildi'
      when 'completed' then 'Rezervasiya tamamlandı'
      when 'no_show' then 'Rezervasiyaya gəlmədi'
      else 'Rezervasiya yeniləndi'
    end;
    _body := new.reservation_code || ' — ' || coalesce(_resource_name,'Rezervasiya') || ': ' || _title;
    insert into public.notifications(user_id,title,body,type,link)
    values
      (new.customer_id,_title,_body,'reservation','/reservations'),
      (new.seller_id,_title,_body,'reservation','/dashboard?section=reservations');
    insert into public.reservation_notification_queue(
      reservation_id,user_id,recipient_email,channel,event_type,payload
    ) values (
      new.id,new.customer_id,new.customer_email,'email','status_changed',
      jsonb_build_object('title',_title,'body',_body)
    );
    insert into public.reservation_notification_queue(
      reservation_id,user_id,recipient_email,channel,event_type,payload
    )
    select new.id,new.seller_id,coalesce(nullif(p.shop_email,''),u.email),'email','status_changed',
      jsonb_build_object('title',_title,'body',_body)
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = new.seller_id and coalesce(nullif(p.shop_email,''),u.email) is not null;
  end if;
  return new;
end;
$function$;

drop trigger if exists reservation_changed_trigger on public.reservations;
create trigger reservation_changed_trigger
after insert or update of status on public.reservations
for each row execute function public.on_reservation_changed();

create or replace function public.fulfill_paid_reservation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog,public
as $function$
begin
  if new.service_type = 'reservation'
     and new.status = 'success'
     and old.status is distinct from new.status
     and new.resource_id is not null then
    update public.reservations
    set payment_status = 'paid',
        status = case when status = 'requested' then 'confirmed' else status end,
        confirmed_at = coalesce(confirmed_at,now()),
        updated_at = now()
    where id = new.resource_id
      and customer_id = new.user_id
      and amount = new.amount
      and currency = new.currency
      and status <> 'cancelled';
  elsif new.service_type = 'reservation'
        and new.status in ('error','server_error','returned')
        and old.status is distinct from new.status
        and new.resource_id is not null then
    update public.reservations
    set payment_status = case when new.status = 'returned' then 'refunded' else 'failed' end,
        updated_at = now()
    where id = new.resource_id and customer_id = new.user_id and payment_status <> 'paid';
  end if;
  return new;
end;
$function$;

drop trigger if exists fulfill_paid_reservation_trigger on public.payment_intents;
create trigger fulfill_paid_reservation_trigger
after update of status on public.payment_intents
for each row execute function public.fulfill_paid_reservation();

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists reservation_resources_updated_at on public.reservation_resources;
    create trigger reservation_resources_updated_at before update on public.reservation_resources
    for each row execute function public.set_updated_at();
    drop trigger if exists reservation_schedules_updated_at on public.reservation_schedules;
    create trigger reservation_schedules_updated_at before update on public.reservation_schedules
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;

alter table public.reservations replica identity full;
