grant select on table public.epoint_payment_transactions to authenticated;

drop policy if exists "Admins read Epoint payment transactions" on public.epoint_payment_transactions;
create policy "Admins read Epoint payment transactions"
on public.epoint_payment_transactions
for select
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role));

create or replace function public.admin_run_auto_payout()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role((select auth.uid()), 'admin'::public.app_role) then
    raise exception 'Admin icazəsi tələb olunur';
  end if;

  return public.auto_payout_after_3_days();
end;
$$;

revoke all on function public.admin_run_auto_payout() from public, anon;
grant execute on function public.admin_run_auto_payout() to authenticated;
