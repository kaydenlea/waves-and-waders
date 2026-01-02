"use client";

import React from "react";
import { Waves, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

// Direction semantics (IMPORTANT)
// - Throughout the app, swell + wind degrees are treated as the direction the swell/wind is *coming from*
//   (meteorological "FROM" bearing). See `components/general/Stats/SwellStat.tsx` where the arrow is rotated
//   so "coming from 270° (W) -> arrow points at 270°".
// - This overlay preserves that existing meaning: bearings are used directly (no +180° conversion).

// ---- Geometry helpers (based on the Premium Rings Overlay Demo reference) ----
const normDeg = (deg: number) => ((deg % 360) + 360) % 360;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

// Compass-style polar coordinates: 0° = North, 90° = East, clockwise positive.
const polar = (cx: number, cy: number, r: number, bearingDeg: number) => {
  const a = toRad(bearingDeg - 90);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const isLowerHalf = (bearingDeg: number) => {
  const d = normDeg(bearingDeg);
  return d > 90 && d < 270;
};

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  sweep: 0 | 1
) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const span =
    sweep === 1 ? normDeg(endDeg - startDeg) : normDeg(startDeg - endDeg);
  const laf = span > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
    2
  )} 0 ${laf} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

// Arc span is computed per-radius so the *pixel length* of each arc stays consistent:
//   arcLengthPx ≈ r * thetaRad  =>  thetaDeg = (arcLengthPx / r) * (180 / π)
// Capped at <360° to avoid degenerate "full circle" arcs (SVG needs start != end).
const arcSpanDegForRadius = (r: number, arcLengthPx: number) => {
  const safeR = Math.max(1e-6, Math.abs(r));
  const safeLen = Math.max(0, arcLengthPx);
  const deg = (safeLen / safeR) * (180 / Math.PI);
  // Keep arcs concise on inner rings: without this clamp, inner rings become overly long (large degrees).
  const MIN_DEG = 52;
  const MAX_DEG = 150;
  return Math.min(Math.max(deg, MIN_DEG), Math.min(MAX_DEG, 359.99));
};

const useStableSvgId = () => {
  const raw = React.useId();
  return React.useMemo(() => raw.replace(/[:.]/g, ""), [raw]);
};

type SwellKey = "primary" | "secondary" | "tertiary";

const parseSwellLabelParts = (label: string | null | undefined) => {
  if (!label)
    return { height: null as string | null, period: null as string | null };
  const heightMatch = label.match(/(\d+(?:\.\d+)?)\s*ft\b/i);
  const periodMatch = label.match(/(\d+(?:\.\d+)?)\s*s\b/i);
  return {
    height: heightMatch ? `${heightMatch[1]}ft` : null,
    period: periodMatch ? `${periodMatch[1]}s` : null,
  };
};

const getArrowMetrics = (
  arcStroke: number,
  scale: number,
  isPreview: boolean
) => {
  // Arc-cap pointer geometry:
  // - Base width ~ arc stroke (so it visually continues the band).
  // - Compact radial length so inner-ring pointers don't collide with outer rings.
  const width = Math.max((isPreview ? 12 : 20) * scale, arcStroke * 1.38);
  const length = Math.max((isPreview ? 8.25 : 11) * scale, arcStroke * 0.78);
  const tipY = -length;
  const baseY = 0;
  // Neck is where the arrowhead transitions into the band-like base.
  const neckY = tipY + length * 0.4;
  return { width, length, tipY, baseY, neckY };
};

// Lightweight text-length estimate (used only for icon centering offsets along the arc).
// SVG doesn't provide reliable text measurement without layout/DOM APIs; this keeps the overlay deterministic.
const estimateTextWidthPx = (text: string, fontPx: number) => {
  const compact = text.replaceAll(/\s+/g, " ").trim();
  return compact.length * fontPx * 0.56;
};

// Map-safe reference styling
// - Dual-stroke (soft light halo + darker core) keeps rings/ticks legible on both light tiles and dark satellite.
// - Avoid pure black/white; use slate tones for a calm, "system layer" feel.
const REF_RING_HALO = "rgba(241, 245, 249, 0.18)"; // slate-100
const REF_RING_CORE = "rgba(30, 41, 59, 0.40)"; // slate-800
const REF_TICK_HALO = "rgba(241, 245, 249, 0.22)"; // slate-100
const REF_TICK_CORE = "rgba(15, 23, 42, 0.58)"; // slate-900

