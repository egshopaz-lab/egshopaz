-- Unified admin operations center: queues, moderation, alerts, support workflow,
-- saved views, scoped admin roles, user 360 and bulk operations.

alter table public.products
  add column if not exists moderation_status text not null default 'pending',
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_moderation_status_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_moderation_status_check
      check (moderation_status in ('pending','approved','rejected'));
  end if;
end $$;

update public.products
set moderation_status = case when is_active then 'approved' else 'pending' end
where moderation_status is null
   or (moderation_status = 'pending' and is_active = true);

alter table public.support_tickets
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists internal_note text,
  add column if not exists first_response_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'support_tickets_priority_check'
      and conrelid = 'public.support_tickets'::regclass
  ) then
    alter table public.support_tickets add constraint support_tickets_priority_check
      check (priority in ('low','normal','high','urgent'));
  end if;
end $$;

create table if not exists public.admin_staff_permissions (
  admin_id uuid primary key references auth.users(id) on delete cascade,
  role_key text not null default 'support',
  permissions text[] not null default array[]::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (role_key in ('super_admin','seller_moderator','product_moderator','finance','support','advertising','delivery','analyst'))
);

create table if not exists public.admin_saved_views (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  section text not null,
  filters jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_id, section, name)
);

create table if not exists public.admin_internal_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(trim(note)) between 2 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_operational_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  title text not null,
  description text,
  entity_type text,
  entity_id text,
  dedupe_key text not null unique,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  assigned_admin_id uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_staff_permissions enable row level security;
alter table public.admin_saved_views enable row level security;
alter table public.admin_internal_notes enable row level security;
alter table public.admin_operational_alerts enable row level security;

create or replace function public.is_admin_user(_uid uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$ select exists(select 1 from public.user_roles where user_id=_uid and role='admin'::public.app_role) $$;

revoke all on function public.is_admin_user(uuid) from public, anon;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;

create or replace function public.enforce_product_moderation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.is_admin_user(auth.uid()) then return new; end if;
  if tg_op='INSERT' then
    new.moderation_status := 'pending'; new.moderation_reason := null;
    new.moderated_at := null; new.moderated_by := null; new.is_active := false;
  elsif new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.price is distinct from old.price
     or new.category_id is distinct from old.category_id
     or new.image_url is distinct from old.image_url then
    new.moderation_status := 'pending'; new.moderation_reason := null;
    new.moderated_at := null; new.moderated_by := null; new.is_active := false;
  else
    new.moderation_status := old.moderation_status;
    new.moderation_reason := old.moderation_reason;
    new.moderated_at := old.moderated_at; new.moderated_by := old.moderated_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_product_moderation on public.products;
create trigger trg_enforce_product_moderation before insert or update on public.products
for each row execute function public.enforce_product_moderation();

drop policy if exists "Admins manage staff permissions" on public.admin_staff_permissions;
create policy "Admins manage staff permissions" on public.admin_staff_permissions for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Admins manage own saved views" on public.admin_saved_views;
create policy "Admins manage own saved views" on public.admin_saved_views for all to authenticated
using (admin_id=auth.uid() and public.is_admin_user(auth.uid()))
with check (admin_id=auth.uid() and public.is_admin_user(auth.uid()));
drop policy if exists "Admins manage internal notes" on public.admin_internal_notes;
create policy "Admins manage internal notes" on public.admin_internal_notes for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));
drop policy if exists "Admins manage operational alerts" on public.admin_operational_alerts;
create policy "Admins manage operational alerts" on public.admin_operational_alerts for all to authenticated
using (public.is_admin_user(auth.uid())) with check (public.is_admin_user(auth.uid()));

grant select, insert, update, delete on public.admin_staff_permissions, public.admin_saved_views,
  public.admin_internal_notes, public.admin_operational_alerts to authenticated;

create or replace function public.admin_has_permission(_permission text)
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select public.is_admin_user(auth.uid()) and coalesce((
    select is_active and (role_key='super_admin' or _permission=any(permissions))
    from public.admin_staff_permissions where admin_id=auth.uid()
  ), true)
$$;
revoke all on function public.admin_has_permission(text) from public, anon;
grant execute on function public.admin_has_permission(text) to authenticated;

create or replace function public.admin_work_queue()
returns jsonb
language sql stable security definer set search_path = pg_catalog, public
as $$
  select case when not public.is_admin_user(auth.uid()) then
    jsonb_build_object('error','admin_required')
  else jsonb_build_object(
    'pending_products', (select count(*) from public.products where moderation_status='pending'),
    'unpaid_sellers', (select count(*) from public.seller_applications where coalesce(payment_status,'pending') not in ('success','migrated')),
    'open_disputes', (select count(*) from public.disputes where status='open'),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open','pending','in_progress')),
    'urgent_tickets', (select count(*) from public.support_tickets where status in ('open','pending','in_progress') and priority='urgent'),
    'failed_payments_24h', (select count(*) from public.epoint_payment_transactions where status in ('error','server_error') and created_at >= now()-interval '24 hours'),
    'pending_orders', (select count(*) from public.orders where status='pending'),
    'stock_out_products', (select count(*) from public.products where stock<=0 and is_active=true),
    'unresolved_alerts', (select count(*) from public.admin_operational_alerts where status='open')
  ) end
