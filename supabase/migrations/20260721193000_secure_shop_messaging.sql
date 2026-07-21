
-- Secure buyer/seller messaging: private attachments, conversation blocks and reports.

alter table public.shop_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.shop_messages
  drop constraint if exists shop_messages_attachment_size_check;
alter table public.shop_messages
  add constraint shop_messages_attachment_size_check
  check (attachment_size is null or attachment_size between 1 and 10485760);

create table if not exists public.shop_message_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint shop_message_blocks_not_self check (blocker_id <> blocked_id),
  constraint shop_message_blocks_unique unique (blocker_id, blocked_id)
);

create table if not exists public.shop_message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.shop_messages(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','fraud','prohibited_content','other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  assigned_admin_id uuid references auth.users(id) on delete set null,
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_message_reports_not_self check (reporter_id <> reported_user_id),
  constraint shop_message_reports_once unique (reporter_id, message_id)
);

create index if not exists shop_message_reports_status_idx
  on public.shop_message_reports(status, created_at desc);
create index if not exists shop_message_reports_thread_idx
  on public.shop_message_reports(buyer_id, seller_id, created_at desc);

alter table public.shop_message_blocks enable row level security;
alter table public.shop_message_reports enable row level security;

drop policy if exists "Message block participants read" on public.shop_message_blocks;
create policy "Message block participants read" on public.shop_message_blocks
for select to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users create own message blocks" on public.shop_message_blocks;
create policy "Users create own message blocks" on public.shop_message_blocks
for insert to authenticated
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

drop policy if exists "Users remove own message blocks" on public.shop_message_blocks;
create policy "Users remove own message blocks" on public.shop_message_blocks
for delete to authenticated
using (auth.uid() = blocker_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.prepare_shop_message_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_message public.shop_messages%rowtype;
begin
  select * into source_message from public.shop_messages where id = new.message_id;
  if source_message.id is null then
    raise exception 'message_not_found';
  end if;
  if auth.uid() is null or auth.uid() not in (source_message.buyer_id, source_message.seller_id) then
    raise exception 'not_a_conversation_participant';
  end if;
  new.reporter_id := auth.uid();
  new.buyer_id := source_message.buyer_id;
  new.seller_id := source_message.seller_id;
  new.reported_user_id := case when auth.uid() = source_message.buyer_id
    then source_message.seller_id else source_message.buyer_id end;
  return new;
end;
$$;

drop trigger if exists prepare_shop_message_report_trigger on public.shop_message_reports;
create trigger prepare_shop_message_report_trigger
before insert on public.shop_message_reports
for each row execute function public.prepare_shop_message_report();

drop policy if exists "Reporter creates message report" on public.shop_message_reports;
create policy "Reporter creates message report" on public.shop_message_reports
for insert to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Reporter reads own message reports" on public.shop_message_reports;
create policy "Reporter reads own message reports" on public.shop_message_reports
for select to authenticated
using (auth.uid() = reporter_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update message reports" on public.shop_message_reports;
create policy "Admins update message reports" on public.shop_message_reports
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Admins may inspect a conversation only when a report exists for that thread.
drop policy if exists "Msg participants read" on public.shop_messages;
create policy "Msg participants read" on public.shop_messages
for select to authenticated
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
  or (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.shop_message_reports report
      where report.buyer_id = shop_messages.buyer_id
        and report.seller_id = shop_messages.seller_id
    )
  )
);

drop policy if exists "Buyer sends" on public.shop_messages;
create policy "Buyer sends" on public.shop_messages
for insert to authenticated
with check (
  sender_role = 'buyer'
  and auth.uid() = buyer_id
  and auth.uid() <> seller_id
  and not exists (
    select 1 from public.shop_message_blocks block
    where (block.blocker_id = buyer_id and block.blocked_id = seller_id)
       or (block.blocker_id = seller_id and block.blocked_id = buyer_id)
  )
);

drop policy if exists "Seller replies" on public.shop_messages;
create policy "Seller replies" on public.shop_messages
for insert to authenticated
with check (
  sender_role = 'seller'
  and auth.uid() = seller_id
  and public.has_role(auth.uid(), 'seller')
  and auth.uid() <> buyer_id
  and not exists (
    select 1 from public.shop_message_blocks block
    where (block.blocker_id = buyer_id and block.blocked_id = seller_id)
       or (block.blocker_id = seller_id and block.blocked_id = buyer_id)
  )
);

-- Recipients may only update the read marker, never message content or ownership.
revoke update on public.shop_messages from authenticated;
grant update (read_at) on public.shop_messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf','text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Message participants upload attachments" on storage.objects;
create policy "Message participants upload attachments" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and array_length(storage.foldername(name), 1) >= 3
  and auth.uid()::text = any (array[(storage.foldername(name))[1], (storage.foldername(name))[2]])
  and auth.uid()::text = (storage.foldername(name))[3]
);

drop policy if exists "Message participants read attachments" on storage.objects;
create policy "Message participants read attachments" on storage.objects
for select to authenticated
using (
  bucket_id = 'message-attachments'
  and (
    auth.uid()::text = any (array[(storage.foldername(name))[1], (storage.foldername(name))[2]])
    or (
      public.has_role(auth.uid(), 'admin')
      and exists (
        select 1
        from public.shop_messages message
        join public.shop_message_reports report
          on report.buyer_id = message.buyer_id and report.seller_id = message.seller_id
        where message.attachment_path = name
      )
    )
  )
);

drop policy if exists "Attachment uploader deletes own files" on storage.objects;
create policy "Attachment uploader deletes own files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'message-attachments'
  and auth.uid()::text = (storage.foldername(name))[3]
);

grant select, insert, delete on public.shop_message_blocks to authenticated;
grant select, insert on public.shop_message_reports to authenticated;
grant update (status, assigned_admin_id, resolution, reviewed_at, updated_at)
  on public.shop_message_reports to authenticated;


