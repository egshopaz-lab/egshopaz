import { useCallback, useEffect, useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Delivery {
  id: string;
  status: string;
  confirmation_status: string;
  confirmation_deadline: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  tracking_number: string | null;
  external_courier_companies?: { name: string } | null;
}

export function CustomerDeliveryConfirmation({
  orderItemId,
  onChanged,
}: {
  orderItemId: string;
  onChanged: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await db
      .from("deliveries")
      .select(
        "id,status,confirmation_status,confirmation_deadline,courier_name,courier_phone,tracking_number,external_courier_companies(name)",
      )
      .eq("order_item_id", orderItemId)
      .maybeSingle();
    setDelivery((data ?? null) as Delivery | null);
  }, [db, orderItemId]);
  useEffect(() => {
    void load();
  }, [load]);

  const answer = async (received: boolean) => {
    const note = received ? null : prompt("Sifarişi niyə təhvil almadığınızı qısa yazın:");
    if (!received && note === null) return;
    setBusy(true);
    const { error } = await db.rpc("customer_confirm_delivery", {
      _delivery_id: delivery?.id,
      _received: received,
      _note: note,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      received ? "Təhvil təsdiqləndi. Sifariş tamamlandı." : "Müraciət mübahisəyə göndərildi.",
    );
    await load();
    onChanged();
  };

  if (!delivery) return null;
  if (delivery.status === "delivered" && delivery.confirmation_status === "pending")
    return (
      <div className="mt-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
        <div className="font-extrabold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" /> Sifarişinizi təhvil almısınız?
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {delivery.external_courier_companies?.name ?? "Kənar kuryer"}
          {delivery.tracking_number ? ` · ${delivery.tracking_number}` : ""}
        </div>
        {delivery.confirmation_deadline && (
          <div className="text-xs mt-1">
            Cavab müddəti: {new Date(delivery.confirmation_deadline).toLocaleString("az-AZ")}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button
            disabled={busy}
            onClick={() => void answer(true)}
            className="px-4 py-2 rounded-lg bg-success text-white font-bold text-sm inline-flex gap-1"
          >
            <Check className="h-4 w-4" /> Bəli
          </button>
          <button
            disabled={busy}
            onClick={() => void answer(false)}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm inline-flex gap-1"
          >
            <X className="h-4 w-4" /> Xeyr
          </button>
        </div>
      </div>
    );
  if (delivery.status === "completed")
    return (
      <div className="mt-2 text-xs font-bold text-success">
        ✓ Çatdırılma təsdiqlənib və sifariş tamamlanıb
      </div>
    );
  if (delivery.status === "disputed")
    return (
      <div className="mt-2 text-xs font-bold text-destructive">
        ! Çatdırılma üzrə mübahisə araşdırılır
      </div>
    );
  return null;
}
