-- 1) Add audience column to isolate AI chats per panel
ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'buyer';

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_audience_created
  ON public.ai_chat_messages(user_id, audience, created_at DESC);

-- 2) Replace RLS policies so users see only their own messages for the requested audience
DROP POLICY IF EXISTS "AI chat owner read" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "AI chat owner insert" ON public.ai_chat_messages;

CREATE POLICY "AI chat owner read"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "AI chat owner insert"
  ON public.ai_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "AI chat owner delete"
  ON public.ai_chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Cleanup function: delete chats older than 5 minutes after last activity in that thread
CREATE OR REPLACE FUNCTION public.cleanup_ai_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all messages in (user_id, audience) threads where the latest message is older than 5 minutes
  DELETE FROM public.ai_chat_messages m
  USING (
    SELECT user_id, audience, MAX(created_at) AS last_at
    FROM public.ai_chat_messages
    GROUP BY user_id, audience
  ) t
  WHERE m.user_id = t.user_id
    AND m.audience = t.audience
    AND t.last_at < now() - interval '5 minutes';
END;
$$;

-- 4) Schedule cleanup every minute via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-chat-cleanup') THEN
    PERFORM cron.unschedule('ai-chat-cleanup');
  END IF;
  PERFORM cron.schedule(
    'ai-chat-cleanup',
    '* * * * *',
    $cron$ SELECT public.cleanup_ai_chat_messages(); $cron$
  );
END $$;