ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_email text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS customer_email text;