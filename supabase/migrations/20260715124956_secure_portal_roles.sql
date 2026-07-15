-- User metadata is editable by the user and must never grant operational roles.
-- New identities always start as customers. Seller is granted only by the
-- verified payment callback; PVZ is granted by the explicit registration RPC;
-- admin remains an owner-managed role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _ref_code text;
  _referrer_id uuid;
  _input_ref text;
begin
  _ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _input_ref := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');

  insert into public.profiles (id, full_name, phone, referral_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    _ref_code
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone),
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'buyer'::public.app_role)
  on conflict (user_id, role) do nothing;

  if _input_ref is not null then
    select id into _referrer_id
    from public.profiles
    where referral_code = upper(_input_ref)
    limit 1;

    if _referrer_id is not null and _referrer_id <> new.id then
      update public.profiles set referred_by = _referrer_id where id = new.id;
      insert into public.referrals (referrer_id, referred_id, bonus_awarded)
      values (_referrer_id, new.id, 500)
      on conflict do nothing;
      insert into public.bonus_transactions (user_id, amount, reason)
      values
        (_referrer_id, 500, 'Dəvət bonusu'),
        (new.id, 500, 'Xoş gəldiniz bonusu (dəvət)');
      update public.profiles
      set bonus_balance = coalesce(bonus_balance, 0) + 500
      where id in (_referrer_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

comment on function public.handle_new_user() is
  'Creates a customer profile. User-editable metadata never grants seller, PVZ, or admin roles.';
