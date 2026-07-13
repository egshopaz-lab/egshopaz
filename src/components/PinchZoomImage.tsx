import { useRef, useState, useEffect } from "react";

interface Props {
  src: string;
  alt?: string;
  onSwipe?: (dir: 1 | -1) => void;
  onClose?: () => void;
  maxScale?: number;
}

// Pinch-to-zoom (up to 200%), drag-to-pan, swipe to change image when not zoomed.
export function PinchZoomImage({ src, alt, onSwipe, onClose, maxScale = 2 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const state = useRef({
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startX: 0,
    startY: 0,
    panning: false,
    pinching: false,
    moved: false,
  });

  useEffect(() => { setScale(1); setTx(0); setTy(0); }, [src]);

  const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    state.current.moved = false;
    if (e.touches.length === 2) {
      state.current.pinching = true;
      state.current.panning = false;
      state.current.startDist = dist(e.touches[0], e.touches[1]);
      state.current.startScale = scale;
    } else if (e.touches.length === 1) {
      state.current.pinching = false;
      state.current.panning = true;
      state.current.startX = e.touches[0].clientX;
      state.current.startY = e.touches[0].clientY;
      state.current.startTx = tx;
      state.current.startTy = ty;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (state.current.pinching && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const ratio = d / (state.current.startDist || 1);
      const next = Math.max(1, Math.min(maxScale, state.current.startScale * ratio));
      setScale(next);
      if (next === 1) { setTx(0); setTy(0); }
      state.current.moved = true;
    } else if (state.current.panning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - state.current.startX;
      const dy = e.touches[0].clientY - state.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.current.moved = true;
      if (scale > 1) {
        setTx(state.current.startTx + dx);
        setTy(state.current.startTy + dy);
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const wasPinching = state.current.pinching;
    if (state.current.panning && scale === 1 && !wasPinching && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - state.current.startX;
      const dy = e.changedTouches[0].clientY - state.current.startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        onSwipe?.(dx < 0 ? 1 : -1);
      } else if (!state.current.moved) {
        onClose?.();
      }
    }
    state.current.pinching = false;
    state.current.panning = false;
  };

  return (
    <div
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={() => {
        if (scale > 1) { setScale(1); setTx(0); setTy(0); } else { setScale(maxScale); }
      }}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: state.current.pinching || state.current.panning ? "none" : "transform 0.2s",
        }}
        className="max-w-full max-h-[92vh] object-contain origin-center will-change-transform"
      />
    </div>
  );
}
