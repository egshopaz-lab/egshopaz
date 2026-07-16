-- Marketplace visual merchandising: responsive banners and visual categories.

alter table public.banners
  add column if not exists mobile_image_url text,
  add column if not exists alt_text text,
  add column if not exists ad_label text not null default 'Reklam';

alter table public.categories
  add column if not exists image_url text,
  add column if not exists background_color text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists popularity_score integer not null default 0;

create index if not exists categories_featured_popularity_idx
  on public.categories (is_featured desc, popularity_score desc, sort_order asc)
  where parent_id is null;

drop policy if exists "Banners public read active" on public.banners;
create policy "Banners public read active"
  on public.banners for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create or replace function public.record_banner_impression(p_banner_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.banners
  set impressions = impressions + 1
  where id = p_banner_id
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now());
$$;

create or replace function public.record_banner_click(p_banner_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.banners
  set clicks = clicks + 1
  where id = p_banner_id
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now());
$$;

revoke all on function public.record_banner_impression(uuid) from public;
revoke all on function public.record_banner_click(uuid) from public;
grant execute on function public.record_banner_impression(uuid) to anon, authenticated;
grant execute on function public.record_banner_click(uuid) to anon, authenticated;

grant select on table public.banners to anon, authenticated;
grant select on table public.categories to anon, authenticated;

comment on function public.record_banner_impression(uuid) is
  'Narrow public RPC that increments impressions only for a currently deliverable banner.';
comment on function public.record_banner_click(uuid) is
  'Narrow public RPC that increments clicks only for a currently deliverable banner.';
