
create index if not exists epoint_api_operations_saved_card_idx on public.epoint_api_operations(saved_card_id);
create index if not exists epoint_api_operations_payout_request_idx on public.epoint_api_operations(payout_request_id);
create index if not exists epoint_api_operations_created_by_idx on public.epoint_api_operations(created_by);

drop policy if exists "Users read own Epoint cards" on public.epoint_saved_cards;
drop policy if exists "Users hide own Epoint cards" on public.epoint_saved_cards;
drop policy if exists "Admins manage Epoint cards" on public.epoint_saved_cards;
create policy "Read permitted Epoint cards" on public.epoint_saved_cards for select to authenticated
using (user_id=(select auth.uid()) or (select public.has_role((select auth.uid()),'admin'::public.app_role)));
create policy "Update permitted Epoint cards" on public.epoint_saved_cards for update to authenticated
using ((select public.has_role((select auth.uid()),'admin'::public.app_role)) or user_id=(select auth.uid()))
with check ((select public.has_role((select auth.uid()),'admin'::public.app_role)) or (user_id=(select auth.uid()) and status='deleted'));
create policy "Admins insert Epoint cards" on public.epoint_saved_cards for insert to authenticated
with check ((select public.has_role((select auth.uid()),'admin'::public.app_role)));
create policy "Admins delete Epoint cards" on public.epoint_saved_cards for delete to authenticated
using ((select public.has_role((select auth.uid()),'admin'::public.app_role)));

drop policy if exists "Users read own Epoint operations" on public.epoint_api_operations;
drop policy if exists "Admins manage Epoint operations" on public.epoint_api_operations;
create policy "Read permitted Epoint operations" on public.epoint_api_operations for select to authenticated
using (user_id=(select auth.uid()) or (select public.has_role((select auth.uid()),'admin'::public.app_role)));

