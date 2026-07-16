-- Registration acquisition, account administration, realtime statistics and audit trail.

alter table public.profiles
  add column if not exists acquisition_source text,
  add column if not exists acquisition_detail text,
  add column if not exists account_status text not null default 'active',
  add column if not exists blocked_until timestamptz,
  add column if not exists block_reason text,
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_updated_by uuid,
  add column if not exists last_active_at timestamptz not null default now();

alter table public.seller_applications
  add column if not exists acquisition_source text,
  add column if not exists acquisition_detail text;

alter table public.pvz_staff
  add column if not exists acquisition_source text,
  add column if not exists acquisition_detail text;

alter table public.system_settings
  add column if not exists acquisition_source_enabled boolean not null default true,
  add column if not exists acquisition_source_required boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_acquisition_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_acquisition_source_check check (
      acquisition_source is null or acquisition_source in (
        'internet_ads', 'facebook', 'instagram', 'tiktok', 'google', 'youtube',
        'friend_referral', 'seller_referral', 'pvz_referral', 'employee_referral', 'other'
      )
    );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_account_status_check check (
      account_status in ('active', 'inactive', 'temporary_blocked', 'permanent_blocked')
    );
  end if;
end $$;

create index if not exists profiles_account_status_created_idx
  on public.profiles (account_status, created_at desc);
create index if not exists profiles_acquisition_source_created_idx
  on public.profiles (acquisition_source, created_at desc)
  where acquisition_source is not null;
create index if not exists profiles_last_active_idx
  on public.profiles (last_active_at desc);
create index if not exists user_roles_role_created_idx
  on public.user_roles (role, created_at desc);
create index if not exists pvz_staff_user_active_idx
  on public.pvz_staff (user_id, is_active);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  admin_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  target_user_id uuid,
  reason text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc, id desc);
create index if not exists admin_audit_logs_target_created_idx
  on public.admin_audit_logs (target_user_id, created_at desc)
  where target_user_id is not null;
create index if not exists admin_audit_logs_admin_created_idx
  on public.admin_audit_logs (admin_id, created_at desc)
  where admin_id is not null;
create index if not exists admin_audit_logs_entity_created_idx
  on public.admin_audit_logs (entity_type, created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins read audit logs" on public.admin_audit_logs;
create policy "Admins read audit logs"
on public.admin_audit_logs for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

revoke all on public.admin_audit_logs from public, anon, authenticated;
grant select on public.admin_audit_logs to authenticated;
grant select, insert on public.admin_audit_logs to service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = _user_id
      and ur.role = _role
      and (
        p.account_status = 'active'
        or (p.account_status = 'temporary_blocked' and p.blocked_until <= now())
      )
  )
$$;

create or replace function public.protect_profile_control_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _is_privileged boolean := current_user in ('postgres', 'service_role')
    or coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false);
begin
  if _is_privileged then
    return new;
  end if;

  if new.account_status is distinct from old.account_status
     or new.blocked_until is distinct from old.blocked_until
     or new.block_reason is distinct from old.block_reason
     or new.status_updated_at is distinct from old.status_updated_at
     or new.status_updated_by is distinct from old.status_updated_by then
    raise exception 'Hesab statusunu yalnız admin dəyişə bilər';
  end if;

  if old.acquisition_source is not null
     and (new.acquisition_source is distinct from old.acquisition_source
          or new.acquisition_detail is distinct from old.acquisition_detail) then
    raise exception 'Qeydiyyat mənbəyi yalnız admin tərəfindən dəyişdirilə bilər';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_control_fields on public.profiles;
create trigger protect_profile_control_fields
before update on public.profiles
for each row execute function public.protect_profile_control_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _ref_code text;
  _referrer_id uuid;
  _input_ref text;
  _portal text := nullif(trim(new.raw_user_meta_data->>'onboarding_portal'), '');
  _source text := nullif(trim(new.raw_user_meta_data->>'acquisition_source'), '');
  _source_detail text := nullif(left(trim(new.raw_user_meta_data->>'acquisition_detail'), 250), '');
  _source_enabled boolean := true;
  _source_required boolean := true;
