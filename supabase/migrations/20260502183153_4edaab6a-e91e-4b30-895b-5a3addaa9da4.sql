-- Remove anonymous execution from registration RPCs and lock internal maintenance RPCs
REVOKE EXECUTE ON FUNCTION public.become_seller(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_seller(text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_pvz_staff(text, text, uuid, text, text, text, text) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.become_seller(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_seller(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_pvz_staff(text, text, uuid, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.auto_payout_after_3_days() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_ai_chat_messages() FROM PUBLIC, anon, authenticated;