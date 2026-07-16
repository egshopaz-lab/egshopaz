create or replace function public.notify_admin_delivery_completion()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.notifications(user_id,title,body,type,link,order_id,order_item_id)
  select ur.user_id,'Çatdırılma tamamlandı',
    'Sifariş təsdiqləndi, satıcı ödənişi və platforma komissiyası hesablandı.',
    'delivery_completed','/admin',new.order_id,new.order_item_id
  from public.user_roles ur where ur.role='admin'::public.app_role;
  return new;
end $$;

revoke all on function public.notify_admin_delivery_completion() from public,anon,authenticated;

drop trigger if exists trg_notify_admin_delivery_completion on public.deliveries;
create trigger trg_notify_admin_delivery_completion
after update of status on public.deliveries
for each row when (new.status='completed' and old.status is distinct from new.status)
execute function public.notify_admin_delivery_completion();
