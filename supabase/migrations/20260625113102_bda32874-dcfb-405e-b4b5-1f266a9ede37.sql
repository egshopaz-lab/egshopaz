ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS single_banner_price numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS single_banner_days integer NOT NULL DEFAULT 30;