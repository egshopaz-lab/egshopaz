-- A seller must own a manually verified Epoint business account before any
-- seller role, store access or product-access override can become effective.

alter table public.seller_applications
  add column if not exists epoint_account_email text,
  add column if not exists epoint_business_name text,
  add column if not exists epoint_registration_status text not null default 'pending',
  add column if not exists epoint_registration_declared_at timestamptz,
  add column if not exists epoint_registration_verified_at timestamptz,
  add column if not exists epoint_registration_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists epoint_registration_note text;

alter table public.seller_applications
  drop constraint if exists seller_applications_epoint_registration_status_check;
alter table public.seller_applications
  add constraint seller_applications_epoint_registration_status_check
  check (epoint_registration_status in ('pending','verified','rejected','legacy_verified'));

alter table public.seller_applications
  drop constraint if exists seller_applications_status_check;
alter table public.seller_applications
  add constraint seller_applications_status_check
  check (status in ('pending_payment','pending_epoint_verification','active','payment_returned','suspended'));

-- Do not interrupt existing production sellers. Every new/pending application
-- must pass the new verification gate.
update public.seller_applications
set epoint_registration_status = 'legacy_verified',
    epoint_registration_verified_at = coalesce(activated_at, now()),
    epoint_registration_note = coalesce(epoint_registration_note, 'Yeni Epoint yoxlaması tətbiq ediləndən əvvəl aktiv satıcı')
where status = 'active'
  and epoint_registration_status = 'pending';

create or replace function private.sync_seller_epoint_registration_from_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if new.email_confirmed_at is null
     or _metadata ->> 'onboarding_portal' <> 'seller' then
    return new;
  end if;

  update public.seller_applications
  set epoint_account_email = nullif(lower(trim(_metadata ->> 'epoint_account_email')), ''),
      epoint_business_name = nullif(left(trim(_metadata ->> 'epoint_business_name'), 120), ''),
      epoint_registration_declared_at = case
        when lower(coalesce(_metadata ->> 'epoint_registration_declared', 'false')) in ('true','1','yes')
        then coalesce(
          case when (_metadata ->> 'epoint_registration_declared_at') ~ '^\d{4}-\d{2}-\d{2}T'
            then (_metadata ->> 'epoint_registration_declared_at')::timestamptz end,
          now()
        )
        else null
      end,
      updated_at = now()
  where user_id = new.id;

  return new;
end;
$$;

revoke all on function private.sync_seller_epoint_registration_from_auth()
from public, anon, authenticated;

drop trigger if exists zz_sync_seller_epoint_registration_from_auth on auth.users;
create trigger zz_sync_seller_epoint_registration_from_auth
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function private.sync_seller_epoint_registration_from_auth();

-- Keep payment callbacks successful, but turn their attempted activation into
-- a pending Epoint review until an admin verifies the merchant account.
create or replace function private.enforce_epoint_seller_application_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(new.product_access_override, false)
     and new.epoint_registration_status not in ('verified','legacy_verified') then
    raise exception 'Epoint qeydiyyatı yoxlanmadan satıcıya giriş icazəsi verilə bilməz';
  end if;

  if new.status = 'active'
     and new.epoint_registration_status not in ('verified','legacy_verified') then
    new.status := 'pending_epoint_verification';
    new.activated_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_epoint_seller_application_gate()
from public, anon, authenticated;

drop trigger if exists enforce_epoint_seller_application_gate on public.seller_applications;
create trigger enforce_epoint_seller_application_gate
before insert or update on public.seller_applications
for each row execute function private.enforce_epoint_seller_application_gate();

-- A payment callback historically removes the buyer role before inserting the
-- seller role. Preserve buyer access while Epoint verification is pending.
create or replace function private.preserve_buyer_until_epoint_verification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.role = 'buyer'::public.app_role
     and exists (
       select 1 from public.seller_applications application
       where application.user_id = old.user_id
         and application.epoint_registration_status not in ('verified','legacy_verified')
     ) then
    return null;
  end if;
  return old;
end;
$$;

revoke all on function private.preserve_buyer_until_epoint_verification()
from public, anon, authenticated;

drop trigger if exists preserve_buyer_until_epoint_verification on public.user_roles;
create trigger preserve_buyer_until_epoint_verification
before delete on public.user_roles
for each row execute function private.preserve_buyer_until_epoint_verification();

create or replace function private.enforce_paid_seller_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role <> 'seller'::public.app_role then return new; end if;

  if exists (
    select 1 from public.seller_applications application
    where application.user_id = new.user_id
      and application.epoint_registration_status not in ('verified','legacy_verified')
  ) then
    return null;
  end if;

  if not exists (
    select 1 from public.seller_applications application
    where application.user_id = new.user_id
      and application.status = 'active'
      and (
        application.payment_status in ('success','migrated')
        or coalesce(application.product_access_override, false)
      )
      and application.epoint_registration_status in ('verified','legacy_verified')
  ) then
    raise exception 'Satıcı kabineti yalnız Epoint qeydiyyatı və ödəniş təsdiqindən sonra aktivləşdirilə bilər';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_paid_seller_role()
