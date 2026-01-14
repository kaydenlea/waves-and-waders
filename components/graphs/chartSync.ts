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

const createNearestIncrementSyncMethod = (
  incrementHours: number,
  offsetHours = 0
) => {
  let cachedTicks: TooltipTick[] | null = null;
  let cachedFirst: number | null = null;
  let cachedLast: number | null = null;
  let cachedLength = 0;

  const sync = (tooltipTicks: TooltipTick[] = [], data?: SyncPayload): number => {
    if (!tooltipTicks.length) {
      return getFallbackIndex(tooltipTicks, data);
    }

    if (cachedTicks !== tooltipTicks) {
      cachedTicks = tooltipTicks;
      cachedLength = tooltipTicks.length;
      cachedFirst = toNumber(tooltipTicks[0]?.value);
      cachedLast =
        cachedLength > 0
          ? toNumber(tooltipTicks[cachedLength - 1]?.value)
          : null;
    }

    const labelNumber = toNumber(data?.activeLabel);
    if (labelNumber === null) {
      return getFallbackIndex(tooltipTicks, data);
    }

    const quantized =
      Math.round((labelNumber - offsetHours) / incrementHours) *
      incrementHours;

    if (
      cachedLength > 0 &&
      cachedFirst !== null &&
      cachedLast !== null &&
      Number.isFinite(cachedFirst) &&
      Number.isFinite(cachedLast)
    ) {
      const rawIndex = Math.round((quantized - cachedFirst) / incrementHours);
      const clamped = Math.max(0, Math.min(rawIndex, cachedLength - 1));
      return clamped;
    }

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

  return sync;
};

export const syncToNearestThirdHour = createNearestIncrementSyncMethod(3);
export const syncToNearestThirdHourBarCenter = createNearestIncrementSyncMethod(
  3,
  1.5
);
