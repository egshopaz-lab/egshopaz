drop policy if exists "Admins manage stock movements" on public.product_stock_movements;

drop policy if exists "Admins insert stock movements" on public.product_stock_movements;
create policy "Admins insert stock movements"
  on public.product_stock_movements
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins update stock movements" on public.product_stock_movements;
create policy "Admins update stock movements"
  on public.product_stock_movements
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins delete stock movements" on public.product_stock_movements;
create policy "Admins delete stock movements"
  on public.product_stock_movements
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

revoke all on function public.log_product_stock_change() from public, anon, authenticated;
