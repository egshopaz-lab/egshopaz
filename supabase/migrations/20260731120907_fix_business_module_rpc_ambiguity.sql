create or replace function public.set_my_business_modules(_module_codes text[])
returns table (module_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  _user_id uuid := auth.uid();
  _normalized_codes text[];
  _invalid_codes text[];
begin
  if _user_id is null then
    raise exception 'Sessiya tapılmadı';
  end if;

  if not private.is_active_seller(_user_id) then
    raise exception 'Biznes modullarını seçmək üçün satıcı ödənişi və aktivləşdirmə tamamlanmalıdır';
  end if;

  select coalesce(array_agg(normalized.code order by normalized.code), array[]::text[])
    into _normalized_codes
  from (
    select distinct trim(requested.code) as code
    from unnest(coalesce(_module_codes, array[]::text[])) as requested(code)
    where nullif(trim(requested.code), '') is not null
  ) normalized;

  if cardinality(_normalized_codes) = 0 then
    raise exception 'Ən azı bir biznes modulu seçilməlidir';
  end if;

  select coalesce(array_agg(requested.requested_code), array[]::text[])
    into _invalid_codes
  from unnest(_normalized_codes) as requested(requested_code)
  where not exists (
    select 1
    from public.business_modules bm
    where bm.code = requested.requested_code
      and bm.is_active
  );

  if cardinality(_invalid_codes) > 0 then
    raise exception 'Aktiv olmayan və ya tanınmayan modul seçilib: %', array_to_string(_invalid_codes, ', ');
  end if;

  delete from public.seller_business_modules as sbm
  where sbm.seller_id = _user_id
    and sbm.module_code <> all(_normalized_codes);

  insert into public.seller_business_modules as sbm (seller_id, module_code)
  select _user_id, requested.code
  from unnest(_normalized_codes) as requested(code)
  on conflict on constraint seller_business_modules_pkey do update
    set updated_at = now();

  return query
  select sbm.module_code
  from public.seller_business_modules sbm
  where sbm.seller_id = _user_id
  order by sbm.module_code;
end;
$$;

revoke all on function public.set_my_business_modules(text[]) from public, anon;
grant execute on function public.set_my_business_modules(text[]) to authenticated;
