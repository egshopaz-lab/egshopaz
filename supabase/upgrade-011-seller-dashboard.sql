-- Production tables for the seller dashboard.

alter table public.products
  add column if not exists sku text,
  add column if not exists barcode text,
  add column if not exists brand text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists draft boolean not null default false,
  add column if not exists variant_options jsonb not null default '{}'::jsonb,
  add column if not exists gallery_urls text[] not null default '{}';

create table if not exists public.seller_store_settings (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  store_name text not null default 'EG Shop mağazası',
  logo_url text,
  banner_url text,
  description text,
  phone text,
  email text,
  address text,
  socials jsonb not null default '{}'::jsonb,
  working_hours text,
  delivery_info text,
  return_policy text,
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_coupons (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(seller_id, code)
);

create table if not exists public.seller_campaigns (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  discount_percent numeric(5,2) check (discount_percent is null or discount_percent between 0 and 100),
  active boolean not null default true,
  product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.seller_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  kind text not null check (kind in ('sale','commission','withdraw','refund','adjustment')),
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_notifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.seller_messages (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  rating integer not null default 5 check (rating between 1 and 5),
  body text,
  reply text,
  created_at timestamptz not null default now()
);

alter table public.seller_store_settings enable row level security;
alter table public.seller_coupons enable row level security;
alter table public.seller_campaigns enable row level security;
alter table public.seller_wallet_transactions enable row level security;
alter table public.seller_notifications enable row level security;
alter table public.seller_messages enable row level security;
alter table public.product_reviews enable row level security;

drop policy if exists "seller store own read" on public.seller_store_settings;
create policy "seller store own read" on public.seller_store_settings for select using (seller_id = auth.uid() or public.is_admin());
drop policy if exists "seller store own write" on public.seller_store_settings;
create policy "seller store own write" on public.seller_store_settings for all using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller coupons own" on public.seller_coupons;
create policy "seller coupons own" on public.seller_coupons for all using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller campaigns own" on public.seller_campaigns;
create policy "seller campaigns own" on public.seller_campaigns for all using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller wallet own read" on public.seller_wallet_transactions;
create policy "seller wallet own read" on public.seller_wallet_transactions for select using (seller_id = auth.uid() or public.is_admin());
drop policy if exists "seller wallet own create" on public.seller_wallet_transactions;
create policy "seller wallet own create" on public.seller_wallet_transactions for insert with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller notifications own" on public.seller_notifications;
create policy "seller notifications own" on public.seller_notifications for all using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller messages participants" on public.seller_messages;
create policy "seller messages participants" on public.seller_messages for all using (
  seller_id = auth.uid() or customer_id = auth.uid() or sender_id = auth.uid() or public.is_admin()
) with check (
  seller_id = auth.uid() or customer_id = auth.uid() or sender_id = auth.uid() or public.is_admin()
);

drop policy if exists "reviews readable" on public.product_reviews;
create policy "reviews readable" on public.product_reviews for select using (true);
drop policy if exists "reviews seller reply" on public.product_reviews;
create policy "reviews seller reply" on public.product_reviews for update using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
drop policy if exists "reviews customer create" on public.product_reviews;
create policy "reviews customer create" on public.product_reviews for insert with check (customer_id = auth.uid() or public.is_admin());
drop policy if exists "reviews owner delete" on public.product_reviews;
create policy "reviews owner delete" on public.product_reviews for delete using (seller_id = auth.uid() or customer_id = auth.uid() or public.is_admin());

create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_seller_idx on public.order_items(seller_id);
create index if not exists seller_messages_seller_idx on public.seller_messages(seller_id, created_at desc);
create index if not exists seller_notifications_seller_idx on public.seller_notifications(seller_id, created_at desc);

grant select, insert, update, delete on public.seller_store_settings, public.seller_coupons,
  public.seller_campaigns, public.seller_notifications, public.seller_messages,
  public.product_reviews to authenticated;
grant select, insert on public.seller_wallet_transactions to authenticated;
