DROP TRIGGER IF EXISTS profiles_assign_default_buyer_role ON public.profiles;
DROP FUNCTION IF EXISTS public.assign_default_buyer_role();

DELETE FROM public.user_roles ur
WHERE ur.role = 'buyer'::public.app_role
  AND EXISTS (
    SELECT 1
    FROM public.user_roles elevated
    WHERE elevated.user_id = ur.user_id
      AND elevated.role IN ('seller'::public.app_role, 'pvz'::public.app_role, 'admin'::public.app_role)
  );