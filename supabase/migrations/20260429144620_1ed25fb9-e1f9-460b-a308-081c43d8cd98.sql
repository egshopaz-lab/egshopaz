-- 1) Move products from old to new categories
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='elektronika')
  WHERE category_id = (SELECT id FROM public.categories WHERE slug='texnika');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='evd-mebel')
  WHERE category_id = (SELECT id FROM public.categories WHERE slug='ev-mebel');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug='el-aksesuar')
  WHERE category_id = (SELECT id FROM public.categories WHERE slug='t-elektrik');

-- 2) Delete all old duplicate categories (children first via CASCADE on parent_id won't help — manual)
-- Get list of old root slugs to wipe along with their descendants
WITH RECURSIVE old_tree AS (
  SELECT id FROM public.categories
   WHERE slug IN ('qadin','kisi','usaq','ev','texnika','idman','avto','erzaq','meiset','kitab','heyvan','tikinti','ofis','digerleri')
  UNION ALL
  SELECT c.id FROM public.categories c JOIN old_tree o ON c.parent_id = o.id
)
DELETE FROM public.categories WHERE id IN (SELECT id FROM old_tree);