-- Repair text that was previously saved after UTF-8 bytes were decoded as WIN1250.
-- Correct UTF-8 text is left untouched. Conversion failures also keep the original value.

create or replace function public.repair_azerbaijani_mojibake(_value text)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $$
declare fixed text;
begin
  if _value !~ '[ÃÄÅÆĂÉĹĽź™â]' then
    return _value;
  end if;
  begin
    fixed := convert_from(convert_to(_value, 'WIN1250'), 'UTF8');
  exception when others then
    return _value;
  end;
  if fixed is null or fixed = '' then return _value; end if;
  return fixed;
end;
$$;

do $$
declare item record;
begin
  for item in
    select * from (values
      ('categories','name'), ('categories','description'),
      ('products','title'), ('products','description'), ('products','short_description'),
      ('products','brand'), ('products','manufacturer'), ('products','origin_country'),
      ('profiles','full_name'), ('profiles','shop_name'), ('profiles','shop_description'),
      ('profiles','shop_city'), ('profiles','shop_address'),
      ('seller_storefronts_public','shop_name'), ('seller_storefronts_public','full_name'),
      ('seller_storefronts_public','shop_description'), ('seller_storefronts_public','shop_city'),
      ('seller_storefronts_public','shop_address'),
      ('shops','name'), ('shops','description'), ('shops','city'), ('shops','address'),
      ('business_modules','name'), ('business_modules','description'),
      ('reservation_resources','name'), ('reservation_resources','description'),
      ('notifications','title'), ('notifications','body'),
      ('shop_messages','body'), ('support_tickets','subject'), ('support_tickets','message')
    ) as columns_to_repair(table_name, column_name)
  loop
    if exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = item.table_name
        and c.column_name = item.column_name
        and c.data_type = 'text'
    ) then
      execute format(
        'update public.%I set %I = public.repair_azerbaijani_mojibake(%I) where %I ~ %L',
        item.table_name, item.column_name, item.column_name, item.column_name, '[ÃÄÅÆĂÉĹĽź™â]'
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.repair_azerbaijani_mojibake(text) from public, anon, authenticated;
grant execute on function public.repair_azerbaijani_mojibake(text) to service_role;

comment on function public.repair_azerbaijani_mojibake(text) is
  'Safely repairs WIN1250-decoded UTF-8 mojibake while preserving valid text.';