$$;
revoke all on function public.admin_work_queue() from public, anon;
grant execute on function public.admin_work_queue() to authenticated;

create or replace function public.admin_refresh_operational_alerts()
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare _count integer := 0; _n integer;
begin
  if not public.is_admin_user(auth.uid()) then raise exception 'Admin icazəsi tələb olunur'; end if;

  insert into public.admin_operational_alerts(alert_type,severity,title,description,entity_type,dedupe_key)
  select 'failed_payments','critical','Son 24 saatda uğursuz ödənişlər', count(*)||' uğursuz ödəniş əməliyyatı tapıldı','payment','failed_payments_24h'
  from public.epoint_payment_transactions where status in ('error','server_error') and created_at>=now()-interval '24 hours'
  having count(*)>0
  on conflict(dedupe_key) do update set description=excluded.description,status='open',updated_at=now();
  get diagnostics _n = row_count; _count := _count + _n;

  insert into public.admin_operational_alerts(alert_type,severity,title,description,entity_type,dedupe_key)
  select 'pending_products','warning','Gecikən məhsul moderasiyası', count(*)||' məhsul 24 saatdan çoxdur təsdiq gözləyir','product','pending_products_24h'
  from public.products where moderation_status='pending' and created_at<now()-interval '24 hours'
  having count(*)>0
  on conflict(dedupe_key) do update set description=excluded.description,status='open',updated_at=now();
  get diagnostics _n = row_count; _count := _count + _n;

  insert into public.admin_operational_alerts(alert_type,severity,title,description,entity_type,dedupe_key)
  select 'support_sla','warning','Dəstək cavabı gecikir', count(*)||' müraciət 24 saatdan çoxdur cavabsızdır','support_ticket','support_sla_24h'
  from public.support_tickets where status in ('open','pending','in_progress') and created_at<now()-interval '24 hours'
  having count(*)>0
  on conflict(dedupe_key) do update set description=excluded.description,status='open',updated_at=now();
  get diagnostics _n = row_count; _count := _count + _n;

  insert into public.admin_operational_alerts(alert_type,severity,title,description,entity_type,dedupe_key)
  select 'stock','warning','Stoku bitən aktiv məhsullar', count(*)||' aktiv məhsulun stoku bitib','product','active_stock_out'
  from public.products where is_active=true and stock<=0
  having count(*)>0
  on conflict(dedupe_key) do update set description=excluded.description,status='open',updated_at=now();
  get diagnostics _n = row_count; _count := _count + _n;

  return jsonb_build_object('ok',true,'alerts_refreshed',_count);
end;
$$;
revoke all on function public.admin_refresh_operational_alerts() from public, anon;
grant execute on function public.admin_refresh_operational_alerts() to authenticated;

create or replace function public.admin_payment_reconciliation(_status text default null, _limit integer default 300)
returns table(id uuid,merchant_order_id text,amount numeric,currency text,status text,message text,paid_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select t.id,t.merchant_order_id,t.amount,t.currency,t.status,t.message,t.paid_at,t.created_at
  from public.epoint_payment_transactions t
  where public.admin_has_permission('payments.manage')
    and (nullif(_status,'') is null or t.status=_status)
  order by t.created_at desc limit least(greatest(coalesce(_limit,300),1),1000)
$$;
revoke all on function public.admin_payment_reconciliation(text,integer) from public, anon;
grant execute on function public.admin_payment_reconciliation(text,integer) to authenticated;

create or replace function public.admin_set_staff_role(_admin_id uuid,_role_key text,_permissions text[])
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if not public.admin_has_permission('admins.manage') then raise exception 'Admin səlahiyyətlərini dəyişmək icazəsi yoxdur'; end if;
  if not exists(select 1 from public.user_roles where user_id=_admin_id and role='admin'::public.app_role) then raise exception 'İstifadəçi admin deyil'; end if;
  if _role_key not in ('super_admin','seller_moderator','product_moderator','finance','support','advertising','delivery','analyst') then raise exception 'Admin rolu etibarsızdır'; end if;
  insert into public.admin_staff_permissions(admin_id,role_key,permissions,is_active,updated_by,updated_at)
  values(_admin_id,_role_key,coalesce(_permissions,array[]::text[]),true,auth.uid(),now())
  on conflict(admin_id) do update set role_key=excluded.role_key,permissions=excluded.permissions,is_active=true,updated_by=auth.uid(),updated_at=now();
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,target_user_id,new_data)
  values(auth.uid(),'admin_role_updated','admin_staff',_admin_id::text,_admin_id,jsonb_build_object('role_key',_role_key,'permissions',_permissions));
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_set_staff_role(uuid,text,text[]) from public, anon;
grant execute on function public.admin_set_staff_role(uuid,text,text[]) to authenticated;

