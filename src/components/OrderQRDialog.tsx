import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pickupCode: string;
  title: string;
  subtitle?: string;
  pvzName?: string | null;
  pvzAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  orderDate?: string | null;
  mode?: "buyer" | "seller";
}

export function OrderQRDialog({ open, onOpenChange, pickupCode, title, subtitle, pvzName, pvzAddress, customerName, customerPhone, orderDate, mode = "buyer" }: Props) {
  const [qr, setQr] = useState("");
  const orderDateStr = orderDate ? formatDateTime(orderDate) : null;

  useEffect(() => {
    if (!open || !pickupCode) return;
    QRCode.toDataURL(pickupCode, { width: 360, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQr).catch(() => {});
  }, [open, pickupCode]);

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr; a.download = `qr-${pickupCode}.png`; a.click();
  };

  const print = () => {
    if (!qr) return;
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${pickupCode}</title>
      <style>@page{size:80mm 100mm;margin:4mm}body{font-family:system-ui;text-align:center;padding:8px}
      h2{margin:4px 0;font-size:14px}.code{font-family:monospace;font-size:22px;font-weight:800;letter-spacing:2px;margin:6px 0}
      img{width:280px;height:280px}.sub{font-size:11px;color:#555;margin:4px 0}
      .pvz{margin-top:8px;padding-top:6px;border-top:1px dashed #999;font-size:11px}
      .cust{margin-top:6px;padding:6px;border:1px solid #000;border-radius:4px;font-size:12px;text-align:left}
      .cust b{display:block;font-size:13px;margin-bottom:2px}</style>
      </head><body>
      <h2>${title}</h2>
      ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
      ${orderDateStr ? `<div class="sub">📅 Sifariş: ${orderDateStr}</div>` : ""}
      <img src="${qr}"/>
      <div class="code">${pickupCode}</div>
      ${(customerName || customerPhone) ? `<div class="cust"><b>👤 Müştəri</b>${customerName ? customerName : ""}${customerPhone ? `<br/>📞 ${customerPhone}` : ""}</div>` : ""}
      ${pvzName ? `<div class="pvz"><b>PVZ:</b> ${pvzName}<br/>${pvzAddress ?? ""}</div>` : ""}
      </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" /> {mode === "seller" ? "Paketləmə QR" : "Təhvil QR kodu"}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3">
          <div className="text-sm font-semibold line-clamp-2">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          {orderDateStr && <div className="text-xs font-semibold text-primary">📅 Sifariş tarixi: {orderDateStr}</div>}
          <div className="bg-white rounded-xl p-3 inline-block border">
            {qr ? <img src={qr} alt="QR" className="w-56 h-56" /> : <div className="w-56 h-56 bg-muted animate-pulse rounded" />}
          </div>
          <div className="font-mono text-xl font-extrabold tracking-widest text-primary">{pickupCode}</div>
          {(customerName || customerPhone) && (
            <div className="text-xs bg-primary/5 border border-primary/30 rounded-lg p-2 text-left">
              <div className="font-bold text-foreground mb-0.5">👤 {customerName ?? "—"}</div>
              {customerPhone && <div className="text-muted-foreground">📞 {customerPhone}</div>}
            </div>
          )}
          {pvzName && (
            <div className="text-xs bg-secondary/60 rounded-lg p-2 text-left">
              <div className="font-bold text-foreground mb-0.5">📍 {pvzName}</div>
              <div className="text-muted-foreground">{pvzAddress}</div>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            {mode === "seller"
              ? "Bu QR-ı paketin üzərinə yapışdırın. PVZ qəbul zamanı skan edəcək."
              : "Bu QR kodu PVZ-də göstərin və ya işçiyə verilən kodu deyin."}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={download}>
              <Download className="h-4 w-4 mr-1" /> Yüklə
            </Button>
            <Button className="flex-1" onClick={print}>
              <Printer className="h-4 w-4 mr-1" /> Çap et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
