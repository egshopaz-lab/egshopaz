
-- 1. orders cədvəlinə ödəniş sahələri
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod_pvz',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS collected_by_pvz_id uuid REFERENCES public.pickup_points(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_note text;

-- 2. treasury_transactions cədvəli
CREATE TABLE IF NOT EXISTS public.treasury_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  amount numeric(12,2) NOT NULL,
  direction text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_point_id uuid REFERENCES public.pickup_points(id) ON DELETE SET NULL,
  payout_request_id uuid REFERENCES public.payout_requests(id) ON DELETE SET NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_transactions TO authenticated;
GRANT ALL ON public.treasury_transactions TO service_role;

ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_admin_all" ON public.treasury_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "treasury_pvz_read_own" ON public.treasury_transactions
  FOR SELECT TO authenticated
  USING (
    pickup_point_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pvz_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.pickup_point_id = treasury_transactions.pickup_point_id
        AND ps.is_active
    )
  );

CREATE POLICY "treasury_seller_read_own" ON public.treasury_transactions
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_treasury_kind ON public.treasury_transactions(kind);
CREATE INDEX IF NOT EXISTS idx_treasury_order ON public.treasury_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_treasury_pvz ON public.treasury_transactions(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_treasury_created ON public.treasury_transactions(created_at DESC);

-- 3. Avtomatik: sifariş tam təhvil verildikdə (COD) → kassaya gəlir
CREATE OR REPLACE FUNCTION public.cod_collect_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ord record;
  _total numeric;
  _undelivered int;
  _pvz uuid;
BEGIN
  IF NEW.delivered_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.delivered_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO _ord FROM public.orders WHERE id = NEW.order_id;
  IF _ord.id IS NULL THEN RETURN NEW; END IF;
  IF _ord.payment_method <> 'cod_pvz' THEN RETURN NEW; END IF;
  IF _ord.payment_status = 'paid' THEN RETURN NEW; END IF;

  SELECT count(*) INTO _undelivered
  FROM public.order_items
  WHERE order_id = NEW.order_id
    AND delivered_at IS NULL
    AND status NOT IN ('cancelled');
  IF _undelivered > 0 THEN RETURN NEW; END IF;

  _pvz := COALESCE(NEW.pickup_point_id, _ord.pickup_point_id);
  _total := _ord.total;

  UPDATE public.orders
    SET payment_status = 'paid', paid_at = now(), collected_by_pvz_id = _pvz
    WHERE id = NEW.order_id AND payment_status = 'unpaid';

  INSERT INTO public.treasury_transactions (kind, direction, amount, order_id, pickup_point_id, note)
  VALUES ('cash_in_pvz', 'in', _total, NEW.order_id, _pvz,
    'PVZ-də nağd qəbul (sifariş #' || substr(NEW.order_id::text,1,8) || ')');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cod_collect ON public.order_items;
CREATE TRIGGER trg_cod_collect
  AFTER INSERT OR UPDATE OF delivered_at ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.cod_collect_on_delivery();

-- 4. Satıcıya ödəniş tamamlandıqda → kassadan çıxış
CREATE OR REPLACE FUNCTION public.treasury_log_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.treasury_transactions (kind, direction, amount, seller_id, payout_request_id, note)
    VALUES ('payout_out', 'out', NEW.amount, NEW.seller_id, NEW.id,
      'Satıcıya ödəniş — ' || COALESCE(NEW.admin_note,''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_treasury_payout ON public.payout_requests;
CREATE TRIGGER trg_treasury_payout
  AFTER UPDATE OF status ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.treasury_log_payout();

-- 5. Admin əl ilə "ödənildi" qeyd etmək üçün (transfer və s.)
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid, _method text DEFAULT 'transfer', _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ord record;
  _kind text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Yalnız admin';
  END IF;
  SELECT * INTO _ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _ord.id IS NULL THEN RAISE EXCEPTION 'Sifariş tapılmadı'; END IF;
  IF _ord.payment_status = 'paid' THEN RAISE EXCEPTION 'Artıq ödənilib'; END IF;

  UPDATE public.orders
    SET payment_status = 'paid',
        paid_at = now(),
        payment_method = _method,
        payment_note = _note
    WHERE id = _order_id;

  _kind := CASE _method WHEN 'online' THEN 'online_in' WHEN 'transfer' THEN 'transfer_in' ELSE 'manual_in' END;

  INSERT INTO public.treasury_transactions (kind, direction, amount, order_id, note, created_by)
  VALUES (_kind, 'in', _ord.total, _order_id, COALESCE(_note,'Admin əl ilə təsdiqlədi'), auth.uid());
END;
$$;

-- 6. Admin əl ilə kassa hərəkəti əlavə etmək üçün
CREATE OR REPLACE FUNCTION public.add_manual_treasury(_direction text, _amount numeric, _note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Yalnız admin';
  END IF;
  IF _direction NOT IN ('in','out') THEN RAISE EXCEPTION 'Yanlış istiqamət'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Məbləğ düzgün deyil'; END IF;

  INSERT INTO public.treasury_transactions (kind, direction, amount, note, created_by)
  VALUES (CASE WHEN _direction='in' THEN 'manual_in' ELSE 'manual_out' END, _direction, _amount, _note, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
