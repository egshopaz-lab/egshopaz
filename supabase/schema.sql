create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'seller', 'admin');
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'customer',
  phone text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= price),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  active boolean not null default true,
  sponsored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  total numeric(12,2) not null default 0,
  delivery_address text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  product_name text not null,
  price numeric(12,2) not null,
  quantity integer not null check (quantity > 0)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.is_seller()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('seller','admin')); $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles read own" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admin manages profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "categories public read" on public.categories for select using (true);
create policy "admin manages categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "products public read" on public.products for select using (active or seller_id = auth.uid() or public.is_admin());
create policy "seller creates products" on public.products for insert with check (public.is_seller() and seller_id = auth.uid());
create policy "seller updates own products" on public.products for update using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
create policy "seller deletes own products" on public.products for delete using (seller_id = auth.uid() or public.is_admin());

create policy "cart own read" on public.cart_items for select using (user_id = auth.uid());
create policy "cart own create" on public.cart_items for insert with check (user_id = auth.uid());
create policy "cart own update" on public.cart_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart own delete" on public.cart_items for delete using (user_id = auth.uid());

create policy "orders own read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders own create" on public.orders for insert with check (user_id = auth.uid());
create policy "admin updates orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "order items buyer seller admin read" on public.order_items for select using (
  seller_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid()
  )
);
create policy "order items buyer create" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_id and orders.user_id = auth.uid())
);

insert into public.categories (name) values
  ('Elektronika'), ('Qadın geyimləri'), ('Kişi geyimləri'),
  ('Uşaq və körpə'), ('Ayaqqabı'), ('Gözəllik və baxım'),
  ('Ev və mətbəx'), ('Mebel')
on conflict do nothing;

