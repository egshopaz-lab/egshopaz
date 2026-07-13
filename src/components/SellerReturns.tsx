import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Undo2, Eye, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import { toast } from "sonner";

interface ReturnRow {
  id: string;
  pickup_code: string | null;
  reason: string;
  description: string | null;
  buyer_explanation: string | null;
  rejection_reason: string | null;
  status: string;
  cost_paid_by: string;
  images: string[];
  pvz_received_at: string | null;
  seller_approved_at: string | null;
  shipped_to_seller_at: string | null;
  seller_received_at: string | null;
  created_at: string;
  buyer_id: string;
  order_id: string;
  order_item_id: string;
  order_items: {
    title: string;
    orders: { recipient_name: string | null; recipient_phone: string | null } | null;
  } | null;
}

const STAGES = [
  "İstək gəldi",
  "Siz təsdiqlədiniz",
  "PVZ qəbul etdi",
  "Sizə göndərildi",
  "Tamamlandı",
];

function stageOf(r: ReturnRow): number {
  if (r.status === "completed") return 4;
  if (r.shipped_to_seller_at) return 3;
  if (r.pvz_received_at) return 2;
  if (r.seller_approved_at) return 1;
  return 0;
}

function Stepper({ stage, rejected }: { stage: number; rejected?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => (
        <div key={s} className="flex-1">
          <div
            className={`h-1.5 rounded-full ${i <= stage && !rejected ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`text-[9px] mt-1 text-center ${i <= stage && !rejected ? "text-primary font-semibold" : "text-muted-foreground"}`}
          >
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SellerReturns({ sellerId }: { sellerId: string }) {
  const [list, setList] = useState<ReturnRow[]>([]);
  const [view, setView] = useState<ReturnRow | null>(null);
  const [rejectFor, setRejectFor] = useState<ReturnRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("returns")
      .select(
        "id,pickup_code,reason,description,buyer_explanation,rejection_reason,status,cost_paid_by,images,pvz_received_at,seller_approved_at,shipped_to_seller_at,seller_received_at,created_at,buyer_id,order_id,order_item_id",
      )
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(`Qaytarmalar yüklənmədi: ${error.message}`);
      return;
    }

    const rows = (data ?? []) as unknown as Omit<ReturnRow, "order_items">[];
    const itemIds = [...new Set(rows.map((r) => r.order_item_id))];
    const orderIds = [...new Set(rows.map((r) => r.order_id))];
    const [{ data: itemRows, error: itemsError }, { data: orderRows, error: ordersError }] =
      await Promise.all([
        itemIds.length
          ? supabase.from("order_items").select("id,title").in("id", itemIds)
          : Promise.resolve({ data: [], error: null }),
        orderIds.length
          ? supabase.from("orders").select("id,recipient_name,recipient_phone").in("id", orderIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
    const firstError = itemsError ?? ordersError;
    if (firstError) {
      toast.error(`Qaytarma detalları yüklənmədi: ${firstError.message}`);
      return;
    }

    const itemMap = new Map((itemRows ?? []).map((i) => [i.id, i]));
    const orderMap = new Map((orderRows ?? []).map((o) => [o.id, o]));
    setList(
      rows.map((r) => ({
        ...r,
        order_items: {
          title: itemMap.get(r.order_item_id)?.title ?? "—",
          orders: orderMap.get(r.order_id) ?? null,
        },
      })) as ReturnRow[],
    );
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`seller-returns-${sellerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "returns", filter: `seller_id=eq.${sellerId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sellerId]);

  const approve = async (r: ReturnRow) => {
    const { error } = await supabase
      .from("returns")
      .update({
        status: "approved",
        seller_approved_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Təsdiqləndi. Müştəriyə QR kod göndərildi.");
    setView(null);
    void load();
  };

  const reject = async (r: ReturnRow, reason: string) => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast.error("Rədd etmə səbəbini yazın (ən azı 3 simvol)");
      return;
    }
    const { error } = await supabase
      .from("returns")
      .update({
        status: "rejected",
        rejection_reason: trimmed,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rədd edildi və müştəriyə bildirildi");
    setRejectFor(null);
    setRejectReason("");
    setView(null);
    void load();
  };

  const complete = async (r: ReturnRow) => {
    const { error } = await supabase
      .from("returns")
      .update({
        status: "completed",
        seller_received_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Qaytarma tamamlandı. Pul/bonus müştəriyə qaytarılır.");
    setView(null);
    void load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold flex items-center gap-2">
        <Undo2 className="h-6 w-6 text-primary" /> Qaytarmalar ({list.length})
      </h1>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs space-y-1">
        <div className="font-bold text-primary">📋 Sizin addımlarınız:</div>
        <div>
          1️⃣ Müştərinin istəyini yoxlayın → <b>Təsdiqlə</b> və ya <b>Rədd et</b>.
        </div>
        <div>2️⃣ Təsdiqdən sonra müştəriyə QR avtomatik göndərilir, PVZ-ə bildiriş gedir.</div>
        <div>3️⃣ Müştəri PVZ-ə aparır → PVZ qəbul edir → kuryer ilə sizə göndərir.</div>
        <div>
          4️⃣ Məhsul sizə çatanda → <b>"Məhsul gəldi — tamamla"</b> düyməsinə basın. Pul/bonus
          müştəriyə qaytarılır.
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 overflow-x-auto">
        {list.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Qaytarma yoxdur</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Müştəri</TableHead>
                <TableHead>Məhsul</TableHead>
                <TableHead>Səbəb</TableHead>
                <TableHead>Xərc</TableHead>
                <TableHead className="min-w-[260px]">Vəziyyət</TableHead>
                <TableHead>Bax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.pickup_code}</TableCell>
                  <TableCell className="text-xs">
                    {r.order_items?.orders?.recipient_name ?? "—"}
                    <div className="text-[10px] text-muted-foreground">
                      {r.order_items?.orders?.recipient_phone ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{r.order_items?.title ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.reason}</TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${r.cost_paid_by === "seller" ? "bg-destructive/10 text-destructive" : "bg-warning/20"}`}
                    >
                      {r.cost_paid_by === "seller" ? "Sizin" : "Müştəri"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Stepper stage={stageOf(r)} rejected={r.status === "rejected"} />
                    {r.status === "rejected" && (
                      <div className="text-[10px] text-destructive font-semibold mt-1 text-center">
                        ❌ Rədd edildi{r.rejection_reason ? ` — ${r.rejection_reason}` : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => setView(r)} title="Bax">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approve(r)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Təsdiqlə
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectFor(r);
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Rədd et
                          </Button>
                        </>
                      )}
                      {r.shipped_to_seller_at && r.status !== "completed" && (
                        <Button size="sm" variant="secondary" onClick={() => complete(r)}>
                          <PackageCheck className="h-4 w-4 mr-1" /> Tamamla
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Qaytarma — {view?.pickup_code}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <Stepper stage={stageOf(view)} rejected={view.status === "rejected"} />
              <div>
                <div className="text-xs text-muted-foreground">Məhsul</div>
                <div className="font-semibold">{view.order_items?.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Müştəri</div>
                  <div>{view.order_items?.orders?.recipient_name ?? "—"}</div>
                  <div className="text-xs">{view.order_items?.orders?.recipient_phone ?? ""}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Xərc kim</div>
                  <div
                    className={
                      view.cost_paid_by === "seller"
                        ? "text-destructive font-semibold"
                        : "font-semibold"
                    }
                  >
                    {view.cost_paid_by === "seller" ? "Siz ödəyirsiniz" : "Müştəri ödəyir"}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Səbəb</div>
                <div>{view.reason}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Müştərinin izahı</div>
                <div className="bg-secondary/40 p-2 rounded text-xs">
                  {view.buyer_explanation || view.description || "—"}
                </div>
              </div>
              {view.images.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Şəkillər ({view.images.length})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {view.images.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded overflow-hidden border"
                      >
                        <img src={u} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {view.rejection_reason && (
                <div>
                  <div className="text-xs text-muted-foreground">Rədd səbəbi</div>
                  <div className="bg-destructive/10 text-destructive p-2 rounded text-xs">
                    {view.rejection_reason}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2 flex-wrap">
                {view.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectFor(view);
                        setRejectReason("");
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Rədd et
                    </Button>
                    <Button onClick={() => approve(view)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Təsdiqlə (QR-ı müştəriyə göndər)
                    </Button>
                  </>
                )}
                {view.status === "approved" && !view.pvz_received_at && (
                  <div className="text-xs text-muted-foreground">
                    Müştəri PVZ-ə gələnə qədər gözləyirik...
                  </div>
                )}
                {view.shipped_to_seller_at && view.status !== "completed" && (
                  <Button onClick={() => complete(view)}>
                    <PackageCheck className="h-4 w-4 mr-1" /> Məhsul gəldi — tamamla
                  </Button>
                )}
                {view.status === "approved" &&
                  view.pvz_received_at &&
                  !view.shipped_to_seller_at && (
                    <div className="text-xs text-muted-foreground">
                      PVZ paketi sizə göndərənə qədər gözləyirik...
                    </div>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectFor}
        onOpenChange={(v) => {
          if (!v) {
            setRejectFor(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Qaytarmanı rədd et</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="text-muted-foreground text-xs">
              Səbəbi yazın — müştəriyə bildiriş şəklində göndəriləcək.
            </div>
            <Textarea
              placeholder="Məs: Məhsul istifadə edilib, geri qəbul mümkün deyil..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectFor(null);
                  setRejectReason("");
                }}
              >
                İmtina
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectFor && reject(rejectFor, rejectReason)}
              >
                <XCircle className="h-4 w-4 mr-1" /> Rədd et və göndər
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
