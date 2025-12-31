"use client";

type SunArea = { x1: number; x2?: number };
type NightArea = { x1: number; x2?: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const parseHex = (input: string) => {
  const value = input.trim();
  if (!value.startsWith("#")) return null;
  const hex = value.slice(1);

  const expand = (s: string) => s.split("").map((c) => c + c).join("");

  if (hex.length === 3 || hex.length === 4) {
    const full = expand(hex);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const a = hex.length === 4 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }

  return null;
};

const applyOpacity = (color: string, opacity: number) => {
  const parsed = parseHex(color);
  if (!parsed) return color;
  const a = clamp(parsed.a * opacity, 0, 1);
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${a})`;
};

export function applyForecastShadingOpacity(color: string, opacity: number) {
  return applyOpacity(color, opacity);
}

const uniqSorted = (values: number[]) => {
  const sorted = values
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const out: number[] = [];
  const EPS = 1e-6;
  for (const v of sorted) {
    const prev = out[out.length - 1];
    if (prev == null || Math.abs(v - prev) > EPS) out.push(v);
  }
  return out;
};

export function buildForecastShadingBackground(options: {
  dayAreas: SunArea[];
  nightAreas: NightArea[];
  domainMin: number;
  domainMax: number;
  chartWidthPx: number;
  plotLeftPx: number;
  plotWidthPx: number;
  dayColor: string;
  nightColor: string;
  opacity: number;
}) {
  const {
    dayAreas,
    nightAreas,
    domainMin,
    domainMax,
    chartWidthPx,
    plotLeftPx,
    plotWidthPx,
    dayColor,
    nightColor,
    opacity,
  } = options;

  const span = domainMax - domainMin;
  if (!(span > 0) || !(chartWidthPx > 0) || !(plotWidthPx > 0)) return undefined;

  const day = applyOpacity(dayColor, opacity);
  const night = applyOpacity(nightColor, opacity);

  const bounds: number[] = [domainMin, domainMax];
  for (const a of dayAreas) {
    bounds.push(
      clamp(a.x1, domainMin, domainMax),
      clamp(a.x2 ?? domainMax, domainMin, domainMax)
    );
  }
  for (const a of nightAreas) {
    bounds.push(clamp(a.x1, domainMin, domainMax));
    if (a.x2 != null) bounds.push(clamp(a.x2, domainMin, domainMax));
  }

  const ticks = uniqSorted(bounds);
  if (ticks.length < 2) return undefined;

  const isDayAt = (h: number) =>
    dayAreas.some((a) => h >= a.x1 && h <= (a.x2 ?? domainMax));

  const hourToPx = (h: number) =>
    plotLeftPx + ((h - domainMin) / span) * plotWidthPx;

  const stops: string[] = [];
  for (let i = 0; i < ticks.length - 1; i++) {
    const a = ticks[i]!;
    const b = ticks[i + 1]!;
    if (!(b > a)) continue;

    const mid = (a + b) / 2;
    const color = isDayAt(mid) ? day : night;

    const start = a <= domainMin ? 0 : clamp(hourToPx(a), 0, chartWidthPx);
    const end = b >= domainMax ? chartWidthPx : clamp(hourToPx(b), 0, chartWidthPx);
    if (!(end > start)) continue;

    stops.push(`${color} ${start}px`, `${color} ${end}px`);
  }

  if (!stops.length) return undefined;
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

// Percent-based variant for 1-day overview charts: the caller can size/position the background
// via CSS (e.g., `background-size` + `background-position`) so we don't need measured pixel widths.
export function buildForecastPlotShadingBackgroundPercent(options: {
  dayAreas: SunArea[];
  nightAreas: NightArea[];
  domainMin: number;
  domainMax: number;
  dayColor: string;
  nightColor: string;
  opacity: number;
}) {
  const { dayAreas, nightAreas, domainMin, domainMax, dayColor, nightColor, opacity } = options;

  const span = domainMax - domainMin;
  if (!(span > 0)) return undefined;

  const day = applyOpacity(dayColor, opacity);
  const night = applyOpacity(nightColor, opacity);

  const bounds: number[] = [domainMin, domainMax];
  for (const a of dayAreas) {
    bounds.push(
      clamp(a.x1, domainMin, domainMax),
      clamp(a.x2 ?? domainMax, domainMin, domainMax)
    );
  }
  for (const a of nightAreas) {
    bounds.push(clamp(a.x1, domainMin, domainMax));
    if (a.x2 != null) bounds.push(clamp(a.x2, domainMin, domainMax));
  }

  const ticks = uniqSorted(bounds);
  if (ticks.length < 2) return undefined;

  const isDayAt = (h: number) =>
    dayAreas.some((a) => h >= a.x1 && h <= (a.x2 ?? domainMax));

  const hourToPct = (h: number) => ((h - domainMin) / span) * 100;

  const stops: string[] = [];
  for (let i = 0; i < ticks.length - 1; i++) {
    const a = ticks[i]!;
    const b = ticks[i + 1]!;
    if (!(b > a)) continue;

    const mid = (a + b) / 2;
    const color = isDayAt(mid) ? day : night;

    const start = a <= domainMin ? 0 : clamp(hourToPct(a), 0, 100);
    const end = b >= domainMax ? 100 : clamp(hourToPct(b), 0, 100);
    if (!(end > start)) continue;

    stops.push(`${color} ${start}%`, `${color} ${end}%`);
  }

  if (!stops.length) return undefined;
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
