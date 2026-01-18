"use client";

import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Hook to separate dragging from tooltip viewing on touch/mobile devices.
 *
 * On desktop (mouse), hovering shows tooltips and dragging pans the chart.
 * On touch devices, we need to differentiate:
 * - Quick tap (< threshold movement) = show tooltip at that position
 * - Drag (> threshold movement) = pan the chart, no tooltip
 *
 * This hook provides:
 * - `isTouchDevice`: whether we're on a touch-capable device
 * - `isDragging`: whether the user is actively dragging (moved beyond threshold)
 * - `tooltipEnabled`: whether tooltips should be shown (false during drag)
 * - `tapPosition`: the position of the last tap (for showing tooltip)
 * - Pointer event handlers that wrap the existing drag handlers
 */

const DRAG_THRESHOLD_PX = 10; // Movement beyond this = drag, not tap
const TAP_TIMEOUT_MS = 300; // Max time for a tap

export type TouchInteractionState = {
  isTouchDevice: boolean;
  isDragging: boolean;
  tooltipEnabled: boolean;
  tapX: number | null;
  tapY: number | null;
};

export type TouchInteractionHandlers = {
  onPointerDown: (ev: React.PointerEvent) => void;
  onPointerMove: (ev: React.PointerEvent) => void;
  onPointerUp: (ev: React.PointerEvent) => void;
  onPointerCancel: (ev: React.PointerEvent) => void;
  clearTap: () => void;
};

type OriginalHandlers = {
  onPointerDown?: (ev: React.PointerEvent) => void;
  onPointerMove?: (ev: React.PointerEvent) => void;
  onPointerUp?: (ev: React.PointerEvent) => void;
};

export function useTouchInteraction(
  originalHandlers: OriginalHandlers
): [TouchInteractionState, TouchInteractionHandlers] {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);
  const [tapPosition, setTapPosition] = useState<{
    x: number | null;
    y: number | null;
  }>({ x: null, y: null });

  // Track the pointer state
  const pointerState = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startTime: number;
    pointerId: number | null;
    pointerType: string;
    movedBeyondThreshold: boolean;
  } | null>(null);

  // Detect touch capability on mount
  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent) => {
      const isTouch = ev.pointerType === "touch" || ev.pointerType === "pen";

      pointerState.current = {
        isDown: true,
        startX: ev.clientX,
        startY: ev.clientY,
        startTime: Date.now(),
        pointerId: ev.pointerId,
        pointerType: ev.pointerType,
        movedBeyondThreshold: false,
      };

      if (isTouch) {
        // On touch, disable tooltips until we determine it's a tap
        setTooltipEnabled(false);
        setIsDragging(false);
        // Clear any previous tap position when starting a new interaction
        setTapPosition({ x: null, y: null });
      }

      // Call original handler
      originalHandlers.onPointerDown?.(ev);
    },
    [originalHandlers]
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent) => {
      const ps = pointerState.current;

      if (ps && ps.isDown) {
        const dx = ev.clientX - ps.startX;
        const dy = ev.clientY - ps.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > DRAG_THRESHOLD_PX && !ps.movedBeyondThreshold) {
          ps.movedBeyondThreshold = true;
          setIsDragging(true);
          // Keep tooltip disabled during drag
          setTooltipEnabled(false);
        }
      }

      // Call original handler
      originalHandlers.onPointerMove?.(ev);
    },
    [originalHandlers]
  );

  const onPointerUp = useCallback(
    (ev: React.PointerEvent) => {
      const ps = pointerState.current;

      if (ps && ps.isDown) {
        const isTouch =
          ps.pointerType === "touch" || ps.pointerType === "pen";
        const elapsed = Date.now() - ps.startTime;
        const wasTap =
          !ps.movedBeyondThreshold && elapsed < TAP_TIMEOUT_MS;

        if (isTouch && wasTap) {
          // It was a tap - enable tooltip and record position
          setTooltipEnabled(true);
          setTapPosition({ x: ev.clientX, y: ev.clientY });
        } else if (isTouch) {
          // It was a drag - keep tooltip disabled briefly, then re-enable
          // Re-enable tooltip after drag ends so next tap can show it
          setTooltipEnabled(true);
        }

        setIsDragging(false);
      }

      pointerState.current = null;

      // Call original handler
      originalHandlers.onPointerUp?.(ev);
    },
    [originalHandlers]
  );

  const onPointerCancel = useCallback(
    (ev: React.PointerEvent) => {
      pointerState.current = null;
      setIsDragging(false);
      setTooltipEnabled(true);

      // Call original handler (same as up)
      originalHandlers.onPointerUp?.(ev);
    },
    [originalHandlers]
  );

  const clearTap = useCallback(() => {
    setTapPosition({ x: null, y: null });
  }, []);

  return [
    {
      isTouchDevice,
      isDragging,
      tooltipEnabled,
      tapX: tapPosition.x,
      tapY: tapPosition.y,
    },
    {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      clearTap,
    },
  ];
}
