"use client";

type TooltipTick = {
  value?: number | string;
};

type SyncPayload = {
  activeLabel?: number | string;
  activeTooltipIndex?: number;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getFallbackIndex = (
  tooltipTicks: TooltipTick[],
  data?: SyncPayload
): number => {
  if (data && typeof data.activeTooltipIndex === "number") {
    return data.activeTooltipIndex;
  }
  return tooltipTicks.length > 0 ? 0 : -1;
};

const createNearestIncrementSyncMethod = (incrementHours: number) => {
  return (tooltipTicks: TooltipTick[] = [], data?: SyncPayload): number => {
    if (!tooltipTicks.length) {
      return getFallbackIndex(tooltipTicks, data);
    }

    const labelNumber = toNumber(data?.activeLabel);
    if (labelNumber === null) {
      return getFallbackIndex(tooltipTicks, data);
    }

    const quantized = Math.round(labelNumber / incrementHours) * incrementHours;
    let exactMatch = -1;
    let closestIndex = -1;
    let smallestDiff = Number.POSITIVE_INFINITY;

    tooltipTicks.forEach((tick, index) => {
      const tickValue = toNumber(tick?.value);
      if (tickValue === null) return;

      if (exactMatch === -1 && tickValue === quantized) {
        exactMatch = index;
      }

      const diff = Math.abs(tickValue - quantized);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = index;
      }
    });

    if (exactMatch !== -1) {
      return exactMatch;
    }

    return closestIndex !== -1
      ? closestIndex
      : getFallbackIndex(tooltipTicks, data);
  };
};

export const syncToNearestThirdHour = createNearestIncrementSyncMethod(3);
