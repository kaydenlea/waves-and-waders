import type { ForecastData } from "@/lib/supabase";

export type SurfIntensityBand = "unknown" | "low" | "mid" | "high";

/**
 * Shared surf intensity thresholds used across the UI.
 *
 * Notes:
 * - The Date Picker uses daily `avg_surf_max_ft` values from `/api/surf-intensity`.
 * - For hourly visualization (Hour Slider), we summarize forecast `surf.heightMax`
 *   over the time window represented by each 3-hour bucket so the thresholds
 *   remain comparable.
 */
export const SURF_INTENSITY_THRESHOLDS_FT = {
  unknownMin: 0.1,
  midMin: 3,
  highMin: 6,
} as const;

export function getSurfIntensityBand(
  intensityFt: number | null | undefined
): SurfIntensityBand {
  if (typeof intensityFt !== "number" || !Number.isFinite(intensityFt)) {
    return "unknown";
  }
  if (intensityFt < SURF_INTENSITY_THRESHOLDS_FT.unknownMin) return "unknown";
  if (intensityFt >= SURF_INTENSITY_THRESHOLDS_FT.highMin) return "high";
  if (intensityFt >= SURF_INTENSITY_THRESHOLDS_FT.midMin) return "mid";
  return "low";
}

export function getSurfIntensityColorCss(band: SurfIntensityBand): string {
  switch (band) {
    case "high":
      return "var(--ww-surf-intensity-high)";
    case "mid":
      return "var(--ww-surf-intensity-mid)";
    case "low":
      return "var(--ww-surf-intensity-low)";
    default:
      return "var(--ww-surf-intensity-unknown)";
  }
}

const HOUR_MS = 60 * 60 * 1000;

export function computeRepresentativeSurfFt(row: ForecastData): number | null {
  if (!row) return null;

  const h1 = row.swell?.primary?.height ?? 0;
  const p1 = row.swell?.primary?.period ?? 10;
  const h2 = row.swell?.secondary?.height ?? 0;
  const p2 = row.swell?.secondary?.period ?? 10;
  const h3 = row.swell?.tertiary?.height ?? 0;
  const p3 = row.swell?.tertiary?.period ?? 10;
  const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
  const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
  const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
  const combined = Math.sqrt(
    Math.pow(1.0 * s1, 2) + Math.pow(0.6 * s2, 2) + Math.pow(0.3 * s3, 2),
  );
  const wind = row.conditions?.windSpeed ?? 0;
  const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
  const effective = Math.max(0, combined * (1 - windPenalty));

  const minH = row.surf?.heightMin;
  const maxH = row.surf?.heightMax;
  const estimate =
    minH != null && maxH != null
      ? (minH + maxH) / 2
      : maxH != null
        ? maxH
        : minH != null
          ? minH
          : 0;

  const representative =
    effective > 0 && estimate > 0
      ? effective * 0.7 + estimate * 0.3
      : effective > 0
        ? effective
        : estimate;

  return Number.isFinite(representative) ? Math.max(0, representative) : null;
}

export function summarizeForecastSurfMaxFtInHourRange(
  rows: ForecastData[],
  windowStart: Date,
  startHourInclusive: number,
  endHourExclusive: number,
  options?: { includeEnd?: boolean }
): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const startMs = windowStart.getTime() + startHourInclusive * HOUR_MS;
  const endMs = windowStart.getTime() + endHourExclusive * HOUR_MS;
  const includeEnd = Boolean(options?.includeEnd);

  let sum = 0;
  let count = 0;

  for (const row of rows) {
    const tsMs = new Date(row.timestamp).getTime();
    if (!Number.isFinite(tsMs)) continue;
    if (tsMs < startMs) continue;
    if (includeEnd ? tsMs > endMs : tsMs >= endMs) continue;

    const v = computeRepresentativeSurfFt(row);
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    sum += v;
    count += 1;
  }

  if (count === 0) return null;
  return sum / count;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export type SurfIntensitySegment = {
  startHour: number;
  endHour: number;
  band: SurfIntensityBand;
};

