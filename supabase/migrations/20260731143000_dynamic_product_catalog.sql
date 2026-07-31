-- Dynamic marketplace product catalogue.
-- Keeps products.attributes/products.variants for backwards compatibility while
-- projecting them into indexed, admin-managed catalogue tables.

alter table public.products
  add column if not exists short_description text,
  add column if not exists model text,
  add column if not exists gtin text,
  add column if not exists manufacturer text,
  add column if not exists origin_country text,
  add column if not exists warranty_months integer check (warranty_months is null or warranty_months >= 0),
  add column if not exists item_state text not null default 'new',
  add column if not exists currency text not null default 'AZN',
  add column if not exists tax_percent numeric(5,2) not null default 0,
  add column if not exists wholesale_price numeric(12,2),
  add column if not exists discount_starts_at timestamptz,
  add column if not exists discount_ends_at timestamptz,
  add column if not exists unlimited_stock boolean not null default false,
  add column if not exists allow_preorder boolean not null default false,
  add column if not exists length_cm numeric(10,2),
  add column if not exists width_cm numeric(10,2),
  add column if not exists height_cm numeric(10,2),
  add column if not exists shipping_price numeric(12,2),
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists url_slug text,
  add column if not exists keywords text[] not null default '{}'::text[];

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_item_state_check') then
    alter table public.products add constraint products_item_state_check
      check (item_state in ('new','refurbished','used'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_currency_check') then
    alter table public.products add constraint products_currency_check check (currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_tax_percent_check') then
    alter table public.products add constraint products_tax_percent_check check (tax_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_discount_dates_check') then
    alter table public.products add constraint products_discount_dates_check
      check (discount_starts_at is null or discount_ends_at is null or discount_ends_at > discount_starts_at);
  end if;
end $$;

create unique index if not exists products_url_slug_unique
  on public.products(url_slug) where url_slug is not null and btrim(url_slug) <> '';
create index if not exists products_gtin_idx on public.products(gtin) where gtin is not null;

create table if not exists public.catalog_attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name_az text not null,
  name_ru text,
  name_en text,
  data_type text not null default 'text'
    check (data_type in ('text','number','boolean','select','multiselect','date','color')),
  unit text,
  placeholder text,
  validation jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.catalog_attribute_definitions(id) on delete cascade,
  value text not null,
  label_az text not null,
  label_ru text,
  label_en text,
  color_hex text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(attribute_id,value)
);

create table if not exists public.category_attributes (
  category_id uuid not null references public.categories(id) on delete cascade,
  attribute_id uuid not null references public.catalog_attribute_definitions(id) on delete cascade,
  is_required boolean not null default false,
  is_filterable boolean not null default false,
  is_variant boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(category_id,attribute_id)
);

create table if not exists public.catalog_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_attribute_values (
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_id uuid not null references public.catalog_attribute_definitions(id) on delete cascade,
  option_id uuid references public.catalog_attribute_options(id) on delete set null,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  value_json jsonb,
  updated_at timestamptz not null default now(),
  primary key(product_id,attribute_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  external_key text not null,
  sku text,
  barcode text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  image_url text,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,external_key)
);

create unique index if not exists product_variants_seller_sku_unique
  on public.product_variants(seller_id,sku) where sku is not null and btrim(sku) <> '';
create unique index if not exists product_variants_seller_barcode_unique
  on public.product_variants(seller_id,barcode) where barcode is not null and btrim(barcode) <> '';
create index if not exists product_variants_product_active_idx on public.product_variants(product_id,is_active);
create index if not exists product_variants_attributes_gin_idx on public.product_variants using gin(attributes);

create table if not exists public.product_variant_attribute_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  attribute_id uuid not null references public.catalog_attribute_definitions(id) on delete cascade,
  option_id uuid references public.catalog_attribute_options(id) on delete set null,
  value_text text,
  primary key(variant_id,attribute_id)
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image','video','spin_360')),
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_attribute_values_text_idx on public.product_attribute_values(attribute_id,value_text);
create index if not exists product_attribute_values_number_idx on public.product_attribute_values(attribute_id,value_number);
create index if not exists product_variant_attribute_values_text_idx on public.product_variant_attribute_values(attribute_id,value_text);
create index if not exists product_media_product_idx on public.product_media(product_id,sort_order);

alter table public.cart_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.cart_items add column if not exists selected_attributes jsonb not null default '{}'::jsonb;
alter table public.cart_items add column if not exists unit_price numeric(12,2);
alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_sku text;
alter table public.order_items add column if not exists variant_attributes jsonb not null default '{}'::jsonb;

alter table public.cart_items drop constraint if exists cart_items_user_id_product_id_key;
create unique index if not exists cart_items_user_product_variant_unique
  on public.cart_items(user_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

alter table public.catalog_attribute_definitions enable row level security;
alter table public.catalog_attribute_options enable row level security;
alter table public.category_attributes enable row level security;
alter table public.catalog_brands enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_attribute_values enable row level security;
alter table public.product_media enable row level security;

drop policy if exists "Catalogue schema public read" on public.catalog_attribute_definitions;
create policy "Catalogue schema public read" on public.catalog_attribute_definitions for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Catalogue options public read" on public.catalog_attribute_options;
create policy "Catalogue options public read" on public.catalog_attribute_options for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Category attributes public read" on public.category_attributes;
create policy "Category attributes public read" on public.category_attributes for select using (true);
drop policy if exists "Catalogue brands public read" on public.catalog_brands;
create policy "Catalogue brands public read" on public.catalog_brands for select using (is_active or public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Admins manage catalogue definitions" on public.catalog_attribute_definitions;
create policy "Admins manage catalogue definitions" on public.catalog_attribute_definitions for all to authenticated using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Admins manage catalogue options" on public.catalog_attribute_options;
create policy "Admins manage catalogue options" on public.catalog_attribute_options for all to authenticated using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Admins manage category attributes" on public.category_attributes;
create policy "Admins manage category attributes" on public.category_attributes for all to authenticated using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "Admins manage catalogue brands" on public.catalog_brands;
create policy "Admins manage catalogue brands" on public.catalog_brands for all to authenticated using (public.has_role(auth.uid(),'admin'::public.app_role)) with check (public.has_role(auth.uid(),'admin'::public.app_role));

drop policy if exists "Product attribute values visible with product" on public.product_attribute_values;
create policy "Product attribute values visible with product" on public.product_attribute_values for select using (
  exists(select 1 from public.products p where p.id=product_id and (p.is_active or p.seller_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role)))
);
drop policy if exists "Product variants visible with product" on public.product_variants;
create policy "Product variants visible with product" on public.product_variants for select using (
  exists(select 1 from public.products p where p.id=product_id and (p.is_active or p.seller_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role)))
);
drop policy if exists "Variant values visible with variant" on public.product_variant_attribute_values;
create policy "Variant values visible with variant" on public.product_variant_attribute_values for select using (
  exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=variant_id and (p.is_active or p.seller_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role)))
);
drop policy if exists "Product media visible with product" on public.product_media;
create policy "Product media visible with product" on public.product_media for select using (
  exists(select 1 from public.products p where p.id=product_id and (p.is_active or p.seller_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role)))
);

