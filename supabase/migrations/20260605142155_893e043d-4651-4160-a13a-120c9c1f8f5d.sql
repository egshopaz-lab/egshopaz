
-- payout_requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'iban',
  iban text,
  card_number text,
  bank_name text,
  account_holder text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PR seller read own" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PR seller create own" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "PR admin manage" ON public.payout_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_payout_requests_updated
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RPC: request_payout (atomic: validates balance, reduces available, creates request)
CREATE OR REPLACE FUNCTION public.request_payout(_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _avail numeric;
  _min numeric;
  _prof record;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Məbləğ düzgün deyil'; END IF;

  SELECT min_payout INTO _min FROM public.system_settings LIMIT 1;
  _min := COALESCE(_min, 50);
  IF _amount < _min THEN RAISE EXCEPTION 'Minimum çıxarış məbləği: % AZN', _min; END IF;

  SELECT available INTO _avail FROM public.seller_balances WHERE seller_id = _uid FOR UPDATE;
  IF _avail IS NULL OR _avail < _amount THEN RAISE EXCEPTION 'Balans kifayət deyil'; END IF;

  SELECT payout_method, iban, card_number, bank_name, account_holder
    INTO _prof FROM public.profiles WHERE id = _uid;
  IF COALESCE(_prof.payout_method,'iban') = 'iban' AND COALESCE(_prof.iban,'') = '' THEN
    RAISE EXCEPTION 'Profildə IBAN daxil edin';
  END IF;
  IF _prof.payout_method = 'card' AND COALESCE(_prof.card_number,'') = '' THEN
    RAISE EXCEPTION 'Profildə kart nömrəsi daxil edin';
  END IF;

  UPDATE public.seller_balances
    SET available = available - _amount,
        pending = pending + _amount,
        updated_at = now()
    WHERE seller_id = _uid;

  INSERT INTO public.payout_requests (seller_id, amount, method, iban, card_number, bank_name, account_holder)
  VALUES (_uid, _amount, COALESCE(_prof.payout_method,'iban'), _prof.iban, _prof.card_number, _prof.bank_name, _prof.account_holder)
  RETURNING id INTO _id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_uid, '💸 Çıxarış tələbi qeydə alındı',
    _amount || ' AZN üçün tələbiniz admin tərəfindən baxılır.',
    'payout_request', '/seller');

  RETURN _id;
END;
$$;

-- RPC: admin mark payout as paid (or rejected)
CREATE OR REPLACE FUNCTION public.complete_payout_request(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Yalnız admin';
  END IF;
  SELECT * INTO _r FROM public.payout_requests WHERE id = _id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Tələb tapılmadı'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Artıq baxılıb'; END IF;

  IF _approve THEN
    UPDATE public.seller_balances
      SET pending = GREATEST(0, pending - _r.amount), updated_at = now()
      WHERE seller_id = _r.seller_id;
    UPDATE public.payout_requests
      SET status = 'paid', paid_at = now(), admin_note = _note
      WHERE id = _id;
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (_r.seller_id, '✅ Çıxarış ödənildi',
      _r.amount || ' AZN hesabınıza köçürüldü.', 'payout_paid', '/seller');
  ELSE
    -- refund to available
    UPDATE public.seller_balances
      SET available = available + _r.amount,
          pending = GREATEST(0, pending - _r.amount),
          updated_at = now()
      WHERE seller_id = _r.seller_id;
    UPDATE public.payout_requests
      SET status = 'rejected', admin_note = _note
      WHERE id = _id;
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (_r.seller_id, '❌ Çıxarış rədd edildi',
      COALESCE(_note, 'Tələb rədd edildi') || ' — məbləğ balansa qaytarıldı.', 'payout_rejected', '/seller');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_payout(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payout_request(uuid, boolean, text) TO authenticated;

-- Enable cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto payout daily at 02:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('eg-auto-payout-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'eg-auto-payout-daily',
  '0 2 * * *',
  $$ SELECT public.auto_payout_after_3_days(); $$
);
