create or replace function public.admin_list_accounts(
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
  pvz_active boolean
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
  join auth.users u on u.id = p.id
  left join lateral (
    select array_agg(ur.role::text order by ur.role::text) roles
    from public.user_roles ur
    where ur.user_id = p.id
  ) r on true
  left join public.seller_applications sa on sa.user_id = p.id
  left join lateral (
    select bool_or(x.is_active) is_active
    from public.pvz_staff x
    where x.user_id = p.id
  ) ps on true
  where (
      _role is null
      or _role = ''
      or (
        _role = 'buyer'
        and 'buyer' = any(coalesce(r.roles, array[]::text[]))
        and not ('seller' = any(coalesce(r.roles, array[]::text[])))
        and not ('pvz' = any(coalesce(r.roles, array[]::text[])))
        and coalesce(sa.status, '') <> 'active'
        and coalesce(ps.is_active, false) = false
      )
      or (
        _role = 'seller'
        and (
          'seller' = any(coalesce(r.roles, array[]::text[]))
          or sa.status = 'active'
        )
      )
      or (
        _role = 'pvz'
        and (
          'pvz' = any(coalesce(r.roles, array[]::text[]))
          or coalesce(ps.is_active, false) = true
        )
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
