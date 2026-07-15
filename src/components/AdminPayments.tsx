import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";

interface PaymentRow {
  id: string;
  user_id: string;
  service_type: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  provider_transaction_id: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
  cancelled: "bg-slate-100 text-slate-700",
};

export function AdminPayments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_intents" as never)
      .select("id,user_id,service_type,description,amount,currency,status,provider_transaction_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as unknown as PaymentRow[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const totalPaid = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4"><div className="text-xs text-muted-foreground">Uğurlu dövriyyə</div><div className="text-2xl font-black text-emerald-600">{formatAZN(totalPaid)}</div></div>
        <div className="bg-card border border-border rounded-2xl p-4"><div className="text-xs text-muted-foreground">Gözləyən</div><div className="text-2xl font-black">{rows.filter((row) => ["pending", "processing"].includes(row.status)).length}</div></div>
        <div className="bg-card border border-border rounded-2xl p-4"><div className="text-xs text-muted-foreground">Cəmi əməliyyat</div><div className="text-2xl font-black">{rows.length}</div></div>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div><b>Epoint ödənişləri</b><div className="text-xs text-muted-foreground">Məhsul, PVZ, paket və reklam əməliyyatları</div></div>
          <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-secondary"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50"><tr><th className="text-left p-3">Tarix</th><th className="text-left p-3">Xidmət</th><th className="text-left p-3">İstifadəçi</th><th className="text-right p-3">Məbləğ</th><th className="text-left p-3">Status</th><th className="text-left p-3">Transaction ID</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
              <td className="p-3 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
              <td className="p-3"><div className="font-semibold">{row.description}</div><div className="text-xs text-muted-foreground">{row.service_type}</div></td>
              <td className="p-3 font-mono text-xs">{row.user_id.slice(0, 8)}</td>
              <td className="p-3 text-right font-bold">{Number(row.amount).toFixed(2)} {row.currency}</td>
              <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[row.status] ?? "bg-secondary"}`}>{row.status}</span></td>
              <td className="p-3 font-mono text-xs">{row.provider_transaction_id ?? "—"}</td>
            </tr>)}</tbody>
          </table>
          {!loading && rows.length === 0 && <div className="p-10 text-center text-muted-foreground">Hələ ödəniş yoxdur.</div>}
        </div>
      </div>
    </div>
  );
}
