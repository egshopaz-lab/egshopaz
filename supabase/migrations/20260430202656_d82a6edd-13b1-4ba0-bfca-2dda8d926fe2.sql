REVOKE EXECUTE ON FUNCTION public.call_ai_auto_reply(text, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_shop_msg_ai() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_pvz_msg_ai() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_dispute_msg_ai() FROM PUBLIC, authenticated, anon;