-- EG Shop accounting core: double-entry ledger, source documents and periods.
-- Account subcodes are an internal working chart based on the official 3-digit chart.
-- The entity's accountant must approve the accounting policy and subaccount mapping.

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  normal_side text not null check (normal_side in ('debit','credit')),
  parent_code text,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (starts_on, ends_on),
  check (ends_on >= starts_on)
);

create table if not exists public.accounting_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  document_number text not null unique,
  document_date date not null,
  counterparty_name text,
  counterparty_voen text,
  currency text not null default 'AZN',
  total_amount numeric(18,2) not null default 0,
  source_table text,
  source_id text,
  file_url text,
  status text not null default 'draft' check (status in ('draft','approved','void')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.accounting_entry_number_seq;

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number bigint not null unique default nextval('public.accounting_entry_number_seq'),
  entry_date date not null,
  document_id uuid references public.accounting_documents(id) on delete restrict,
  description text not null,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  source_table text,
  source_id text,
  source_event text,
  reversal_of uuid references public.accounting_journal_entries(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists accounting_source_event_unique
  on public.accounting_journal_entries(source_table, source_id, source_event)
  where source_table is not null and source_id is not null and source_event is not null;

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.accounting_journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounting_accounts(id) on delete restrict,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  currency text not null default 'AZN',
  exchange_rate numeric(18,8) not null default 1,
  amount_currency numeric(18,2),
  seller_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  counterparty_name text,
  memo text,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  check (exchange_rate > 0)
);

create index if not exists accounting_lines_entry_idx on public.accounting_journal_lines(entry_id);
create index if not exists accounting_lines_account_idx on public.accounting_journal_lines(account_id);
create index if not exists accounting_entries_date_idx on public.accounting_journal_entries(entry_date desc);

insert into public.accounting_accounts(code,name,account_type,normal_side,parent_code,description) values
  ('211-1','Alıcı və sifarişçilərin qısamüddətli debitor borcları','asset','debit','211','Marketplace analitik subhesabı'),
  ('222-1','Epoint üzrə yolda olan pul köçürmələri','asset','debit','222','Prosessinqdən banka keçən vəsait'),
  ('223-1','Bank hesablaşma hesabı — AZN','asset','debit','223','Əsas bank hesabı'),
  ('241-1','Əvəzləşdirilən əlavə dəyər vergisi','asset','debit','241','Yalnız tətbiq olunan vergi rejimində'),
  ('521-1','Vergi öhdəlikləri','liability','credit','521','Vergilər üzrə qısamüddətli öhdəlik'),
  ('531-1','Satıcılara kreditor borcları','liability','credit','531','Marketplace satıcı hesablaşmaları'),
  ('545-1','Müştərilərə refund öhdəliyi','liability','credit','545','Təsdiqlənmiş geri ödənişlər'),
  ('601-1','Marketplace komissiya gəliri','revenue','credit','601','Platforma xidmət gəliri'),
  ('601-2','Satıcı qeydiyyat xidməti gəliri','revenue','credit','601','Satıcı aktivləşdirmə xidməti'),
  ('601-3','Reklam xidməti gəliri','revenue','credit','601','Reklam paketləri və bannerlər'),
  ('601-4','EG Trends xidməti gəliri','revenue','credit','601','EG Trends abunə gəliri'),
  ('731-1','Ödəniş prosessinqi xərcləri','expense','debit','731','Epoint və bank komissiyaları'),
  ('731-2','Refund və mübahisə xərcləri','expense','debit','731','Platformanın üzərinə düşən qaytarma xərci'),
  ('801-1','Hesabat dövrünün mənfəəti (zərəri)','equity','credit','801','Dövrün bağlanış hesabı')
on conflict(code) do update set name=excluded.name,account_type=excluded.account_type,normal_side=excluded.normal_side,parent_code=excluded.parent_code,description=excluded.description;

create or replace function public.accounting_guard_posted_changes()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare _status text;
begin
  select status into _status from public.accounting_journal_entries where id=coalesce(new.entry_id,old.entry_id);
  if _status in ('posted','reversed') then raise exception 'Təsdiqlənmiş jurnal yazılışı dəyişdirilə bilməz; əks yazılış yaradın'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists accounting_lines_immutable on public.accounting_journal_lines;
create trigger accounting_lines_immutable before insert or update or delete on public.accounting_journal_lines
for each row execute function public.accounting_guard_posted_changes();

create or replace function public.accounting_guard_entry_update()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if old.status in ('posted','reversed') and (new.entry_date,new.document_id,new.description,new.source_table,new.source_id,new.source_event) is distinct from (old.entry_date,old.document_id,old.description,old.source_table,old.source_id,old.source_event) then
    raise exception 'Təsdiqlənmiş jurnal yazılışının məzmunu dəyişdirilə bilməz';
  end if;
  if old.status='posted' and new.status='draft' then raise exception 'Təsdiqlənmiş yazılış qaralamaya qaytarıla bilməz'; end if;
  return new;
end $$;

drop trigger if exists accounting_entries_immutable on public.accounting_journal_entries;
create trigger accounting_entries_immutable before update on public.accounting_journal_entries
for each row execute function public.accounting_guard_entry_update();

create or replace function public.accounting_post_entry(_entry_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare _entry public.accounting_journal_entries%rowtype; _debit numeric; _credit numeric;
begin
  if not public.admin_has_permission('payments.manage') then raise exception 'Maliyyə yazılışını təsdiqləmək icazəsi yoxdur'; end if;
  select * into _entry from public.accounting_journal_entries where id=_entry_id for update;
  if not found then raise exception 'Jurnal yazılışı tapılmadı'; end if;
  if _entry.status <> 'draft' then raise exception 'Yalnız qaralama yazılışı təsdiqlənə bilər'; end if;
  if exists(select 1 from public.accounting_periods where status='closed' and _entry.entry_date between starts_on and ends_on) then raise exception 'Mühasibat dövrü bağlanıb'; end if;
  select coalesce(sum(debit),0),coalesce(sum(credit),0) into _debit,_credit from public.accounting_journal_lines where entry_id=_entry_id;
  if _debit=0 or _debit<>_credit then raise exception 'Debet və kredit bərabər və sıfırdan böyük olmalıdır: debet %, kredit %',_debit,_credit; end if;
  update public.accounting_journal_entries set status='posted',posted_by=auth.uid(),posted_at=now(),updated_at=now() where id=_entry_id;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),'accounting_entry_posted','accounting_journal_entry',_entry_id::text,jsonb_build_object('debit',_debit,'credit',_credit,'entry_number',_entry.entry_number));
  return jsonb_build_object('ok',true,'entry_number',_entry.entry_number,'debit',_debit,'credit',_credit);
