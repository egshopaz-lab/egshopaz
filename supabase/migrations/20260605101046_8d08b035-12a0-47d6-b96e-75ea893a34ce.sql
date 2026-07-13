
CREATE OR REPLACE FUNCTION public.recalc_product_review_stats(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_avg numeric;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO v_count, v_avg
  FROM public.reviews
  WHERE product_id = p_product_id;

  UPDATE public.products
     SET reviews_count = v_count,
         rating = ROUND(v_avg::numeric, 2)
   WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reviews_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_product_review_stats(OLD.product_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.product_id <> OLD.product_id THEN
    PERFORM public.recalc_product_review_stats(OLD.product_id);
    PERFORM public.recalc_product_review_stats(NEW.product_id);
    RETURN NEW;
  ELSE
    PERFORM public.recalc_product_review_stats(NEW.product_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_recalc_aiud ON public.reviews;
CREATE TRIGGER trg_reviews_recalc_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_reviews_recalc();

-- Backfill existing aggregates
UPDATE public.products p
SET reviews_count = sub.cnt,
    rating = ROUND(sub.avg_r::numeric, 2)
FROM (
  SELECT product_id, COUNT(*) AS cnt, COALESCE(AVG(rating), 0) AS avg_r
  FROM public.reviews
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;

UPDATE public.products
   SET reviews_count = 0, rating = 0
 WHERE id NOT IN (SELECT product_id FROM public.reviews)
   AND (reviews_count <> 0 OR rating <> 0);
