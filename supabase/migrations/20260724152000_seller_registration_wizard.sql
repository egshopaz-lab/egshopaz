-- Structured seller onboarding fields.
-- Identity data is copied from temporary signup metadata into the protected
-- seller application when payment preparation creates or updates the row.

alter table public.seller_applications
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists father_name text,
  add column if not exists date_of_birth date,
  add column if not exists fin_code text,
  add column if not exists identity_document_number text,
  add column if not exists residential_address text,
  add column if not exists seller_type text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists seller_agreement_accepted_at timestamptz,
  add column if not exists phone_verified_at timestamptz;

alter table public.system_settings
  add column if not exists seller_phone_otp_required boolean not null default true;

alter table public.seller_applications
  drop constraint if exists seller_applications_seller_type_check;

alter table public.seller_applications
  add constraint seller_applications_seller_type_check
  check (seller_type is null or seller_type in ('individual', 'sole_proprietor', 'legal_entity'));

create unique index if not exists seller_applications_fin_code_unique
  on public.seller_applications (fin_code)
  where fin_code is not null;

create unique index if not exists seller_applications_identity_document_unique
  on public.seller_applications (identity_document_number)
  where identity_document_number is not null;

create or replace function public.populate_seller_application_registration()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  _metadata jsonb;
  _birth_date date;
  _seller_type text;
  _voen text;
  _phone_confirmed_at timestamptz;
  _phone_otp_required boolean := true;
begin
  select
    coalesce(raw_user_meta_data, '{}'::jsonb),
    phone_confirmed_at
  into _metadata, _phone_confirmed_at
  from auth.users
  where id = new.user_id;

  if coalesce(_metadata->>'registration_version', '') <> 'seller_wizard_v1' then
    return new;
  end if;

  select coalesce(seller_phone_otp_required, true)
  into _phone_otp_required
  from public.system_settings
  limit 1;

  begin
    _birth_date := nullif(_metadata->>'date_of_birth', '')::date;
  exception when others then
    raise exception 'Doğum tarixi düzgün deyil';
  end;

  _seller_type := nullif(trim(coalesce(_metadata->>'seller_type', '')), '');
  _voen := regexp_replace(coalesce(_metadata->>'voen', ''), '[^0-9]', '', 'g');

  if char_length(trim(coalesce(_metadata->>'first_name', ''))) < 2
    or char_length(trim(coalesce(_metadata->>'last_name', ''))) < 2
    or char_length(trim(coalesce(_metadata->>'father_name', ''))) < 2 then
    raise exception 'Şəxsi məlumatlar tam deyil';
  end if;
  if _birth_date is null or _birth_date > (current_date - interval '18 years')::date then
    raise exception 'Qeydiyyat üçün minimum yaş 18-dir';
  end if;
  if coalesce(_metadata->>'fin_code', '') !~ '^[A-Z0-9]{7}$' then
    raise exception 'FİN kodu düzgün deyil';
  end if;
  if coalesce(_metadata->>'identity_document_number', '') !~ '^[A-Z0-9]{5,20}$' then
    raise exception 'Şəxsiyyət vəsiqəsi məlumatı düzgün deyil';
  end if;
  if char_length(trim(coalesce(_metadata->>'residential_address', ''))) < 10 then
    raise exception 'Yaşayış ünvanı tam deyil';
  end if;
  if _seller_type not in ('individual', 'sole_proprietor', 'legal_entity') then
    raise exception 'Satıcı növü düzgün deyil';
  end if;
  if _seller_type in ('sole_proprietor', 'legal_entity') and _voen !~ '^[0-9]{10}$' then
    raise exception 'VÖEN 10 rəqəmdən ibarət olmalıdır';
  end if;
  if coalesce(_metadata->>'terms_accepted', '') <> 'true'
    or coalesce(_metadata->>'privacy_accepted', '') <> 'true'
    or coalesce(_metadata->>'seller_agreement_accepted', '') <> 'true' then
    raise exception 'Məcburi razılıqlar təsdiqlənməyib';
  end if;
  if _phone_otp_required and _phone_confirmed_at is null then
    raise exception 'Telefon nömrəsi təsdiqlənməyib';
  end if;

  new.first_name := trim(_metadata->>'first_name');
  new.last_name := trim(_metadata->>'last_name');
  new.father_name := trim(_metadata->>'father_name');
  new.date_of_birth := _birth_date;
  new.fin_code := upper(_metadata->>'fin_code');
  new.identity_document_number := upper(_metadata->>'identity_document_number');
  new.residential_address := trim(_metadata->>'residential_address');
  new.seller_type := _seller_type;
  new.voen := case when _seller_type = 'individual' then null else _voen end;
  new.terms_accepted_at := coalesce(new.terms_accepted_at, now());
  new.privacy_accepted_at := coalesce(new.privacy_accepted_at, now());
  new.seller_agreement_accepted_at := coalesce(new.seller_agreement_accepted_at, now());
  new.phone_verified_at := coalesce(new.phone_verified_at, _phone_confirmed_at);
  return new;
end;
$$;

revoke all on function public.populate_seller_application_registration() from public, anon, authenticated;

drop trigger if exists populate_seller_application_registration
  on public.seller_applications;

create trigger populate_seller_application_registration
before insert or update on public.seller_applications
for each row execute function public.populate_seller_application_registration();

create or replace function public.clear_temporary_seller_identity_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb)
      - 'registration_version'
      - 'first_name'
      - 'last_name'
      - 'father_name'
      - 'date_of_birth'
      - 'fin_code'
      - 'identity_document_number'
      - 'residential_address'
      - 'terms_accepted'
      - 'privacy_accepted'
      - 'seller_agreement_accepted'
      - 'agreements_accepted_at'
  where id = new.user_id
    and raw_user_meta_data->>'registration_version' = 'seller_wizard_v1';
  return new;
end;
$$;

revoke all on function public.clear_temporary_seller_identity_metadata()
  from public, anon, authenticated;

drop trigger if exists clear_temporary_seller_identity_metadata
  on public.seller_applications;

create trigger clear_temporary_seller_identity_metadata
after insert or update on public.seller_applications
for each row execute function public.clear_temporary_seller_identity_metadata();

comment on column public.seller_applications.fin_code is
  'Protected seller identity field. Never expose through public storefront APIs.';
comment on column public.seller_applications.identity_document_number is
  'Protected seller identity field. Never expose through public storefront APIs.';
comment on column public.seller_applications.residential_address is
  'Protected seller identity field. Never expose through public storefront APIs.';
comment on column public.system_settings.seller_phone_otp_required is
  'Admin-controlled seller phone OTP gate. Disabling skips verification without deleting provider configuration.';