const missingRingDasharray = (scale: number, isPreview: boolean) => {
  const dash = Math.max(2, (isPreview ? 2.2 : 3.2) * scale);
  const gap = Math.max(2, (isPreview ? 2.6 : 3.6) * scale);
  return `${dash} ${gap}`;
};

export const SwellRings: React.FC<{
  directions: {
    primary: number | null | undefined;
    secondary: number | null | undefined;
    tertiary: number | null | undefined;
  };
  labels?: {
    primary?: string | null;
    secondary?: string | null;
    tertiary?: string | null;
  };
  showLegend?: boolean;
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({
  directions,
  labels,
  showLegend = false,
  scale = 1,
  className = "",
  variant = "full",
}) => {
  const size = 160 * scale;
  const center = size / 2;
  const svgId = useStableSvgId();

  const isPreview = variant === "preview";

  const ringsBase: Array<{ key: SwellKey; radius: number; color: string }> = [
    {
      key: "primary",
      radius: (isPreview ? 40 : 36) * scale,
      color: "var(--ww-ring-swell-primary)",
    },
    {
      key: "secondary",
      radius: (isPreview ? 68 : 64) * scale,
      color: "var(--ww-ring-swell-secondary)",
    },
    {
      key: "tertiary",
      radius: 94 * scale,
      color: "var(--ww-ring-swell-tertiary)",
    },
  ];
  // Premium, map-safe rendering:
  // - Keep arcs slightly slimmer to reduce clutter.
  // - Use a subtle halo + an in-arc "label lane" so text stays readable on any basemap.
  const arcStroke = (isPreview ? 7 : 14) * scale;
  const trackStroke = (isPreview ? 3.25 : 5) * scale;
  // Concise but long enough for typical values like "0.8ft · 21s".
  const arcLenPx = (isPreview ? 46 : 112) * scale;
  const labelFont = (isPreview ? 8.25 : 9.75) * scale;
  const textHaloStroke = (isPreview ? 1.8 : 2.2) * scale;
  const haloStroke = arcStroke + 3.2 * scale;
  const arrowGapPx = (isPreview ? 2.0 : 2.75) * scale;
  const ringCoreStroke = trackStroke + (isPreview ? 0.15 : 0.45) * scale;
  const ringHaloStroke = ringCoreStroke + (isPreview ? 0.75 : 1.1) * scale;
  const ringMissingDash = missingRingDasharray(scale, isPreview);

  const textHaloStyle: React.CSSProperties = {
    paintOrder: "stroke",
    stroke: "rgba(0,0,0,0.28)",
    strokeWidth: textHaloStroke,
    strokeLinejoin: "round",
  };

  const parseValue = (value: string | null) => {
    if (!value) return null;
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const hasMeaningfulValue = (label: string | null | undefined) => {
    if (!label) return false;
    if (label.includes("--") || /n\/a/i.test(label)) return false;
    const { height, period } = parseSwellLabelParts(label);
    const h = parseValue(height);
    const p = parseValue(period);
    if (h == null && p == null) return false;
    if ((h ?? 0) === 0 && (p ?? 0) === 0) return false;
    return true;
  };

  const renderArcCapPointer = (
    direction: number,
    arcOuterRadius: number,
    color: string,
    badgeText?: string,
    badgeBearing?: number,
    badgeRadius?: number
  ): React.ReactNode => {
    const normalized = normDeg(direction);

    // Arc-cap pointer: a tapered, rounded wedge that visually continues the arc band.
    // Sized from the arc stroke so it scales consistently across zoom levels.
    const { width, length, tipY, baseY, neckY } = getArrowMetrics(
      arcStroke,
      scale,
      isPreview
    );
    // Place pointer just outside the arc stroke, inside the inter-ring gap.
    const anchorRadius = arcOuterRadius + arrowGapPx;
    const halfW = width / 2;
    const baseHalfW = Math.min(halfW * 0.78, arcStroke * 0.66);
    const neckHalfW = Math.min(halfW * 0.5, arcStroke * 0.42);
    const baseBulge = Math.min(arcStroke * 0.36, 3.8 * scale);
    const tipInset = Math.min(halfW * 0.3, 4 * scale);

    const pointerD = `M 0 ${tipY}
                Q ${tipInset} ${tipY + length * 0.1} ${neckHalfW} ${neckY}
                Q ${baseHalfW} ${neckY + length * 0.34} ${baseHalfW} ${baseY}
                Q 0 ${baseY + baseBulge} ${-baseHalfW} ${baseY}
                Q ${-baseHalfW} ${neckY + length * 0.34} ${-neckHalfW} ${neckY}
                Q ${-tipInset} ${tipY + length * 0.1} 0 ${tipY} Z`;

    return (
      <g>
        <g transform={`rotate(${normalized} ${center} ${center})`}>
          <g transform={`translate(${center} ${center - anchorRadius})`}>
            {/* Map-safe arrowhead: a soft dark outline improves visibility on light tiles/ocean without looking "outlined". */}
            <path
              d={pointerD}
              fill="none"
              stroke="rgba(15, 23, 42, 0.62)"
              strokeWidth={(isPreview ? 1.1 : 1.7) * scale}
              strokeLinejoin="round"
              opacity={0.26}
            />
            <path
              d={pointerD}
              fill={color}
              opacity={0.96}
              stroke="rgba(255,255,255,0.70)"
              strokeOpacity={0.3}
              strokeWidth={(isPreview ? 0.8 : 1.05) * scale}
              strokeLinejoin="round"
              style={{
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.32))",
              }}
            />
          </g>
        </g>

        {!isPreview &&
          badgeText &&
          typeof badgeBearing === "number" &&
          typeof badgeRadius === "number" && (
            <g
              transform={`rotate(${normDeg(badgeBearing)} ${center} ${center})`}
            >
              <g transform={`translate(${center} ${center - badgeRadius})`}>
                {(() => {
                  const size = Math.max(8 * scale, arcStroke - 4 * scale);
                  const r = size / 2;
                  return (
                    <rect
                      x={-r}
                      y={-r}
                      width={size}
                      height={size}
                      rx={Math.max(2 * scale, r * 0.55)}
                      fill="rgba(0,0,0,0.30)"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth={1.15 * scale}
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.30))",
                      }}
                    />
                  );
                })()}
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(7.5 * scale, arcStroke * 0.55)}
                  fontWeight={800}
                  fill="rgba(255,255,255,0.96)"
                  style={{
                    paintOrder: "stroke",
                    stroke: "rgba(0,0,0,0.28)",
                    strokeWidth: 2 * scale,
                    strokeLinejoin: "round",
                  }}
                  transform={`rotate(${-normDeg(badgeBearing)} 0 0)`}
                >
                  {badgeText}
                </text>
              </g>
            </g>
          )}
      </g>
    );
  };

  return (
    <svg
      className={cn("pointer-events-none overflow-visible", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <defs>
        {ringsBase.map(({ key, radius }) => {
          const raw = directions[key];
          // Preserve previous behavior: missing directions default to North (0°).
          const direction =
            typeof raw === "number" && !Number.isNaN(raw) ? raw : 0;

          const spanDeg = arcSpanDegForRadius(radius, arcLenPx);
          const start = normDeg(direction - spanDeg / 2);
          const end = normDeg(direction + spanDeg / 2);
          const lower = isLowerHalf(direction);
          // Text sits inside the stroke thickness (toward the center).
          const textRadius = radius - arcStroke * (lower ? 0.1 : 0.01);

          // Text placement & readability:
          // - The label must stay on the same arc segment (never mirrored to the opposite side).
          // - For lower-half bearings, we rotate the rendered text 180° around the ring center to keep it readable.
          // - To keep the text *on the correct arc* after that rotation, we lay it out on a path pre-rotated by 180°.
          //   This matches the structural approach from the Premium Rings Overlay Demo.
          const textStart = lower ? end + 180 : start;
          const textEnd = lower ? start + 180 : end;
          const textSweep: 0 | 1 = lower ? 0 : 1;

          return (
            <path
              key={key}
              id={`ww-ring-${svgId}-${key}-text`}
              d={arcPath(
                center,
                center,
                textRadius,
                textStart,
                textEnd,
                textSweep
              )}
            />
          );
        })}
      </defs>

      {ringsBase.map(({ key, radius, color }) => {
        const raw = directions[key];
        const direction =
          typeof raw === "number" && !Number.isNaN(raw) ? raw : 0;
        const labelText = labels?.[key] ?? null;
        const hasDirection = typeof raw === "number" && Number.isFinite(raw);
        const hasLabelValue =
          labels != null ? hasMeaningfulValue(labelText) : true;
        const hasData = hasDirection && hasLabelValue;
        const { height, period } = parseSwellLabelParts(labelText);
        const valueLabelRaw =
          height && period ? `${height} · ${period}` : height || period;

        // Some terminals/editors can introduce mojibake for the middle dot (e.g. "\u00C2\u00B7").
        // Normalize so the overlay consistently renders "ft · s".
        const valueLabel =
          typeof valueLabelRaw === "string"
            ? valueLabelRaw.replaceAll("\u00c2\u00b7", "\u00b7")
            : valueLabelRaw;

        const spanDeg = arcSpanDegForRadius(radius, arcLenPx);
        const start = normDeg(direction - spanDeg / 2);
        const end = normDeg(direction + spanDeg / 2);
        const lower = isLowerHalf(direction);
        const textStart = lower ? end + 180 : start;
        const textSweep: 0 | 1 = lower ? 0 : 1;
        const sweepSign = textSweep === 1 ? 1 : -1;
        const bearingAt = (fraction: number) =>
          textStart + sweepSign * spanDeg * fraction;
        const centerBearing = normDeg(bearingAt(0.5));
        const spanRad = (spanDeg * Math.PI) / 180;
        const arcLen = Math.max(1, Math.abs(radius * spanRad));

        const arcD = arcPath(center, center, radius, start, end, 1);
        const arcOuterRadius = radius + arcStroke / 2;
        const badgeText =
          key === "primary" ? "1" : key === "secondary" ? "2" : "3";
        const badgeBearing = end;
        const badgeRadius = radius - arcStroke * 0.02;

        const iconGapPx = 0.01 * scale;
        const iconSize = Math.max(11 * scale, arcStroke * 0.5);
        // Keep the icon fully inside the colored arc band (same lane as the text).
        const laneR = radius - arcStroke * 0.01;
        const iconCenterShiftPx =
          showLegend && valueLabel
            ? -(estimateTextWidthPx(valueLabel, labelFont) / 2 + iconGapPx / 2)
            : 0;
        const iconBearing = normDeg(
          centerBearing +
            sweepSign * ((iconCenterShiftPx / radius) * (180 / Math.PI))
        );

        return (
          <g key={key}>
            {/* Reference ring (neutral): dual-stroke for map safety without looking "outlined". */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={REF_RING_HALO}
              strokeWidth={ringHaloStroke}
              strokeDasharray={hasData ? undefined : ringMissingDash}
              strokeLinecap={hasData ? undefined : "round"}
              opacity={hasData ? undefined : 0.55}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={REF_RING_CORE}
              strokeWidth={ringCoreStroke}
              strokeDasharray={hasData ? undefined : ringMissingDash}
              strokeLinecap={hasData ? undefined : "round"}
              opacity={hasData ? undefined : 0.42}
            />

            {hasData && (
              <>
                {/* Arc halo (contrast without blurring the map) */}
                <path
                  d={arcD}
                  fill="none"
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={haloStroke}
                  strokeLinecap="round"
                  opacity={0.32}
                />

                {/* Highlight arc segment */}
                <path
                  d={arcD}
                  fill="none"
                  stroke={color}
                  strokeWidth={arcStroke}
                  strokeLinecap="round"
                  opacity={0.93}
                />

                {/* Label lane: a subtle dark pass inside the arc so text stays readable on any basemap. */}
                <path
                  d={arcD}
                  fill="none"
                  stroke="rgba(0,0,0,0.80)"
                  strokeWidth={Math.max(1, arcStroke - 4.2 * scale)}
                  strokeLinecap="round"
                  opacity={0.18}
                />
              </>
            )}

            {/* Inner highlight: thin light edge for a "premium" finish (kept subtle). */}
            {/* <path
              d={arcD}
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth={Math.max(0.8 * scale, 1.25 * scale)}
              strokeLinecap="round"
              opacity={0.28}
            /> */}

            {hasData &&
              renderArcCapPointer(
                direction,
                arcOuterRadius,
                color,
                badgeText,
                badgeBearing,
                badgeRadius
              )}

            {/* Icon stays visible even when legend is closed; it follows the same path direction as the value text. */}
            {!isPreview &&
              hasData &&
              valueLabel &&
              (() => {
                const p = polar(center, center, laneR, iconBearing);
                // Match the same path-following orientation as the text glyphs.
                const iconRot = iconBearing + (sweepSign === 1 ? 0 : 180);
                return (
                  <g
                    aria-hidden="true"
                    transform={
                      lower ? `rotate(180 ${center} ${center})` : undefined
                    }
                  >
                    <g transform={`rotate(${iconRot} ${p.x} ${p.y})`}>
                      <Waves
                        width={iconSize}
                        height={iconSize}
                        x={p.x - iconSize / 2}
                        y={p.y - iconSize / 2}
                        color="rgba(255,255,255,0.92)"
                        strokeWidth={3.5 * scale}
                        style={{
                          opacity: 0.96,
                          filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))",
                        }}
                      />
                    </g>
                  </g>
                );
              })()}

            {/* Swell stat value: only shown when legend is active. */}
            {showLegend && hasData && valueLabel && (
              <g
                transform={
                  lower ? `rotate(180 ${center} ${center})` : undefined
                }
              >
                <text
                  fontSize={labelFont}
                  fontWeight={700}
                  letterSpacing="0.02em"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.96)"
                  style={textHaloStyle}
                >
                  <textPath
                    href={`#ww-ring-${svgId}-${key}-text`}
                    startOffset={`${clamp(
                      50 + ((iconSize + iconGapPx) / 2 / arcLen) * 100,
                      5,
                      95
                    )}%`}
                    dy={0}
                  >
                    {valueLabel}
                  </textPath>
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const WindRing: React.FC<{
  direction: number | null | undefined;
  label?: string | null;
  showLegend?: boolean;
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
  radiusOffset?: number;
}> = ({
  direction,
  label,
  showLegend = false,
  scale = 1,
  className = "",
  variant = "full",
  radiusOffset = 0,
}) => {
  const size = 160 * scale;
  const center = size / 2;
  const svgId = useStableSvgId();

  const isPreview = variant === "preview";
  const radius = ((isPreview ? 126 : 122) + radiusOffset) * scale;
  const color = "var(--ww-ring-wind)";

  const arcStroke = (isPreview ? 7 : 14) * scale;
  const trackStroke = (isPreview ? 3.25 : 5) * scale;
  const arcLenPx = (isPreview ? 46 : 112) * scale;
  const labelFont = (isPreview ? 8.25 : 9.75) * scale;
  const textHaloStroke = (isPreview ? 1.8 : 2.2) * scale;
  const haloStroke = arcStroke + 3.2 * scale;
  const arrowGapPx = (isPreview ? 2.0 : 2.75) * scale;
  const ringCoreStroke = trackStroke + (isPreview ? 0.15 : 0.45) * scale;
  const ringHaloStroke = ringCoreStroke + (isPreview ? 0.75 : 1.1) * scale;
  const ringMissingDash = missingRingDasharray(scale, isPreview);
  const textHaloStyle: React.CSSProperties = {
    paintOrder: "stroke",
    stroke: "rgba(0,0,0,0.28)",
    strokeWidth: textHaloStroke,
    strokeLinejoin: "round",
  };

  // Preserve previous behavior: missing direction defaults to North (0°).
  const hasDirection =
    typeof direction === "number" && Number.isFinite(direction);
  const finalDirection = hasDirection ? (direction as number) : 0;

  // Hide the wind ring entirely when the stat is missing/placeholder/zero.
  const hasMeaningfulValue = React.useMemo(() => {
    if (!label) return false;
    if (label.includes("--") || /n\/a/i.test(label)) return false;
    const match = label.match(/(\d+(?:\.\d+)?)/);
    if (!match) return false;
    const n = Number(match[1]);
    return Number.isFinite(n) && n !== 0;
  }, [label]);

  const hasData = hasDirection && (isPreview ? true : hasMeaningfulValue);

  const spanDeg = arcSpanDegForRadius(radius, arcLenPx);
  const start = normDeg(finalDirection - spanDeg / 2);
  const end = normDeg(finalDirection + spanDeg / 2);
  const lower = isLowerHalf(finalDirection);
  const textStart = lower ? end + 180 : start;
  const textSweep: 0 | 1 = lower ? 0 : 1;
  const sweepSign = textSweep === 1 ? 1 : -1;
  const bearingAt = (fraction: number) =>
    textStart + sweepSign * spanDeg * fraction;
  const centerBearing = normDeg(bearingAt(0.5));
  const spanRad = (spanDeg * Math.PI) / 180;
  const arcLen = Math.max(1, Math.abs(radius * spanRad));

  const iconGapPx = 4 * scale;
  const iconSize = Math.max(13 * scale, arcStroke * 0.98);
  // Keep the icon fully inside the colored arc band (same lane as the text).
  const laneR = radius - arcStroke * 0.01;
  const iconCenterShiftPx =
    showLegend && label
      ? -(estimateTextWidthPx(label, labelFont) / 2 + iconGapPx / 2)
      : 0;
  const iconBearing = normDeg(
    centerBearing + sweepSign * ((iconCenterShiftPx / radius) * (180 / Math.PI))
  );

  const arcD = arcPath(center, center, radius, start, end, 1);
  const arcOuterRadius = radius + arcStroke / 2;

  const renderArcCapPointer = (dir: number): React.ReactNode => {
    const normalized = normDeg(dir);

    const { width, length, tipY, baseY, neckY } = getArrowMetrics(
      arcStroke,
      scale,
      isPreview
    );
    const anchorRadius = arcOuterRadius + arrowGapPx;
    const halfW = width / 2;
    const baseHalfW = Math.min(halfW * 0.78, arcStroke * 0.66);
    const neckHalfW = Math.min(halfW * 0.5, arcStroke * 0.42);
    const baseBulge = Math.min(arcStroke * 0.36, 3.8 * scale);
    const tipInset = Math.min(halfW * 0.3, 4 * scale);
    const pointerD = `M 0 ${tipY}
                Q ${tipInset} ${tipY + length * 0.1} ${neckHalfW} ${neckY}
                Q ${baseHalfW} ${neckY + length * 0.34} ${baseHalfW} ${baseY}
                Q 0 ${baseY + baseBulge} ${-baseHalfW} ${baseY}
                Q ${-baseHalfW} ${neckY + length * 0.34} ${-neckHalfW} ${neckY}
                Q ${-tipInset} ${tipY + length * 0.1} 0 ${tipY} Z`;

    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - anchorRadius})`}>
          <path
            d={pointerD}
            fill="none"
            stroke="rgba(15, 23, 42, 0.62)"
            strokeWidth={(isPreview ? 1.1 : 1.7) * scale}
            strokeLinejoin="round"
            opacity={0.26}
          />
          <path
            d={pointerD}
            fill={color}
            opacity={0.96}
            stroke="rgba(255,255,255,0.70)"
            strokeOpacity={0.3}
            strokeWidth={(isPreview ? 0.8 : 1.05) * scale}
            strokeLinejoin="round"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.32))",
            }}
          />
        </g>
      </g>
    );
  };

  return (
    <svg
      className={cn("pointer-events-none overflow-visible", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <defs>
        {hasData &&
          (() => {
          const textRadius = radius - arcStroke * (lower ? 0.1 : -0.1);

          const textStart = lower ? end + 180 : start;
          const textEnd = lower ? start + 180 : end;
          const textSweep: 0 | 1 = lower ? 0 : 1;

          return (
            <path
              id={`ww-ring-${svgId}-wind-text`}
              d={arcPath(
                center,
                center,
                textRadius,
                textStart,
                textEnd,
                textSweep
              )}
            />
          );
        })()}
      </defs>

      {/* Compass ticks (wind ring only) */}
      {!isPreview && showLegend && (
        <g aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => {
            const deg = i * 45;
            const isCardinal = deg % 90 === 0;
            const ro = radius + arcStroke * 0.78 + (isCardinal ? 2 : 4) * scale;
            const tickLen = isCardinal ? 10 : 6;
            const ri = ro - tickLen * scale;
            const p1 = polar(center, center, ri, deg);
            const p2 = polar(center, center, ro, deg);
            const tickWidth = isCardinal ? 2.25 * scale : 1.8 * scale;
            const tickCoreStroke =
              tickWidth + (isCardinal ? 0.55 : 0.45) * scale;
            const tickHaloStroke = tickCoreStroke + 1.0 * scale;
            return (
              <g key={i} aria-hidden="true">
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={REF_TICK_HALO}
                  strokeWidth={tickHaloStroke}
                  strokeLinecap="round"
                />
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={REF_TICK_CORE}
                  strokeWidth={tickCoreStroke}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>
      )}

      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={REF_RING_HALO}
        strokeWidth={ringHaloStroke}
        strokeDasharray={hasData ? undefined : ringMissingDash}
        strokeLinecap={hasData ? undefined : "round"}
        opacity={hasData ? undefined : 0.55}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={REF_RING_CORE}
        strokeWidth={ringCoreStroke}
        strokeDasharray={hasData ? undefined : ringMissingDash}
        strokeLinecap={hasData ? undefined : "round"}
        opacity={hasData ? undefined : 0.42}
      />

      {hasData && (
        <>
          <path
            d={arcD}
            fill="none"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth={haloStroke}
            strokeLinecap="round"
            opacity={0.32}
          />

          <path
            d={arcD}
            fill="none"
            stroke={color}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            opacity={0.93}
          />

          <path
            d={arcD}
            fill="none"
            stroke="rgba(0,0,0,0.80)"
            strokeWidth={Math.max(1, arcStroke - 4.2 * scale)}
            strokeLinecap="round"
            opacity={0.18}
          />
        </>
      )}

      {/* <path
        d={arcD}
        fill="none"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth={Math.max(0.8 * scale, 1.25 * scale)}
        strokeLinecap="round"
        opacity={0.28}
      /> */}

      {hasData && renderArcCapPointer(finalDirection)}

      {/* Icon stays visible even when legend is closed; it follows the same path direction as the value text. */}
      {!isPreview &&
        hasData &&
        label &&
        (() => {
          const p = polar(center, center, laneR, iconBearing);
          // Match the same path-following orientation as the text glyphs.
          const iconRot = iconBearing + (sweepSign === 1 ? 0 : 180);
          return (
            <g
              aria-hidden="true"
              transform={lower ? `rotate(180 ${center} ${center})` : undefined}
            >
              <g transform={`rotate(${iconRot} ${p.x} ${p.y})`}>
                <Wind
                  width={iconSize}
                  height={iconSize}
                  x={p.x - iconSize / 2}
                  y={p.y - iconSize / 2}
                  color="rgba(255,255,255,0.92)"
                  strokeWidth={3 * scale}
                  style={{
                    opacity: 0.96,
                    filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))",
                  }}
                />
              </g>
            </g>
          );
        })()}

      {/* Wind stat value: only shown when legend is active. */}
      {showLegend && hasData && label && (
        <>
          <g transform={lower ? `rotate(180 ${center} ${center})` : undefined}>
            <text
              fontSize={labelFont}
              fontWeight={700}
              letterSpacing="0.02em"
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.96)"
              style={textHaloStyle}
            >
              <textPath
                href={`#ww-ring-${svgId}-wind-text`}
                startOffset={`${clamp(
                  50 + ((iconSize + iconGapPx) / 2 / arcLen) * 100,
                  5,
                  95
                )}%`}
                dy={0}
              >
                {label}
              </textPath>
            </text>
          </g>
        </>
      )}
    </svg>
  );
};
