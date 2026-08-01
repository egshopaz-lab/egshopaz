-- Repair Azerbaijani text that was decoded as Windows-1250 during deployment.
do $repair_functions$
declare
  item record;
  repaired_definition text;
begin
  for item in
    select p.oid, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) ~ '(Ã|Â|Ä|Å|Ð|Ñ|É|Ă|Ĺ|â|ð|�)'
  loop
    repaired_definition := convert_from(convert_to(item.definition, 'WIN1250'), 'UTF8');
    execute repaired_definition;
  end loop;
end;
$repair_functions$;

update public.notifications
set title = convert_from(convert_to(title, 'WIN1250'), 'UTF8'),
    body = convert_from(convert_to(body, 'WIN1250'), 'UTF8')
where coalesce(title, '') ~ '(Ã|Â|Ä|Å|Ð|Ñ|É|Ă|Ĺ|â|ð|�)'
   or coalesce(body, '') ~ '(Ã|Â|Ä|Å|Ð|Ñ|É|Ă|Ĺ|â|ð|�)';

update public.payment_intents
set description = convert_from(convert_to(description, 'WIN1250'), 'UTF8')
where coalesce(description, '') ~ '(Ã|Â|Ä|Å|Ð|Ñ|É|Ă|Ĺ|â|ð|�)';

