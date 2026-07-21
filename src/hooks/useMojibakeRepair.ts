import { useEffect } from "react";
import { repairMojibakeIn } from "@/lib/mojibake";

export function useMojibakeRepair(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const roots = new Set<ParentNode>();
    let frame = 0;

    const observe = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label", "alt"],
      });
    };

    const addRoot = (node: Node | null) => {
      if (!node) return;
      if (node instanceof Element) roots.add(node);
      else if (node.parentElement) roots.add(node.parentElement);
      if (roots.size > 40) {
        roots.clear();
        roots.add(document.body);
      }
    };

    const flush = () => {
      frame = 0;
      if (!roots.size) return;
      const targets = Array.from(roots);
      roots.clear();

      // Avoid reacting to our own text/attribute repairs.
      observer.disconnect();
      for (const target of targets) repairMojibakeIn(target);
      observe();
    };

    const schedule = (node: Node | null) => {
      addRoot(node);
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(schedule);
          continue;
        }
        schedule(mutation.target);
      }
    });

    // React may hydrate nested boundaries after the parent effect runs. Delay
    // DOM text repair so it cannot mutate server markup during hydration.
    const startTimer = window.setTimeout(() => {
      repairMojibakeIn(document.body);
      observe();
    }, 800);

    return () => {
      window.clearTimeout(startTimer);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);
}

