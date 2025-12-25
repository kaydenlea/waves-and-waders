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
  return Math.min(Math.max(deg, 0), 359.99);
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

  const rings: Array<{ key: SwellKey; radius: number; color: string }> = [
    {
      key: "primary",
      radius: 40 * scale,
      color: "var(--ww-ring-swell-primary)",
    },
    {
      key: "secondary",
      radius: 64 * scale,
      color: "var(--ww-ring-swell-secondary)",
    },
    {
      key: "tertiary",
      radius: 88 * scale,
      color: "var(--ww-ring-swell-tertiary)",
    },
  ];

  const isPreview = variant === "preview";
  // Keep ring thickness consistent with the earlier overlay.
  const arcStroke = (isPreview ? 7 : 12) * scale;
  // A bit longer so both swell stats fit comfortably while keeping separation from the arrow.
  const arcLenPx = (isPreview ? 46 : 108) * scale;
  // Slightly smaller so it fits inside the arc.
  const labelFont = (isPreview ? 8.25 : 9.5) * scale;
  const textDy = labelFont * 0.24;

  const renderArrow = (
    direction: number,
    anchorRadius: number,
    color: string,
    kind?: SwellKey
  ): React.ReactNode => {
    const normalized = normDeg(direction);

    // Existing arrow-with-icon design (preserved).
    const headLen = (isPreview ? 12 : 17) * scale;
    const arrowWidth = (isPreview ? 11 : 16) * scale;
    const tipY = -headLen * 0.54;
    const baseY = headLen * 0.56;
    const shoulderY = headLen * 0.12;
    const badgeRadius = 7 * scale;
    const badgeOffsetX = arrowWidth * 0.62;
    const badgeCy = baseY - headLen * 0.04;

    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - anchorRadius})`}>
          <path
            d={`M 0 ${tipY}
                Q ${arrowWidth * 0.18} ${tipY + headLen * 0.08} ${
              arrowWidth / 2
            } ${shoulderY}
                L ${arrowWidth * 0.34} ${baseY}
                Q 0 ${baseY + headLen * 0.12} ${-arrowWidth * 0.34} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY}
                Q ${-arrowWidth * 0.18} ${tipY + headLen * 0.08} 0 ${tipY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {kind &&
            !isPreview &&
            (() => {
              const iconSize = Math.min(arrowWidth * 0.75, headLen * 0.75);
              const iconCenterY = (tipY + baseY) / 2 + headLen * 0.08;
              const num =
                kind === "primary" ? "1" : kind === "secondary" ? "2" : "3";
              return (
                <>
                  <Waves
                    color="#ffffff"
                    strokeWidth={2.2 * scale}
                    width={iconSize}
                    height={iconSize}
                    x={-iconSize / 2}
                    y={iconCenterY - iconSize / 2 + 4}
                  />
                  <circle
                    cx={badgeOffsetX}
                    cy={badgeCy}
                    r={badgeRadius}
                    fill="#ffffff"
                    stroke="#cacacaff"
                    opacity={0.98}
                  />
                  <text
                    x={badgeOffsetX}
                    y={badgeCy}
                    transform={`rotate(${-normalized} ${badgeOffsetX} ${badgeCy})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8.6 * scale}
                    fontWeight={900}
                    fill={color}
                  >
                    {num}
                  </text>
                </>
              );
            })()}
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
        {rings.map(({ key, radius }) => {
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

      {rings.map(({ key, radius, color }) => {
        const raw = directions[key];
        const direction =
          typeof raw === "number" && !Number.isNaN(raw) ? raw : 0;
        const labelText = labels?.[key] ?? null;
        const { height, period } = parseSwellLabelParts(labelText);

        const spanDeg = arcSpanDegForRadius(radius, arcLenPx);
        const start = normDeg(direction - spanDeg / 2);
        const end = normDeg(direction + spanDeg / 2);
        const lower = isLowerHalf(direction);

        const arcD = arcPath(center, center, radius, start, end, 1);
        // Anchor at the outer edge of the stroke so the tip protrudes,
        // while the base + icon stay inside the stroke thickness.
        const arrowAnchorRadius = radius + arcStroke * 0.7;

        return (
          <g key={key}>
            {/* Subtle track ring (restores the "ring" read behind the arc). */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-black/20"
              strokeWidth={(isPreview ? 4 : 6) * scale}
            />

            {/* Arc halo (contrast without blurring the map) */}
            <path
              d={arcD}
              fill="none"
              stroke="currentColor"
              className="text-black/40"
              strokeWidth={arcStroke + 2 * scale}
              strokeLinecap="round"
            />

            {/* Highlight arc segment */}
            <path
              d={arcD}
              fill="none"
              stroke={color}
              strokeWidth={arcStroke}
              strokeLinecap="round"
            />

            {renderArrow(direction, arrowAnchorRadius, color, key)}

            {/* Swell stats: height on left of arrow, period on right (both within the arc). */}
            {showLegend && (height || period) && (
              <g
                transform={
                  lower ? `rotate(180 ${center} ${center})` : undefined
                }
              >
                {height && (
                  <text
                    fontSize={labelFont}
                    fontWeight={800}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.92)"
                  >
                    <textPath
                      href={`#ww-ring-${svgId}-${key}-text`}
                      startOffset="18%"
                      dy={0}
                    >
                      {height}
                    </textPath>
                  </text>
                )}
                {period && (
                  <text
                    fontSize={labelFont}
                    fontWeight={800}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.92)"
                  >
                    <textPath
                      href={`#ww-ring-${svgId}-${key}-text`}
                      startOffset="80%"
                      dy={0}
                    >
                      {period}
                    </textPath>
                  </text>
                )}
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
}> = ({
  direction,
  label,
  showLegend = false,
  scale = 1,
  className = "",
  variant = "full",
}) => {
  const size = 160 * scale;
  const center = size / 2;
  const svgId = useStableSvgId();

  const isPreview = variant === "preview";
  const radius = 108 * scale;
  const color = "var(--ww-ring-wind)";

  const arcStroke = (isPreview ? 7 : 12) * scale;
  const trackStroke = (isPreview ? 4 : 6) * scale;
  const arcLenPx = (isPreview ? 46 : 108) * scale;
  const labelFont = (isPreview ? 8.25 : 9.5) * scale;
  const textDy = labelFont * 0.24;

  // Preserve previous behavior: missing direction defaults to North (0°).
  const finalDirection =
    typeof direction === "number" && !Number.isNaN(direction) ? direction : 0;

  const spanDeg = arcSpanDegForRadius(radius, arcLenPx);
  const start = normDeg(finalDirection - spanDeg / 2);
  const end = normDeg(finalDirection + spanDeg / 2);
  const lower = isLowerHalf(finalDirection);

  const arcD = arcPath(center, center, radius, start, end, 1);
  const arrowAnchorRadius = radius + arcStroke * 0.7;

  const renderArrow = (dir: number, anchorRadius: number): React.ReactNode => {
    const normalized = normDeg(dir);

    // Existing arrow-with-icon design (preserved).
    const headLen = (isPreview ? 12 : 17) * scale;
    const arrowWidth = (isPreview ? 11 : 16) * scale;
    const tipY = -headLen * 0.54;
    const baseY = headLen * 0.56;
    const shoulderY = headLen * 0.12;

    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - anchorRadius})`}>
          <path
            d={`M 0 ${tipY}
                Q ${arrowWidth * 0.18} ${tipY + headLen * 0.08} ${
              arrowWidth / 2
            } ${shoulderY}
                L ${arrowWidth * 0.34} ${baseY}
                Q 0 ${baseY + headLen * 0.12} ${-arrowWidth * 0.34} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY}
                Q ${-arrowWidth * 0.18} ${tipY + headLen * 0.08} 0 ${tipY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {!isPreview &&
            (() => {
              const iconSize = Math.min(arrowWidth * 0.75, headLen * 0.75);
              const iconCenterY = (tipY + baseY) / 2 + headLen * 0.05;
              return (
                <Wind
                  color="#ffffff"
                  strokeWidth={2.2 * scale}
                  width={iconSize}
                  height={iconSize}
                  x={-iconSize / 2}
                  y={iconCenterY - iconSize / 2 + 4}
                />
              );
            })()}
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
        {(() => {
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
          {Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30;
            const isCardinal = deg % 90 === 0;
            const ro = radius + arcStroke * 0.8 + (isCardinal ? 6 : 4) * scale;
            const tickLen = isCardinal ? 11 : 6;
            const ri = ro - tickLen * scale;
            const p1 = polar(center, center, ri, deg);
            const p2 = polar(center, center, ro, deg);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="currentColor"
                className={isCardinal ? "text-black/60" : "text-black/60"}
                strokeWidth={isCardinal ? 1.5 * scale : 1.5 * scale}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}

      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-black/20"
        strokeWidth={trackStroke}
      />

      <path
        d={arcD}
        fill="none"
        stroke="currentColor"
        className="text-black/40"
        strokeWidth={arcStroke + 2 * scale}
        strokeLinecap="round"
      />

      <path
        d={arcD}
        fill="none"
        stroke={color}
        strokeWidth={arcStroke}
        strokeLinecap="round"
      />

      {renderArrow(finalDirection, arrowAnchorRadius)}

      {/* Wind stat: left of the arrow, within the arc. */}
      {showLegend && label && (
        <g transform={lower ? `rotate(180 ${center} ${center})` : undefined}>
          <text
            fontSize={labelFont}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.92)"
          >
            <textPath
              href={`#ww-ring-${svgId}-wind-text`}
              startOffset="20%"
              dy={0}
            >
              {label}
            </textPath>
          </text>
        </g>
      )}
    </svg>
  );
};
