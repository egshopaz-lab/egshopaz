-- Keep the legacy advertising catalog aligned with system_settings, which is
-- the authoritative source used by prepare_payment_intent.

create or replace function public.sync_advertising_settings_to_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ad_service_types
  set
    base_price = case slug
      when 'product_promotion' then new.single_product_promo_price
      when 'shop_promotion' then new.single_shop_promo_price
      when 'banner_promotion' then new.single_banner_price
      else base_price
    end,
    default_duration_days = case slug
      when 'product_promotion' then new.single_product_promo_days
      when 'shop_promotion' then new.single_shop_promo_days
      when 'banner_promotion' then new.single_banner_days
      else default_duration_days
    end
  where slug in ('product_promotion', 'shop_promotion', 'banner_promotion')
    and (
      base_price is distinct from case slug
        when 'product_promotion' then new.single_product_promo_price
        when 'shop_promotion' then new.single_shop_promo_price
        when 'banner_promotion' then new.single_banner_price
        else base_price
      end
      or default_duration_days is distinct from case slug
        when 'product_promotion' then new.single_product_promo_days
        when 'shop_promotion' then new.single_shop_promo_days
        when 'banner_promotion' then new.single_banner_days
        else default_duration_days
      end
    );
  return new;
end;
$$;

drop trigger if exists sync_advertising_settings_to_catalog_trigger on public.system_settings;
create trigger sync_advertising_settings_to_catalog_trigger
after insert or update of
  single_product_promo_price,
  single_product_promo_days,
  single_shop_promo_price,
  single_shop_promo_days,
  single_banner_price,
  single_banner_days
on public.system_settings
for each row execute function public.sync_advertising_settings_to_catalog();

with current_settings as (
  select *
  from public.system_settings
  limit 1
)
update public.ad_service_types as service
set
  base_price = case service.slug
    when 'product_promotion' then settings.single_product_promo_price
    when 'shop_promotion' then settings.single_shop_promo_price
    when 'banner_promotion' then settings.single_banner_price
    else service.base_price
  end,
  default_duration_days = case service.slug
    when 'product_promotion' then settings.single_product_promo_days
    when 'shop_promotion' then settings.single_shop_promo_days
    when 'banner_promotion' then settings.single_banner_days
    else service.default_duration_days
  end
from current_settings as settings
where service.slug in ('product_promotion', 'shop_promotion', 'banner_promotion');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'system_settings'
  ) then
    alter publication supabase_realtime add table public.system_settings;
  end if;
end;
$$;
