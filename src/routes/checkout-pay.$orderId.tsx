import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout-pay/$orderId")({
  head: () => ({ meta: [{ title: "Təhlükəsiz ödəniş — EG Shop" }] }),
  component: CheckoutPayPage,
});

interface OrderSummary {
  id: string;
  total: number;
  payment_status: string;
  recipient_name: string | null;
  shipping_address: string | null;
}

function CheckoutPayPage() {
  const { orderId } = useParams({ from: "/checkout-pay/$orderId" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("id,total,payment_status,recipient_name,shipping_address")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data as OrderSummary | null);
        setLoading(false);
      });
  }, [orderId, user]);

  const payWithEpoint = async () => {
    if (!order || paying) return;
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("payment-init", {
      body: { service_type: "product_order", resource_id: order.id, language: "az" },
    });
    if (error || !data?.redirect_url) {
      toast.error(
        data?.error === "payment_not_configured"
          ? "Epoint açarları hələ aktivləşdirilməyib"
          : "Ödəniş səhifəsi açıla bilmədi",
      );
      setPaying(false);
      return;
    }
    window.location.assign(data.redirect_url as string);
  };

  if (!user || loading) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }
  if (!order) return <div className="container mx-auto p-8 text-center">Sifariş tapılmadı.</div>;
  if (order.payment_status === "paid") {
    return (
      <div className="container mx-auto p-8 max-w-md text-center">
        <ShieldCheck className="h-16 w-16 text-green-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Bu sifariş artıq ödənilib</h1>
        <Link to="/orders" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold">Sifarişlərə qayıt</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-10 max-w-lg">
      <div className="bg-gradient-brand text-primary-foreground rounded-3xl p-7 shadow-elegant">
        <LockKeyhole className="h-10 w-10 mb-3" />
        <h1 className="text-3xl font-extrabold">Təhlükəsiz ödəniş</h1>
        <p className="mt-2 opacity-90">Kart məlumatları yalnız Epoint səhifəsində daxil edilir.</p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mt-5 space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Sifariş</div>
          <div className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</div>
        </div>
        {order.recipient_name && <div><div className="text-sm text-muted-foreground">Alıcı</div><div>{order.recipient_name}</div></div>}
        <div className="rounded-xl bg-secondary/60 p-4 flex items-center justify-between">
          <span className="font-semibold">Yekun məbləğ</span>
          <span className="text-2xl font-black">{Number(order.total).toFixed(2)} AZN</span>
        </div>
        <button
          onClick={payWithEpoint}
          disabled={paying}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {paying ? "Epoint hazırlanır..." : "Kartla ödə — Epoint"}
        </button>
        <p className="text-xs text-center text-muted-foreground">EG Shop kart nömrəsi, CVV və son istifadə tarixini qəbul etmir və saxlamır.</p>
      </div>
    </div>
  );
}
