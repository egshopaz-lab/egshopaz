import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function LiveClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/80 border border-border shrink-0">
        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="min-w-0 leading-tight text-right">
          <div className="font-mono font-bold text-xs tabular-nums">--:--</div>
          <div className="text-[9px] text-muted-foreground">-- ---</div>
        </div>
      </div>
    );
  }

  const time = now.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: compact ? undefined : "2-digit", hour12: false });
  const date = now.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/80 border border-border shrink-0">
      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="min-w-0 leading-tight text-right">
        <div className="font-mono font-bold text-xs tabular-nums">{time}</div>
        <div className="text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">{date}</div>
      </div>
    </div>
  );
}
