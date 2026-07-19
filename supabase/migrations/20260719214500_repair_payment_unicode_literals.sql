-- Keep this migration ASCII-only so payment labels survive every deployment shell.
do $repair$
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
    raise exception 'prepare_payment_intent_missing';
  end if;

  definition := regexp_replace(
    definition,
    '_description := ''EG Shop sifari[^'']*#'' \|\| left\(_order\.id::text, 8\);',
    '_description := U&''EG Shop sifari\015Fi #'' || left(_order.id::text, 8);'
  );
  definition := regexp_replace(
    definition,
    '_description := ''EG Shop PVZ [^'']*'';',
    '_description := U&''EG Shop PVZ qeydiyyat haqq\0131'';'
  );
  definition := regexp_replace(
    definition,
    '_description := _package\.name \|\| '' paketi \('' \|\| _package\.duration_days \|\| '' [^'']*\)'';',
    '_description := _package.name || '' paketi ('' || _package.duration_days || U&'' g\00FCn)'';'
  );
  definition := regexp_replace(
    definition,
    '_description := ''[^'']*'' \|\| left\(_product\.title, 150\);',
    '_description := U&''M\0259hsul reklam\0131: '' || left(_product.title, 150);'
  );
  definition := regexp_replace(
    definition,
    '_description := ''Ma[^'']*'';',
    '_description := U&''Ma\011Faza reklam\0131'';'
  );
  definition := regexp_replace(
    definition,
    '_description := ''Banner [^'']*: '' \|\| left\(trim\(_payload->>''title''\), 150\);',
    '_description := U&''Banner reklam\0131: '' || left(trim(_payload->>''title''), 150);'
  );
  definition := regexp_replace(
    definition,
    '_description := ''Paket slotu: ma[^'']*'';',
    '_description := U&''Paket slotu: ma\011Faza reklam\0131'';'
  );

  execute definition;
end;
$repair$;