/**
 * Builds a "hard stop" segmented gradient that aligns each color segment to the
 * midpoints between discrete slider ticks (e.g. 0,3,6,...,21).
 *
 * Uses CSS variables so colors automatically adapt to light/dark mode without
 * JS theme detection.
 */
export function buildSurfIntensityTrackGradient({
  hours,
  bands,
  min,
  max,
}: {
  hours: number[];
  bands: SurfIntensityBand[];
  min: number;
  max: number;
}): string {
  const unknown = getSurfIntensityColorCss("unknown");

  if (!Array.isArray(hours) || hours.length === 0) {
    return `linear-gradient(90deg, ${unknown} 0%, ${unknown} 100%)`;
  }
  if (!Array.isArray(bands) || bands.length !== hours.length) {
    return `linear-gradient(90deg, ${unknown} 0%, ${unknown} 100%)`;
  }

  const range = Math.max(1, max - min);
  const pct = (hour: number) => clamp(((hour - min) / range) * 100, 0, 100);
  const formatPct = (value: number) => `${value.toFixed(3)}%`;

  const stops: string[] = [];

  for (let i = 0; i < hours.length; i += 1) {
    const h = hours[i]!;
    const prev = i > 0 ? hours[i - 1]! : null;
    const next = i < hours.length - 1 ? hours[i + 1]! : null;

    const segmentStart = prev == null ? min : (prev + h) / 2;
    const segmentEnd = next == null ? max : (h + next) / 2;

    const startPct = pct(segmentStart);
    const endPct = pct(segmentEnd);

    const color = getSurfIntensityColorCss(bands[i]!);
    stops.push(`${color} ${formatPct(startPct)}`, `${color} ${formatPct(endPct)}`);
  }

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/**
 * Builds a segmented gradient where each segment is an explicit start/end hour
 * span (preferred for sliders), ensuring the track fully fills to the end.
 */
export function buildSurfIntensityTrackGradientFromSegments({
  segments,
  min,
  max,
  blendHours = 0.25,
}: {
  segments: SurfIntensitySegment[];
  min: number;
  max: number;
  blendHours?: number;
}): string {
  const unknown = getSurfIntensityColorCss("unknown");

  if (!Array.isArray(segments) || segments.length === 0) {
    return `linear-gradient(90deg, ${unknown} 0%, ${unknown} 100%)`;
  }

  const range = Math.max(1, max - min);
  const pct = (hour: number) => clamp(((hour - min) / range) * 100, 0, 100);
  const formatPct = (value: number) => `${value.toFixed(3)}%`;

  const colorFor = (segment: SurfIntensitySegment) =>
    getSurfIntensityColorCss(segment.band);

  const safeBlendHours = clamp(blendHours, 0, 1.5);
  const blendPct = clamp((safeBlendHours / range) * 100, 0, 10);

  const firstColor = colorFor(segments[0]!);
  const stops: string[] = [`${firstColor} 0%`];
  let cursor = 0;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const a = segments[i]!;
    const b = segments[i + 1]!;
    const boundaryHour = a.endHour;
    const boundaryPct = pct(boundaryHour);

    // Prevent blend regions from overlapping the segment body.
    const segWidthPct = Math.max(0, pct(a.endHour) - pct(a.startHour));
    const localBlend = Math.min(blendPct, segWidthPct / 2);

    const aColor = colorFor(a);
    const bColor = colorFor(b);

    const blendStart = clamp(boundaryPct - localBlend, cursor, 100);
    const blendEnd = clamp(boundaryPct + localBlend, blendStart, 100);

    // Flat segment color up to blendStart, then a subtle transition to bColor.
    stops.push(
      `${aColor} ${formatPct(blendStart)}`,
      `${bColor} ${formatPct(blendEnd)}`
    );
    cursor = blendEnd;
  }

  const lastColor = colorFor(segments[segments.length - 1]!);
  stops.push(`${lastColor} 100%`);

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
