-- A seller application is created only after email confirmation. This keeps
-- the user as a buyer during signup while preserving the seller wizard data
-- needed to start the mandatory registration payment.

create or replace function private.create_seller_application_after_confirmation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  _shop_name text := nullif(trim(_metadata ->> 'shop_name'), '');
  _seller_type text := nullif(trim(_metadata ->> 'seller_type'), '');
  _accepted_at timestamptz := coalesce(
    case
      when (_metadata ->> 'agreements_accepted_at') ~
        '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
      then (_metadata ->> 'agreements_accepted_at')::timestamptz
      else null
    end,
    now()
  );
  _registration_fee numeric;
begin
  if new.email_confirmed_at is null
     or _metadata ->> 'onboarding_portal' <> 'seller'
     or _shop_name is null
     or char_length(_shop_name) not between 2 and 100
  then
    return new;
  end if;

  if _seller_type not in ('individual', 'sole_proprietor', 'legal_entity') then
    _seller_type := null;
  end if;

  select coalesce(seller_signup_fee, 20)
    into _registration_fee
  from public.system_settings
  limit 1;
  _registration_fee := coalesce(_registration_fee, 20);

  insert into public.seller_applications (
    user_id,
    shop_name,
    shop_city,
    phone,
    voen,
    status,
    payment_status,
    registration_fee,
    acquisition_source,
    acquisition_detail,
    first_name,
    last_name,
    father_name,
    date_of_birth,
    fin_code,
    identity_document_number,
    residential_address,
    seller_type,
    terms_accepted_at,
    privacy_accepted_at,
    seller_agreement_accepted_at
  )
  values (
    new.id,
    _shop_name,
    nullif(trim(_metadata ->> 'shop_city'), ''),
    nullif(trim(_metadata ->> 'phone'), ''),
    nullif(trim(_metadata ->> 'voen'), ''),
    'pending_payment',
    'pending',
    _registration_fee,
    nullif(trim(_metadata ->> 'acquisition_source'), ''),
    nullif(left(trim(_metadata ->> 'acquisition_detail'), 250), ''),
    nullif(trim(_metadata ->> 'first_name'), ''),
    nullif(trim(_metadata ->> 'last_name'), ''),
    nullif(trim(_metadata ->> 'father_name'), ''),
    case
      when (_metadata ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$'
      then (_metadata ->> 'date_of_birth')::date
      else null
    end,
    nullif(trim(_metadata ->> 'fin_code'), ''),
    nullif(trim(_metadata ->> 'identity_document_number'), ''),
    nullif(trim(_metadata ->> 'residential_address'), ''),
    _seller_type,
    case when lower(coalesce(_metadata ->> 'terms_accepted', 'false'))
      in ('true', '1', 'yes') then _accepted_at end,
    case when lower(coalesce(_metadata ->> 'privacy_accepted', 'false'))
      in ('true', '1', 'yes') then _accepted_at end,
    case when lower(coalesce(_metadata ->> 'seller_agreement_accepted', 'false'))
      in ('true', '1', 'yes') then _accepted_at end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_seller_application_after_confirmation()
from public, anon, authenticated;

drop trigger if exists create_seller_application_after_confirmation
on auth.users;

create trigger create_seller_application_after_confirmation
after update of email_confirmed_at
on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function private.create_seller_application_after_confirmation();

-- Repair already-confirmed seller signups that reached the marketplace before
-- this trigger existed. Paid/active applications are untouched.
insert into public.seller_applications (
  user_id,
  shop_name,
  shop_city,
  phone,
  voen,
  status,
  payment_status,
  registration_fee,
  acquisition_source,
  acquisition_detail,
  first_name,
  last_name,
  father_name,
  date_of_birth,
  fin_code,
  identity_document_number,
  residential_address,
  seller_type,
  terms_accepted_at,
  privacy_accepted_at,
  seller_agreement_accepted_at
)
select
  u.id,
  trim(u.raw_user_meta_data ->> 'shop_name'),
  nullif(trim(u.raw_user_meta_data ->> 'shop_city'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'phone'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'voen'), ''),
  'pending_payment',
  'pending',
  coalesce((select seller_signup_fee from public.system_settings limit 1), 20),
  nullif(trim(u.raw_user_meta_data ->> 'acquisition_source'), ''),
  nullif(left(trim(u.raw_user_meta_data ->> 'acquisition_detail'), 250), ''),
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'father_name'), ''),
  case
    when (u.raw_user_meta_data ->> 'date_of_birth') ~ '^\d{4}-\d{2}-\d{2}$'
    then (u.raw_user_meta_data ->> 'date_of_birth')::date
    else null
  end,
  nullif(trim(u.raw_user_meta_data ->> 'fin_code'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'identity_document_number'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'residential_address'), ''),
  case
    when u.raw_user_meta_data ->> 'seller_type'
      in ('individual', 'sole_proprietor', 'legal_entity')
    then u.raw_user_meta_data ->> 'seller_type'
    else null
  end,
  coalesce(
    case
      when (u.raw_user_meta_data ->> 'agreements_accepted_at') ~
        '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
      then (u.raw_user_meta_data ->> 'agreements_accepted_at')::timestamptz
      else null
    end,
    u.email_confirmed_at
  ),
  coalesce(
    case
      when (u.raw_user_meta_data ->> 'agreements_accepted_at') ~
        '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
      then (u.raw_user_meta_data ->> 'agreements_accepted_at')::timestamptz
      else null
    end,
    u.email_confirmed_at
  ),
  coalesce(
    case
      when (u.raw_user_meta_data ->> 'agreements_accepted_at') ~
        '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
      then (u.raw_user_meta_data ->> 'agreements_accepted_at')::timestamptz
      else null
    end,
    u.email_confirmed_at
  )
from auth.users u
where u.email_confirmed_at is not null
  and u.raw_user_meta_data ->> 'onboarding_portal' = 'seller'
  and char_length(trim(u.raw_user_meta_data ->> 'shop_name')) between 2 and 100
on conflict (user_id) do nothing;

comment on function private.create_seller_application_after_confirmation() is
  'Creates a pending seller application after email confirmation without granting seller access.';
