-- Extensible business module catalog and seller selections.

create table if not exists public.business_modules (
  code text primary key
    check (code ~ '^[a-z0-9_]{2,64}$'),
  name_az text not null,
  name_en text not null,
  name_ru text not null,
  description_az text,
  description_en text,
  description_ru text,
  icon_key text not null default 'blocks',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_business_modules (
  seller_id uuid not null references auth.users(id) on delete cascade,
  module_code text not null references public.business_modules(code) on delete restrict,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  primary key (seller_id, module_code)
);

create index if not exists seller_business_modules_module_idx
  on public.seller_business_modules(module_code);

create or replace function public.set_business_module_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_business_modules_updated_at on public.business_modules;
create trigger set_business_modules_updated_at
before update on public.business_modules
for each row execute function public.set_business_module_updated_at();

drop trigger if exists set_seller_business_modules_updated_at on public.seller_business_modules;
create trigger set_seller_business_modules_updated_at
before update on public.seller_business_modules
for each row execute function public.set_business_module_updated_at();

insert into public.business_modules (
  code, name_az, name_en, name_ru,
  description_az, description_en, description_ru,
  icon_key, sort_order
) values
  ('marketplace', 'Marketplace', 'Marketplace', 'Маркетплейс',
   'Məhsullarınızı onlayn mağazada satın.', 'Sell products through your online store.', 'Продавайте товары через интернет-магазин.',
   'shopping-bag', 10),
  ('services', 'Xidmətlər', 'Services', 'Услуги',
   'Xidmətlərinizi təqdim edin və sifariş qəbul edin.', 'Offer services and receive bookings.', 'Предлагайте услуги и принимайте заказы.',
   'wrench', 20),
  ('restaurant', 'Restoran', 'Restaurant', 'Ресторан',
   'Menyu, masa rezervasiyası və çatdırılmanı idarə edin.', 'Manage menus, reservations and delivery.', 'Управляйте меню, бронированием и доставкой.',
   'utensils', 30),
  ('beauty_salon', 'Gözəllik Salonu', 'Beauty Salon', 'Салон красоты',
   'Xidmətləri, ustaları və görüşləri idarə edin.', 'Manage services, specialists and appointments.', 'Управляйте услугами, специалистами и записями.',
   'scissors', 40),
  ('rent_a_car', 'Rent a Car', 'Rent a Car', 'Прокат автомобилей',
   'Avtomobil parkını və rezervasiyaları idarə edin.', 'Manage vehicles and reservations.', 'Управляйте автопарком и бронированиями.',
   'car', 50),
  ('real_estate', 'Əmlak', 'Real Estate', 'Недвижимость',
   'Satış və kirayə elanları yerləşdirin.', 'Publish property sale and rental listings.', 'Публикуйте объявления о продаже и аренде.',
   'building-2', 60),
  ('auto_dealer', 'Avtosalon', 'Auto Dealership', 'Автосалон',
   'Avtomobil elanlarını və müraciətləri idarə edin.', 'Manage vehicle listings and leads.', 'Управляйте объявлениями автомобилей и заявками.',
   'car-front', 70),
  ('jobs', 'İş Elanları', 'Job Listings', 'Вакансии',
   'Vakansiyalar yerləşdirin və müraciətləri toplayın.', 'Publish vacancies and collect applications.', 'Публикуйте вакансии и собирайте отклики.',
   'briefcase-business', 80),
  ('clinic', 'Klinika', 'Clinic', 'Клиника',
   'Həkimləri, xidmətləri və qəbulları idarə edin.', 'Manage doctors, services and appointments.', 'Управляйте врачами, услугами и приёмами.',
   'hospital', 90),
  ('hotel', 'Otel', 'Hotel', 'Отель',
   'Otaqları, qiymətləri və rezervasiyaları idarə edin.', 'Manage rooms, rates and reservations.', 'Управляйте номерами, тарифами и бронированиями.',
   'hotel', 100),
  ('course_center', 'Kurs Mərkəzi', 'Course Center', 'Учебный центр',
   'Kursları, qrupları və qeydiyyatları idarə edin.', 'Manage courses, groups and enrolments.', 'Управляйте курсами, группами и регистрациями.',
   'graduation-cap', 110),
  ('tourism', 'Turizm Agentliyi', 'Travel Agency', 'Туристическое агентство',
   'Turları və səyahət paketlərini təqdim edin.', 'Offer tours and travel packages.', 'Предлагайте туры и туристические пакеты.',
   'plane', 120),
  ('logistics', 'Logistika', 'Logistics', 'Логистика',
   'Daşıma xidmətləri və sifarişlərini idarə edin.', 'Manage transport services and orders.', 'Управляйте перевозками и заказами.',
   'truck', 130),
  ('veterinary', 'Baytarlıq', 'Veterinary', 'Ветеринария',
   'Baytarlıq xidmətləri və qəbulları idarə edin.', 'Manage veterinary services and appointments.', 'Управляйте ветеринарными услугами и приёмами.',
   'paw-print', 140),
  ('events_tickets', 'Tədbirlər və Bilet Satışı', 'Events and Ticketing', 'Мероприятия и билеты',
   'Tədbirlər yaradın və bilet satın.', 'Create events and sell tickets.', 'Создавайте мероприятия и продавайте билеты.',
   'ticket', 150),
  ('fitness', 'Fitness və İdman Mərkəzləri', 'Fitness and Sports Centers', 'Фитнес и спортивные центры',
   'Abunəlikləri, məşqləri və cədvəlləri idarə edin.', 'Manage memberships, classes and schedules.', 'Управляйте абонементами, занятиями и расписанием.',
   'dumbbell', 160),
  ('childcare_education', 'Uşaq Baxçası və Tədris Mərkəzləri', 'Childcare and Education Centers', 'Детские сады и учебные центры',
   'Qrupları, proqramları və qeydiyyatları idarə edin.', 'Manage groups, programs and enrolments.', 'Управляйте группами, программами и регистрациями.',
   'baby', 170),
  ('insurance', 'Sığorta Xidmətləri', 'Insurance Services', 'Страховые услуги',
   'Sığorta məhsullarını və müraciətləri idarə edin.', 'Manage insurance products and applications.', 'Управляйте страховыми продуктами и заявками.',
   'shield-check', 180)
on conflict (code) do update set
  name_az = excluded.name_az,
  name_en = excluded.name_en,
  name_ru = excluded.name_ru,
  description_az = excluded.description_az,
  description_en = excluded.description_en,
  description_ru = excluded.description_ru,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order;

alter table public.business_modules enable row level security;
alter table public.seller_business_modules enable row level security;

drop policy if exists "Authenticated users read active business modules" on public.business_modules;
create policy "Authenticated users read active business modules"
on public.business_modules for select to authenticated
using (
  is_active
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Admins insert business modules" on public.business_modules;
create policy "Admins insert business modules"
on public.business_modules for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins update business modules" on public.business_modules;
create policy "Admins update business modules"
on public.business_modules for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins delete business modules" on public.business_modules;
create policy "Admins delete business modules"
on public.business_modules for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Sellers read own business modules" on public.seller_business_modules;
create policy "Sellers read own business modules"
on public.seller_business_modules for select to authenticated
using (
  seller_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Admins insert seller business modules" on public.seller_business_modules;
create policy "Admins insert seller business modules"
on public.seller_business_modules for insert to authenticated
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins update seller business modules" on public.seller_business_modules;
create policy "Admins update seller business modules"
on public.seller_business_modules for update to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins delete seller business modules" on public.seller_business_modules;
create policy "Admins delete seller business modules"
on public.seller_business_modules for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

grant select, insert, update, delete on public.business_modules to authenticated;
grant select, insert, update, delete on public.seller_business_modules to authenticated;

create or replace function public.set_my_business_modules(_module_codes text[])
returns table (module_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  _user_id uuid := auth.uid();
  _normalized_codes text[];
  _invalid_codes text[];
begin
  if _user_id is null then
    raise exception 'Sessiya tapılmadı';
  end if;

  if not private.is_active_seller(_user_id) then
    raise exception 'Biznes modullarını seçmək üçün satıcı ödənişi və aktivləşdirmə tamamlanmalıdır';
  end if;

  select coalesce(array_agg(code order by code), array[]::text[])
    into _normalized_codes
  from (
    select distinct trim(code) as code
    from unnest(coalesce(_module_codes, array[]::text[])) as requested(code)
    where nullif(trim(code), '') is not null
  ) normalized;

  if cardinality(_normalized_codes) = 0 then
    raise exception 'Ən azı bir biznes modulu seçilməlidir';
  end if;

  select coalesce(array_agg(requested_code), array[]::text[])
    into _invalid_codes
  from unnest(_normalized_codes) requested_code
  where not exists (
    select 1
    from public.business_modules bm
    where bm.code = requested_code
      and bm.is_active
  );

  if cardinality(_invalid_codes) > 0 then
    raise exception 'Aktiv olmayan və ya tanınmayan modul seçilib: %', array_to_string(_invalid_codes, ', ');
  end if;

  delete from public.seller_business_modules
  where seller_id = _user_id
    and module_code <> all(_normalized_codes);

  insert into public.seller_business_modules (seller_id, module_code)
  select _user_id, code
  from unnest(_normalized_codes) code
  on conflict (seller_id, module_code) do update
    set updated_at = now();

  return query
  select sbm.module_code
  from public.seller_business_modules sbm
  where sbm.seller_id = _user_id
  order by sbm.module_code;
end;
$$;

revoke all on function public.set_my_business_modules(text[]) from public, anon;
grant execute on function public.set_my_business_modules(text[]) to authenticated;

-- Existing paid sellers keep their current Marketplace workspace without interruption.
insert into public.seller_business_modules (seller_id, module_code)
select distinct sa.user_id, 'marketplace'
from public.seller_applications sa
join public.user_roles ur
  on ur.user_id = sa.user_id
 and ur.role = 'seller'::public.app_role
where sa.status = 'active'
  and sa.payment_status in ('success', 'migrated')
on conflict (seller_id, module_code) do nothing;

drop trigger if exists audit_admin_change on public.business_modules;
create trigger audit_admin_change
after insert or update or delete on public.business_modules
for each row execute function public.audit_admin_table_change();

drop trigger if exists audit_admin_change on public.seller_business_modules;
create trigger audit_admin_change
after insert or update or delete on public.seller_business_modules
for each row execute function public.audit_admin_table_change();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'business_modules'
    ) then
      alter publication supabase_realtime add table public.business_modules;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'seller_business_modules'
    ) then
      alter publication supabase_realtime add table public.seller_business_modules;
    end if;
  end if;
end;
$$;
