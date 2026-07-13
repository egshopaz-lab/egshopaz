ALTER TABLE public.couriers REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;