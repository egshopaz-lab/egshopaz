-- Trigger functions are internal implementation details and must not be exposed as RPCs.
revoke all on function public.eg_trends_normalize_post() from public, anon, authenticated;
revoke all on function public.eg_trends_record_price_change() from public, anon, authenticated;
revoke all on function public.eg_trends_sync_subscription_posts() from public, anon, authenticated;