grant select on public.catalog_attribute_definitions,public.catalog_attribute_options,public.category_attributes,public.catalog_brands to anon,authenticated;
grant select on public.product_attribute_values,public.product_variants,public.product_variant_attribute_values,public.product_media to anon,authenticated;
grant insert,update,delete on public.catalog_attribute_definitions,public.catalog_attribute_options,public.category_attributes,public.catalog_brands to authenticated;

-- Admin-managed initial catalogue vocabulary. These are data rows, not frontend constants.
insert into public.catalog_attribute_definitions(code,name_az,name_en,data_type,unit) values
 ('brand_model','Model','Model','text',null),
 ('origin','İstehsal ölkəsi','Country of origin','text',null),
 ('manufacturer','İstehsalçı','Manufacturer','text',null),
 ('warranty','Zəmanət','Warranty','number','ay'),
 ('color','Rəng','Color','color',null),
 ('size','Ölçü','Size','select',null),
 ('material','Material','Material','text',null),
 ('gender','Cins','Gender','select',null),
 ('age_group','Yaş qrupu','Age group','select',null),
 ('season','Mövsüm','Season','select',null),
 ('style','Stil','Style','text',null),
 ('fit','Kəsim','Fit','select',null),
 ('ram','RAM','RAM','select','GB'),
 ('storage','Yaddaş','Storage','select','GB'),
 ('processor','Prosessor','Processor','text',null),
 ('screen_size','Ekran ölçüsü','Screen size','number','düym'),
 ('screen_type','Ekran tipi','Screen type','text',null),
 ('battery','Batareya','Battery','text',null),
 ('camera','Kamera','Camera','text',null),
 ('operating_system','Əməliyyat sistemi','Operating system','text',null),
 ('network','Şəbəkə','Network','text',null),
 ('bluetooth','Bluetooth','Bluetooth','boolean',null),
 ('nfc','NFC','NFC','boolean',null),
 ('wifi','Wi-Fi','Wi-Fi','boolean',null),
 ('sim_count','SIM sayı','SIM count','number',null),
 ('five_g','5G','5G','boolean',null),
 ('water_resistance','Suya davamlılıq','Water resistance','text',null),
 ('cpu','CPU','CPU','text',null),
 ('gpu','GPU','GPU','text',null),
 ('ssd','SSD','SSD','select','GB'),
 ('hdd','HDD','HDD','select','GB'),
 ('heel_height','Daban hündürlüyü','Heel height','number','sm'),
 ('dimensions','Ölçülər','Dimensions','text',null),
 ('room_type','Otaq tipi','Room type','select',null),
 ('assembly_required','Quraşdırma tələb olunur','Assembly required','boolean',null),
 ('skin_type','Dəri tipi','Skin type','select',null),
 ('volume','Həcm','Volume','select','ml'),
 ('spf','SPF','SPF','number',null),
 ('ingredients','Tərkib','Ingredients','text',null),
 ('expiry_date','Son istifadə tarixi','Expiry date','date',null),
 ('weight_value','Çəki','Weight','number','q'),
 ('calories','Kalori','Calories','number','kkal'),
 ('storage_temperature','Saxlanma temperaturu','Storage temperature','text',null),
 ('flavor','Dad','Flavor','select',null)
