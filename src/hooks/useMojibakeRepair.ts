import { useEffect } from "react";
import { repairMojibakeIn } from "@/lib/mojibake";

export function useMojibakeRepair(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const repair = () => repairMojibakeIn(document.body);
    repair();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(repair);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt"],
    });

    return () => observer.disconnect();
  }, [enabled]);
}
