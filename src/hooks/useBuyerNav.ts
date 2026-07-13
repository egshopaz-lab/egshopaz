import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  User as UserIcon, Package, MapPin, CreditCard, Star,
  Gift, Bell, MessageCircle, Coins, AlertTriangle,
  Heart, ShoppingCart, Undo2,
} from "lucide-react";
import type { PanelNavItem } from "@/components/PanelLayout";

export function useBuyerNav(): { items: PanelNavItem[]; bonusBalance: number } {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orderCount, setOrderCount] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", user.id).in("status", ["pending", "paid", "shipped"])
      .then(({ count }) => setOrderCount(count ?? 0));
    supabase.from("profiles").select("bonus_balance").eq("id", user.id).maybeSingle()
      .then(({ data }) => setBonusBalance((data as { bonus_balance?: number } | null)?.bonus_balance ?? 0));
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open")
      .then(({ count }) => setOpenTickets(count ?? 0));
    const loadUnread = () => {
      supabase.from("shop_messages").select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id).eq("sender_role", "seller").is("read_at", null)
        .then(({ count }) => setUnreadMsgs(count ?? 0));
    };
    loadUnread();
    const ch = supabase.channel(`buyer-msg-badge-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_messages", filter: `buyer_id=eq.${user.id}` }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const items: PanelNavItem[] = [
    { to: "/profile", label: t("sidebar.profile"), icon: UserIcon },
    { to: "/orders", label: t("sidebar.orders"), icon: Package, badge: orderCount },
    { to: "/returns", label: "Qaytarmalarım", icon: Undo2 },
    { to: "/favorites", label: t("sidebar.favorites"), icon: Heart },
    { to: "/cart", label: t("sidebar.cart"), icon: ShoppingCart },
    { to: "/messages", label: t("sidebar.messages"), icon: MessageCircle, badge: unreadMsgs },
    { to: "/messages-pvz", label: t("sidebar.pvzPanel"), icon: MessageCircle },
    { to: "/addresses", label: t("sidebar.addresses"), icon: MapPin },
    { to: "/pickup-points", label: t("sidebar.pickupPoints"), icon: MapPin },
    { to: "/payment-methods", label: t("sidebar.paymentMethods"), icon: CreditCard },
    { to: "/my-reviews", label: t("sidebar.myReviews"), icon: Star },
    { to: "/promotions", label: t("sidebar.promotions"), icon: Gift },
    { to: "/bonus", label: t("sidebar.bonuses"), icon: Coins, badge: bonusBalance },
    { to: "/notifications", label: t("sidebar.notifications"), icon: Bell },
    { to: "/disputes", label: t("sidebar.disputes"), icon: AlertTriangle },
    { to: "/support", label: t("sidebar.support"), icon: MessageCircle, badge: openTickets },
  ];

  return { items, bonusBalance };
}