begin
  select acquisition_source_enabled, acquisition_source_required
    into _source_enabled, _source_required
  from public.system_settings
  limit 1;
  _source_enabled := coalesce(_source_enabled, true);
  _source_required := coalesce(_source_required, true);

  if _source is not null and _source not in (
    'internet_ads', 'facebook', 'instagram', 'tiktok', 'google', 'youtube',
    'friend_referral', 'seller_referral', 'pvz_referral', 'employee_referral', 'other'
  ) then
    raise exception 'Qeydiyyat mənbəyi düzgün deyil';
  end if;

  if _source_enabled and _source_required and _portal in ('seller', 'pvz') and _source is null then
    raise exception 'Sizi haradan tanıdığımızı seçin';
  end if;
  if _source in ('seller_referral', 'pvz_referral', 'employee_referral', 'other')
     and _source_detail is null then
    raise exception 'Cəlb edən şəxs və ya mənbə haqqında məlumat daxil edin';
  end if;

  _ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _input_ref := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');

  insert into public.profiles (
    id, full_name, phone, referral_code, acquisition_source, acquisition_detail
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    _ref_code,
    case when _source_enabled then _source else null end,
    case when _source_enabled then _source_detail else null end
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone),
      acquisition_source = coalesce(public.profiles.acquisition_source, excluded.acquisition_source),
      acquisition_detail = coalesce(public.profiles.acquisition_detail, excluded.acquisition_detail),
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'buyer'::public.app_role)
  on conflict (user_id, role) do nothing;

  if _input_ref is not null then
    select id into _referrer_id
    from public.profiles
    where referral_code = upper(_input_ref)
    limit 1;

    if _referrer_id is not null and _referrer_id <> new.id then
      update public.profiles set referred_by = _referrer_id where id = new.id;
      insert into public.referrals (referrer_id, referred_id, bonus_awarded)
      values (_referrer_id, new.id, 500)
      on conflict do nothing;
      insert into public.bonus_transactions (user_id, amount, reason)
      values
        (_referrer_id, 500, 'Dəvət bonusu'),
        (new.id, 500, 'Xoş gəldiniz bonusu (dəvət)');
      update public.profiles
      set bonus_balance = coalesce(bonus_balance, 0) + 500
      where id in (_referrer_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.record_registration_source(_source text, _detail text default null)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  _enabled boolean := true;
  _required boolean := true;
  _clean_source text := nullif(trim(_source), '');
  _clean_detail text := nullif(left(trim(coalesce(_detail, '')), 250), '');
begin
  if auth.uid() is null then raise exception 'Giriş tələb olunur'; end if;
  select acquisition_source_enabled, acquisition_source_required into _enabled, _required
  from public.system_settings limit 1;
  if not coalesce(_enabled, true) then return; end if;
  if _clean_source is null and coalesce(_required, true) then
    raise exception 'Qeydiyyat mənbəyini seçin';
  end if;
  if _clean_source is not null and _clean_source not in (
    'internet_ads', 'facebook', 'instagram', 'tiktok', 'google', 'youtube',
    'friend_referral', 'seller_referral', 'pvz_referral', 'employee_referral', 'other'
  ) then raise exception 'Qeydiyyat mənbəyi düzgün deyil'; end if;
  if _clean_source in ('seller_referral', 'pvz_referral', 'employee_referral', 'other')
     and _clean_detail is null then
    raise exception 'Əlavə məlumat daxil edin';
  end if;
  update public.profiles
  set acquisition_source = coalesce(acquisition_source, _clean_source),
      acquisition_detail = coalesce(acquisition_detail, _clean_detail),
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.record_registration_source(text,text) from public, anon;
grant execute on function public.record_registration_source(text,text) to authenticated;

-- The payment preparer is service-only in production. Enforce acquisition settings there too.
create or replace function public.prepare_seller_payment(
  _user_id uuid,
  _shop_name text,
  _shop_city text default null,
  _phone text default null,
  _voen text default null
)
returns table (
  application_id uuid,
  merchant_order_id text,
  amount numeric,
  currency text,
  application_status text
)
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  _application_id uuid;
  _merchant_order_id text;
  _safe_shop_name text := nullif(trim(coalesce(_shop_name, '')), '');
  _current_status text;
  _source text;
  _source_detail text;
  _source_enabled boolean := true;
  _source_required boolean := true;
  _fee numeric := 20.00;
begin
  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'İstifadəçi tapılmadı';
  end if;
  if _safe_shop_name is null or char_length(_safe_shop_name) < 2 then
    raise exception 'Mağaza adı minimum 2 simvol olmalıdır';
  end if;

  select p.acquisition_source, p.acquisition_detail
    into _source, _source_detail
  from public.profiles p where p.id = _user_id;
  select acquisition_source_enabled, acquisition_source_required, seller_signup_fee
    into _source_enabled, _source_required, _fee
  from public.system_settings limit 1;
  if coalesce(_source_enabled, true) and coalesce(_source_required, true) and _source is null then
    raise exception 'Qeydiyyat mənbəyini seçin';
  end if;

  select sa.id, sa.status into _application_id, _current_status
  from public.seller_applications sa
  where sa.user_id = _user_id for update;
  if _current_status = 'active' then raise exception 'Satıcı hesabı artıq aktivdir'; end if;

  insert into public.profiles (id, shop_name, shop_city, phone, voen)
  values (
    _user_id, left(_safe_shop_name, 100),
    nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
    nullif(left(trim(coalesce(_phone, '')), 30), ''),
    nullif(left(trim(coalesce(_voen, '')), 32), '')
  )
  on conflict (id) do update
  set shop_name = excluded.shop_name,
      shop_city = excluded.shop_city,
      phone = coalesce(excluded.phone, profiles.phone),
      voen = excluded.voen,
      updated_at = now();

  if _application_id is null then
    insert into public.seller_applications (
      user_id, shop_name, shop_city, phone, voen, acquisition_source, acquisition_detail, registration_fee
    ) values (
      _user_id, left(_safe_shop_name, 100),
      nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
      nullif(left(trim(coalesce(_phone, '')), 30), ''),
      nullif(left(trim(coalesce(_voen, '')), 32), ''),
      _source, _source_detail, coalesce(_fee, 20.00)
    ) returning id into _application_id;
  else
    update public.seller_applications
    set shop_name = left(_safe_shop_name, 100),
        shop_city = nullif(left(trim(coalesce(_shop_city, '')), 100), ''),
        phone = nullif(left(trim(coalesce(_phone, '')), 30), ''),
        voen = nullif(left(trim(coalesce(_voen, '')), 32), ''),
        acquisition_source = _source,
        acquisition_detail = _source_detail,
        registration_fee = coalesce(_fee, 20.00),
        status = 'pending_payment', payment_status = 'pending', updated_at = now()
    where id = _application_id;
  end if;

  _merchant_order_id := 'seller_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.seller_payment_attempts (application_id, user_id, merchant_order_id, amount, currency)
  values (_application_id, _user_id, _merchant_order_id, coalesce(_fee, 20.00), 'AZN');

  return query select _application_id, _merchant_order_id, coalesce(_fee, 20.00), 'AZN'::text, 'pending_payment'::text;
end;
$$;

revoke all on function public.prepare_seller_payment(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.prepare_seller_payment(uuid,text,text,text,text) to service_role;

create or replace function public.complete_pvz_registration(
  _user_id uuid,
  _full_name text,
  _phone text,
  _pickup_point_id uuid default null,
  _position text default 'operator',
  _new_pvz_name text default null,
  _new_pvz_city text default null,
  _new_pvz_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _final_pvz uuid := _pickup_point_id;
  _name_norm text;
  _source text;
  _detail text;
  _enabled boolean := true;
  _required boolean := true;
begin
  if _user_id is null or not exists (select 1 from auth.users where id=_user_id) then
    raise exception 'İstifadəçi tapılmadı';
  end if;
  if coalesce(trim(_full_name),'')='' then raise exception 'Ad daxil edin'; end if;
  if coalesce(trim(_phone),'')='' then raise exception 'Telefon nömrəsi daxil edin'; end if;

  select p.acquisition_source,p.acquisition_detail into _source,_detail
  from public.profiles p where p.id=_user_id;
  select acquisition_source_enabled,acquisition_source_required into _enabled,_required
  from public.system_settings where id=1;
  if coalesce(_enabled,true) and coalesce(_required,true) and _source is null then
    raise exception 'Məlumat mənbəyini seçin';
  end if;
  if _source in ('other','seller_referral','pvz_referral','employee_referral') and nullif(trim(coalesce(_detail,'')),'') is null then
    raise exception 'Cəlb edən şəxs və ya mənbə haqqında məlumat daxil edin';
  end if;

  if _final_pvz is null then
    if coalesce(trim(_new_pvz_name),'')='' or coalesce(trim(_new_pvz_city),'')='' or coalesce(trim(_new_pvz_address),'')='' then
      raise exception 'PVZ punkt məlumatları tam daxil edilməlidir';
    end if;
    _name_norm := 'PVZ PUNKT — ' || trim(_new_pvz_name);
    select id into _final_pvz from public.pickup_points
    where lower(trim(name))=lower(_name_norm)
      and lower(trim(city))=lower(trim(_new_pvz_city))
      and lower(trim(address))=lower(trim(_new_pvz_address))
    limit 1;
    if _final_pvz is null then
      insert into public.pickup_points(name,city,address,phone,is_active)
      values(_name_norm,trim(_new_pvz_city),trim(_new_pvz_address),trim(_phone),true)
      returning id into _final_pvz;
    end if;
  elsif not exists (select 1 from public.pickup_points where id=_final_pvz and is_active) then
    raise exception 'Aktiv PVZ punkt tapılmadı';
  end if;

  update public.profiles set
    full_name=coalesce(nullif(trim(_full_name),''),full_name),
    phone=trim(_phone), updated_at=now()
  where id=_user_id;

  insert into public.pvz_staff(
    user_id,full_name,phone,pickup_point_id,position,is_active,acquisition_source,acquisition_detail
  ) values (
    _user_id,trim(_full_name),trim(_phone),_final_pvz,
    coalesce(nullif(trim(_position),''),'operator'),true,_source,_detail
  ) on conflict (user_id) do update set
    full_name=excluded.full_name,phone=excluded.phone,pickup_point_id=excluded.pickup_point_id,
    position=excluded.position,is_active=true,acquisition_source=excluded.acquisition_source,
    acquisition_detail=excluded.acquisition_detail;

  delete from public.user_roles where user_id=_user_id and role='buyer'::public.app_role;
  insert into public.user_roles(user_id,role) values(_user_id,'pvz'::public.app_role)
  on conflict (user_id,role) do nothing;
  return _final_pvz;
end;
$$;

revoke all on function public.complete_pvz_registration(uuid,text,text,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.complete_pvz_registration(uuid,text,text,uuid,text,text,text,text)
  to service_role;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  _today timestamptz := date_trunc('day', now());
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;
  return jsonb_build_object(
    'total_customers', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='buyer'::public.app_role),
    'total_sellers', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='seller'::public.app_role),
    'total_pvz', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='pvz'::public.app_role),
    'active_sellers', (
      select count(distinct ur.user_id) from public.user_roles ur
      join public.profiles p on p.id=ur.user_id
      left join public.seller_applications sa on sa.user_id=ur.user_id
      where ur.role='seller'::public.app_role
        and (p.account_status='active' or (p.account_status='temporary_blocked' and p.blocked_until <= now()))
        and coalesce(sa.status,'active')='active'
    ),
    'active_pvz', (
      select count(distinct ur.user_id) from public.user_roles ur
      join public.profiles p on p.id=ur.user_id
      join public.pvz_staff ps on ps.user_id=ur.user_id and ps.is_active
      where ur.role='pvz'::public.app_role
        and (p.account_status='active' or (p.account_status='temporary_blocked' and p.blocked_until <= now()))
    ),
    'today_customers', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='buyer'::public.app_role and ur.created_at >= _today),
    'today_sellers', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='seller'::public.app_role and ur.created_at >= _today),
    'today_pvz', (select count(distinct ur.user_id) from public.user_roles ur where ur.role='pvz'::public.app_role and ur.created_at >= _today)
  );
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

