-- Central commercial configuration controlled by administrators.
alter table public.business_modules
  add column if not exists activation_fee numeric(12,2) not null default 0 check (activation_fee >= 0),
  add column if not exists monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  add column if not exists commission_percent numeric(6,3) check (commission_percent between 0 and 100);

alter table public.system_settings
  add column if not exists shorts_monthly_price numeric(12,2) not null default 9.90 check (shorts_monthly_price >= 0),
  add column if not exists reservation_min_advance_minutes integer not null default 60 check (reservation_min_advance_minutes between 0 and 525600),
  add column if not exists reservation_max_advance_days integer not null default 90 check (reservation_max_advance_days between 1 and 1095),
  add column if not exists reservation_cancel_before_hours integer not null default 24 check (reservation_cancel_before_hours between 0 and 8760),
  add column if not exists reservation_auto_confirm boolean not null default false,
  add column if not exists pvz_registration_fee numeric(12,2) not null default 0 check (pvz_registration_fee >= 0),
  add column if not exists pvz_free_storage_days integer not null default 3 check (pvz_free_storage_days between 0 and 365),
  add column if not exists pvz_commission_per_order numeric(12,2) not null default 0 check (pvz_commission_per_order >= 0),
  add column if not exists pvz_auto_accept boolean not null default false;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,64}$'),
  name text not null,
  description text,
  audience text not null default 'seller' check (audience in ('seller','pvz','customer')),
  price numeric(12,2) not null default 0 check (price >= 0),
  duration_days integer not null default 30 check (duration_days between 1 and 3650),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_policies (
  module_code text primary key references public.business_modules(code) on delete cascade,
  min_advance_minutes integer not null default 60 check (min_advance_minutes between 0 and 525600),
  max_advance_days integer not null default 90 check (max_advance_days between 1 and 1095),
  cancel_before_hours integer not null default 24 check (cancel_before_hours between 0 and 8760),
  auto_confirm boolean not null default false,
  require_online_payment boolean not null default false,
  deposit_percent numeric(6,3) not null default 0 check (deposit_percent between 0 and 100),
  max_party_size integer not null default 10000 check (max_party_size between 1 and 10000),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.working_hours_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  schedule jsonb not null check (jsonb_typeof(schedule) = 'array'),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courier_tariffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type text not null default 'standard' check (service_type in ('standard','express','same_day','pvz')),
  city text,
  base_fee numeric(12,2) not null default 0 check (base_fee >= 0),
  per_km_fee numeric(12,2) not null default 0 check (per_km_fee >= 0),
  min_fee numeric(12,2) not null default 0 check (min_fee >= 0),
  free_delivery_over numeric(12,2) check (free_delivery_over is null or free_delivery_over >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  campaign_type text not null default 'discount' check (campaign_type in ('discount','cashback','free_delivery','banner','coupon')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  discount_percent numeric(6,3) check (discount_percent is null or discount_percent between 0 and 100),
  budget numeric(12,2) check (budget is null or budget >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

insert into public.reservation_policies (module_code)
select code from public.business_modules
where code in ('restaurant','beauty_salon','services','rent_a_car','clinic','hotel','course_center','tourism','events_tickets')
on conflict (module_code) do nothing;

insert into public.working_hours_templates (name,schedule,is_default)
values
  ('Standart iş həftəsi', '[{"day":1,"start":"09:00","end":"18:00"},{"day":2,"start":"09:00","end":"18:00"},{"day":3,"start":"09:00","end":"18:00"},{"day":4,"start":"09:00","end":"18:00"},{"day":5,"start":"09:00","end":"18:00"}]'::jsonb, true),
  ('Hər gün', '[{"day":0,"start":"09:00","end":"21:00"},{"day":1,"start":"09:00","end":"21:00"},{"day":2,"start":"09:00","end":"21:00"},{"day":3,"start":"09:00","end":"21:00"},{"day":4,"start":"09:00","end":"21:00"},{"day":5,"start":"09:00","end":"21:00"},{"day":6,"start":"09:00","end":"21:00"}]'::jsonb, false)
on conflict (name) do nothing;

alter table public.subscription_plans enable row level security;
alter table public.reservation_policies enable row level security;
alter table public.working_hours_templates enable row level security;
alter table public.courier_tariffs enable row level security;
alter table public.marketing_campaigns enable row level security;

drop policy if exists "Commercial plans public read" on public.subscription_plans;
create policy "Commercial plans public read" on public.subscription_plans for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Commercial plans admin manage" on public.subscription_plans;
create policy "Commercial plans admin manage" on public.subscription_plans for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Reservation policies public read" on public.reservation_policies;
create policy "Reservation policies public read" on public.reservation_policies for select using (true);
drop policy if exists "Reservation policies admin manage" on public.reservation_policies;
create policy "Reservation policies admin manage" on public.reservation_policies for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Working templates public read" on public.working_hours_templates;
create policy "Working templates public read" on public.working_hours_templates for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Working templates admin manage" on public.working_hours_templates;
create policy "Working templates admin manage" on public.working_hours_templates for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Courier tariffs public read" on public.courier_tariffs;
create policy "Courier tariffs public read" on public.courier_tariffs for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Courier tariffs admin manage" on public.courier_tariffs;
create policy "Courier tariffs admin manage" on public.courier_tariffs for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Campaigns public read" on public.marketing_campaigns;
create policy "Campaigns public read" on public.marketing_campaigns for select using (
  (is_active and starts_at <= now() and ends_at > now()) or public.has_role(auth.uid(),'admin'::public.app_role)
);
drop policy if exists "Campaigns admin manage" on public.marketing_campaigns;
create policy "Campaigns admin manage" on public.marketing_campaigns for all to authenticated
using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

grant select on public.subscription_plans,public.reservation_policies,public.working_hours_templates,public.courier_tariffs,public.marketing_campaigns to anon,authenticated;
grant insert,update,delete on public.subscription_plans,public.reservation_policies,public.working_hours_templates,public.courier_tariffs,public.marketing_campaigns to authenticated;

create or replace function public.touch_commercial_settings()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['subscription_plans','reservation_policies','working_hours_templates','courier_tariffs','marketing_campaigns']
  loop
    execute format('drop trigger if exists touch_commercial_settings on public.%I',t);
    execute format('create trigger touch_commercial_settings before update on public.%I for each row execute function public.touch_commercial_settings()',t);
  end loop;
end $$;

-- Enforce current reservation rules for every insert, including RPC and future integrations.
create or replace function public.enforce_reservation_policy()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
declare
  p public.reservation_policies%rowtype;
  s public.system_settings%rowtype;
begin
  select * into p from public.reservation_policies where module_code = new.module_code and is_active;
  select * into s from public.system_settings limit 1;
  if new.starts_at < now() + make_interval(mins => coalesce(p.min_advance_minutes,s.reservation_min_advance_minutes,60)) then
    raise exception 'reservation_too_soon';
  end if;
  if new.starts_at > now() + make_interval(days => coalesce(p.max_advance_days,s.reservation_max_advance_days,90)) then
    raise exception 'reservation_too_far';
  end if;
  if new.party_size > coalesce(p.max_party_size,10000) then raise exception 'reservation_party_limit'; end if;
  if coalesce(p.require_online_payment,false) and new.payment_method <> 'online' then raise exception 'online_payment_required'; end if;
  if coalesce(p.auto_confirm,s.reservation_auto_confirm,false) and (new.payment_method = 'onsite' or new.amount = 0) then
    new.status := 'confirmed';
    new.confirmed_at := coalesce(new.confirmed_at,now());
  end if;
  return new;
end $$;

drop trigger if exists enforce_reservation_policy_trigger on public.reservations;
create trigger enforce_reservation_policy_trigger before insert on public.reservations
for each row execute function public.enforce_reservation_policy();

-- Public, stable snapshot used by all clients; admin updates become effective immediately.
create or replace function public.get_commercial_config()
returns jsonb
language sql stable security definer set search_path=pg_catalog,public
as $$
  select jsonb_build_object(
    'system',coalesce((select to_jsonb(s)-'id' from public.system_settings s limit 1),'{}'::jsonb),
    'modules',coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order) from public.business_modules m where m.is_active),'[]'::jsonb),
    'reservation_policies',coalesce((select jsonb_agg(to_jsonb(r)) from public.reservation_policies r where r.is_active),'[]'::jsonb),
    'courier_tariffs',coalesce((select jsonb_agg(to_jsonb(c)) from public.courier_tariffs c where c.is_active),'[]'::jsonb),
    'subscription_plans',coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order) from public.subscription_plans p where p.is_active),'[]'::jsonb)
  )
$$;
revoke all on function public.get_commercial_config() from public;
grant execute on function public.get_commercial_config() to anon,authenticated;

do $$
declare t text;
begin
  foreach t in array array['subscription_plans','reservation_policies','working_hours_templates','courier_tariffs','marketing_campaigns']
  loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
