-- 1. Compare list
CREATE TABLE public.compare_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.compare_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Compare owner all" ON public.compare_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Referral code on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS seller_tier text NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS seller_total_sales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_total_orders integer NOT NULL DEFAULT 0;

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 3. Referrals tracking
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  bonus_awarded integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrals participants read" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Referrals admin manage" ON public.referrals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Update handle_new_user to generate referral code and apply referral bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_count integer;
  _ref_code text;
  _referrer_id uuid;
  _input_ref text;
BEGIN
  _ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _input_ref := NEW.raw_user_meta_data->>'referral_code';

  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), _ref_code);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');

  -- Apply referral bonus
  IF _input_ref IS NOT NULL AND length(_input_ref) > 0 THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = upper(_input_ref) LIMIT 1;
    IF _referrer_id IS NOT NULL AND _referrer_id <> NEW.id THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE id = NEW.id;
      INSERT INTO public.referrals (referrer_id, referred_id, bonus_awarded) VALUES (_referrer_id, NEW.id, 500);
      INSERT INTO public.bonus_transactions (user_id, amount, reason) VALUES (_referrer_id, 500, 'Dəvət bonusu');
      INSERT INTO public.bonus_transactions (user_id, amount, reason) VALUES (NEW.id, 500, 'Xoş gəldiniz bonusu (dəvət)');
      UPDATE public.profiles SET bonus_balance = COALESCE(bonus_balance,0) + 500 WHERE id = _referrer_id;
      UPDATE public.profiles SET bonus_balance = COALESCE(bonus_balance,0) + 500 WHERE id = NEW.id;
    END IF;
  END IF;

  SELECT count(*) INTO _user_count FROM auth.users;
  IF _user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Seller tier auto-update on delivery
CREATE OR REPLACE FUNCTION public.update_seller_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total numeric;
  _orders integer;
  _new_tier text;
BEGIN
  IF NEW.delivered_at IS NULL OR (TG_OP='UPDATE' AND OLD.delivered_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
    SET seller_total_sales = COALESCE(seller_total_sales,0) + (NEW.price * NEW.quantity),
        seller_total_orders = COALESCE(seller_total_orders,0) + 1
    WHERE id = NEW.seller_id
    RETURNING seller_total_sales, seller_total_orders INTO _total, _orders;

  _new_tier := CASE
    WHEN _total >= 50000 THEN 'platinum'
    WHEN _total >= 10000 THEN 'gold'
    WHEN _total >= 2000 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE public.profiles SET seller_tier = _new_tier WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_update_seller_tier ON public.order_items;
CREATE TRIGGER trg_update_seller_tier
  AFTER UPDATE OF delivered_at ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_seller_tier();

-- 6. Recompute existing seller tiers
UPDATE public.profiles p SET
  seller_total_sales = COALESCE(t.total, 0),
  seller_total_orders = COALESCE(t.cnt, 0),
  seller_tier = CASE
    WHEN COALESCE(t.total,0) >= 50000 THEN 'platinum'
    WHEN COALESCE(t.total,0) >= 10000 THEN 'gold'
    WHEN COALESCE(t.total,0) >= 2000 THEN 'silver'
    ELSE 'bronze'
  END
FROM (
  SELECT seller_id, sum(price*quantity) AS total, count(*) AS cnt
  FROM public.order_items WHERE delivered_at IS NOT NULL GROUP BY seller_id
) t WHERE p.id = t.seller_id;