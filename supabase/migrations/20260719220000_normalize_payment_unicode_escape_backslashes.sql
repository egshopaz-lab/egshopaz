-- Normalize escaped Unicode literals after transport-safe repair migrations.
do $$
declare
  definition text;
begin
  select pg_get_functiondef(p.oid)
  into definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_payment_intent';

  if definition is null then
    raise exception 'prepare_payment_intent_not_found';
  end if;

  definition := replace(definition, chr(92) || chr(92), chr(92));
  execute definition;
end $$;
