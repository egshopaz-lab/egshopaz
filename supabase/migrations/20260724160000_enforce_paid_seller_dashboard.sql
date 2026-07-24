-- A seller role is an operational permission, not a signup label.
-- It may only exist after a verified Epoint payment callback has activated
-- the corresponding seller application.

create or replace function private.enforce_paid_seller_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'seller'::public.app_role
     and not exists (
       select 1
       from public.seller_applications sa
       where sa.user_id = new.user_id
         and sa.status = 'active'
         and sa.payment_status in ('success', 'migrated')
     )
  then
    raise exception 'Satıcı kabineti yalnız uğurlu qeydiyyat ödənişindən sonra aktivləşdirilə bilər';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_paid_seller_role()
from public, anon, authenticated;

drop trigger if exists enforce_paid_seller_role
on public.user_roles;

create trigger enforce_paid_seller_role
before insert or update of user_id, role
on public.user_roles
for each row
execute function private.enforce_paid_seller_role();

-- Remove any stale seller permission that does not satisfy the payment gate.
-- Paid/migrated active sellers are preserved.
delete from public.user_roles ur
where ur.role = 'seller'::public.app_role
  and not exists (
    select 1
    from public.seller_applications sa
    where sa.user_id = ur.user_id
      and sa.status = 'active'
      and sa.payment_status in ('success', 'migrated')
  );

comment on function private.enforce_paid_seller_role() is
  'Prevents seller dashboard access until a verified Epoint payment activates the seller application.';