on conflict(code) do update set name_az=excluded.name_az,name_en=excluded.name_en,data_type=excluded.data_type,unit=excluded.unit;

insert into public.catalog_attribute_options(attribute_id,value,label_az,label_en,sort_order)
select d.id,o.value,o.label_az,o.label_en,o.sort_order
from public.catalog_attribute_definitions d
join (values
 ('color','black','Qara','Black',1),('color','white','Ağ','White',2),('color','blue','Mavi','Blue',3),('color','red','Qırmızı','Red',4),('color','green','Yaşıl','Green',5),('color','grey','Boz','Grey',6),('color','beige','Bej','Beige',7),
 ('size','XS','XS','XS',1),('size','S','S','S',2),('size','M','M','M',3),('size','L','L','L',4),('size','XL','XL','XL',5),('size','XXL','XXL','XXL',6),
 ('gender','women','Qadın','Women',1),('gender','men','Kişi','Men',2),('gender','unisex','Uniseks','Unisex',3),('gender','kids','Uşaq','Kids',4),
 ('season','spring','Yaz','Spring',1),('season','summer','Yay','Summer',2),('season','autumn','Payız','Autumn',3),('season','winter','Qış','Winter',4),
 ('ram','4','4 GB','4 GB',1),('ram','8','8 GB','8 GB',2),('ram','16','16 GB','16 GB',3),('ram','32','32 GB','32 GB',4),
 ('storage','64','64 GB','64 GB',1),('storage','128','128 GB','128 GB',2),('storage','256','256 GB','256 GB',3),('storage','512','512 GB','512 GB',4),('storage','1024','1 TB','1 TB',5)
) as o(code,value,label_az,label_en,sort_order) on o.code=d.code
on conflict(attribute_id,value) do update set label_az=excluded.label_az,label_en=excluded.label_en,sort_order=excluded.sort_order;

