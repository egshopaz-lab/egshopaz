-- Real shop list and 360-degree admin inspection. These functions intentionally
-- expose private seller data only to authenticated administrators.

create or replace function public.admin_list_shops(
  _search text default null,
  _account_status text default null,
  _seller_status text default null,
  _payment_status text default null,
  _limit integer default 300
)
returns table (
  seller_id uuid,
  email text,
  full_name text,
  phone text,
  shop_name text,
  shop_city text,
  shop_logo_url text,
  account_status text,
  seller_status text,
  payment_status text,
  registration_fee numeric,
  paid_at timestamptz,
  product_access_override boolean,
  created_at timestamptz,
  last_active_at timestamptz,
  products_total bigint,
  products_active bigint,
  products_pending bigint,
  orders_total bigint,
  revenue numeric,
  rating numeric,
  reviews_total bigint,
  disputes_open bigint,
  tickets_open bigint
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin_user(auth.uid()) then raise exception 'Admin icazəsi tələb olunur'; end if;
  return query
  select p.id, u.email::text, p.full_name, p.phone, p.shop_name, p.shop_city,
    p.shop_logo_url, p.account_status, sa.status, sa.payment_status,
    sa.registration_fee, sa.paid_at, coalesce(sa.product_access_override,false),
    p.created_at, p.last_active_at,
    coalesce(px.total,0), coalesce(px.active,0), coalesce(px.pending,0),
    coalesce(ox.total,0), coalesce(ox.revenue,0), coalesce(rx.rating,0),
    coalesce(rx.total,0), coalesce(dx.open,0), coalesce(tx.open,0)
  from public.profiles p
  join auth.users u on u.id=p.id
  left join public.seller_applications sa on sa.user_id=p.id
  left join lateral (
    select count(*) total, count(*) filter(where pr.is_active) active,
      count(*) filter(where pr.moderation_status='pending') pending
    from public.products pr where pr.seller_id=p.id
  ) px on true
  left join lateral (
    select count(distinct oi.order_id) total,
      coalesce(sum(oi.price*oi.quantity) filter(where o.status::text not in ('cancelled','returned')),0) revenue
    from public.order_items oi join public.orders o on o.id=oi.order_id where oi.seller_id=p.id
  ) ox on true
  left join lateral (
    select round(coalesce(avg(r.rating),0),2) rating, count(*) total
    from public.reviews r join public.products pr on pr.id=r.product_id where pr.seller_id=p.id
  ) rx on true
  left join lateral (select count(*) open from public.disputes d where d.seller_id=p.id and d.status not in ('resolved','closed')) dx on true
  left join lateral (select count(*) open from public.support_tickets t where t.user_id=p.id and t.status not in ('resolved','closed')) tx on true
  where (sa.id is not null or exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='seller'::public.app_role))
    and (_account_status is null or _account_status='' or p.account_status=_account_status)
    and (_seller_status is null or _seller_status='' or sa.status=_seller_status)
    and (_payment_status is null or _payment_status='' or
      (_payment_status='paid' and sa.payment_status in ('success','migrated')) or
      (_payment_status='unpaid' and coalesce(sa.payment_status,'pending') not in ('success','migrated')))
    and (_search is null or trim(_search)='' or concat_ws(' ',p.shop_name,p.full_name,p.phone,p.shop_city,u.email) ilike '%'||trim(_search)||'%')
  order by p.created_at desc limit least(greatest(coalesce(_limit,300),1),500);
end $$;

revoke all on function public.admin_list_shops(text,text,text,text,integer) from public, anon;
grant execute on function public.admin_list_shops(text,text,text,text,integer) to authenticated;

