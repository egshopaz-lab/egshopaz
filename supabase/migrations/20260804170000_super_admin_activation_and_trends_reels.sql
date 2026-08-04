-- Super Admin control, administratively free seller activation and shop-aware EG Trends.

alter table public.eg_trends_posts
  add column if not exists shop_id uuid references public.shops(id) on delete set null;

create index if not exists eg_trends_posts_shop_idx
  on public.eg_trends_posts(shop_id, published_at desc);

update public.eg_trends_posts post
set shop_id = product.shop_id
from public.products product
where post.product_id = product.id
  and post.shop_id is null
  and product.shop_id is not null;

update public.eg_trends_posts post
set shop_id = (
  select shop.id from public.shops shop
  where shop.seller_id = post.seller_id
  order by shop.is_primary desc, shop.created_at asc limit 1
)
where post.shop_id is null;

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
       from public.seller_applications application
       where application.user_id = new.user_id
         and application.status = 'active'
         and (
           application.payment_status in ('success', 'migrated')
           or coalesce(application.product_access_override, false)
         )
     )
  then
    raise exception 'Satıcı kabineti yalnız ödənişdən və ya Super Admin icazəsindən sonra aktivləşdirilə bilər';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_paid_seller_role()
from public, anon, authenticated;

comment on function private.enforce_paid_seller_role() is
  'Allows seller dashboard access after verified payment or explicit Super Admin activation.';

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
  if auth.role() <> 'service_role' and auth.uid() is distinct from _admin_id then
    raise exception 'Admin şəxsiyyəti uyğun deyil';
  end if;
  if _admin_id is null or not public.is_admin_user(_admin_id) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;
  if not exists (select 1 from public.seller_applications where user_id = _target_id) then
    raise exception 'Satıcı müraciəti tapılmadı';
  end if;

  _old := public.admin_account_snapshot(_target_id);
  update public.seller_applications
  set product_access_override = _allowed,
      product_access_granted_at = case when _allowed then now() else null end,
      product_access_granted_by = case when _allowed then _admin_id else null end,
      product_access_note = nullif(left(trim(coalesce(_reason, '')), 500), ''),
      status = case when _allowed then 'active' else status end,
      updated_at = now()
  where user_id = _target_id;

  select payment_status in ('success', 'migrated')
  into _paid from public.seller_applications where user_id = _target_id;

  if _allowed or _paid then
    update public.profiles set account_status = 'active' where id = _target_id;
    insert into public.user_roles(user_id, role)
    values(_target_id, 'seller'::public.app_role)
    on conflict(user_id, role) do nothing;
    delete from public.user_roles where user_id = _target_id and role = 'buyer'::public.app_role;
  else
    delete from public.user_roles where user_id = _target_id and role = 'seller'::public.app_role;
    update public.seller_applications
    set status = case when payment_status in ('success','migrated') then 'active' else 'pending_payment' end
    where user_id = _target_id;
  end if;

  _new := public.admin_account_snapshot(_target_id);
  insert into public.admin_audit_logs(admin_id,admin_email,action,entity_type,entity_id,target_user_id,reason,old_data,new_data,ip_address,user_agent)
  values(_admin_id,_admin_email,case when _allowed then 'seller_free_activation_granted' else 'seller_free_activation_revoked' end,
    'seller_application',_target_id::text,_target_id,nullif(left(trim(coalesce(_reason,'')),1000),''),_old,_new,_ip_address,left(_user_agent,500));
  return jsonb_build_object('ok',true,'allowed',_allowed,'paid',_paid,'account',_new);
end;
$$;

revoke all on function public.admin_set_seller_product_access(uuid,uuid,boolean,text,text,inet,text)
from public, anon, authenticated;
grant execute on function public.admin_set_seller_product_access(uuid,uuid,boolean,text,text,inet,text)
to authenticated, service_role;

-- Bootstrap legacy admins once. Subsequent promotions are always explicit.
insert into public.admin_staff_permissions(admin_id,role_key,permissions,is_active,updated_by,updated_at)
select role.user_id,'super_admin',array['*']::text[],true,role.user_id,now()
from public.user_roles role
where role.role = 'admin'::public.app_role
  and not exists(select 1 from public.admin_staff_permissions)
