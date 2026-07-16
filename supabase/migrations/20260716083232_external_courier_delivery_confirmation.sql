-- Preserve legacy values while adding the canonical delivery lifecycle.
alter type public.order_status add value if not exists 'preparing' after 'paid';
alter type public.order_status add value if not exists 'handed_to_courier' after 'packed';
alter type public.order_status add value if not exists 'in_transit' after 'handed_to_courier';
alter type public.order_status add value if not exists 'completed' after 'delivered';
alter type public.order_status add value if not exists 'returned' after 'cancelled';
alter type public.order_status add value if not exists 'disputed' after 'returned';
