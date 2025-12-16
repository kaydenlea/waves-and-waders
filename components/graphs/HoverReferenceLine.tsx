"use client";

import React from "react";
import { ReferenceLine } from "recharts";
import { useHoveredHour } from "@/components/context/DateContext";

type HoverReferenceLineProps = {
  days?: Date[] | null;
  selectedDate: Date | null;
  selectedHour: number | null;
  alignmentOffset?: number;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
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

const HoverReferenceLine: React.FC<HoverReferenceLineProps> = ({
  days,
  selectedDate,
  selectedHour,
  alignmentOffset = 0,
  strokeWidth = 1,
  strokeOpacity: strokeOpacityProp,
  strokeDasharray = "5 5",
}) => {
  const hoveredHour = useHoveredHour();
  const selectedX = React.useMemo(
    () =>
      getSelectedHourPosition(
        days,
        selectedDate,
        selectedHour,
        alignmentOffset
      ),
    [days, selectedDate, selectedHour, alignmentOffset]
  );

  const hoverX =
    hoveredHour !== null ? hoveredHour + alignmentOffset : null;

  const strokeOpacity =
    typeof strokeOpacityProp === "number"
      ? strokeOpacityProp
      : hoverX !== null && (selectedX === null || hoverX !== selectedX)
        ? 0.75
        : 0;

  return (
    <ReferenceLine
      x={hoverX ?? 0}
      stroke="var(--foreground)"
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeDasharray={strokeDasharray}
    />
  );
};

export default React.memo(HoverReferenceLine);
