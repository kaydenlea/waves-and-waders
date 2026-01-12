"use client";

// Compute a "nice" linear set of ticks with consistent spacing.
// `targetCount` is treated as exact: the returned tick array will have exactly
// `targetCount` values (unless `targetCount < 2`, in which case it falls back to 2).
export function buildYAxisTicks(
  values: number[],
  minValue = 0,
  targetCount = 6,
  paddingRatio = 0.2,
  minMax?: number
): number[] {
  const desiredCount = Math.max(2, Math.floor(targetCount));
  const finiteValues = values.filter(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  const maxRaw = Math.max(
    minValue,
    finiteValues.length ? Math.max(...finiteValues) : minValue
  );
  const spanRaw = Math.max(1e-6, maxRaw - minValue);
  const paddedCandidate = maxRaw + Math.max(spanRaw * paddingRatio, 0.01);
  const paddedMax = Math.max(minMax ?? minValue, paddedCandidate);

  const span = Math.max(1e-6, paddedMax - minValue);
  const desiredSteps = desiredCount - 1;
  const rawStep = span / Math.max(1, desiredSteps);

  const niceStep = chooseNiceStep(rawStep);
  const start = Math.floor(minValue / niceStep) * niceStep;

  const ticks: number[] = Array.from({ length: desiredCount }, (_, i) =>
    roundForDisplay(start + i * niceStep, niceStep)
  );

  // Fallback if something went wrong
  if (ticks.length < 2) {
    return [0, 1];
  }

  return ticks;
}

// Build a fixed-count tick list by linearly interpolating between min/max.
// Useful when you want exactly N ticks without "nice step" expansion.
export function buildLinearYAxisTicks(
  minValue: number,
  maxValue: number,
  targetCount = 4,
  wholeNumbers = false
): number[] {
  const desiredCount = Math.max(2, Math.floor(targetCount));
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return [0, 1];

  const safeMax =
    maxValue > minValue ? maxValue : minValue + (desiredCount - 1);

  if (wholeNumbers) {
    const start = Math.floor(minValue);
    const end = Math.ceil(safeMax);
    const rawStep = (end - start) / Math.max(1, desiredCount - 1);
    const step = Math.max(1, Math.ceil(rawStep));
    return Array.from({ length: desiredCount }, (_, i) => start + i * step);
  }

  const step = (safeMax - minValue) / Math.max(1, desiredCount - 1);
  const precision =
    step >= 1 ? (Number.isInteger(step) ? 0 : 1) : step >= 0.1 ? 1 : 2;
  const factor = Math.pow(10, precision);

  return Array.from({ length: desiredCount }, (_, i) => {
    const value = minValue + i * step;
    return Math.round(value * factor) / factor;
  });
}

// Enforce an upper bound on tick count while keeping the min/max ticks.
// Used by forecast charts to keep the in-plot sticky axis compact.
export function limitYAxisTicks(ticks: number[], maxTicks: number): number[] {
  if (!Array.isArray(ticks) || ticks.length === 0) return ticks;
  if (!(maxTicks > 1) || ticks.length <= maxTicks) return ticks;

  const lastIndex = ticks.length - 1;
  const step = lastIndex / (maxTicks - 1);
  const out: number[] = [];

  let prevIndex = -1;
  for (let i = 0; i < maxTicks; i++) {
    const rawIndex = Math.round(i * step);
    const index =
      i === 0
        ? 0
        : i === maxTicks - 1
          ? lastIndex
          : Math.min(lastIndex - (maxTicks - 1 - i), Math.max(prevIndex + 1, rawIndex));
    prevIndex = index;
    const value = ticks[index]!;
    if (!out.length || Math.abs(value - out[out.length - 1]!) > 1e-6) {
      out.push(value);
    }
  }

  // If rounding produced fewer than desired ticks, fall back to min/max only.
  if (out.length < 2) return [ticks[0]!, ticks[lastIndex]!];
  return out;
}

// Pick a friendly step (1/2/5 * 10^n)
function chooseNiceStep(step: number) {
  if (step <= 0) return 1;
  const exponent = Math.floor(Math.log10(step));
  const fraction = step / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

// Round to a reasonable precision based on step size
function roundForDisplay(value: number, step: number) {
  const precision = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
