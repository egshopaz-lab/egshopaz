-- Lock admin role: only the very first admin (the project owner) can hold the admin role.
-- Prevent anyone else from being granted admin, and prevent the owner admin row from being removed.

CREATE OR REPLACE FUNCTION public.get_owner_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role
  ORDER BY created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.enforce_admin_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  _owner := public.get_owner_admin_id();

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin'::public.app_role THEN
      -- Allow first ever admin (bootstrap), otherwise only the owner-admin row may exist
      IF _owner IS NOT NULL AND NEW.user_id <> _owner THEN
        RAISE EXCEPTION 'Admin rolu kilidlidir. Yalnız sahib admin ola bilər.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin'::public.app_role AND OLD.user_id = _owner THEN
      RAISE EXCEPTION 'Sahib admin rolunu dəyişmək olmaz.';
    END IF;
    IF NEW.role = 'admin'::public.app_role AND NEW.user_id <> _owner THEN
      RAISE EXCEPTION 'Admin rolu kilidlidir.';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin'::public.app_role AND OLD.user_id = _owner THEN
      RAISE EXCEPTION 'Sahib admin rolunu silmək olmaz.';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_admin_lock ON public.user_roles;
CREATE TRIGGER user_roles_admin_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_lock();