do $$
declare
  function_oid oid;
begin
  for function_oid in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_oid::regprocedure
    );
  end loop;
end;
$$;

-- Authorization helpers used by RLS policies.
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;
grant execute on function public.is_buyer_only(uuid) to authenticated;
grant execute on function public.can_read_order(uuid, uuid) to authenticated;
grant execute on function public.can_read_order_item(uuid, uuid) to authenticated;
grant execute on function public.can_pvz_update_order_item(uuid, uuid) to authenticated;
grant execute on function public.order_belongs_to_user(uuid, uuid) to authenticated;

-- Explicit user-facing operations. Each function validates auth.uid() or admin role.
grant execute on function public.become_seller(text) to authenticated;
grant execute on function public.register_seller(text, text, text, text) to authenticated;
grant execute on function public.register_pvz_staff(text, text, uuid, text, text, text, text) to authenticated;
grant execute on function public.request_payout(numeric) to authenticated;
grant execute on function public.set_default_card(uuid) to authenticated;
grant execute on function public.admin_get_pickup_phones() to authenticated;
grant execute on function public.add_manual_treasury(text, numeric, text) to authenticated;
grant execute on function public.complete_payout_request(uuid, boolean, text) to authenticated;
grant execute on function public.mark_order_paid(uuid, text, text) to authenticated;

-- Fake card processing and globally mutable stock/promo helpers stay disabled.
-- They will be replaced by the signed Epoint checkout flow.
