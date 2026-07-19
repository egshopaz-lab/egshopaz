import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CreditCard, ExternalLink, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatAZN } from "@/lib/format";
import { getFunctionErrorMessage } from "@/lib/functionError";

export const Route = createFileRoute("/checkout-pay/$orderId")({
  head: () => ({ meta: [{ title: "Təhlükəsiz ödəniş — EG Shop" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CheckoutPayPage,
});

type OrderSummary = { id: string; total: number; payment_status: string; recipient_name: string | null };

function isTrustedPaymentRedirect(target: URL): boolean {
  const isEpoint = target.hostname === "epoint.az" || target.hostname.endsWith(".epoint.az");
  const isPashaEcomm = target.hostname === "ecomm.pashabank.az";
  return target.protocol === "https:" && (isEpoint || isPashaEcomm);
}

function CheckoutPayPage() {
  const { orderId } = useParams({ from: "/checkout-pay/$orderId" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { role: "buyer" } as never });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,total,payment_status,recipient_name").eq("id", orderId).eq("buyer_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Sifariş məlumatı yüklənmədi");
        setOrder(data as OrderSummary | null);
        setLoading(false);
      });
  }, [user, orderId]);

  const startEpointPayment = async () => {
    if (!order || paying) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-init", {
        body: { service_type: "product_order", resource_id: order.id, language: "az" },
      });
      if (error) throw error;
      const target = new URL(typeof data?.redirect_url === "string" ? data.redirect_url : "");
      if (!isTrustedPaymentRedirect(target)) {
        throw new Error("Ödəniş ünvanı etibarsızdır");
      }
      window.location.assign(target.toString());
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Epoint ödənişi başladılmadı"));
      setPaying(false);
    }
  };

  if (!user || loading) return <div className="container mx-auto p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="container mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-2xl font-black">Sifariş tapılmadı</h1><Link to="/orders" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Sifarişlərə qayıt</Link></div>;
  if (order.payment_status === "paid") return <div className="container mx-auto max-w-md px-4 py-16 text-center"><ShieldCheck className="mx-auto mb-4 h-16 w-16 text-emerald-600" /><h1 className="text-2xl font-black">Bu sifariş artıq ödənilib</h1><Link to="/orders" className="mt-5 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Sifarişlərə qayıt</Link></div>;

  return (
    <main className="container mx-auto max-w-xl px-4 py-8 sm:py-12">
      <Link to="/cart" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Səbətə qayıt</Link>
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
        <div className="bg-gradient-brand px-6 py-7 text-primary-foreground sm:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Lock className="h-4 w-4" /> Təhlükəsiz ödəniş</div>
          <div className="mt-3 text-4xl font-black">{formatAZN(Number(order.total))}</div>
          <div className="mt-2 text-xs opacity-80">Sifariş #{order.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          <div className="flex gap-4 rounded-2xl bg-secondary/60 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm"><CreditCard className="h-5 w-5" /></span>
            <div><h2 className="font-extrabold">Epoint ilə kart ödənişi</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Kart nömrəsi və CVV EG Shop-da daxil edilmir və saxlanmır. Ödəniş Epoint-in qorunan səhifəsində tamamlanır.</p></div>
          </div>
          <button onClick={startEpointPayment} disabled={paying} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-extrabold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Epoint açılır...</> : <>Ödənişə keç <ExternalLink className="h-4 w-4" /></>}
          </button>
          <div className="flex items-center justify-center gap-5 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> İmzalanmış ödəniş</span><span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-emerald-600" /> SSL qoruması</span></div>
        </div>
      </section>
    </main>
  );
}
