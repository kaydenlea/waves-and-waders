"use client";

import React from "react";
import { useHoveredHour } from "@/components/context/DateContext";

type HoverOverlayLineProps = {
  domainMin: number;
  domainMax: number;
  plotLeftPx: number;
  plotWidthPx: number;
  alignmentOffset?: number;
  bottomInsetPx?: number;
  endInsetPx?: number;
  days?: Date[] | null;
  selectedDate?: Date | null;
  selectedHour?: number | null;
  strokeOpacity?: number;
  zIndex?: number;
};

function getSelectedHourPosition(
  days?: Date[] | null,
  selectedDate?: Date | null,
  selectedHour?: number | null,
  offset: number = 0
): number | null {
  if (!days || days.length === 0 || !selectedDate || selectedHour == null) {
    return null;
  }

  try {
    const base = days[0];
    const baseMid = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate()
    ).getTime();
    const selMid = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ).getTime();
    const dayDelta = Math.floor((selMid - baseMid) / (24 * 3600 * 1000));
    return dayDelta * 24 + selectedHour + offset;
  } catch {
    return null;
  }
}

const HoverOverlayLine: React.FC<HoverOverlayLineProps> = ({
  domainMin,
  domainMax,
  plotLeftPx,
  plotWidthPx,
  alignmentOffset = 0,
  bottomInsetPx = 0,
  endInsetPx = 0,
  days,
  selectedDate,
  selectedHour,
  strokeOpacity = 0.75,
  zIndex = 4,
}) => {
  const hoveredHour = useHoveredHour();
  const hoverX = hoveredHour !== null ? hoveredHour + alignmentOffset : null;
  const selectedX = React.useMemo(
    () => getSelectedHourPosition(days, selectedDate, selectedHour, alignmentOffset),
    [days, selectedDate, selectedHour, alignmentOffset]
  );

  if (hoverX === null) return null;
  if (selectedX !== null && Math.abs(hoverX - selectedX) < 1e-6) return null;

  const domainSpan = domainMax - domainMin;
  if (!Number.isFinite(domainSpan) || domainSpan === 0) return null;

  const t = (hoverX - domainMin) / domainSpan;
  if (!Number.isFinite(t)) return null;

  const rawX = plotLeftPx + plotWidthPx * t;
  if (!Number.isFinite(rawX)) return null;

  const plotRightPx = plotLeftPx + plotWidthPx;
  let clampedX = Math.max(
    plotLeftPx,
    Math.min(plotRightPx, rawX)
  );

  if (endInsetPx > 0 && clampedX >= plotRightPx - 0.5) {
    clampedX = Math.max(plotLeftPx, plotRightPx - endInsetPx);
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        bottom: bottomInsetPx,
        left: clampedX,
        borderLeft: "1px dashed var(--foreground)",
        opacity: strokeOpacity,
        pointerEvents: "none",
        zIndex,
      }}
    />
  );
};

export default React.memo(HoverOverlayLine);
