import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatAZN } from "@/lib/format";
import { Trash2, Plus, Minus, ShoppingBag, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

interface CartRow {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    stock: number;
    seller_id: string;
  } | null;
}

function CartPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [pvzList, setPvzList] = useState<
    {
      id: string;
      name: string;
      city: string;
      address: string;
      point_number: number | null;
      phone: string | null;
      working_hours: string;
    }[]
  >([]);
  const [pvzId, setPvzId] = useState<string>("");
  const [pvzSearch, setPvzSearch] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pvz" | "home">("pvz");
  const [homeCity, setHomeCity] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeApartment, setHomeApartment] = useState("");
  const [homeNotes, setHomeNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [promo, setPromo] = useState("");
  const [promoInfo, setPromoInfo] = useState<{ code: string; discount: number } | null>(null);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [bonusToUse, setBonusToUse] = useState(0);
  const [bonusToAzn, setBonusToAzn] = useState(0.01);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [cart, prof, settings, pps] = await Promise.all([
      supabase.from("cart_items").select("id,quantity,product_id").eq("user_id", user.id),
      supabase.from("profiles").select("bonus_balance,full_name,phone").eq("id", user.id).maybeSingle(),
      supabase.from("system_settings").select("bonus_to_azn").limit(1).maybeSingle(),
      supabase
        .from("pickup_points")
        .select("id,name,city,address,point_number,phone,working_hours")
        .eq("is_active", true)
        .order("point_number", { ascending: true }),
    ]);
    const firstError = cart.error ?? prof.error ?? settings.error ?? pps.error;
    if (firstError) {
      toast.error(`Səbət yüklənmədi: ${firstError.message}`);
      setLoading(false);
      return;
    }
    const cartRows = (cart.data ?? []) as { id: string; quantity: number; product_id: string }[];
    const productIds = [...new Set(cartRows.map((row) => row.product_id))];
    const { data: productRows, error: productsError } = productIds.length
      ? await supabase
          .from("products")
          .select("id,title,price,image_url,stock,seller_id")
          .in("id", productIds)
      : { data: [], error: null };
    if (productsError) {
      toast.error(`Məhsullar yüklənmədi: ${productsError.message}`);
      setLoading(false);
      return;
    }
    const productMap = new Map((productRows ?? []).map((product) => [product.id, product]));
    setItems(
      cartRows.map((row) => ({
        ...row,
        products: (productMap.get(row.product_id) as CartRow["products"]) ?? null,
      })),
    );
    setBonusBalance(prof.data?.bonus_balance ?? 0);
    setProfile({ full_name: prof.data?.full_name ?? null, phone: prof.data?.phone ?? null });
    setRecipientName((prev) => prev || prof.data?.full_name || "");
    setRecipientEmail((prev) => prev || user.email || "");
    setRecipientPhone((prev) => prev || prof.data?.phone || "");
    setBonusToAzn(Number(settings.data?.bonus_to_azn ?? 0.01));
    setPvzList((pps.data ?? []) as never);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    else if (!authLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const applyPromo = async () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase
      .from("promo_codes")
      .select(
        "code,discount_percent,discount_amount,min_order,is_active,expires_at,usage_limit,used_count",
      )
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) {
      toast.error(t("cart.promoNotFound"));
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error(t("cart.promoExpired"));
      return;
    }
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      toast.error(t("cart.promoLimit"));
      return;
    }
    if (Number(data.min_order) > total) {
      toast.error(`${t("cart.minOrder")}: ${formatAZN(Number(data.min_order))}`);
      return;
    }
    const disc = data.discount_amount
      ? Number(data.discount_amount)
      : Math.round(total * (data.discount_percent ?? 0)) / 100;
    setPromoInfo({ code: data.code, discount: disc });
    toast.success(`${t("cart.promoApplied")}: -${formatAZN(disc)}`);
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    const item = items.find((i) => i.id === id);
    if (item?.products && qty > item.products.stock) {
      toast.error(`Maksimum stok: ${item.products.stock} ədəd`);
      return;
    }
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    load();
  };

  const subtotal = items.reduce(
    (s, it) => s + (it.products ? Number(it.products.price) * it.quantity : 0),
    0,
  );
  const total = subtotal;
  const bonusDiscount = bonusToUse * bonusToAzn;
  const promoDiscount = promoInfo?.discount ?? 0;
  const HOME_FREE_THRESHOLD = 50;
  const HOME_SHIPPING_FEE = 5;
  const PVZ_FREE_THRESHOLD = 30;
  const PVZ_SHIPPING_FEE = 2;
  const freeThreshold = deliveryMethod === "home" ? HOME_FREE_THRESHOLD : PVZ_FREE_THRESHOLD;
  const baseFee = deliveryMethod === "home" ? HOME_SHIPPING_FEE : PVZ_SHIPPING_FEE;
  const shippingFee = subtotal >= freeThreshold ? 0 : baseFee;
  const finalTotal = Math.max(0, subtotal - promoDiscount - bonusDiscount + shippingFee);
  const maxBonus = Math.min(bonusBalance, Math.floor(subtotal / bonusToAzn));

  const checkout = async () => {
    if (!user || items.length === 0) return;
    const finalRecipientName = recipientName.trim() || profile?.full_name || "";
    const finalRecipientEmail = recipientEmail.trim() || user.email || "";
    const finalRecipientPhone = recipientPhone.trim() || profile?.phone || "";
    if (!finalRecipientName || !finalRecipientPhone) {
      toast.error("Ad və telefon nömrəsi daxil edin");
      return;
    }
    let shippingAddress = "";
    let chosenPvzId: string | null = null;
    if (deliveryMethod === "pvz") {
      if (!pvzId) {
        toast.error("Zəhmət olmasa PVZ punkt seçin");
        return;
      }
      const selected = pvzList.find((p) => p.id === pvzId);
      if (!selected) {
        toast.error("PVZ punkt tapılmadı");
        return;
      }
      shippingAddress = `PVZ #${selected.point_number ?? "-"} — ${selected.name}, ${selected.city}, ${selected.address}`;
      chosenPvzId = pvzId;
    } else {
      if (!homeCity.trim() || !homeAddress.trim()) {
        toast.error("Şəhər və ünvan daxil edin");
        return;
      }
      shippingAddress = `🏠 Ev çatdırılması — ${homeCity.trim()}, ${homeAddress.trim()}${homeApartment.trim() ? `, mən./ev: ${homeApartment.trim()}` : ""}${homeNotes.trim() ? ` (Qeyd: ${homeNotes.trim()})` : ""}`;
    }
    setPlacing(true);
    const orderId = crypto.randomUUID();
    const { error } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        buyer_id: user.id,
        total: finalTotal,
        shipping_address: shippingAddress,
        pickup_point_id: chosenPvzId,
        recipient_name: finalRecipientName,
        recipient_email: finalRecipientEmail,
        recipient_phone: finalRecipientPhone,
        status: "pending",
        promo_code: promoInfo?.code ?? null,
        discount: promoDiscount + bonusDiscount,
        bonus_used: bonusToUse,
      } as never);
    if (error) {
      toast.error(`Sifariş yaradıla bilmədi: ${error?.message ?? t("cart.orderError")}`);
      setPlacing(false);
      return;
    }

    const orderItems = items
      .filter((i) => i.products)
      .map((i) => ({
        order_id: orderId,
        product_id: i.products!.id,
        seller_id: i.products!.seller_id,
        title: i.products!.title,
        price: i.products!.price,
        quantity: i.quantity,
        image_url: i.products!.image_url,
        pickup_point_id: chosenPvzId,
        customer_name: finalRecipientName,
        customer_email: finalRecipientEmail,
        customer_phone: finalRecipientPhone,
      }));
    const { error: itemError } = await supabase.from("order_items").insert(orderItems);
    if (itemError) {
      toast.error(`Sifariş məhsulları əlavə olunmadı: ${itemError.message}`);
      setPlacing(false);
      return;
    }

    if (bonusToUse > 0) {
      const { error: bonusError } = await supabase.from("bonus_transactions").insert({
        user_id: user.id,
        amount: -bonusToUse,
        reason: t("cart.useBonus"),
        order_id: orderId,
      } as never);
      if (bonusError) {
        toast.error(`Bonus tətbiq olunmadı: ${bonusError.message}`);
        setPlacing(false);
        return;
      }
      await supabase
        .from("profiles")
        .update({ bonus_balance: bonusBalance - bonusToUse })
        .eq("id", user.id);
    }

    // Promo used_count artır
    if (promoInfo?.code) {
      const { error: rpcErr } = await supabase.rpc(
        "increment_promo_used_count" as never,
        { promo_code: promoInfo.code } as never
      );
      if (rpcErr) {
        const { data } = await supabase
          .from("promo_codes")
          .select("used_count")
          .eq("code", promoInfo.code)
          .maybeSingle();
        if (data) {
          await supabase
            .from("promo_codes")
            .update({ used_count: (data.used_count ?? 0) + 1 })
            .eq("code", promoInfo.code);
        }
      }
    }

    // Stoku azalt
    await Promise.all(
      items
        .filter((i) => i.products)
        .map(async (i) => {
          const { error: rpcErr } = await supabase.rpc(
            "decrement_stock" as never,
            { product_id: i.products!.id, qty: i.quantity } as never
          );
          if (rpcErr) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, (i.products!.stock ?? 0) - i.quantity) } as never)
              .eq("id", i.products!.id);
          }
        })
    );

    await supabase.from("cart_items").delete().eq("user_id", user.id);
    toast.success(t("cart.orderPlaced"));
    setPlacing(false);
    navigate({ to: "/checkout-pay/$orderId", params: { orderId } });
  };

  if (!authLoading && !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t("cart.loginRequired")}</h2>
        <Link
          to="/auth"
          search={{ role: "buyer" } as never}
          className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold"
        >
          {t("cart.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-6">{t("cart.title")}</h1>
      {loading ? (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-secondary/40 rounded-2xl">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{t("cart.empty")}</p>
          <Link
            to="/catalog"
            search={{ q: undefined, cat: undefined } as never}
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {items.map(
              (it) =>
                it.products && (
                  <div
                    key={it.id}
                    className="bg-card border border-border rounded-2xl p-4 flex gap-4"
                  >
                    <Link
                      to="/product/$id"
                      params={{ id: it.products.id }}
                      className="w-24 h-24 bg-secondary rounded-xl overflow-hidden shrink-0"
                    >
                      {it.products.image_url && (
                        <img
                          src={it.products.image_url}
                          alt={it.products.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/product/$id"
                        params={{ id: it.products.id }}
                        className="font-semibold line-clamp-2 hover:text-primary"
                      >
                        {it.products.title}
                      </Link>
                      <div className="text-lg font-extrabold mt-1">
                        {formatAZN(Number(it.products.price) * it.quantity)}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-border rounded-lg">
                          <button
                            onClick={() => updateQty(it.id, it.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-secondary"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(it.id, it.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-secondary"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => remove(it.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ),
            )}
          </div>

          <aside className="bg-card border border-border rounded-2xl p-5 h-fit sticky top-24 space-y-4">
            <h3 className="font-bold text-lg">{t("cart.summary")}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("cart.products")} ({items.length})
              </span>
              <span className="font-semibold">{formatAZN(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("cart.delivery")} {deliveryMethod === "home" ? "(Ev)" : "(PVZ)"}
              </span>
              {shippingFee > 0 ? (
                <span className="font-semibold">{formatAZN(shippingFee)}</span>
              ) : (
                <span className="font-semibold text-success">{t("cart.free")}</span>
              )}
            </div>
            {shippingFee > 0 && (
              <div className="text-[11px] text-muted-foreground -mt-1">
                {formatAZN(freeThreshold - subtotal)} daha alış-veriş edin və {deliveryMethod === "home" ? "ev" : "PVZ"} çatdırılması pulsuz olsun
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("cart.promoCode")}
              </label>
              {promoInfo ? (
                <div className="flex items-center justify-between bg-primary/10 rounded-lg p-2 text-sm">
                  <span className="font-mono font-bold">{promoInfo.code}</span>
                  <button onClick={() => setPromoInfo(null)} className="text-xs text-rose-500">
                    {t("common.delete")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value.toUpperCase())}
                    placeholder="KOD"
                    maxLength={32}
                    className="flex-1 border border-input rounded-lg px-3 h-9 text-sm font-mono uppercase"
                  />
                  <button
                    onClick={applyPromo}
                    className="bg-secondary hover:bg-secondary/80 px-3 h-9 rounded-lg text-sm font-bold"
                  >
                    {t("cart.apply")}
                  </button>
                </div>
              )}
              {promoInfo && (
                <div className="flex justify-between text-sm text-success">
                  <span>{t("cart.promoDiscount")}</span>
                  <span>−{formatAZN(promoDiscount)}</span>
                </div>
              )}
            </div>

            {bonusBalance > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("cart.useBonus")}
                  </label>
                  <span className="text-xs">
                    {t("cart.balance")}: <b>{bonusBalance}</b>
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    max={maxBonus}
                    value={bonusToUse}
                    onChange={(e) =>
                      setBonusToUse(
                        Math.min(maxBonus, Math.max(0, parseInt(e.target.value || "0"))),
                      )
                    }
                    className="flex-1 border border-input rounded-lg px-3 h-9 text-sm"
                  />
                  <button
                    onClick={() => setBonusToUse(maxBonus)}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2 h-9 rounded-lg font-bold"
                  >
                    {t("cart.all")}
                  </button>
                </div>
                {bonusToUse > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>{t("cart.bonusDiscount")}</span>
                    <span>−{formatAZN(bonusDiscount)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-3 flex justify-between text-lg font-extrabold">
              <span>{t("cart.total")}</span>
              <span>{formatAZN(finalTotal)}</span>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Alıcı məlumatları</label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ad Soyad"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Email"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Telefon (+994...)"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Çatdırılma üsulu</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pvz")}
                  className={`p-2 rounded-lg text-xs font-bold border transition ${deliveryMethod === "pvz" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"}`}
                >
                  📦 PVZ punkt
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("home")}
                  className={`p-2 rounded-lg text-xs font-bold border transition ${deliveryMethod === "home" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"}`}
                >
                  🏠 Ev ünvanı
                </button>
              </div>
            </div>

            {deliveryMethod === "pvz" ? (
              <div className="border-t border-border pt-3 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> PVZ punkt seçin
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={pvzSearch}
                    onChange={(e) => setPvzSearch(e.target.value)}
                    placeholder="Şəhər, ünvan və ya nömrə..."
                    className="w-full pl-9 pr-3 h-9 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                  {pvzList
                    .filter((p) => {
                      const q = pvzSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        p.city.toLowerCase().includes(q) ||
                        p.address.toLowerCase().includes(q) ||
                        p.name.toLowerCase().includes(q) ||
                        String(p.point_number ?? "").includes(q)
                      );
                    })
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPvzId(p.id)}
                        className={`w-full text-left p-2 rounded-md text-xs hover:bg-secondary transition ${pvzId === p.id ? "bg-primary/10 ring-2 ring-primary" : ""}`}
                      >
                        <div className="font-bold">
                          #{p.point_number ?? "-"} · {p.name}
                        </div>
                        <div className="text-muted-foreground">
                          {p.city} — {p.address}
                        </div>
                        <div className="text-muted-foreground">
                          {p.working_hours}
                          {p.phone ? ` · ${p.phone}` : ""}
                        </div>
                      </button>
                    ))}
                  {pvzList.length === 0 && (
                    <div className="text-xs text-muted-foreground p-3 text-center">
                      PVZ punkt mövcud deyil
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-3 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Ev ünvanı
                </label>
                <input
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="Şəhər (məs. Bakı)"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                />
                <input
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Küçə, bina"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                />
                <input
                  value={homeApartment}
                  onChange={(e) => setHomeApartment(e.target.value)}
                  placeholder="Mənzil / ev nömrəsi (istəyə bağlı)"
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                />
                <textarea
                  value={homeNotes}
                  onChange={(e) => setHomeNotes(e.target.value)}
                  placeholder="Əlavə qeyd (mərtəbə, domofon və s.)"
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            )}
            <button
              onClick={checkout}
              disabled={placing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-3 font-bold disabled:opacity-60"
            >
              {placing ? t("cart.placing") : t("cart.checkout")}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
