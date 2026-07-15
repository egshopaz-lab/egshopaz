import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortal } from "@/lib/portals";

interface PaymentIntent {
  id: string;
  service_type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

export function PaymentResultPage({ paymentId, mode }: { paymentId?: string; mode: "success" | "error" }) {
  const portal = usePortal();
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [checking, setChecking] = useState(mode === "success");

  const load = useCallback(async () => {
    if (!paymentId) { setChecking(false); return; }
    const { data } = await supabase
      .from("payment_intents" as never)
      .select("id,service_type,status,amount,currency,description,created_at")
      .eq("id", paymentId)
      .maybeSingle();
    const current = data as unknown as PaymentIntent | null;
    setPayment(current);
    if (current && ["paid", "failed", "refunded", "cancelled"].includes(current.status)) setChecking(false);
  }, [paymentId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (mode !== "success" || !checking) return;
    const interval = window.setInterval(() => void load(), 2000);
    const timeout = window.setTimeout(() => { window.clearInterval(interval); setChecking(false); }, 60_000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [checking, load, mode]);

  const paid = payment?.status === "paid";
  const returnPath = portal === "seller" ? "/seller" : portal === "pvz" ? "/pvz" : "/orders";
  const retryPath = payment?.service_type === "product_order" && payment?.id
    ? "/orders"
    : portal === "seller" ? "/seller" : portal === "pvz" ? "/become-pvz" : "/cart";

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl text-center">
      <div className="bg-card border border-border rounded-3xl p-8 shadow-elegant">
        {checking ? <Clock3 className="h-20 w-20 text-amber-500 mx-auto mb-4 animate-pulse" />
          : paid ? <CheckCircle2 className="h-20 w-20 text-emerald-600 mx-auto mb-4" />
          : <XCircle className="h-20 w-20 text-red-600 mx-auto mb-4" />}
        <h1 className="text-3xl font-extrabold">
          {checking ? "Ödəniş təsdiqlənir" : paid ? "Ödəniş uğurla tamamlandı" : "Ödəniş tamamlanmadı"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {checking ? "Epoint callback nəticəsini gözləyirik. Bu səhifəni bağlamayın."
            : paid ? "Xidmətiniz avtomatik aktivləşdirildi."
            : "Pul tutulmayıbsa yenidən cəhd edə bilərsiniz."}
        </p>
        {payment && <div className="text-left rounded-2xl bg-secondary/50 p-4 mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Əməliyyat</span><b>#{payment.id.slice(0, 8).toUpperCase()}</b></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Xidmət</span><b className="text-right">{payment.description}</b></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Məbləğ</span><b>{Number(payment.amount).toFixed(2)} {payment.currency}</b></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><b>{payment.status}</b></div>
        </div>}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
          {!paid && !checking && <Link to={retryPath as never} className="px-5 py-3 rounded-xl border border-border font-bold flex items-center justify-center gap-2"><RotateCcw className="h-4 w-4" /> Yenidən cəhd et</Link>}
          <Link to={returnPath as never} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold">Davam et</Link>
        </div>
      </div>
    </div>
  );
}
