-- Persist the extended registration profile for new and existing accounts.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    phone = coalesce(nullif(excluded.phone, ''), profiles.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

update public.profiles p
set
  full_name = coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), p.full_name),
  phone = coalesce(nullif(u.raw_user_meta_data->>'phone', ''), p.phone)
from auth.users u
where u.id = p.id;
