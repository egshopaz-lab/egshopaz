
-- Coordinates for addresses
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

-- Coordinates for shop (profile)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_lat numeric,
  ADD COLUMN IF NOT EXISTS shop_lng numeric;

-- Live courier location
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Assign courier to order item for live tracking
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS courier_id uuid;

-- Allow public read of basic courier presence (lat/lng) for tracking - already public via existing policy
