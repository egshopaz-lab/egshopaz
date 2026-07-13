-- pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: edge function URL
CREATE OR REPLACE FUNCTION public.call_ai_auto_reply(_channel text, _message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text := 'https://ibhmwwdrzgjgwfrvpjht.supabase.co/functions/v1/ai-auto-reply';
BEGIN
  PERFORM extensions.http_post(
    url := _url,
    body := jsonb_build_object('channel', _channel, 'message_id', _message_id),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_net function name varies; try net.http_post
  BEGIN
    PERFORM net.http_post(
      url := _url,
      body := jsonb_build_object('channel', _channel, 'message_id', _message_id),
      headers := jsonb_build_object('Content-Type', 'application/json')::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'AI auto-reply call failed: %', SQLERRM;
  END;
END;
$$;

-- Trigger: shop_messages
CREATE OR REPLACE FUNCTION public.trg_shop_msg_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
BEGIN
  IF NEW.sender_role <> 'buyer' THEN RETURN NEW; END IF;
  SELECT (enabled AND enabled_shop) INTO _enabled FROM public.ai_settings LIMIT 1;
  IF COALESCE(_enabled, false) THEN
    PERFORM public.call_ai_auto_reply('shop', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_msg_ai_trigger ON public.shop_messages;
CREATE TRIGGER shop_msg_ai_trigger
  AFTER INSERT ON public.shop_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_shop_msg_ai();

-- Trigger: pvz_messages
CREATE OR REPLACE FUNCTION public.trg_pvz_msg_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
BEGIN
  IF NEW.sender_role <> 'buyer' THEN RETURN NEW; END IF;
  SELECT (enabled AND enabled_pvz) INTO _enabled FROM public.ai_settings LIMIT 1;
  IF COALESCE(_enabled, false) THEN
    PERFORM public.call_ai_auto_reply('pvz', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pvz_msg_ai_trigger ON public.pvz_messages;
CREATE TRIGGER pvz_msg_ai_trigger
  AFTER INSERT ON public.pvz_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_pvz_msg_ai();

-- Trigger: dispute_messages
CREATE OR REPLACE FUNCTION public.trg_dispute_msg_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
BEGIN
  IF NEW.sender_role <> 'buyer' THEN RETURN NEW; END IF;
  SELECT (enabled AND enabled_dispute) INTO _enabled FROM public.ai_settings LIMIT 1;
  IF COALESCE(_enabled, false) THEN
    PERFORM public.call_ai_auto_reply('dispute', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispute_msg_ai_trigger ON public.dispute_messages;
CREATE TRIGGER dispute_msg_ai_trigger
  AFTER INSERT ON public.dispute_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispute_msg_ai();