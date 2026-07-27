alter table public.products
  add column if not exists min_stock integer not null default 5 check (min_stock >= 0),
  add column if not exists barcode text,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists stock_updated_at timestamptz not null default now();

create unique index if not exists products_seller_barcode_unique
  on public.products (seller_id, barcode)
  where barcode is not null and btrim(barcode) <> '';

create table if not exists public.product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  change integer not null,
  previous_stock integer not null check (previous_stock >= 0),
  new_stock integer not null check (new_stock >= 0),
  reason text not null default 'manual'
    check (reason in ('manual','sale','return','import','admin','correction')),
  note text,
  order_item_id uuid references public.order_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_stock_movements_seller_created_idx
  on public.product_stock_movements (seller_id, created_at desc);
create index if not exists product_stock_movements_product_created_idx
  on public.product_stock_movements (product_id, created_at desc);

alter table public.product_stock_movements enable row level security;

drop policy if exists "Sellers read own stock movements" on public.product_stock_movements;
create policy "Sellers read own stock movements"
  on public.product_stock_movements
  for select
  to authenticated
  using (seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins manage stock movements" on public.product_stock_movements;
drop policy if exists "Admins insert stock movements" on public.product_stock_movements;
create policy "Admins insert stock movements"
  on public.product_stock_movements
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins update stock movements" on public.product_stock_movements;
create policy "Admins update stock movements"
  on public.product_stock_movements
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins delete stock movements" on public.product_stock_movements;
create policy "Admins delete stock movements"
  on public.product_stock_movements
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.log_product_stock_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock is distinct from old.stock then
    insert into public.product_stock_movements (
      product_id, seller_id, change, previous_stock, new_stock, reason
    ) values (
      new.id, new.seller_id, new.stock - old.stock, old.stock, new.stock,
      case when public.has_role(auth.uid(), 'admin'::public.app_role) then 'admin' else 'manual' end
    );
    new.stock_updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.log_product_stock_change() from public, anon, authenticated;

drop trigger if exists trg_log_product_stock_change on public.products;
create trigger trg_log_product_stock_change
before update of stock on public.products
for each row
execute function public.log_product_stock_change();
