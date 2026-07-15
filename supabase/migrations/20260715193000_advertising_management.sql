-- Modular advertising catalog, package services and seller assignment controls.
create table if not exists public.ad_service_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  default_duration_days integer not null default 7 check (default_duration_days > 0),
  default_usage_limit integer not null default 1 check (default_usage_limit >= 0),
  display_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(display_rules) = 'object'),
  priority integer not null default 100,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_package_services (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.ad_packages(id) on delete cascade,
  service_type_id uuid not null references public.ad_service_types(id) on delete restrict,
  is_active boolean not null default true,
  activation_price numeric(12,2) not null default 0 check (activation_price >= 0),
  duration_days integer not null default 7 check (duration_days > 0),
  usage_limit integer not null default 1 check (usage_limit >= 0),
  priority integer not null default 100,
  display_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(display_rules) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (package_id, service_type_id)
);

create index if not exists ad_package_services_package_idx on public.ad_package_services(package_id);
create index if not exists ad_package_services_type_idx on public.ad_package_services(service_type_id);
create index if not exists seller_subscriptions_seller_active_idx on public.seller_subscriptions(seller_id, is_active, ends_at desc);

alter table public.seller_subscriptions
  add column if not exists source text not null default 'seller',
  add column if not exists admin_note text,
  add column if not exists assigned_by uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid;

alter table public.ad_service_types enable row level security;
alter table public.ad_package_services enable row level security;

drop policy if exists "Ad service types read" on public.ad_service_types;
create policy "Ad service types read" on public.ad_service_types
  for select
  using (is_active or public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Ad service types admin manage" on public.ad_service_types;
create policy "Ad service types admin manage" on public.ad_service_types
  for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Package services read" on public.ad_package_services;
create policy "Package services read" on public.ad_package_services
  for select
  using (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or (
      is_active
      and exists (select 1 from public.ad_packages p where p.id = package_id and p.is_active)
      and exists (select 1 from public.ad_service_types t where t.id = service_type_id and t.is_active)
    )
  );

drop policy if exists "Package services admin manage" on public.ad_package_services;
create policy "Package services admin manage" on public.ad_package_services
  for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

grant select on public.ad_service_types, public.ad_package_services to anon, authenticated;
grant insert, update, delete on public.ad_service_types, public.ad_package_services to authenticated;

insert into public.ad_service_types
  (slug, name, description, base_price, default_duration_days, default_usage_limit, display_rules, priority, settings, sort_order)
values
  ('shop_promotion', 'MaÄŸazanÄ± reklam et', 'MaÄŸazanÄ± ana sÉ™hifÉ™dÉ™ vÉ™ seÃ§ilmiÅŸ vitrinlÉ™rdÉ™ gÃ¶stÉ™rir.', 10, 7, 1, '{"position":"home_featured"}'::jsonb, 80, '{"icon":"store"}'::jsonb, 10),
  ('product_promotion', 'MÉ™hsulu irÉ™li Ã§É™k', 'MÉ™hsulu kataloqda vÉ™ ana sÉ™hifÉ™dÉ™ Ã¶n sÄ±ralara Ã§Ä±xarÄ±r.', 5, 7, 5, '{"position":"catalog_top"}'::jsonb, 70, '{"icon":"package"}'::jsonb, 20),
  ('banner_promotion', 'Banner reklamÄ±', 'ÅžÉ™kil vÉ™ ya video bannerini seÃ§ilmiÅŸ reklam mÃ¶vqeyindÉ™ gÃ¶stÉ™rir.', 5, 30, 1, '{"position":"home_top","media":["image","video"]}'::jsonb, 60, '{"icon":"image"}'::jsonb, 30)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.ad_package_services
  (package_id, service_type_id, is_active, activation_price, duration_days, usage_limit, priority, display_rules, settings)
select p.id, t.id, true, 1, p.duration_days,
  case t.slug
    when 'banner_promotion' then p.banner_slots
    when 'product_promotion' then p.sponsored_product_slots
    when 'shop_promotion' then p.shop_promo_slots
  end,
  t.priority, t.display_rules, '{}'::jsonb
from public.ad_packages p
cross join public.ad_service_types t
where t.slug in ('banner_promotion', 'product_promotion', 'shop_promotion')
on conflict (package_id, service_type_id) do nothing;

create or replace function public.sync_ad_package_legacy_limits()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_package uuid;
begin
  if tg_op = 'DELETE' then
    target_package := old.package_id;
  else
    target_package := new.package_id;
  end if;
  update public.ad_packages p set
    banner_slots = coalesce((
      select ps.usage_limit from public.ad_package_services ps
      join public.ad_service_types st on st.id = ps.service_type_id
      where ps.package_id = target_package and st.slug = 'banner_promotion' and ps.is_active
    ), 0),
    sponsored_product_slots = coalesce((
      select ps.usage_limit from public.ad_package_services ps
      join public.ad_service_types st on st.id = ps.service_type_id
      where ps.package_id = target_package and st.slug = 'product_promotion' and ps.is_active
    ), 0),
    shop_promo_slots = coalesce((
      select ps.usage_limit from public.ad_package_services ps
      join public.ad_service_types st on st.id = ps.service_type_id
      where ps.package_id = target_package and st.slug = 'shop_promotion' and ps.is_active
    ), 0)
  where p.id = target_package;
  return null;
end;
$$;

drop trigger if exists sync_ad_package_legacy_limits_trigger on public.ad_package_services;
create trigger sync_ad_package_legacy_limits_trigger
after insert or update or delete on public.ad_package_services
for each row execute function public.sync_ad_package_legacy_limits();

drop trigger if exists touch_ad_service_types on public.ad_service_types;
create trigger touch_ad_service_types before update on public.ad_service_types
for each row execute function public.touch_updated_at();

drop trigger if exists touch_ad_package_services on public.ad_package_services;
create trigger touch_ad_package_services before update on public.ad_package_services
for each row execute function public.touch_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ad_service_types') then
    alter publication supabase_realtime add table public.ad_service_types;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ad_package_services') then
    alter publication supabase_realtime add table public.ad_package_services;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ad_packages') then
    alter publication supabase_realtime add table public.ad_packages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seller_subscriptions') then
    alter publication supabase_realtime add table public.seller_subscriptions;
  end if;
end $$;

