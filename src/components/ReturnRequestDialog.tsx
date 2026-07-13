import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Undo2, Upload, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderItemId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  productTitle: string;
  deliveredAt: string | null;
  pickupPointId: string | null;
  onDone?: () => void;
}

const REASONS: { label: string; cost: "seller" | "buyer" }[] = [
  { label: "Məhsul təsvirə uyğun deyil", cost: "seller" },
  { label: "Keyfiyyət problemi / qüsurlu", cost: "seller" },
  { label: "Yanlış məhsul gəldi", cost: "seller" },
  { label: "Ölçü / rəng uyğun deyil", cost: "buyer" },
  { label: "Fikrim dəyişdi", cost: "buyer" },
  { label: "Digər", cost: "buyer" },
];

export function ReturnRequestDialog({
  open, onOpenChange, orderItemId, orderId, buyerId, sellerId,
  productTitle, deliveredAt, pickupPointId, onDone,
}: Props) {
  const [reasonIdx, setReasonIdx] = useState(0);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const reason = REASONS[reasonIdx];

  const expired = (() => {
    if (!deliveredAt) return false;
    return Date.now() - new Date(deliveredAt).getTime() > 3 * 24 * 60 * 60 * 1000;
  })();

  const remainingHours = (() => {
    if (!deliveredAt) return null;
    const ms = 3 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deliveredAt).getTime());
    return ms <= 0 ? 0 : Math.ceil(ms / (60 * 60 * 1000));
  })();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const f of Array.from(files).slice(0, 5)) {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${buyerId}/${orderItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("return-images").upload(path, f, { upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("return-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 5));
    setUploading(false);
  };

  const submit = async () => {
    if (expired) { toast.error("Qaytarma müddəti bitib"); return; }
    if (description.trim().length < 5) { toast.error("Qaytarma səbəbini ətraflı izah edin"); return; }
    if (images.length < 1) { toast.error("Ən azı 1 şəkil yükləyin (sübut)"); return; }
    setBusy(true);
    const { error } = await supabase.from("returns").insert({
      order_id: orderId,
      order_item_id: orderItemId,
      buyer_id: buyerId,
      seller_id: sellerId,
      reason: reason.label,
      description: description.trim(),
      buyer_explanation: description.trim(),
      images,
      pickup_point_id: pickupPointId,
      cost_paid_by: reason.cost,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("İstək göndərildi. Satıcı təsdiqlədikdən sonra QR kodunuz aktivləşəcək.");
    onDone?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" /> Qaytarma istəyi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm font-semibold">{productTitle}</div>

          <div className="text-[11px] bg-primary/5 border border-primary/20 rounded p-2 space-y-0.5">
            <div className="font-bold text-primary">📋 Qaytarma prosesi:</div>
            <div>1. İstək göndərirsiniz → 2. Satıcı təsdiqləyir → 3. QR kod sizə gəlir → 4. PVZ-ə aparıb skan etdirin → 5. Satıcı qəbul edir → pul qaytarılır.</div>
          </div>

          {expired ? (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              ⛔ Qaytarma müddəti bitib (3 gün keçib).
            </div>
          ) : (
            <div className="text-xs bg-warning/10 border border-warning/30 rounded-lg p-2">
              ⏳ Qaytarmaq üçün qalıb: <b>{remainingHours} saat</b>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Səbəb</label>
            <select value={reasonIdx} onChange={(e) => setReasonIdx(Number(e.target.value))}
              className="w-full h-10 px-3 mt-1 rounded-lg border border-input bg-background">
              {REASONS.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
            </select>
            <div className={`text-[11px] mt-1 px-2 py-1 rounded ${reason.cost === "seller" ? "bg-primary/10 text-primary" : "bg-warning/10"}`}>
              {reason.cost === "seller"
                ? "💰 Qaytarma xərci satıcının üzərinə düşür"
                : "💰 Qaytarma xərcini müştəri ödəyir"}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Sizin izahınız *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4} maxLength={500}
              placeholder="Problemi öz sözlərinizlə ətraflı izah edin..."
              className="w-full p-2 text-sm mt-1 rounded-lg border border-input bg-background resize-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Şəkillər * (min 1, maks 5)</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {images.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => void onFiles(e.target.files)} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </label>
              )}
            </div>
            {uploading && <div className="text-xs text-muted-foreground mt-1">Yüklənir...</div>}
          </div>

          {!pickupPointId && (
            <div className="text-xs bg-destructive/10 text-destructive p-2 rounded">
              ⚠️ PVZ təyin olunmayıb. Qaytarma üçün PVZ lazımdır.
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
            <Button onClick={submit} disabled={busy || expired || uploading || !pickupPointId}>
              {busy ? "..." : "İstək göndər"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
