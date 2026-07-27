alter table public.eg_trends_posts
  add column if not exists media_type text not null default 'image',
  add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.eg_trends_posts
  drop constraint if exists eg_trends_posts_media_type_check;

alter table public.eg_trends_posts
  add constraint eg_trends_posts_media_type_check
  check (media_type in ('image', 'video'));

create index if not exists idx_eg_trends_posts_product_id
  on public.eg_trends_posts(product_id)
  where product_id is not null;

create or replace function public.enforce_eg_trends_product_owner()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.product_id is not null and not exists (
    select 1
    from public.products p
    where p.id = new.product_id
      and p.seller_id = new.seller_id
      and p.is_active = true
  ) then
    raise exception 'trend_product_must_belong_to_seller';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_eg_trends_product_owner_trigger
  on public.eg_trends_posts;

create trigger enforce_eg_trends_product_owner_trigger
before insert or update of seller_id, product_id
on public.eg_trends_posts
for each row execute function public.enforce_eg_trends_product_owner();

revoke execute on function public.enforce_eg_trends_product_owner()
  from public, anon, authenticated;
