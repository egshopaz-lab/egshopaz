CREATE OR REPLACE FUNCTION public.is_buyer_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND public.has_role(_user_id, 'buyer'::public.app_role)
    AND NOT public.has_role(_user_id, 'seller'::public.app_role)
    AND NOT public.has_role(_user_id, 'pvz'::public.app_role)
    AND NOT public.has_role(_user_id, 'admin'::public.app_role)
$$;