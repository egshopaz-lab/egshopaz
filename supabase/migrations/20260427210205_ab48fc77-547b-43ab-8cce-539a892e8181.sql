DROP FUNCTION IF EXISTS public.become_seller(text);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Product images public read" ON storage.objects;

NOTIFY pgrst, 'reload schema';