-- Seed category bindings. Admin can edit/remove every row afterwards.
with bindings(pattern,code,required,filterable,variant_axis,sort_order) as (values
 ('elektron%','brand_model',true,false,false,10),('elektron%','ram',false,true,true,20),('elektron%','storage',false,true,true,30),('elektron%','processor',false,true,false,40),('elektron%','screen_size',false,true,false,50),('elektron%','operating_system',false,true,false,60),('elektron%','five_g',false,true,false,70),('elektron%','nfc',false,true,false,80),('elektron%','color',false,true,true,90),
 ('geyim%','gender',true,true,false,10),('geyim%','material',true,true,false,20),('geyim%','season',false,true,false,30),('geyim%','style',false,true,false,40),('geyim%','fit',false,true,false,50),('geyim%','color',false,true,true,60),('geyim%','size',true,true,true,70),
 ('ayaqqabi%','gender',true,true,false,10),('ayaqqabi%','material',false,true,false,20),('ayaqqabi%','season',false,true,false,30),('ayaqqabi%','heel_height',false,true,false,40),('ayaqqabi%','color',false,true,true,50),('ayaqqabi%','size',true,true,true,60),
 ('ev-%','material',false,true,false,10),('ev-%','dimensions',false,true,false,20),('ev-%','room_type',false,true,false,30),('ev-%','assembly_required',false,true,false,40),('ev-%','color',false,true,true,50),
 ('gozellik%','skin_type',false,true,false,10),('gozellik%','spf',false,true,false,20),('gozellik%','volume',false,true,true,30),
 ('supermarket%','ingredients',false,true,false,10),('supermarket%','weight_value',false,true,true,20),('supermarket%','calories',false,true,false,30),('supermarket%','expiry_date',false,false,false,40),('supermarket%','flavor',false,true,true,50)
)
insert into public.category_attributes(category_id,attribute_id,is_required,is_filterable,is_variant,sort_order)
select c.id,d.id,b.required,b.filterable,b.variant_axis,b.sort_order
from bindings b join public.categories c on c.slug like b.pattern join public.catalog_attribute_definitions d on d.code=b.code
on conflict(category_id,attribute_id) do nothing;

create or replace function public.catalog_schema_for_category(_category_id uuid)
returns table(
  attribute_id uuid,code text,name_az text,name_ru text,name_en text,data_type text,unit text,placeholder text,
  is_required boolean,is_filterable boolean,is_variant boolean,sort_order integer,options jsonb
)
language sql stable security definer set search_path=public as $$
  with recursive chain as (
    select c.id,c.parent_id,0 depth from public.categories c where c.id=_category_id
    union all
    select p.id,p.parent_id,ch.depth+1 from public.categories p join chain ch on ch.parent_id=p.id
  ), chosen as (
    select distinct on(ca.attribute_id) ca.*,ch.depth
    from chain ch join public.category_attributes ca on ca.category_id=ch.id
    order by ca.attribute_id,ch.depth asc
  )
  select d.id,d.code,d.name_az,d.name_ru,d.name_en,d.data_type,d.unit,d.placeholder,
    x.is_required,x.is_filterable,x.is_variant,x.sort_order,
    coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'value',o.value,'label_az',o.label_az,'label_ru',o.label_ru,'label_en',o.label_en,'color_hex',o.color_hex) order by o.sort_order,o.label_az)
      from public.catalog_attribute_options o where o.attribute_id=d.id and o.is_active),'[]'::jsonb)
  from chosen x join public.catalog_attribute_definitions d on d.id=x.attribute_id
  where d.is_active order by x.sort_order,d.name_az;
$$;
grant execute on function public.catalog_schema_for_category(uuid) to anon,authenticated;
alter function public.catalog_schema_for_category(uuid) security invoker;

