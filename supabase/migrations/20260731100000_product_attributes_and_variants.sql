alter table public.products
  add column if not exists attributes jsonb not null default '{}'::jsonb;

alter table public.products
  drop constraint if exists products_attributes_object_check;
alter table public.products
  add constraint products_attributes_object_check
  check (jsonb_typeof(attributes) = 'object');

alter table public.products
  drop constraint if exists products_variants_array_check;
alter table public.products
  add constraint products_variants_array_check
  check (jsonb_typeof(variants) = 'array');

create or replace function public.validate_product_variants()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  variant jsonb;
  sku_value text;
  barcode_value text;
  seen_skus text[] := array[]::text[];
  seen_barcodes text[] := array[]::text[];
  calculated_stock integer := 0;
begin
  if jsonb_typeof(coalesce(new.attributes, '{}'::jsonb)) <> 'object' then
    raise exception 'Product attributes must be a JSON object';
  end if;
  if jsonb_typeof(coalesce(new.variants, '[]'::jsonb)) <> 'array' then
    raise exception 'Product variants must be a JSON array';
  end if;

  for variant in select value from jsonb_array_elements(coalesce(new.variants, '[]'::jsonb)) loop
    if jsonb_typeof(variant) <> 'object' then
      raise exception 'Each product variant must be a JSON object';
    end if;
    if jsonb_typeof(coalesce(variant->'attributes', '{}'::jsonb)) <> 'object' then
      raise exception 'Variant attributes must be a JSON object';
    end if;
    if coalesce((variant->>'stock')::integer, 0) < 0 then
      raise exception 'Variant stock cannot be negative';
    end if;
    if coalesce((variant->>'price')::numeric, new.price) < 0 then
      raise exception 'Variant price cannot be negative';
    end if;
    sku_value := nullif(btrim(variant->>'sku'), '');
    barcode_value := nullif(btrim(variant->>'barcode'), '');
    if sku_value is not null and sku_value = any(seen_skus) then
      raise exception 'Variant SKU must be unique inside a product: %', sku_value;
    end if;
    if barcode_value is not null and barcode_value = any(seen_barcodes) then
      raise exception 'Variant barcode must be unique inside a product: %', barcode_value;
    end if;
    if sku_value is not null then seen_skus := array_append(seen_skus, sku_value); end if;
    if barcode_value is not null then seen_barcodes := array_append(seen_barcodes, barcode_value); end if;
    if coalesce((variant->>'is_active')::boolean, true) then
      calculated_stock := calculated_stock + coalesce((variant->>'stock')::integer, 0);
    end if;
  end loop;

  if jsonb_array_length(coalesce(new.variants, '[]'::jsonb)) > 0 then
    new.stock := calculated_stock;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_product_variants on public.products;
create trigger trg_validate_product_variants
before insert or update of variants, attributes, price on public.products
for each row execute function public.validate_product_variants();

comment on column public.products.attributes is
  'Category-aware product specifications displayed to buyers.';
comment on column public.products.variants is
  'Sellable combinations with attributes, SKU, barcode, stock, price and active status.';