end $$;

create or replace function public.accounting_trial_balance(_from date default null,_to date default null)
returns table(account_id uuid,code text,name text,account_type text,total_debit numeric,total_credit numeric,balance numeric)
language sql stable security definer set search_path=pg_catalog,public as $$
  select a.id,a.code,a.name,a.account_type,
    coalesce(sum(l.debit) filter(where e.id is not null),0),
    coalesce(sum(l.credit) filter(where e.id is not null),0),
    case when a.normal_side='debit'
      then coalesce(sum(l.debit-l.credit) filter(where e.id is not null),0)
      else coalesce(sum(l.credit-l.debit) filter(where e.id is not null),0) end
  from public.accounting_accounts a
  left join public.accounting_journal_lines l on l.account_id=a.id
  left join public.accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
    and (_from is null or e.entry_date>=_from) and (_to is null or e.entry_date<=_to)
  where public.admin_has_permission('payments.manage') and a.is_active
  group by a.id,a.code,a.name,a.account_type,a.normal_side order by a.code
$$;

create or replace function public.accounting_close_period(_period_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if not public.admin_has_permission('payments.manage') then raise exception 'Dövrü bağlamaq icazəsi yoxdur'; end if;
  update public.accounting_periods set status='closed',closed_at=now(),closed_by=auth.uid() where id=_period_id and status='open';
  if not found then raise exception 'Açıq dövr tapılmadı'; end if;
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id) values(auth.uid(),'accounting_period_closed','accounting_period',_period_id::text);
  return jsonb_build_object('ok',true);
end $$;

alter table public.accounting_accounts enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.accounting_documents enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;

drop policy if exists accounting_accounts_admin on public.accounting_accounts;
create policy accounting_accounts_admin on public.accounting_accounts for all to authenticated using(public.admin_has_permission('payments.manage')) with check(public.admin_has_permission('payments.manage'));
drop policy if exists accounting_periods_admin on public.accounting_periods;
create policy accounting_periods_admin on public.accounting_periods for all to authenticated using(public.admin_has_permission('payments.manage')) with check(public.admin_has_permission('payments.manage'));
drop policy if exists accounting_documents_admin on public.accounting_documents;
create policy accounting_documents_admin on public.accounting_documents for all to authenticated using(public.admin_has_permission('payments.manage')) with check(public.admin_has_permission('payments.manage'));
drop policy if exists accounting_entries_admin on public.accounting_journal_entries;
create policy accounting_entries_admin on public.accounting_journal_entries for all to authenticated using(public.admin_has_permission('payments.manage')) with check(public.admin_has_permission('payments.manage'));
drop policy if exists accounting_lines_admin on public.accounting_journal_lines;
create policy accounting_lines_admin on public.accounting_journal_lines for all to authenticated using(public.admin_has_permission('payments.manage')) with check(public.admin_has_permission('payments.manage'));

grant select,insert,update,delete on public.accounting_accounts,public.accounting_periods,public.accounting_documents,public.accounting_journal_entries,public.accounting_journal_lines to authenticated;
grant usage,select on sequence public.accounting_entry_number_seq to authenticated;
revoke all on function public.accounting_post_entry(uuid),public.accounting_trial_balance(date,date),public.accounting_close_period(uuid) from public,anon;
grant execute on function public.accounting_post_entry(uuid),public.accounting_trial_balance(date,date),public.accounting_close_period(uuid) to authenticated;

