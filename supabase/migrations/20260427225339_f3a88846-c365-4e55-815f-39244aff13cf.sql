-- Shop messages: buyer -> seller, seller replies
CREATE TABLE public.shop_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid,
  order_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shop_messages_seller_idx ON public.shop_messages(seller_id, created_at DESC);
CREATE INDEX shop_messages_buyer_idx ON public.shop_messages(buyer_id, created_at DESC);
CREATE INDEX shop_messages_thread_idx ON public.shop_messages(buyer_id, seller_id, created_at);

ALTER TABLE public.shop_messages ENABLE ROW LEVEL SECURITY;

-- Read: participants only (or admin)
CREATE POLICY "Msg participants read" ON public.shop_messages
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(),'admin'));

-- Buyer sends as buyer to a seller
CREATE POLICY "Buyer sends" ON public.shop_messages
FOR INSERT TO authenticated
WITH CHECK (sender_role = 'buyer' AND auth.uid() = buyer_id AND auth.uid() <> seller_id);

-- Seller replies as seller
CREATE POLICY "Seller replies" ON public.shop_messages
FOR INSERT TO authenticated
WITH CHECK (sender_role = 'seller' AND auth.uid() = seller_id AND has_role(auth.uid(),'seller') AND auth.uid() <> buyer_id);

-- Mark as read: only the recipient
CREATE POLICY "Recipient marks read" ON public.shop_messages
FOR UPDATE TO authenticated
USING (
  (sender_role = 'buyer' AND auth.uid() = seller_id) OR
  (sender_role = 'seller' AND auth.uid() = buyer_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_messages;
ALTER TABLE public.shop_messages REPLICA IDENTITY FULL;