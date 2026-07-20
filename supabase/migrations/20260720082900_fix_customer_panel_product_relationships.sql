do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_product_id_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'price_alerts_product_id_fkey'
  ) then
    alter table public.price_alerts
      add constraint price_alerts_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete cascade;
  end if;
end $$;

notify pgrst, 'reload schema';
