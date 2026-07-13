ALTER TABLE public.system_settings 
  ADD COLUMN IF NOT EXISTS seller_signup_fee numeric NOT NULL DEFAULT 20;

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_duration integer;

CREATE OR REPLACE FUNCTION public.validate_product_video()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.video_duration IS NOT NULL AND NEW.video_duration > 60 THEN
    RAISE EXCEPTION 'Video maksimum 60 saniyə ola bilər';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_video ON public.products;
CREATE TRIGGER trg_validate_product_video
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_video();