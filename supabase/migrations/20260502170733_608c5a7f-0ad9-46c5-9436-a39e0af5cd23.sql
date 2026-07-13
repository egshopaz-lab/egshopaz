-- Add sequential number to pickup_points for admin labeling
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS point_number integer;

-- Backfill numbers for existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM public.pickup_points
)
UPDATE public.pickup_points p SET point_number = n.rn FROM numbered n WHERE p.id = n.id AND p.point_number IS NULL;

-- Auto-assign next number on insert
CREATE OR REPLACE FUNCTION public.assign_pickup_point_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.point_number IS NULL THEN
    SELECT COALESCE(MAX(point_number), 0) + 1 INTO NEW.point_number FROM public.pickup_points;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_pickup_point_number ON public.pickup_points;
CREATE TRIGGER trg_assign_pickup_point_number
BEFORE INSERT ON public.pickup_points
FOR EACH ROW EXECUTE FUNCTION public.assign_pickup_point_number();

CREATE UNIQUE INDEX IF NOT EXISTS pickup_points_point_number_key ON public.pickup_points(point_number);

-- Allow admin to view all pvz_staff (already covered by admin manage policy via ALL — confirm policy exists; PVZ staff self read remains)
-- No change needed; the existing "PVZ staff admin manage" with ALL covers SELECT for admins.