-- Operational panels moved from role-named routes to /dashboard.
-- Keep existing and future notification links on the canonical route.
update public.notifications
set link = '/dashboard'
where link in ('/admin', '/seller', '/pvz');

create or replace function public.normalize_admin_notification_link()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.link in ('/admin', '/seller', '/pvz') then
    new.link := '/dashboard';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_admin_notification_link on public.notifications;
create trigger trg_normalize_admin_notification_link
before insert or update of link on public.notifications
for each row
execute function public.normalize_admin_notification_link();
