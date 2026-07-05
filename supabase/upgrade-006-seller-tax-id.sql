-- Require a valid VÖEN for every new or updated seller application.

create or replace function public.validate_seller_tax_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tax_id := trim(coalesce(new.tax_id, ''));
  if new.tax_id !~ '^[0-9]{10}$' then
    raise exception 'VÖEN 10 rəqəmdən ibarət olmalıdır';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_seller_tax_id_before_write on public.seller_applications;
create trigger validate_seller_tax_id_before_write
  before insert or update of tax_id on public.seller_applications
  for each row execute function public.validate_seller_tax_id();

create index if not exists seller_applications_tax_id_idx
  on public.seller_applications (tax_id)
  where tax_id is not null;
