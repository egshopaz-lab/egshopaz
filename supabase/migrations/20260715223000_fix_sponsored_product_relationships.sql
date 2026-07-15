alter table public.sponsored_products
  add constraint sponsored_products_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

alter table public.sponsored_products
  add constraint sponsored_products_seller_id_fkey
  foreign key (seller_id) references public.profiles(id) on delete cascade;

notify pgrst, 'reload schema';
