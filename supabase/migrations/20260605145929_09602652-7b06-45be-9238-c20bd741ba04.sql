-- 1) Customer saved cards (masked only)
CREATE TABLE IF NOT EXISTS public.customer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand text NOT NULL,
  last4 text NOT NULL,
  exp_month int NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year int NOT NULL CHECK (exp_year BETWEEN 2024 AND 2099),
  holder text NOT NULL,
  provider_token text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cards TO authenticated;
GRANT ALL ON public.customer_cards TO service_role;

ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own cards" ON public.customer_cards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add their own cards" ON public.customer_cards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own cards" ON public.customer_cards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own cards" ON public.customer_cards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_customer_cards_user ON public.customer_cards(user_id);

-- 2) System settings extensions
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS payments_mode text NOT NULL DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS cod_enabled boolean NOT NULL DEFAULT false;

-- 3) Default new orders to card_online
ALTER TABLE public.orders
  ALTER COLUMN payment_method SET DEFAULT 'card_online';

-- 4) Process card payment (test mode now; real API later)
CREATE OR REPLACE FUNCTION public.process_card_payment(
  _order_id uuid,
  _card_id uuid DEFAULT NULL,
  _new_card jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ord record;
  _mode text;
  _card record;
  _brand text;
  _last4 text;
  _saved_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;

  SELECT * INTO _ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _ord.id IS NULL THEN RAISE EXCEPTION 'Sifariş tapılmadı'; END IF;
  IF _ord.buyer_id <> _uid THEN RAISE EXCEPTION 'İcazə yoxdur'; END IF;
  IF _ord.payment_status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  SELECT COALESCE(payments_mode,'test') INTO _mode FROM public.system_settings LIMIT 1;

  -- Resolve card
  IF _card_id IS NOT NULL THEN
    SELECT * INTO _card FROM public.customer_cards WHERE id = _card_id AND user_id = _uid;
    IF _card.id IS NULL THEN RAISE EXCEPTION 'Kart tapılmadı'; END IF;
    _brand := _card.brand; _last4 := _card.last4;
  ELSIF _new_card IS NOT NULL THEN
    _brand := COALESCE(_new_card->>'brand','Card');
    _last4 := COALESCE(_new_card->>'last4','0000');
    IF COALESCE((_new_card->>'save')::boolean, false) THEN
      INSERT INTO public.customer_cards(user_id, brand, last4, exp_month, exp_year, holder)
      VALUES (_uid, _brand, _last4,
        COALESCE((_new_card->>'exp_month')::int, 1),
        COALESCE((_new_card->>'exp_year')::int, 2030),
        COALESCE(_new_card->>'holder',''))
      RETURNING id INTO _saved_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Kart məlumatı tələb olunur';
  END IF;

  IF _mode = 'live' THEN
    RAISE EXCEPTION 'Canlı ödəniş hələ aktiv deyil. Admin paneldən test rejimi seçin.';
  END IF;

  -- TEST mode: instantly succeed
  UPDATE public.orders
    SET payment_status = 'paid',
        paid_at = now(),
        payment_method = 'card_online',
        payment_note = 'Test ödəniş — ' || _brand || ' ••' || _last4
    WHERE id = _order_id;

  INSERT INTO public.treasury_transactions (kind, direction, amount, order_id, note, created_by)
  VALUES ('card_in', 'in', _ord.total, _order_id,
    'Kart ödənişi (' || _mode || ') — ' || _brand || ' ••' || _last4, _uid);

  INSERT INTO public.notifications (user_id, title, body, type, link, order_id)
  VALUES (_uid, '✅ Ödəniş uğurla tamamlandı',
    _ord.total || ' AZN — ' || _brand || ' ••' || _last4 || ' kartı ilə ödənildi.',
    'payment_paid', '/orders', _order_id);

  RETURN jsonb_build_object('ok', true, 'saved_card_id', _saved_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_card_payment(uuid, uuid, jsonb) TO authenticated;

-- 5) Helper: set default card
CREATE OR REPLACE FUNCTION public.set_default_card(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş tələb olunur'; END IF;
  UPDATE public.customer_cards SET is_default = false WHERE user_id = _uid;
  UPDATE public.customer_cards SET is_default = true WHERE id = _card_id AND user_id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_card(uuid) TO authenticated;