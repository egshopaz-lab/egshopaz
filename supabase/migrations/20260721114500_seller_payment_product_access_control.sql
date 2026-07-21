
-- Show paid and unpaid seller applications separately and let an admin grant
-- product publishing access without falsifying the payment state.

alter table public.seller_applications
  add column if not exists product_access_override boolean not null default false,
  add column if not exists product_access_granted_at timestamptz,
  add column if not exists product_access_granted_by uuid references auth.users(id) on delete set null,
  add column if not exists product_access_note text;

comment on column public.seller_applications.product_access_override is
  'Admin exception that permits an unpaid seller to manage products. Payment status remains unchanged.';

create or replace function private.is_active_seller(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.seller_applications sa
    join public.user_roles ur
      on ur.user_id = sa.user_id
     and ur.role = 'seller'::public.app_role
    join public.profiles p on p.id = sa.user_id
    where sa.user_id = _user_id
      and p.account_status = 'active'
      and (
        (sa.status = 'active' and sa.payment_status in ('success', 'migrated'))
        or sa.product_access_override = true
      )
  );
$$;

revoke all on function private.is_active_seller(uuid) from public, anon;
grant execute on function private.is_active_seller(uuid) to authenticated, service_role;

drop function if exists public.admin_list_accounts(text,text,text,text,integer);
create function public.admin_list_accounts(
  _search text default null,
  _role text default null,
  _status text default null,
  _source text default null,
  _limit integer default 100
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  shop_name text,
  roles text[],
  account_status text,
  blocked_until timestamptz,
  block_reason text,
  acquisition_source text,
  acquisition_detail text,
  created_at timestamptz,
  updated_at timestamptz,
  last_active_at timestamptz,
  seller_status text,
  pvz_active boolean,
  seller_payment_status text,
  seller_registration_fee numeric,
  seller_paid_at timestamptz,
  seller_product_access_override boolean
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
    sa.status, coalesce(ps.is_active, false), sa.payment_status, sa.registration_fee,
    sa.paid_at, coalesce(sa.product_access_override, false)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select array_agg(ur.role::text order by ur.role::text) roles
    from public.user_roles ur where ur.user_id = p.id
  ) r on true
  left join public.seller_applications sa on sa.user_id = p.id
  left join lateral (
    select bool_or(x.is_active) is_active from public.pvz_staff x where x.user_id = p.id
  ) ps on true
  where (
      _role is null or _role = ''
      or (
        _role = 'buyer'
        and 'buyer' = any(coalesce(r.roles, array[]::text[]))
        and sa.id is null
        and not ('pvz' = any(coalesce(r.roles, array[]::text[])))
        and coalesce(ps.is_active, false) = false
      )
      or (
        _role = 'seller'
        and (sa.id is not null or 'seller' = any(coalesce(r.roles, array[]::text[])))
      )
      or (
        _role = 'pvz'
        and ('pvz' = any(coalesce(r.roles, array[]::text[])) or coalesce(ps.is_active, false))
      )
      or (
        _role not in ('buyer', 'seller', 'pvz')
        and _role = any(coalesce(r.roles, array[]::text[]))
      )
    )
    and (_status is null or _status = '' or p.account_status = _status)
    and (_source is null or _source = '' or p.acquisition_source = _source)
    and (
      _search is null or trim(_search) = '' or
      u.email ilike '%' || trim(_search) || '%' or
      coalesce(p.full_name, '') ilike '%' || trim(_search) || '%' or
      coalesce(p.phone, '') ilike '%' || trim(_search) || '%' or
      coalesce(p.shop_name, '') ilike '%' || trim(_search) || '%' or
      coalesce(p.acquisition_detail, '') ilike '%' || trim(_search) || '%'
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(_limit, 100), 1), 500);
end;
$$;

revoke all on function public.admin_list_accounts(text,text,text,text,integer) from public, anon;
grant execute on function public.admin_list_accounts(text,text,text,text,integer) to authenticated;

-- Extend the existing audited admin action RPC with two narrowly scoped actions.
create or replace function public.admin_set_seller_product_access(
  _admin_id uuid,
  _target_id uuid,
  _allowed boolean,
  _reason text default null,
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
  _paid boolean;
begin
  if _admin_id is null or not exists (
    select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where ur.user_id = _admin_id and ur.role = 'admin'::public.app_role and p.account_status = 'active'
  ) then raise exception 'Admin icazəsi tələb olunur'; end if;

  if not exists (select 1 from public.seller_applications where user_id = _target_id) then
    raise exception 'Satıcı müraciəti tapılmadı';
  end if;

  _old := public.admin_account_snapshot(_target_id);

  update public.seller_applications
  set product_access_override = _allowed,
      product_access_granted_at = case when _allowed then now() else null end,
      product_access_granted_by = case when _allowed then _admin_id else null end,
      product_access_note = nullif(left(trim(coalesce(_reason, '')), 500), ''),
      updated_at = now()
  where user_id = _target_id;

  select payment_status in ('success', 'migrated')
    into _paid from public.seller_applications where user_id = _target_id;

  if _allowed or _paid then
    insert into public.user_roles (user_id, role)
    values (_target_id, 'seller'::public.app_role)
    on conflict (user_id, role) do nothing;
    delete from public.user_roles where user_id = _target_id and role = 'buyer'::public.app_role;
  else
    delete from public.user_roles where user_id = _target_id and role = 'seller'::public.app_role;
  end if;

  _new := public.admin_account_snapshot(_target_id);
  insert into public.admin_audit_logs (
    admin_id, admin_email, action, entity_type, entity_id, target_user_id,
    reason, old_data, new_data, ip_address, user_agent
  ) values (
    _admin_id, _admin_email,
    case when _allowed then 'seller_product_access_granted' else 'seller_product_access_revoked' end,
    'seller_application', _target_id::text, _target_id,
    nullif(left(trim(coalesce(_reason, '')), 1000), ''), _old, _new, _ip_address, left(_user_agent, 500)
  );

  return jsonb_build_object('ok', true, 'allowed', _allowed, 'paid', _paid, 'account', _new);
end;
$$;

revoke all on function public.admin_set_seller_product_access(uuid,uuid,boolean,text,text,inet,text)
  from public, anon, authenticated;
grant execute on function public.admin_set_seller_product_access(uuid,uuid,boolean,text,text,inet,text)
  to service_role;

