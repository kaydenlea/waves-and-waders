"use client";

import React from "react";
import { ReferenceLine } from "recharts";
import { useHoveredHour } from "@/components/context/DateContext";

type HoverReferenceLineProps = {
  days?: Date[] | null;
  selectedDate: Date | null;
  selectedHour: number | null;
};

function getSelectedHourPosition(
  days?: Date[] | null,
  selectedDate?: Date | null,
  selectedHour?: number | null
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
    return dayDelta * 24 + selectedHour;
  } catch {
    return null;
  }
}

const HoverReferenceLine: React.FC<HoverReferenceLineProps> = ({
  days,
  selectedDate,
  selectedHour,
}) => {
  const hoveredHour = useHoveredHour();
  const selectedX = React.useMemo(
    () => getSelectedHourPosition(days, selectedDate, selectedHour),
    [days, selectedDate, selectedHour]
  );

  const strokeOpacity =
    hoveredHour !== null &&
    (selectedX === null || hoveredHour !== selectedX)
      ? 0.5
      : 0;

  return (
    <ReferenceLine
      x={hoveredHour ?? 0}
      stroke="var(--foreground)"
      strokeWidth={1}
      strokeOpacity={strokeOpacity}
      strokeDasharray="5 5"
    />
  );
};

export default React.memo(HoverReferenceLine);
