"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  leftPx: number | null;
  onScrub: (clientX: number, clientY: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  className?: string;
  stopPropagation?: boolean;
  triangleBasePx?: number;
  triangleHeightPx?: number;
  showTrack?: boolean;
  position?: "below" | "inside";
};

export default function ForecastTooltipHandle({
  enabled,
  leftPx,
  onScrub,
  onScrubStart,
  onScrubEnd,
  className,
  stopPropagation = false,
  triangleBasePx = 20,
  triangleHeightPx = 18,
  showTrack = true,
  position = "below",
}: Props) {
  const pointerIdRef = React.useRef<number | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const endDrag = React.useCallback(() => {
    pointerIdRef.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    onScrubEnd?.();
  }, [onScrubEnd]);

  if (!enabled || leftPx == null || !Number.isFinite(leftPx)) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-40",
        position === "inside" ? "bottom-0" : "top-full mt-0",
        className
      )}
      aria-hidden="true"
    >
      <div className="relative h-9 w-full">
        {showTrack ? (
          <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-foreground/15 shadow-inner" />
        ) : null}
        <button
          type="button"
          className={cn(
            "pointer-events-auto absolute top-1/2 -translate-y-1/2 rounded-full",
            "bg-transparent border border-transparent shadow-xl",
            "h-11 w-11 flex items-center justify-center",
            dragging ? "scale-110" : "scale-100",
            "transition-transform"
          )}
          style={{ left: leftPx, transform: "translate(-50%, -50%)" }}
          onPointerDown={(ev) => {
            if (stopPropagation) {
              ev.stopPropagation();
            }
            const node = ev.currentTarget as Element;
            node.setPointerCapture?.(ev.pointerId);
            pointerIdRef.current = ev.pointerId;
            setDragging(true);
            document.body.style.userSelect = "none";
            document.body.style.touchAction = "none";
            onScrubStart?.();
            onScrub(ev.clientX, ev.clientY);
          }}
          onPointerMove={(ev) => {
            if (pointerIdRef.current !== ev.pointerId) return;
            if (stopPropagation) {
              ev.stopPropagation();
            }
            onScrub(ev.clientX, ev.clientY);
          }}
          onPointerUp={(ev) => {
            if (pointerIdRef.current !== ev.pointerId) return;
            if (stopPropagation) {
              ev.stopPropagation();
            }
            const node = ev.currentTarget as Element;
            node.releasePointerCapture?.(ev.pointerId);
            endDrag();
          }}
          onPointerCancel={(ev) => {
            if (stopPropagation) {
              ev.stopPropagation();
            }
            endDrag();
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 0,
              height: 0,
              borderLeft: `${triangleBasePx / 2}px solid transparent`,
              borderRight: `${triangleBasePx / 2}px solid transparent`,
              borderTop: "0 solid transparent",
              borderBottom: `${triangleHeightPx}px solid var(--foreground)`,
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.22))",
            }}
          />
        </button>
      </div>
    </div>
  );
}