create or replace function public.admin_shop_360(_seller_id uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public
as $$
  select case when not public.is_admin_user(auth.uid()) then jsonb_build_object('error','admin_required')
  else jsonb_build_object(
    'profile',(select to_jsonb(p) || jsonb_build_object('email',u.email) from public.profiles p join auth.users u on u.id=p.id where p.id=_seller_id),
    'seller_application',(select to_jsonb(sa) from public.seller_applications sa where sa.user_id=_seller_id),
    'storefront',(select to_jsonb(ss) from public.seller_storefronts ss where ss.id=_seller_id),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select id,title,price,stock,image_url,is_active,moderation_status,moderation_reason,created_at,updated_at
      from public.products where seller_id=_seller_id order by created_at desc limit 100
    ) x),
    'orders',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select o.id,o.status::text status,o.created_at,
        sum(oi.price*oi.quantity)::numeric total, sum(oi.quantity)::bigint item_count
      from public.order_items oi join public.orders o on o.id=oi.order_id
      where oi.seller_id=_seller_id group by o.id,o.status,o.created_at order by o.created_at desc limit 100
    ) x),
    'reviews',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select r.id,r.rating,r.comment,r.created_at,pr.title product_title
      from public.reviews r join public.products pr on pr.id=r.product_id
      where pr.seller_id=_seller_id order by r.created_at desc limit 50
    ) x),
    'disputes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select * from public.disputes where seller_id=_seller_id order by created_at desc limit 50
    ) x),
    'tickets',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select * from public.support_tickets where user_id=_seller_id order by created_at desc limit 50
    ) x),
    'notes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select * from public.admin_internal_notes where target_user_id=_seller_id order by created_at desc limit 50
    ) x),
    'audit',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
      select * from public.admin_audit_logs where target_user_id=_seller_id order by created_at desc limit 100
    ) x)
  ) end
$$;

revoke all on function public.admin_shop_360(uuid) from public, anon;
grant execute on function public.admin_shop_360(uuid) to authenticated;

create or replace function public.admin_update_shop(_seller_id uuid, _patch jsonb, _reason text default null)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare _old jsonb; _new jsonb;
begin
  if not public.is_admin_user(auth.uid()) then raise exception 'Admin icazəsi tələb olunur'; end if;
  if not exists(select 1 from public.profiles where id=_seller_id) then raise exception 'Mağaza tapılmadı'; end if;
  select to_jsonb(p) into _old from public.profiles p where p.id=_seller_id;
  update public.profiles set
    full_name=case when _patch?'full_name' then nullif(left(trim(_patch->>'full_name'),100),'') else full_name end,
    phone=case when _patch?'phone' then nullif(left(trim(_patch->>'phone'),30),'') else phone end,
    shop_name=case when _patch?'shop_name' then nullif(left(trim(_patch->>'shop_name'),100),'') else shop_name end,
    shop_city=case when _patch?'shop_city' then nullif(left(trim(_patch->>'shop_city'),100),'') else shop_city end,
    shop_address=case when _patch?'shop_address' then nullif(left(trim(_patch->>'shop_address'),300),'') else shop_address end,
    shop_email=case when _patch?'shop_email' then nullif(left(trim(_patch->>'shop_email'),200),'') else shop_email end,
    shop_description=case when _patch?'shop_description' then nullif(left(trim(_patch->>'shop_description'),2000),'') else shop_description end,
    shop_logo_url=case when _patch?'shop_logo_url' then nullif(left(trim(_patch->>'shop_logo_url'),1000),'') else shop_logo_url end,
    shop_banner_url=case when _patch?'shop_banner_url' then nullif(left(trim(_patch->>'shop_banner_url'),1000),'') else shop_banner_url end,
    voen=case when _patch?'voen' then nullif(left(trim(_patch->>'voen'),32),'') else voen end,
    updated_at=now()
  where id=_seller_id;
  select to_jsonb(p) into _new from public.profiles p where p.id=_seller_id;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,target_user_id,reason,old_data,new_data)
  values(auth.uid(),'shop_update','shop',_seller_id::text,_seller_id,nullif(left(trim(coalesce(_reason,'')),1000),''),_old,_new);
  return jsonb_build_object('ok',true,'shop',_new);
end $$;

revoke all on function public.admin_update_shop(uuid,jsonb,text) from public, anon;
grant execute on function public.admin_update_shop(uuid,jsonb,text) to authenticated;

create index if not exists order_items_seller_order_idx on public.order_items(seller_id,order_id);
create index if not exists disputes_seller_status_idx on public.disputes(seller_id,status);