create or replace function public.admin_list_accounts(
  _search text default null,
  _role text default null,
  _status text default null,
  _source text default null,
  _limit integer default 100
)
returns table (
  user_id uuid, email text, full_name text, phone text, shop_name text,
  roles text[], account_status text, blocked_until timestamptz, block_reason text,
  acquisition_source text, acquisition_detail text, created_at timestamptz,
  updated_at timestamptz, last_active_at timestamptz, seller_status text, pvz_active boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;
  return query
  select p.id, u.email::text, p.full_name, p.phone, p.shop_name,
    coalesce(r.roles, array[]::text[]), p.account_status, p.blocked_until, p.block_reason,
    p.acquisition_source, p.acquisition_detail, p.created_at, p.updated_at, p.last_active_at,
    sa.status, coalesce(ps.is_active, false)
  from public.profiles p
  join auth.users u on u.id=p.id
  left join lateral (
    select array_agg(ur.role::text order by ur.role::text) roles
    from public.user_roles ur where ur.user_id=p.id
  ) r on true
  left join public.seller_applications sa on sa.user_id=p.id
  left join lateral (
    select bool_or(x.is_active) is_active from public.pvz_staff x where x.user_id=p.id
  ) ps on true
  where (_role is null or _role='' or _role=any(coalesce(r.roles,array[]::text[])))
    and (_status is null or _status='' or p.account_status=_status)
    and (_source is null or _source='' or p.acquisition_source=_source)
    and (
      _search is null or trim(_search)='' or
      u.email ilike '%' || trim(_search) || '%' or
      coalesce(p.full_name,'') ilike '%' || trim(_search) || '%' or
      coalesce(p.phone,'') ilike '%' || trim(_search) || '%' or
      coalesce(p.shop_name,'') ilike '%' || trim(_search) || '%' or
      coalesce(p.acquisition_detail,'') ilike '%' || trim(_search) || '%'
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(_limit,100),1),500);
end;
$$;

