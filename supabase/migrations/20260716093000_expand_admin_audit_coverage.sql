-- Cover every business area that administrators can manage. The trigger
-- function records only changes made with an authenticated admin session.
do $$
declare _table text;
begin
  foreach _table in array array[
    'couriers','warehouses','order_items','returns','disputes','dispute_messages',
    'support_tickets','ai_settings','faq_items','ad_service_types','ad_package_services',
    'seller_subscriptions','seller_balances','payout_requests','payouts','treasury_transactions',
    'payment_transactions','payment_intents','eg_trends_subscription_history',
    'eg_trends_price_history','eg_trends_payments','pvz_applications','pvz_notifications',
    'sponsored_products','sponsored_shops','shop_followers','shop_messages','pvz_messages'
  ] loop
    if to_regclass('public.'||_table) is not null then
      execute format('drop trigger if exists audit_admin_change on public.%I',_table);
      execute format(
        'create trigger audit_admin_change after insert or update or delete on public.%I for each row execute function public.audit_admin_table_change()',
        _table
      );
    end if;
  end loop;
end $$;
