-- Keep commercial order history after a customer account is hard-deleted.
alter table public.orders alter column buyer_id drop not null;
alter table public.orders drop constraint if exists orders_buyer_id_fkey;
alter table public.orders add constraint orders_buyer_id_fkey
  foreign key (buyer_id) references auth.users(id) on delete set null;