revoke all on function public.admin_list_accounts(text,text,text,text,integer) from public, anon;
grant execute on function public.admin_list_accounts(text,text,text,text,integer) to authenticated;

create or replace function public.admin_account_snapshot(_target_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'user', (select to_jsonb(u) - 'encrypted_password' - 'confirmation_token' - 'recovery_token' - 'email_change_token_new' - 'email_change_token_current' from auth.users u where u.id=_target_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id=_target_id),
    'roles', (select coalesce(jsonb_agg(to_jsonb(ur)), '[]'::jsonb) from public.user_roles ur where ur.user_id=_target_id),
    'seller_application', (select to_jsonb(sa) from public.seller_applications sa where sa.user_id=_target_id),
    'pvz_staff', (select coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb) from public.pvz_staff ps where ps.user_id=_target_id)
  )
$$;

revoke all on function public.admin_account_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.admin_account_snapshot(uuid) to service_role;

create or replace function public.admin_apply_account_action(
  _admin_id uuid,
  _target_id uuid,
  _action text,
  _reason text default null,
  _blocked_until timestamptz default null,
  _profile_patch jsonb default '{}'::jsonb,
  _admin_email text default null,
  _ip_address inet default null,
  _user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _old jsonb;
  _new jsonb;
  _source text;
begin
  if _admin_id is null or not exists (
    select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id
    where ur.user_id=_admin_id and ur.role='admin'::public.app_role
      and (p.account_status='active' or (p.account_status='temporary_blocked' and p.blocked_until <= now()))
  ) then raise exception 'Admin icazəsi tələb olunur'; end if;
  if _target_id is null or not exists (select 1 from auth.users where id=_target_id) then
    raise exception 'İstifadəçi tapılmadı';
  end if;
  if _admin_id=_target_id then raise exception 'Admin öz hesabında bu əməliyyatı edə bilməz'; end if;

  _old := public.admin_account_snapshot(_target_id);

  if _action in ('activate','restore') then
    update public.profiles set account_status='active', blocked_until=null, block_reason=null,
      status_updated_at=now(), status_updated_by=_admin_id, updated_at=now() where id=_target_id;
    update public.pvz_staff set is_active=true where user_id=_target_id;
    update public.seller_applications set status='active', updated_at=now()
      where user_id=_target_id and payment_status in ('success','migrated');
  elsif _action='deactivate' then
    update public.profiles set account_status='inactive', blocked_until=null, block_reason=nullif(left(trim(coalesce(_reason,'')),500),''),
      status_updated_at=now(), status_updated_by=_admin_id, updated_at=now() where id=_target_id;
    update public.pvz_staff set is_active=false where user_id=_target_id;
    update public.seller_applications set status='suspended', updated_at=now() where user_id=_target_id and status='active';
  elsif _action='temporary_block' then
    if _blocked_until is null or _blocked_until <= now() then raise exception 'Blok müddəti gələcək tarix olmalıdır'; end if;
    update public.profiles set account_status='temporary_blocked', blocked_until=_blocked_until,
      block_reason=nullif(left(trim(coalesce(_reason,'')),500),''), status_updated_at=now(), status_updated_by=_admin_id, updated_at=now()
      where id=_target_id;
  elsif _action='permanent_block' then
    update public.profiles set account_status='permanent_blocked', blocked_until=null,
      block_reason=nullif(left(trim(coalesce(_reason,'')),500),''), status_updated_at=now(), status_updated_by=_admin_id, updated_at=now()
      where id=_target_id;
    update public.pvz_staff set is_active=false where user_id=_target_id;
    update public.seller_applications set status='suspended', updated_at=now() where user_id=_target_id and status='active';
  elsif _action='edit' then
    _source := nullif(trim(_profile_patch->>'acquisition_source'),'');
    if _source is not null and _source not in (
      'internet_ads', 'facebook', 'instagram', 'tiktok', 'google', 'youtube',
      'friend_referral', 'seller_referral', 'pvz_referral', 'employee_referral', 'other'
    ) then raise exception 'Qeydiyyat mənbəyi düzgün deyil'; end if;
    update public.profiles set
      full_name=case when _profile_patch ? 'full_name' then nullif(left(trim(_profile_patch->>'full_name'),100),'') else full_name end,
      phone=case when _profile_patch ? 'phone' then nullif(left(trim(_profile_patch->>'phone'),30),'') else phone end,
      shop_name=case when _profile_patch ? 'shop_name' then nullif(left(trim(_profile_patch->>'shop_name'),100),'') else shop_name end,
      acquisition_source=case when _profile_patch ? 'acquisition_source' then _source else acquisition_source end,
      acquisition_detail=case when _profile_patch ? 'acquisition_detail' then nullif(left(trim(_profile_patch->>'acquisition_detail'),250),'') else acquisition_detail end,
      updated_at=now(), status_updated_at=now(), status_updated_by=_admin_id
    where id=_target_id;
  else
    raise exception 'Dəstəklənməyən əməliyyat';
  end if;

  _new := public.admin_account_snapshot(_target_id);
  insert into public.admin_audit_logs (
    admin_id,admin_email,action,entity_type,entity_id,target_user_id,reason,old_data,new_data,ip_address,user_agent
  ) values (
    _admin_id,_admin_email,'account_'||_action,'account',_target_id::text,_target_id,
    nullif(left(trim(coalesce(_reason,'')),1000),''),_old,_new,_ip_address,left(_user_agent,500)
  );
  return jsonb_build_object('ok',true,'action',_action,'account',_new);
end;
$$;

revoke all on function public.admin_apply_account_action(uuid,uuid,text,text,timestamptz,jsonb,text,inet,text)
  from public, anon, authenticated;
grant execute on function public.admin_apply_account_action(uuid,uuid,text,text,timestamptz,jsonb,text,inet,text)
  to service_role;

create or replace function public.admin_prepare_account_deletion(
  _admin_id uuid, _target_id uuid, _reason text, _admin_email text, _ip_address inet, _user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare _snapshot jsonb;
begin
  if _admin_id=_target_id then raise exception 'Admin öz hesabını silə bilməz'; end if;
  if not exists (select 1 from public.user_roles where user_id=_admin_id and role='admin'::public.app_role) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;
  _snapshot := public.admin_account_snapshot(_target_id);
  if not exists (select 1 from auth.users where id=_target_id) then raise exception 'İstifadəçi tapılmadı'; end if;
  insert into public.admin_audit_logs (
    admin_id,admin_email,action,entity_type,entity_id,target_user_id,reason,old_data,ip_address,user_agent
  ) values (
    _admin_id,_admin_email,'account_delete_requested','account',_target_id::text,_target_id,
    nullif(left(trim(coalesce(_reason,'')),1000),''),_snapshot,_ip_address,left(_user_agent,500)
  );
  return _snapshot;
end;
$$;

revoke all on function public.admin_prepare_account_deletion(uuid,uuid,text,text,inet,text) from public,anon,authenticated;
grant execute on function public.admin_prepare_account_deletion(uuid,uuid,text,text,inet,text) to service_role;

create or replace function public.admin_log_account_deletion(
  _admin_id uuid, _target_id uuid, _success boolean, _message text, _admin_email text, _ip_address inet, _user_agent text
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.admin_audit_logs (
    admin_id,admin_email,action,entity_type,entity_id,target_user_id,reason,metadata,ip_address,user_agent
  ) values (
    _admin_id,_admin_email,case when _success then 'account_deleted' else 'account_delete_failed' end,
    'account',_target_id::text,_target_id,left(_message,1000),jsonb_build_object('success',_success),_ip_address,left(_user_agent,500)
  )
$$;

revoke all on function public.admin_log_account_deletion(uuid,uuid,boolean,text,text,inet,text) from public,anon,authenticated;
grant execute on function public.admin_log_account_deletion(uuid,uuid,boolean,text,text,inet,text) to service_role;

-- Preserve order history when an auth user and their product records are hard-deleted.
alter table public.order_items alter column seller_id drop not null;
alter table public.order_items alter column product_id drop not null;
alter table public.order_items drop constraint if exists order_items_seller_id_fkey;
alter table public.order_items add constraint order_items_seller_id_fkey
  foreign key (seller_id) references auth.users(id) on delete set null;
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

create or replace function public.audit_admin_table_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _admin_id uuid := auth.uid();
  _old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  _new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  _entity_id text := coalesce(_new->>'id', _old->>'id');
begin
  if _admin_id is null or not public.has_role(_admin_id,'admin'::public.app_role) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  insert into public.admin_audit_logs (
    admin_id,action,entity_type,entity_id,old_data,new_data,metadata
  ) values (
    _admin_id,lower(tg_op),tg_table_name,_entity_id,_old,_new,jsonb_build_object('schema',tg_table_schema)
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare _table text;
begin
  foreach _table in array array[
    'profiles','user_roles','seller_applications','pvz_staff','products','categories','orders',
    'pickup_points','banners','ad_packages','system_settings','promo_codes','eg_trends_plans',
    'eg_trends_subscriptions','eg_trends_posts','notifications','campaigns'
  ] loop
    if to_regclass('public.'||_table) is not null then
      execute format('drop trigger if exists audit_admin_change on public.%I',_table);
      execute format('create trigger audit_admin_change after insert or update or delete on public.%I for each row execute function public.audit_admin_table_change()',_table);
    end if;
  end loop;
end $$;

-- Realtime counters refresh on account/role/PVZ changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
    ) then alter publication supabase_realtime add table public.profiles; end if;
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_roles'
    ) then alter publication supabase_realtime add table public.user_roles; end if;
    if not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pvz_staff'
    ) then alter publication supabase_realtime add table public.pvz_staff; end if;
  end if;
end $$;