on conflict(admin_id) do nothing;

create or replace function public.is_super_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_admin_user(_user_id)
    and coalesce((
      select permission.is_active and permission.role_key = 'super_admin'
      from public.admin_staff_permissions permission
      where permission.admin_id = _user_id
    ), true)
$$;

revoke all on function public.is_super_admin(uuid) from public, anon;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;

create or replace function public.admin_set_user_admin_role(_target_id uuid, _role_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _permissions text[];
  _super_admin_count integer;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Bu əməliyyatı yalnız Super Admin edə bilər';
  end if;
  if not exists(select 1 from public.profiles where id = _target_id) then
    raise exception 'İstifadəçi tapılmadı';
  end if;

  if _role_key is null then
    if _target_id = auth.uid() then raise exception 'Öz Super Admin hesabınızı ləğv edə bilməzsiniz'; end if;
    select count(*) into _super_admin_count from public.admin_staff_permissions where role_key='super_admin' and is_active;
    if exists(select 1 from public.admin_staff_permissions where admin_id=_target_id and role_key='super_admin') and _super_admin_count <= 1 then
      raise exception 'Son Super Admin hesabı ləğv edilə bilməz';
    end if;
    delete from public.admin_staff_permissions where admin_id = _target_id;
    delete from public.user_roles where user_id = _target_id and role = 'admin'::public.app_role;
    return jsonb_build_object('ok',true,'admin',false);
  end if;

  if _role_key not in ('super_admin','seller_moderator','product_moderator','finance','support','advertising','delivery','analyst') then
    raise exception 'Admin dərəcəsi etibarsızdır';
  end if;
  _permissions := case _role_key
    when 'super_admin' then array['*']::text[]
    when 'seller_moderator' then array['accounts.view','accounts.manage','sellers.manage']::text[]
    when 'product_moderator' then array['products.manage']::text[]
    when 'finance' then array['payments.manage','reports.view']::text[]
    when 'support' then array['support.manage','accounts.view']::text[]
    when 'advertising' then array['advertising.manage']::text[]
    when 'delivery' then array['delivery.manage','disputes.manage']::text[]
    when 'analyst' then array['reports.view']::text[]
    else array[]::text[] end;

  insert into public.user_roles(user_id,role) values(_target_id,'admin'::public.app_role)
  on conflict(user_id,role) do nothing;
  insert into public.admin_staff_permissions(admin_id,role_key,permissions,is_active,updated_by,updated_at)
  values(_target_id,_role_key,_permissions,true,auth.uid(),now())
  on conflict(admin_id) do update set role_key=excluded.role_key,permissions=excluded.permissions,is_active=true,updated_by=auth.uid(),updated_at=now();
  return jsonb_build_object('ok',true,'admin',true,'role_key',_role_key,'permissions',_permissions);
end;
$$;

revoke all on function public.admin_set_user_admin_role(uuid,text) from public, anon;
grant execute on function public.admin_set_user_admin_role(uuid,text) to authenticated;

create or replace function public.eg_trends_assign_shop()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare _product_shop uuid;
begin
  if new.product_id is not null then
    select product.shop_id into _product_shop from public.products product
    where product.id = new.product_id and product.seller_id = new.seller_id;
    if _product_shop is null then raise exception 'Seçilmiş məhsul satıcıya aid deyil'; end if;
    new.shop_id := _product_shop;
  elsif new.shop_id is null then
    select shop.id into new.shop_id from public.shops shop
    where shop.seller_id = new.seller_id
    order by shop.is_primary desc, shop.created_at asc limit 1;
  end if;
  if new.shop_id is not null and not exists(select 1 from public.shops where id=new.shop_id and seller_id=new.seller_id) then
    raise exception 'Seçilmiş mağaza satıcıya aid deyil';
  end if;
  return new;
end;
$$;

drop trigger if exists eg_trends_assign_shop on public.eg_trends_posts;
create trigger eg_trends_assign_shop
before insert or update of seller_id,product_id,shop_id on public.eg_trends_posts
for each row execute function public.eg_trends_assign_shop();

drop policy if exists "Active sellers create EG Trends posts" on public.eg_trends_posts;
create policy "Active sellers create EG Trends posts" on public.eg_trends_posts
for insert to authenticated with check (
  auth.uid() = seller_id and public.eg_trends_has_access(auth.uid())
  and (shop_id is null or exists(select 1 from public.shops where id=shop_id and seller_id=auth.uid()))
);

drop policy if exists "Active sellers update EG Trends posts" on public.eg_trends_posts;
create policy "Active sellers update EG Trends posts" on public.eg_trends_posts
for update to authenticated using (
  (auth.uid()=seller_id and public.eg_trends_has_access(auth.uid())) or public.has_role(auth.uid(),'admin'::public.app_role)
) with check (
  ((auth.uid()=seller_id and public.eg_trends_has_access(auth.uid())
    and (shop_id is null or exists(select 1 from public.shops where id=shop_id and seller_id=auth.uid()))))
  or public.has_role(auth.uid(),'admin'::public.app_role)
);

create or replace function public.sync_public_seller_storefront()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_user_id uuid;
begin
  if tg_table_name = 'profiles' then target_user_id := coalesce(new.id,old.id);
  else target_user_id := coalesce(new.user_id,old.user_id); end if;

  insert into public.seller_storefronts_public(
    id,shop_name,full_name,shop_description,shop_city,shop_email,shop_logo_url,shop_banner_url,
    shop_address,shop_lat,shop_lng,seller_tier,seller_total_orders,created_at,synced_at
  )
  select profile.id,profile.shop_name,profile.full_name,profile.shop_description,profile.shop_city,profile.shop_email,
    profile.shop_logo_url,profile.shop_banner_url,profile.shop_address,profile.shop_lat,profile.shop_lng,
    profile.seller_tier,coalesce(profile.seller_total_orders,0),profile.created_at,now()
  from public.profiles profile
  join public.seller_applications application on application.user_id=profile.id
  where profile.id=target_user_id and profile.account_status='active'
    and nullif(btrim(profile.shop_name),'') is not null and application.status='active'
    and (application.payment_status in ('success','migrated') or coalesce(application.product_access_override,false))
  on conflict(id) do update set shop_name=excluded.shop_name,full_name=excluded.full_name,
    shop_description=excluded.shop_description,shop_city=excluded.shop_city,shop_email=excluded.shop_email,
    shop_logo_url=excluded.shop_logo_url,shop_banner_url=excluded.shop_banner_url,shop_address=excluded.shop_address,
    shop_lat=excluded.shop_lat,shop_lng=excluded.shop_lng,seller_tier=excluded.seller_tier,
    seller_total_orders=excluded.seller_total_orders,created_at=excluded.created_at,synced_at=excluded.synced_at;
  if not found then delete from public.seller_storefronts_public where id=target_user_id; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke execute on function public.sync_public_seller_storefront() from public,anon,authenticated;

-- Refresh the public seller directory for free-activated sellers too.
insert into public.seller_storefronts_public(
  id,shop_name,full_name,shop_description,shop_city,shop_email,shop_logo_url,shop_banner_url,
  shop_address,shop_lat,shop_lng,seller_tier,seller_total_orders,created_at,synced_at
)
select profile.id,profile.shop_name,profile.full_name,profile.shop_description,profile.shop_city,profile.shop_email,
  profile.shop_logo_url,profile.shop_banner_url,profile.shop_address,profile.shop_lat,profile.shop_lng,
  profile.seller_tier,coalesce(profile.seller_total_orders,0),profile.created_at,now()
from public.profiles profile
join public.seller_applications application on application.user_id=profile.id
where profile.account_status='active' and nullif(btrim(profile.shop_name),'') is not null
  and application.status='active'
  and (application.payment_status in ('success','migrated') or coalesce(application.product_access_override,false))
on conflict(id) do update set shop_name=excluded.shop_name,full_name=excluded.full_name,shop_description=excluded.shop_description,
  shop_city=excluded.shop_city,shop_email=excluded.shop_email,shop_logo_url=excluded.shop_logo_url,
  shop_banner_url=excluded.shop_banner_url,shop_address=excluded.shop_address,shop_lat=excluded.shop_lat,
  shop_lng=excluded.shop_lng,seller_tier=excluded.seller_tier,seller_total_orders=excluded.seller_total_orders,synced_at=now();