create or replace function public.sync_product_catalog_projection()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  a record; v jsonb; key text; normalized_id uuid; active_keys text[] := array[]::text[]; raw text;
begin
  delete from public.product_attribute_values where product_id=new.id;
  for a in select * from public.catalog_schema_for_category(new.category_id) loop
    raw := nullif(btrim(new.attributes->>a.code),'');
    if raw is not null then
      insert into public.product_attribute_values(product_id,attribute_id,option_id,value_text,value_number,value_boolean,value_date,value_json)
      values(new.id,a.attribute_id,
        (select o.id from public.catalog_attribute_options o where o.attribute_id=a.attribute_id and (o.value=raw or o.label_az=raw) limit 1),
        raw,
        case when a.data_type='number' and raw ~ '^-?[0-9]+([.][0-9]+)?$' then raw::numeric end,
        case when a.data_type='boolean' then lower(raw) in ('true','1','yes','bəli') end,
        case when a.data_type='date' and raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raw::date end,
        case when a.data_type='multiselect' then to_jsonb(string_to_array(raw,',')) end
      );
    end if;
  end loop;

  for v in select value from jsonb_array_elements(coalesce(new.variants,'[]'::jsonb)) loop
    key := coalesce(nullif(v->>'id',''),md5(coalesce(v->'attributes','{}'::jsonb)::text));
    active_keys := array_append(active_keys,key);
    insert into public.product_variants(product_id,seller_id,external_key,sku,barcode,price,old_price,stock,min_stock,image_url,attributes,is_active,updated_at)
    values(new.id,new.seller_id,key,nullif(btrim(v->>'sku'),''),nullif(btrim(v->>'barcode'),''),coalesce((v->>'price')::numeric,new.price),
      nullif(v->>'old_price','')::numeric,coalesce((v->>'stock')::integer,0),coalesce((v->>'min_stock')::integer,new.min_stock,0),nullif(v->>'image_url',''),coalesce(v->'attributes','{}'::jsonb),coalesce((v->>'is_active')::boolean,true),now())
    on conflict(product_id,external_key) do update set sku=excluded.sku,barcode=excluded.barcode,price=excluded.price,old_price=excluded.old_price,
      stock=excluded.stock,min_stock=excluded.min_stock,image_url=excluded.image_url,attributes=excluded.attributes,is_active=excluded.is_active,updated_at=now()
    returning id into normalized_id;
    delete from public.product_variant_attribute_values where variant_id=normalized_id;
    for a in select * from public.catalog_schema_for_category(new.category_id) where is_variant loop
      raw := nullif(btrim(v->'attributes'->>a.code),'');
      if raw is not null then
        insert into public.product_variant_attribute_values(variant_id,attribute_id,option_id,value_text)
        values(normalized_id,a.attribute_id,(select o.id from public.catalog_attribute_options o where o.attribute_id=a.attribute_id and (o.value=raw or o.label_az=raw) limit 1),raw);
      end if;
    end loop;
  end loop;
  if cardinality(active_keys)=0 then
    delete from public.product_variants where product_id=new.id;
  else
    delete from public.product_variants where product_id=new.id and not(external_key=any(active_keys));
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_product_catalog_projection on public.products;
create trigger trg_sync_product_catalog_projection
after insert or update of attributes,variants,category_id,price,min_stock on public.products
for each row execute function public.sync_product_catalog_projection();

-- This helper is trigger-only and must not be exposed as a Data API RPC.
revoke execute on function public.sync_product_catalog_projection() from public,anon,authenticated;

-- Project existing products immediately without making one malformed legacy row
-- abort the whole migration. Updating a column to itself intentionally fires the
-- projection trigger and does not change moderation state.
do $$ declare product_key uuid; begin
  for product_key in select id from public.products loop
    begin
      update public.products set attributes=attributes where id=product_key;
    exception when others then
      raise notice 'Catalogue projection deferred for product %: %',product_key,sqlerrm;
    end;
  end loop;
end $$;
