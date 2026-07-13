INSERT INTO public.categories (name, slug, icon, sort_order, parent_id)
VALUES ('Digərləri', 'digerleri', '📦', 999, NULL)
ON CONFLICT (slug) DO NOTHING;