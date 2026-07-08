-- Authentication repair migration. Safe to run after schema.sql and upgrade-002.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update
    set full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

-- Recreate the trigger in case an earlier partial installation missed it.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Repair accounts created while the trigger was absent or failing.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated;
grant select on public.products, public.categories to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.cart_items,
  public.orders, public.order_items, public.favorites, public.seller_applications to authenticated;
grant select, insert, update, delete on public.products to authenticated;
