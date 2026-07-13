import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  Home, LayoutGrid, Heart, ShoppingCart, MessageCircle, Package,
  Bell, Tag, Gift, Store, User, HelpCircle, Shield, PackageOpen, Flame, Map as MapIcon,
  GitCompare, Users, Megaphone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { catName } from "@/lib/catName";

interface Category { id: string; name: string; name_ru?: string | null; name_en?: string | null; slug: string; icon: string | null; parent_id: string | null }

export function MainSidebar() {
  const { user, isSeller } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const { setOpenMobile, isMobile, openMobile, open } = useSidebar();
  const [cats, setCats] = useState<Category[]>([]);
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (isHome) return;
    if (isMobile && !openMobile) return;
    if (!isMobile && !open) return;
    supabase.from("categories").select("id,name,name_ru,name_en,slug,icon,parent_id").order("sort_order").then(({ data }) => {
      setCats((data ?? []) as Category[]);
    });
  }, [isHome, isMobile, openMobile, open]);

  const close = () => { if (isMobile) setOpenMobile(false); };

  const parents = cats.filter((c) => !c.parent_id);

  const mainLinks = isSeller ? [
    { to: "/", label: t("sidebar.home"), icon: Home },
    { to: "/seller", label: t("sidebar.mySellerPanel"), icon: Store },
  ] : [
    { to: "/", label: t("sidebar.home"), icon: Home },
    { to: "/catalog", label: t("sidebar.catalog"), icon: LayoutGrid, search: { q: undefined, cat: undefined } as never },
    { to: "/shops", label: t("sidebar.shops"), icon: Store },
    { to: "/discover", label: t("sidebar.discover"), icon: Flame },
    { to: "/compare", label: t("sidebar.compare"), icon: GitCompare },
    { to: "/map", label: t("sidebar.map"), icon: MapIcon },
    { to: "/promotions", label: t("sidebar.promotions"), icon: Tag },
    { to: "/bonus", label: t("sidebar.bonuses"), icon: Gift },
  ];

  const userLinks = user ? (isSeller ? [
    { to: "/seller", label: t("sidebar.mySellerPanel"), icon: Store },
    { to: "/notifications", label: t("sidebar.notifications"), icon: Bell },
  ] : [
    { to: "/profile", label: t("sidebar.profile"), icon: User },
    { to: "/orders", label: t("sidebar.orders"), icon: Package },
    { to: "/favorites", label: t("sidebar.favorites"), icon: Heart },
    { to: "/followed-shops", label: t("sidebar.followedShops"), icon: Heart },
    { to: "/cart", label: t("sidebar.cart"), icon: ShoppingCart },
    { to: "/messages", label: t("sidebar.messages"), icon: MessageCircle },
    { to: "/notifications", label: t("sidebar.notifications"), icon: Bell },
    { to: "/referral", label: t("sidebar.referral"), icon: Users },
  ]) : [];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" onClick={close} className="flex items-center gap-2 font-extrabold text-xl px-2 py-2">
          <span className="bg-gradient-brand text-primary-foreground px-2 py-1 rounded-md">EG Shop</span>
          <span className="text-gradient-brand">market</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.mainMenu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((l) => (
                <SidebarMenuItem key={l.to}>
                  <SidebarMenuButton asChild>
                    <Link to={l.to} search={l.search} onClick={close}>
                      <l.icon className="h-4 w-4" />
                      <span>{l.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isHome && (
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.categories")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {parents.map((p) => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/catalog"
                      search={{ cat: p.slug, q: undefined } as never}
                      onClick={close}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span>{catName(p)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.myCabinet")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userLinks.map((l) => (
                  <SidebarMenuItem key={l.to}>
                    <SidebarMenuButton asChild>
                      <Link to={l.to} onClick={close}>
                        <l.icon className="h-4 w-4" />
                        <span>{l.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/support" onClick={close}>
                    <HelpCircle className="h-4 w-4" />
                    <span>{t("sidebar.support")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