drop policy if exists "Admins manage staff permissions" on public.admin_staff_permissions;
drop policy if exists "Admins read staff permissions" on public.admin_staff_permissions;
drop policy if exists "Authorized admins insert staff permissions" on public.admin_staff_permissions;
drop policy if exists "Authorized admins update staff permissions" on public.admin_staff_permissions;
drop policy if exists "Authorized admins delete staff permissions" on public.admin_staff_permissions;
create policy "Admins read staff permissions" on public.admin_staff_permissions for select to authenticated
using (public.is_admin_user(auth.uid()));
create policy "Authorized admins insert staff permissions" on public.admin_staff_permissions for insert to authenticated
with check (public.admin_has_permission('admins.manage'));
create policy "Authorized admins update staff permissions" on public.admin_staff_permissions for update to authenticated
using (public.admin_has_permission('admins.manage')) with check (public.admin_has_permission('admins.manage'));
create policy "Authorized admins delete staff permissions" on public.admin_staff_permissions for delete to authenticated
using (public.admin_has_permission('admins.manage'));

create or replace function public.admin_bulk_operational_action(
  _entity text, _ids uuid[], _action text, _reason text default null
)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare _affected integer := 0; _id uuid;
begin
  if not public.is_admin_user(auth.uid()) then raise exception 'Admin icazəsi tələb olunur'; end if;
  if coalesce(array_length(_ids,1),0)=0 or array_length(_ids,1)>200 then raise exception '1-200 qeyd seçin'; end if;

  if _entity='product' then
    if not public.admin_has_permission('products.manage') then raise exception 'Məhsul icazəsi yoxdur'; end if;
    if _action='approve' then
      update public.products set moderation_status='approved',moderation_reason=null,moderated_at=now(),moderated_by=auth.uid(),is_active=true where id=any(_ids);
    elsif _action='reject' then
      update public.products set moderation_status='rejected',moderation_reason=nullif(left(trim(coalesce(_reason,'')),500),''),moderated_at=now(),moderated_by=auth.uid(),is_active=false where id=any(_ids);
    elsif _action='deactivate' then
      update public.products set is_active=false where id=any(_ids);
    else raise exception 'Məhsul əməliyyatı dəstəklənmir'; end if;
    get diagnostics _affected = row_count;
  elsif _entity='account' then
    if not public.admin_has_permission('accounts.manage') then raise exception 'Hesab icazəsi yoxdur'; end if;
    if _action='activate' then
      update public.profiles set account_status='active',blocked_until=null,block_reason=null,updated_at=now() where id=any(_ids);
    elsif _action='deactivate' then
      update public.profiles set account_status='inactive',block_reason=nullif(left(trim(coalesce(_reason,'')),500),''),updated_at=now() where id=any(_ids);
    else raise exception 'Hesab əməliyyatı dəstəklənmir'; end if;
    get diagnostics _affected = row_count;
  else raise exception 'Obyekt növü dəstəklənmir'; end if;

  foreach _id in array _ids loop
    insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,reason,new_data)
    values(auth.uid(),'bulk_'||_action,_entity,_id::text,nullif(left(trim(coalesce(_reason,'')),1000),''),jsonb_build_object('bulk',true));
  end loop;
  return jsonb_build_object('ok',true,'affected',_affected);
end;
$$;
revoke all on function public.admin_bulk_operational_action(text,uuid[],text,text) from public, anon;
grant execute on function public.admin_bulk_operational_action(text,uuid[],text,text) to authenticated;

create or replace function public.admin_user_360(_target_id uuid)
returns jsonb
language sql stable security definer set search_path = pg_catalog, public
as $$
  select case when not public.is_admin_user(auth.uid()) then jsonb_build_object('error','admin_required')
  else jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where p.id=_target_id),
    'roles',(select coalesce(jsonb_agg(ur.role),'[]'::jsonb) from public.user_roles ur where ur.user_id=_target_id),
    'seller_application',(select to_jsonb(sa) from public.seller_applications sa where sa.user_id=_target_id),
    'products',(select jsonb_build_object('total',count(*),'active',count(*) filter(where is_active)) from public.products where seller_id=_target_id),
    'orders',(select jsonb_build_object('total',count(*),'amount',coalesce(sum(total),0)) from public.orders where buyer_id=_target_id),
    'tickets',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) from (select * from public.support_tickets where user_id=_target_id order by created_at desc limit 20) t),
    'notes',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) from (select * from public.admin_internal_notes where target_user_id=_target_id order by created_at desc limit 20) n),
    'audit',(select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb) from (select * from public.admin_audit_logs where target_user_id=_target_id order by created_at desc limit 30) a)
  ) end
$$;
revoke all on function public.admin_user_360(uuid) from public, anon;
grant execute on function public.admin_user_360(uuid) to authenticated;

create index if not exists products_moderation_queue_idx on public.products(moderation_status,created_at);
create index if not exists support_tickets_work_queue_idx on public.support_tickets(status,priority,created_at);
create index if not exists admin_alerts_status_severity_idx on public.admin_operational_alerts(status,severity,created_at desc);