from public, anon, authenticated;

create or replace function public.admin_verify_seller_epoint_registration(
  _target_id uuid,
  _verified boolean,
  _note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _admin_id uuid := auth.uid();
  _application public.seller_applications%rowtype;
begin
  if _admin_id is null or not public.is_super_admin(_admin_id) then
    raise exception 'Bu əməliyyat üçün Super Admin icazəsi tələb olunur';
  end if;

  select * into _application
  from public.seller_applications
  where user_id = _target_id
  for update;
  if not found then raise exception 'Satıcı müraciəti tapılmadı'; end if;

  if _verified and (
    _application.epoint_account_email is null
    or _application.epoint_business_name is null
    or _application.epoint_registration_declared_at is null
  ) then
    raise exception 'Satıcının Epoint qeydiyyat məlumatları tam deyil';
  end if;

  update public.seller_applications
  set epoint_registration_status = case when _verified then 'verified' else 'rejected' end,
      epoint_registration_verified_at = case when _verified then now() else null end,
      epoint_registration_verified_by = case when _verified then _admin_id else null end,
      epoint_registration_note = nullif(left(trim(coalesce(_note,'')), 1000), ''),
      status = case
        when _verified and (
          payment_status in ('success','migrated') or coalesce(product_access_override,false)
        ) then 'active'
        when payment_status in ('success','migrated') then 'pending_epoint_verification'
        else 'pending_payment'
      end,
      activated_at = case
        when _verified and (
          payment_status in ('success','migrated') or coalesce(product_access_override,false)
        ) then coalesce(activated_at, now()) else null end,
      updated_at = now()
  where user_id = _target_id
  returning * into _application;

  if _application.status = 'active' then
    insert into public.user_roles(user_id, role)
    values(_target_id, 'seller'::public.app_role)
    on conflict(user_id, role) do nothing;
    delete from public.user_roles
    where user_id = _target_id and role = 'buyer'::public.app_role;
    update public.profiles set account_status = 'active' where id = _target_id;
  else
    delete from public.user_roles
    where user_id = _target_id and role = 'seller'::public.app_role;
  end if;

  return jsonb_build_object(
    'ok', true,
    'verified', _verified,
    'seller_status', _application.status,
    'payment_status', _application.payment_status,
    'epoint_registration_status', _application.epoint_registration_status
  );
end;
$$;

revoke all on function public.admin_verify_seller_epoint_registration(uuid,boolean,text)
from public, anon;
grant execute on function public.admin_verify_seller_epoint_registration(uuid,boolean,text)
to authenticated, service_role;

comment on function public.admin_verify_seller_epoint_registration(uuid,boolean,text) is
  'Super Admin verification gate for mandatory seller Epoint registration.';

create or replace function public.submit_seller_epoint_registration(
  _account_email text,
  _business_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _user_id uuid := auth.uid();
  _email text := lower(trim(coalesce(_account_email,'')));
  _name text := trim(coalesce(_business_name,''));
begin
  if _user_id is null then raise exception 'Daxil olmaq tələb olunur'; end if;
  if _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Epoint e-poçt ünvanı düzgün deyil';
  end if;
  if char_length(_name) not between 2 and 120 then
    raise exception 'Epoint biznes səhifəsinin adı düzgün deyil';
  end if;

  update public.seller_applications
  set epoint_account_email = _email,
      epoint_business_name = _name,
      epoint_registration_status = case
        when epoint_registration_status in ('verified','legacy_verified')
          and epoint_account_email = _email and epoint_business_name = _name
        then epoint_registration_status else 'pending' end,
      epoint_registration_declared_at = now(),
      epoint_registration_verified_at = case
        when epoint_registration_status in ('verified','legacy_verified')
          and epoint_account_email = _email and epoint_business_name = _name
        then epoint_registration_verified_at else null end,
      epoint_registration_verified_by = case
        when epoint_registration_status in ('verified','legacy_verified')
          and epoint_account_email = _email and epoint_business_name = _name
        then epoint_registration_verified_by else null end,
      epoint_registration_note = case
        when epoint_registration_status in ('verified','legacy_verified')
          and epoint_account_email = _email and epoint_business_name = _name
        then epoint_registration_note else null end,
      status = case
        when payment_status in ('success','migrated') then 'pending_epoint_verification'
        else 'pending_payment'
      end,
      updated_at = now()
  where user_id = _user_id;
  if not found then raise exception 'Satıcı müraciəti tapılmadı'; end if;

  delete from public.user_roles
  where user_id = _user_id and role = 'seller'::public.app_role
    and exists (
      select 1 from public.seller_applications application
      where application.user_id = _user_id
        and application.epoint_registration_status not in ('verified','legacy_verified')
    );

  return jsonb_build_object('ok',true,'status','pending');
end;
$$;

revoke all on function public.submit_seller_epoint_registration(text,text)
from public, anon;
grant execute on function public.submit_seller_epoint_registration(text,text)
to authenticated;
