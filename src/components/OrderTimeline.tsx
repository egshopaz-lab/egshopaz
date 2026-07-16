import { Check, Clock, Package, Truck, PackageCheck, X } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Sifariş qəbul edildi", icon: Clock },
  { key: "preparing", label: "Hazırlanır", icon: Package },
  { key: "handed_to_courier", label: "Kuryerə təhvil", icon: Truck },
  { key: "in_transit", label: "Çatdırılır", icon: Truck },
  { key: "delivered", label: "Təhvil verildi", icon: PackageCheck },
  { key: "completed", label: "Tamamlandı", icon: Check },
] as const;

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-bold">
        <X className="h-4 w-4" /> Sifariş ləğv edildi
      </div>
    );
  }
  if (status === "returned" || status === "disputed") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 text-warning rounded-lg text-sm font-bold">
        <X className="h-4 w-4" />{" "}
        {status === "returned" ? "Sifariş geri qaytarıldı" : "Sifariş üzrə mübahisə açıldı"}
      </div>
    );
  }
  const normalizedStatus =
    status === "paid"
      ? "pending"
      : status === "packed"
        ? "preparing"
        : status === "shipped"
          ? "handed_to_courier"
          : status;
  const idx = STEPS.findIndex((s) => s.key === normalizedStatus);
  const activeIdx = idx === -1 ? 0 : idx;

  return (
    <div className="flex items-center justify-between gap-1 py-3">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i <= activeIdx;
        const current = i === activeIdx;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div
                className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= activeIdx ? "bg-success" : "bg-border"}`}
              />
            )}
            <div
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 transition
              ${done ? "bg-success text-success-foreground border-success" : "bg-card text-muted-foreground border-border"}
              ${current ? "ring-4 ring-success/20" : ""}`}
            >
              {done && !current ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div
              className={`mt-1.5 text-[10px] md:text-xs font-semibold text-center leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
