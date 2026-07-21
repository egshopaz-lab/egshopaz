
-- Read-only Supabase/PostgreSQL security audit for EG Shop.

-- 1. Public tables without RLS. Expected result: zero rows.
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- 2. Tables with RLS enabled but no policies. Review every returned row.
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
group by c.relname
having count(p.oid) = 0
order by c.relname;

-- 3. SECURITY DEFINER functions without a fixed search_path.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and not coalesce(p.proconfig, '{}'::text[]) && array['search_path=public','search_path=pg_catalog, public']
order by p.proname;

-- 4. Broad anonymous table privileges. Every row requires explicit justification.
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
order by table_name, privilege_type;

-- 5. Messaging policy inventory for manual verification.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
  and tablename in ('shop_messages','shop_message_blocks','shop_message_reports','objects')
order by schemaname, tablename, policyname;


