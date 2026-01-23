"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseTouchInteractionProps {
  /** Reference to the chart container element (used for coordinate calculations) */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Callback for horizontal panning (delta pixels) */
  onPan?: (deltaX: number) => void;
  /** Callback when inspecting/hovering (touch move in inspect mode) */
  onInspect?: (chartX: number, clientX: number, clientY: number) => void;
  /** Callback when inspection ends */
  onInspectEnd?: () => void;
  /** Callback when panning ends */
  onPanEnd?: () => void;
  /** Callback when interaction starts (pointer down) */
  onInteractionStart?: () => void;
  /** Callback for a tap interaction */
  onTap?: (chartX: number, clientX: number, clientY: number) => void;
  /** Whether the current device is touch-only */
  isTouchDevice?: boolean;
}

type InteractionState = "IDLE" | "PANNING" | "INSPECTING" | "SCROLLING";

const DRAG_THRESHOLD_PX = 14;

/**
 * A robust hook for handling touch interactions on charts:
 * - Distinguishes between vertical scroll (page) and horizontal pan (chart).
 * - Implements "Immediate Touch Inspection": Tooltip shows on touch, hides on release/drag.
 *
 * MUST BE PAIRED WITH `touch-action: pan-y` ON THE CONTAINER CSS!
 */
export function useTouchInteraction({
  containerRef,
  onPan,
  onPanEnd,
  onInteractionStart,
  onInspect,
  onInspectEnd,
  onTap,
}: UseTouchInteractionProps) {
  const stateRef = useRef<InteractionState>("IDLE");
  const startRef = useRef({ x: 0, y: 0 });
  const lastRef = useRef({ x: 0, y: 0 });

  const getChartX = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientX - rect.left;
  };

  const onPointerDown = useCallback(
    (ev: React.PointerEvent) => {
      // Allow mouse users to interact normally (or handle separately)
      if (ev.pointerType === "mouse") {
        stateRef.current = "PANNING";
        containerRef.current?.setPointerCapture(ev.pointerId);
        startRef.current = { x: ev.clientX, y: ev.clientY };
        lastRef.current = { x: ev.clientX, y: ev.clientY };
        return;
      }

      // Clear any previous inspection state first
      onInteractionStart?.();

      // Initialize state for touch - Start inspecting IMMEDIATELY
      stateRef.current = "INSPECTING"; 
      startRef.current = { x: ev.clientX, y: ev.clientY };
      lastRef.current = { x: ev.clientX, y: ev.clientY };
      
      // Trigger inspection immediately - the key-based remount will handle state
      const chartX = getChartX(ev.clientX);
      onInspect?.(chartX, ev.clientX, ev.clientY);

      containerRef.current?.setPointerCapture(ev.pointerId);
    },
    [onInspect, containerRef, onInteractionStart]
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent) => {
      const clientX = ev.clientX;
      const clientY = ev.clientY;
      const dx = clientX - lastRef.current.x;

      lastRef.current = { x: clientX, y: clientY };
      
      if (stateRef.current === "SCROLLING") {
        return; 
      }

      if (stateRef.current === "PANNING") {
        if (ev.cancelable) ev.preventDefault();
        onPan?.(dx); 
        return;
      }

      if (stateRef.current === "INSPECTING") {
        const totalDx = clientX - startRef.current.x;
        const totalDy = clientY - startRef.current.y;
        const absDx = Math.abs(totalDx);
        const absDy = Math.abs(totalDy);

        if (Math.hypot(absDx, absDy) > DRAG_THRESHOLD_PX) {
           // Decide to switch out of inspection
           onInspectEnd?.(); // Hide tooltip before switching

           if (absDy > absDx * 1.5) {
               stateRef.current = "SCROLLING";
               containerRef.current?.releasePointerCapture(ev.pointerId);
           } else {
               stateRef.current = "PANNING";
               // Apply the accumulated delta
               onPan?.(totalDx); 
           }
        } else {
             // Still within threshold, update inspection
             if (ev.cancelable) ev.preventDefault();
             const chartX = getChartX(clientX);
             onInspect?.(chartX, clientX, clientY);
        }
      }
    },
    [onPan, onInspect, onInspectEnd, containerRef]
  );

  const onPointerUp = useCallback(
    (ev: React.PointerEvent) => {
      containerRef.current?.releasePointerCapture(ev.pointerId);

      if (stateRef.current === "INSPECTING") {
          onInspectEnd?.();
      } else if (stateRef.current === "PANNING") {
          onPanEnd?.();
      }

      stateRef.current = "IDLE";
    },
    [onInspectEnd, onPanEnd, containerRef]
  );
  
  const onPointerCancel = useCallback((ev: React.PointerEvent) => {
      containerRef.current?.releasePointerCapture(ev.pointerId);
      if (stateRef.current === "INSPECTING") onInspectEnd?.();
      if (stateRef.current === "PANNING") onPanEnd?.();
      stateRef.current = "IDLE";
  }, [onInspectEnd, onPanEnd, containerRef]);

  // No timer needed anymore
  // useEffect(() => () => clearTimer(), []);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel
    },
    // Styles to apply to the container
    styles: {
      touchAction: "pan-y",
      userSelect: "none",
      WebkitUserSelect: "none",
    } as React.CSSProperties
  };
}

