-- Remove legacy blanket Data API grants and restore only the privileges used by
-- the marketplace. RLS remains the row-level authorization layer.
revoke all privileges on table
  public.cart_items,
  public.categories,
  public.order_items,
  public.orders,
  public.products,
  public.profiles,
  public.profiles_public,
  public.user_roles
from anon, authenticated;

grant select on table public.categories, public.products, public.profiles_public to anon;
grant select on table public.categories, public.products, public.profiles_public to authenticated;

grant select, insert, update, delete on table public.cart_items to authenticated;
grant select, insert, update, delete on table public.orders to authenticated;
grant select, insert, update, delete on table public.order_items to authenticated;
grant insert, update, delete on table public.products to authenticated;
grant insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;
