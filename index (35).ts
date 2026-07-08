create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  tax_id text,
  phone text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.favorites enable row level security;
alter table public.seller_applications enable row level security;

create policy "favorites own read" on public.favorites for select using (user_id = auth.uid());
create policy "favorites own create" on public.favorites for insert with check (user_id = auth.uid());
create policy "favorites own delete" on public.favorites for delete using (user_id = auth.uid());

create policy "seller applications own read" on public.seller_applications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "seller applications own create" on public.seller_applications
  for insert with check (user_id = auth.uid());
create policy "seller applications own update" on public.seller_applications
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create or replace function public.admin_review_seller(_application_id uuid, _approve boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  applicant uuid;
begin
  if not public.is_admin() then raise exception 'Yalnız admin'; end if;
  select user_id into applicant from public.seller_applications where id = _application_id;
  if applicant is null then raise exception 'Başvuru tapılmadı'; end if;
  update public.seller_applications
    set status = case when _approve then 'approved' else 'rejected' end
    where id = _application_id;
  if _approve then
    update public.profiles set role = 'seller' where id = applicant;
  end if;
end;
$$;

grant execute on function public.admin_review_seller(uuid, boolean) to authenticated;

insert into public.products (name, description, price, old_price, stock, image_url, active, sponsored)
select seed.name, seed.description, seed.price, seed.old_price, seed.stock, seed.image_url, true, seed.sponsored
from (values
  ('EG hədiyyə qutusu', 'Premium EG Shop hədiyyə seçimi', 45::numeric, 59::numeric, 20, '/assets/product-1.jpg', true),
  ('İtaliya yataq dəsti', 'Rahat və müasir yataq kolleksiyası', 1500::numeric, 1800::numeric, 7, '/assets/product-2.jpg', true),
  ('Elektrikli skuter', 'Şəhər üçün elektrikli nəqliyyat', 1000::numeric, 1250::numeric, 5, '/assets/product-3.jpg', true),
  ('Redmi Note 14 Pro', 'Yeni nəsil smartfon', 1199::numeric, 1399::numeric, 14, '/assets/product-4.jpg', false),
  ('Premium ev kolleksiyası', 'Ev üçün seçilmiş məhsullar', 790::numeric, 990::numeric, 9, '/assets/product-5.jpg', false),
  ('Yeni mövsüm seçimi', 'Yeni mövsümün məşhur seçimi', 129::numeric, 179::numeric, 32, '/assets/product-6.jpg', false)
) as seed(name, description, price, old_price, stock, image_url, sponsored)
where not exists (select 1 from public.products);

