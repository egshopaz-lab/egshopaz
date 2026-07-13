-- Bonus rate setting
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS bonus_earn_percent numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS bonus_to_azn numeric NOT NULL DEFAULT 0.01;

-- Order: promo + bonus accounting
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bonus_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_earned integer NOT NULL DEFAULT 0;

-- Trigger: bonus on delivery
CREATE OR REPLACE FUNCTION public.bonus_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer uuid;
  _earn integer := 0;
  _percent numeric := 2;
BEGIN
  IF NEW.delivered_at IS NULL OR (TG_OP = 'UPDATE' AND OLD.delivered_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT buyer_id INTO _buyer FROM public.orders WHERE id = NEW.order_id;
  SELECT bonus_earn_percent INTO _percent FROM public.system_settings LIMIT 1;
  _earn := floor(NEW.price * NEW.quantity * COALESCE(_percent,2) / 100)::int;

  IF _buyer IS NOT NULL AND _earn > 0 THEN
    INSERT INTO public.bonus_transactions (user_id, amount, reason, order_id)
    VALUES (_buyer, _earn, 'Sifariş təhvil alındı', NEW.order_id);

    UPDATE public.profiles
      SET bonus_balance = COALESCE(bonus_balance,0) + _earn
      WHERE id = _buyer;

    UPDATE public.orders
      SET bonus_earned = COALESCE(bonus_earned,0) + _earn
      WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bonus_on_delivery ON public.order_items;
CREATE TRIGGER trg_bonus_on_delivery
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.bonus_on_delivery();

-- Disputes: enable buyer/seller chat-style updates
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS order_item_id uuid;

-- Dispute messages
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller','admin','system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute msg participants read"
  ON public.dispute_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_messages.dispute_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role))
  ));

CREATE POLICY "Dispute msg participants send"
  ON public.dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role))
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;
ALTER TABLE public.dispute_messages REPLICA IDENTITY FULL;