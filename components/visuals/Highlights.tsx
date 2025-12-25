"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { cn, getPacificDayRange } from "@/lib/utils";

import {
  Sun,
  MoonStar,
  Cloud as CloudIcon,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";

// Module-scope helpers and segmented gauge for compact, legible intensity visuals
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const toPct = (v: number, min: number, max: number) =>
  clamp(((v - min) / Math.max(1, max - min)) * 100, 0, 100);

const cubicBezier = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
) => {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
};

type SegmentedGaugeProps = {
  valuePct: number; // 0..100
  segments?: number;
  className?: string;
  height?: number;
  colors?: string[]; // one per segment
  trackColor?: string;
  showCaret?: boolean;
};

function SegmentedGauge({
  valuePct,
  segments = 5,
  className = "",
  height = 10,
  colors,
  trackColor = "#e5e7eb",
  showCaret = false,
}: SegmentedGaugeProps) {
  const segSize = 100 / segments;
  const palette =
    colors && colors.length >= segments
      ? colors
      : ["#22c55e", "#84cc16", "#eab308", "#f59e0b", "#ef4444"].slice(
          0,
          segments
        );
  const pct = clamp(valuePct, 0, 100);
  const caretTransform =
    pct <= 0
      ? "translateX(0%)"
      : pct >= 100
      ? "translateX(-100%)"
      : "translateX(-50%)";
  return (
    <div className={cn("relative w-full", className)} aria-hidden>
      <div className="flex w-full gap-[1.5px]">
        {Array.from({ length: segments }, (_, i) => {
          const start = i * segSize;
          const inSeg = clamp((pct - start) / segSize, 0, 1);
          return (
            <div
              key={i}
              className="relative rounded-[3px] overflow-hidden flex-1"
              style={{ height, background: trackColor }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${Math.round(inSeg * 100)}%`,
                  background: palette[i],
                }}
              />
            </div>
          );
        })}
      </div>
      {showCaret && (
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: -5,
            transform: caretTransform,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "6px solid var(--muted-foreground)",
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}

// Classic circular pressure gauge with bottom gap and clear pointer highlight
/* Deprecated: old pressure gauge — kept for history, not used */
function PressureGaugeClassic({
  value,
  min,
  max,
  unit,
  size = 88,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const pct = clamp(((value - lo) / Math.max(1e-6, hi - lo)) * 100, 0, 100);

  const startDeg = 180; // left
  const spanDeg = 180; // sweep to right

  const arcLen = (spanDeg / 360) * c;
  const filled = (pct / 100) * arcLen;

  const angle = (pct / 100) * spanDeg + startDeg; // absolute angle for needle

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const a = toRad(angle);
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const tipX = center + r * cosA;
  const tipY = center + r * sinA;
  const innerX = center + (r - 10) * cosA;
  const innerY = center + (r - 10) * sinA;
  const px = -sinA;
  const py = cosA;
  const halfW = 6;
  const baseLeftX = innerX - px * halfW;
  const baseLeftY = innerY - py * halfW;
  const baseRightX = innerX + px * halfW;
  const baseRightY = innerY + py * halfW;
  const hue = Math.max(0, Math.min(140, 140 - Math.round((pct / 100) * 140)));
  const intensityColor = `hsl(${hue} 80% 45%)`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* rotate so 0 of dasharray starts at startDeg */}
      <g transform={`rotate(${startDeg} ${center} ${center})`}>
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          opacity={0.15}
          strokeWidth={stroke}
          strokeDasharray={`${arcLen} ${c - arcLen}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {/* Filled arc up to value */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          opacity={0.25}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${c}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {/* Highlight band at needle only (small arc segment) */}
        {(() => {
          const hl = 8; // px along arc
          const start = Math.max(0, Math.min(arcLen - hl, filled - hl / 2));
          const dashOffset = c - start;
          return (
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="currentColor"
              opacity={0.45}
              strokeWidth={stroke - 2}
              strokeDasharray={`${hl} ${c}`}
              strokeDashoffset={c - (filled - hl / 2)}
              strokeLinecap="round"
            />
          );
        })()}
      </g>
      {/* Ticks */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = startDeg + (i / 8) * spanDeg;
        const rad = toRad(a);
        const outer = r + 1;
        const major = i % 2 === 0;
        const inner = r - (major ? 7 : 4);
        const x1 = center + outer * Math.cos(rad);
        const y1 = center + outer * Math.sin(rad);
        const x2 = center + inner * Math.cos(rad);
        const y2 = center + inner * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            opacity={0.28}
            strokeWidth={1}
            strokeLinecap="round"
          />
        );
      })}
      {/* Needle tip marker (no center overlap) */}
      <polygon
        points={`${tipX},${tipY} ${baseRightX},${baseRightY} ${baseLeftX},${baseLeftY}`}
        fill="currentColor"
        opacity={0.9}
        stroke="white"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      {/* Center label (value + unit combined) */}
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
      >
        <tspan fontSize="14" fontWeight="600">
          {Math.round(value * 100) / 100}
        </tspan>
        <tspan fontSize="10" opacity="0.6">
          {" "}
          {unit}
        </tspan>
      </text>
      {/* End labels */}
      {(() => {
        const lblOffset = r + 10;
        const radLo = toRad(startDeg);
        const radHi = toRad(startDeg + spanDeg);
        const lx = center + lblOffset * Math.cos(radLo);
        const ly = center + lblOffset * Math.sin(radLo);
        const hx = center + lblOffset * Math.cos(radHi);
        const hy = center + lblOffset * Math.sin(radHi);
        return (
          <g>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity={0.6}
            >
              Low
            </text>
            <text
              x={hx}
              y={hy}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity={0.6}
            >
              High
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// Donut ring pressure meter with focus segment and center label
function PressureDonut({
  value,
  min,
  max,
  unit,
  size = 84,
  thickness = 10,
  focusDeg = 16,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
  thickness?: number;
  focusDeg?: number;
}) {
  const r = (size - thickness) / 2;
  const center = size / 2;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const pct = clamp(((value - lo) / Math.max(1e-6, hi - lo)) * 100, 0, 100);

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (sa: number, ea: number) => {
    const a0 = toRad(sa);
    const a1 = toRad(ea);
    const x0 = center + r * Math.cos(a0);
    const y0 = center + r * Math.sin(a0);
    const x1 = center + r * Math.cos(a1);
    const y1 = center + r * Math.sin(a1);
    const laf = ea - sa > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${laf} 1 ${x1} ${y1}`;
  };

  const startDeg = 180;
  const spanDeg = 180;
  const angle = startDeg + (pct / 100) * spanDeg;

  // Base semi-circle track
  const baseD = arcPath(startDeg, startDeg + spanDeg);
  // Needle segment (short arc around current angle)
  const half = Math.max(2, focusDeg / 2);
  const ns = Math.max(startDeg, angle - half);
  const ne = Math.min(startDeg + spanDeg, angle + half);
  const needleD = arcPath(ns, ne);

  // Tick marks
  const ticks: React.JSX.Element[] = [];
  const tickCount = 12;
  for (let i = 0; i <= tickCount; i++) {
    const d = startDeg + (i / tickCount) * spanDeg;
    const rad = toRad(d);
    const outer = r;
    const major = i % 2 === 0;
    const inner = r - (major ? 7 : 4);
    const x1 = center + outer * Math.cos(rad);
    const y1 = center + outer * Math.sin(rad);
    const x2 = center + inner * Math.cos(rad);
    const y2 = center + inner * Math.sin(rad);
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        opacity={0.28}
        strokeWidth={1}
        strokeLinecap="round"
      />
    );
  }

  // Tip dot
  const ax = center + r * Math.cos(toRad(angle));
  const ay = center + r * Math.sin(toRad(angle));

  // Low/High label positions (kept inside viewBox)
  const labelRadius = r - thickness * 0.5 - 6;
  const labelY = center + Math.max(10, thickness * 0.7);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-foreground -mb-8"
      aria-hidden
    >
      <path
        d={baseD}
        stroke="currentColor"
        opacity={0.15}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
      />
      {ticks}
      <path
        d={needleD}
        stroke="currentColor"
        opacity={0.9}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
      />
      {(() => {
        const ri = r - thickness; // extend inside the ring
        const ro = r + thickness * 0.6; // extend slightly outside
        const xr1 = center + ri * Math.cos(toRad(angle));
        const yr1 = center + ri * Math.sin(toRad(angle));
        const xr2 = center + ro * Math.cos(toRad(angle));
        const yr2 = center + ro * Math.sin(toRad(angle));
        return (
          <line
            x1={xr1}
            y1={yr1}
            x2={xr2}
            y2={yr2}
            stroke="currentColor"
            opacity={0.8}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })()}
      <circle cx={ax} cy={ay} r={3.2} fill="currentColor" />
      <text
        x={center}
        y={center - 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="16"
        fontWeight="600"
      >
        {Math.round(value * 100) / 100}
      </text>
      <text
        x={center}
        y={center + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="11"
        opacity={0.7}
      >
        {unit}
      </text>
      <text
        x={center - labelRadius}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fill="currentColor"
        opacity={0.6}
      >
        lo
      </text>
      <text
        x={center + labelRadius}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fill="currentColor"
        opacity={0.6}
      >
        hi
      </text>
    </svg>
  );
}

// Apple-inspired semi-circular pressure dial (clean, theme-aware)
function PressureDialApple({
  value,
  min,
  max,
  unit,
  size = 80,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const pct = clamp(((value - lo) / Math.max(1e-6, hi - lo)) * 100, 0, 100);

  const startDeg = 180;
  const spanDeg = 180;
  const arcLen = (spanDeg / 360) * c;
  const filled = (pct / 100) * arcLen;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const angle = (pct / 100) * spanDeg + startDeg;
  const a = toRad(angle);
  const tipX = center + r * Math.cos(a);
  const tipY = center + r * Math.sin(a);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-foreground"
      aria-hidden
    >
      <g transform={`rotate(${startDeg} ${center} ${center})`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          opacity={0.15}
          strokeWidth={stroke}
          strokeDasharray={`${arcLen} ${c - arcLen}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          opacity={0.28}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${c}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {(() => {
          const hl = 10;
          const dashOffset = c - Math.max(0, Math.min(arcLen, filled - hl / 2));
          return (
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="currentColor"
              opacity={0.45}
              strokeWidth={stroke - 2}
              strokeDasharray={`${hl} ${c}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })()}
      </g>
      {Array.from({ length: 9 }, (_, i) => {
        const deg = startDeg + (i / 8) * spanDeg;
        const rad = toRad(deg);
        const outer = r + 1;
        const major = i % 2 === 0;
        const inner = r - (major ? 7 : 4);
        const x1 = center + outer * Math.cos(rad);
        const y1 = center + outer * Math.sin(rad);
        const x2 = center + inner * Math.cos(rad);
        const y2 = center + inner * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            opacity={0.28}
            strokeWidth={1}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={tipX} cy={tipY} r={3.5} fill="currentColor" />
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
      >
        <tspan fontSize="14" fontWeight="600">
          {Math.round(value * 100) / 100}
        </tspan>
        <tspan fontSize="10" opacity="0.6">
          {" "}
          {unit}
        </tspan>
      </text>
      {(() => {
        const lblOffset = r + 10;
        const lx = center + lblOffset * Math.cos(toRad(startDeg));
        const ly = center + lblOffset * Math.sin(toRad(startDeg));
        const hx = center + lblOffset * Math.cos(toRad(startDeg + spanDeg));
        const hy = center + lblOffset * Math.sin(toRad(startDeg + spanDeg));
        return (
          <g>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity={0.6}
            >
              Low
            </text>
            <text
              x={hx}
              y={hy}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity={0.6}
            >
              High
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
// Circular pressure gauge (segmented ring + needle + value in center)
type VerticalSegmentedGaugeProps = {
  valuePct: number; // 0..100
  segments?: number;
  className?: string;
  width?: number;
  height?: number;
  colors?: string[]; // one per segment (bottom to top)
  trackColor?: string;
};

function VerticalSegmentedGauge({
  valuePct,
  segments = 5,
  className = "",
  width = 10,
  height = 46,
  colors,
  trackColor = "#e5e7eb",
}: VerticalSegmentedGaugeProps) {
  const segSize = 100 / segments;
  const palette =
    colors && colors.length >= segments
      ? colors
      : ["#22c55e", "#84cc16", "#eab308", "#f59e0b", "#ef4444"].slice(
          0,
          segments
        );
  return (
    <div
      className={cn("flex flex-col justify-end gap-[2px]", className)}
      style={{ height, width }}
      aria-hidden
    >
      {Array.from({ length: segments }, (_, idx) => {
        const i = segments - 1 - idx; // bottom segment is last color
        const start = i * segSize;
        const inSeg = clamp((valuePct - start) / segSize, 0, 1);
        return (
          <div
            key={i}
            className="relative rounded-[2px] overflow-hidden"
            style={{
              height: height / segments - 2,
              width: "100%",
              background: trackColor,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: `${Math.round(inSeg * 100)}%`,
                background: palette[i],
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

const WeatherStat = ({
  temp,
  label,
  weatherCode,
  isFull,
}: {
  temp: number;
  label: string;
  weatherCode?: number | null;
  isFull?: boolean;
}) => {
  const MixedCloudSunIcon = ({ className }: { className?: string }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="#f79e55ff">
        <path d="M12 2v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="M20 12h2" />
        <path d="m19.07 4.93-1.41 1.41" />
        <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
      </g>
      <path
        d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"
        stroke="#bdbdbdff"
      />
    </svg>
  );

  const getWeatherVisual = (code: number | null | undefined) => {
    if (code == null || code === 0) {
      return {
        label: "Clear",
        icon: (
          <Sun className="h-5 w-5 stroke-[2.5] text-amber-500 dark:text-amber-400" />
        ),
      };
    }
    if ([1, 2].includes(code)) {
      return {
        label: "Mixed",
        icon: <MixedCloudSunIcon />,
      };
    }
    if (code === 3) {
      return {
        label: "Overcast",
        icon: <CloudIcon className="h-5 w-5 text-foreground/65" />,
      };
    }
    if ([45, 48].includes(code)) {
      return {
        label: "Fog",
        icon: <CloudIcon className="h-5 w-5 text-foreground/60" />,
      };
    }
    if ([51, 53, 55, 56, 57].includes(code)) {
      return {
        label: "Drizzle",
        icon: (
          <CloudDrizzle className="h-5 w-5 text-sky-500/80 dark:text-sky-400/80" />
        ),
      };
    }
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return {
        label: "Rain",
        icon: (
          <CloudRain className="h-5 w-5 text-sky-500/85 dark:text-sky-400/85" />
        ),
      };
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return {
        label: "Snow",
        icon: <Snowflake className="h-5 w-5 text-sky-400/85" />,
      };
    }
    if ([95, 96, 99].includes(code)) {
      return {
        label: "Storm",
        icon: (
          <CloudLightning className="h-5 w-5 text-rose-500/80 dark:text-rose-400/80" />
        ),
      };
    }
    return {
      label: "Cloudy",
      icon: <CloudIcon className="h-5 w-5 text-foreground/65" />,
    };
  };

  const visual = getWeatherVisual(weatherCode);
  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight">
            {temp}
          </span>
          <span className="text-[0.75rem] font-medium text-muted-foreground">
            &deg;F
          </span>
        </>
      }
      secondary={
        <span
          className={cn(
            "text-[0.65rem] font-medium text-muted-foreground leading-none",
            isFull && ""
          )}
        >
          {visual.label}
        </span>
      }
      visual={<VisualSlot>{visual.icon}</VisualSlot>}
    />
  );
};

const WaterStat = ({
  temp,
  min,
  max,
}: {
  temp: number;
  min?: number;
  max?: number;
}) => {
  const t = clamp(temp / 100, 0, 1);
  const descriptor =
    temp < 58 ? "Cold" : temp < 65 ? "Cool" : temp < 72 ? "Mild" : "Warm";
  const markerH = 8;
  const top = `clamp(0px, calc(${Math.round((1 - t) * 100)}% - ${
    markerH / 2
  }px), calc(100% - ${markerH}px))`;
  return (
    <HighlightCard
      label="water"
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight">
            {temp}
          </span>
          <span className="text-[0.75rem] font-medium text-muted-foreground">
            &deg;F
          </span>
        </>
      }
      secondary={
        <span className="text-[0.65rem] font-medium text-muted-foreground">
          {descriptor}
        </span>
      }
      visual={
        <VisualSlot>
          <div className="relative h-8 w-2 rounded-full bg-gradient-to-t from-sky-500/70 via-emerald-400/55 to-amber-400/75">
            <div
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-background ring-1 ring-foreground/20 shadow-sm"
              style={{ top }}
            />
          </div>
        </VisualSlot>
      }
    />
  );
};

const BasicStat = ({
  data,
  label,
}: {
  data: { value: number | string; unit: string };
  label: string;
}) => {
  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.55rem] font-semibold tabular-nums tracking-tight">
            {data.value}
          </span>
          <span className="text-[0.75rem] font-medium text-muted-foreground">
            {data.unit}
          </span>
        </>
      }
    />
  );
};

type MoonKind =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

/*
const getMoonPhaseEmoji = (kind: MoonKind): string => {
  switch (kind) {
    case "new":
      return "🌑";
    case "waxing_crescent":
      return "🌒";
    case "first_quarter":
      return "🌓";
    case "waxing_gibbous":
      return "🌔";
    case "full":
      return "🌕";
    case "waning_gibbous":
      return "🌖";
    case "last_quarter":
      return "🌗";
    case "waning_crescent":
      return "🌘";
  }
};

*/

function getMoonPhaseInfo(raw: string | number): {
  kind: MoonKind;
  lines: [string, string];
} {
  const toKindFromNumber = (n: number): MoonKind => {
    const phase = ((n % 1) + 1) % 1; // normalize 0..1
    const isNear = (target: number, eps = 0.03) =>
      Math.abs(phase - target) <= eps || Math.abs(phase - (target + 1)) <= eps;

    if (isNear(0) || isNear(1)) return "new";
    if (isNear(0.25)) return "first_quarter";
    if (isNear(0.5)) return "full";
    if (isNear(0.75)) return "last_quarter";

    if (phase < 0.25) return "waxing_crescent";
    if (phase < 0.5) return "waxing_gibbous";
    if (phase < 0.75) return "waning_gibbous";
    return "waning_crescent"; // 0.75 - 1
  };

  let kind: MoonKind | null = null;
  if (typeof raw === "number") {
    kind = toKindFromNumber(raw);
  } else {
    const s = raw.trim().toLowerCase();
    const num = Number(s);
    if (!Number.isNaN(num)) {
      kind = toKindFromNumber(num);
    } else {
      if (s.includes("new")) kind = "new";
      else if (s.includes("first") && s.includes("quarter"))
        kind = "first_quarter";
      else if (s.includes("last") && s.includes("quarter"))
        kind = "last_quarter";
      else if (s.includes("full")) kind = "full";
      else if (s.includes("waxing") && s.includes("crescent"))
        kind = "waxing_crescent";
      else if (s.includes("waning") && s.includes("crescent"))
        kind = "waning_crescent";
      else if (s.includes("waxing") && s.includes("gibbous"))
        kind = "waxing_gibbous";
      else if (s.includes("waning") && s.includes("gibbous"))
        kind = "waning_gibbous";
      else kind = "new";
    }
  }

  const labelMap: Record<MoonKind, [string, string]> = {
    new: ["New", "Moon"],
    waxing_crescent: ["Waxing", "Crescent"],
    first_quarter: ["First", "Quarter"],
    waxing_gibbous: ["Waxing", "Gibbous"],
    full: ["Full", "Moon"],
    waning_gibbous: ["Waning", "Gibbous"],
    last_quarter: ["Last", "Quarter"],
    waning_crescent: ["Waning", "Crescent"],
  };

  return { kind, lines: labelMap[kind] };
}

const getMoonPhaseEmoji = (kind: MoonKind): string => {
  switch (kind) {
    case "new":
      return "\u{1F311}";
    case "waxing_crescent":
      return "\u{1F312}";
    case "first_quarter":
      return "\u{1F313}";
    case "waxing_gibbous":
      return "\u{1F314}";
    case "full":
      return "\u{1F315}";
    case "waning_gibbous":
      return "\u{1F316}";
    case "last_quarter":
      return "\u{1F317}";
    case "waning_crescent":
      return "\u{1F318}";
  }
};

/*
const getMoonEmojiSafe = (kind: MoonKind): string => {
  switch (kind) {
    case "new":
      return "🌑";
    case "waxing_crescent":
      return "🌒";
    case "first_quarter":
      return "🌓";
    case "waxing_gibbous":
      return "🌔";
    case "full":
      return "🌕";
    case "waning_gibbous":
      return "🌖";
    case "last_quarter":
      return "🌗";
    case "waning_crescent":
      return "🌘";
  }
};

const getMoonEmoji = (kind: MoonKind): string => {
  switch (kind) {
    case "new":
      return "🌑";
    case "waxing_crescent":
      return "🌒";
    case "first_quarter":
      return "🌓";
    case "waxing_gibbous":
      return "🌔";
    case "full":
      return "🌕";
    case "waning_gibbous":
      return "🌖";
    case "last_quarter":
      return "🌗";
    case "waning_crescent":
      return "🌘";
  }
};
*/

const MoonStat = ({
  label,
  data,
  showMap,
}: {
  label: string;
  data: string | number;
  showMap: boolean;
}) => {
  const info = getMoonPhaseInfo(data);
  const emoji = getMoonPhaseEmoji(info.kind);
  const phaseFraction = (() => {
    if (typeof data === "number" && Number.isFinite(data)) {
      return ((data % 1) + 1) % 1;
    }
    const s = String(data ?? "").trim();
    const num = Number(s);
    if (!Number.isNaN(num) && Number.isFinite(num)) return ((num % 1) + 1) % 1;
    const approx: Record<MoonKind, number> = {
      new: 0,
      waxing_crescent: 0.125,
      first_quarter: 0.25,
      waxing_gibbous: 0.375,
      full: 0.5,
      waning_gibbous: 0.625,
      last_quarter: 0.75,
      waning_crescent: 0.875,
    };
    return approx[info.kind];
  })();
  const illumination = 1 - Math.abs(phaseFraction * 2 - 1);

  return (
    <HighlightCard
      label={label}
      primary={
        <div className="flex flex-col leading-[1.05]">
          <span
            className={cn(
              "text-[0.7rem] @min-sm:text-[0.82rem] font-semibold tracking-tight",
              !showMap && "@min-4xl:text-[0.75rem] @min-5xl:text-[0.82rem]"
            )}
          >
            {info.lines[0]}
          </span>
          <span
            className={cn(
              "text-[0.7rem] @min-sm:text-[0.82rem] font-semibold tracking-tight",
              !showMap && "@min-4xl:text-[0.75rem] @min-5xl:text-[0.82rem]"
            )}
          >
            {info.lines[1]}
          </span>
        </div>
      }
      secondary={
        <span className="text-[0.72rem] font-medium text-muted-foreground">
          {Math.round(illumination * 100)}% lit
        </span>
      }
      visual={
        <VisualSlot>
          <div className="relative grid size-10 place-items-center">
            {(() => {
              const size = 40;
              const cx = size / 2;
              const cy = size / 2;
              const r = 15;
              const c = 2 * Math.PI * r;
              const lit = clamp(illumination, 0, 1);
              const dash = Math.max(0.001, lit) * c;
              const gap = Math.max(0.001, c - dash);
              return (
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  aria-hidden="true"
                  className="absolute inset-0 text-violet-600/80 dark:text-violet-400/80"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    opacity="0.18"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${gap}`}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    opacity="0.55"
                  />
                </svg>
              );
            })()}
            <div className="grid size-9 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
              <span
                role="img"
                aria-label={`${info.lines[0]} ${info.lines[1]}`}
                className="text-[1.05rem] leading-none"
              >
                {emoji}
              </span>
            </div>
          </div>
        </VisualSlot>
      }
    />
  );
};

const WindStat = ({
  data,
  label,
  maxScale,
}: {
  data: { speed: number; max: number; dir: number };
  label: string;
  maxScale?: number;
}) => {
  const dirLabel = getWindDirection(
    typeof data.dir === "number" && Number.isFinite(data.dir) ? data.dir : 0
  );
  const effMax = Math.max(1, maxScale ?? 30);
  const speedPct = clamp(data.speed / effMax, 0, 1);
  const gustPct = clamp(data.max / effMax, 0, 1);
  const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
    const a = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const windColor = (() => {
    const p = clamp(speedPct, 0, 1);
    if (p < 0.33) return "#22c55e"; // green
    if (p < 0.66) return "#f59e0b"; // amber
    return "#ef4444"; // red
  })();
  const arcPath = (cx: number, cy: number, r: number, pct: number) => {
    const p = clamp(pct, 0, 0.999);
    if (p <= 0) return "";
    const startDeg = -90;
    const endDeg = startDeg + p * 360;
    const s = polar(cx, cy, r, startDeg);
    const e = polar(cx, cy, r, endDeg);
    const laf = p > 0.5 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${laf} 1 ${e.x} ${e.y}`;
  };
  const speedD = arcPath(22, 22, 18, speedPct);
  const gustD = arcPath(22, 22, 19.5, gustPct);

  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight">
            {data.speed}
          </span>
          <span className="text-[0.65rem] @min-sm:text-[0.75rem] font-medium text-muted-foreground">
            mph
          </span>
        </>
      }
      secondary={
        <span className="text-[0.65rem] font-medium text-muted-foreground">
          Gust {data.max}
        </span>
      }
      visual={
        <VisualSlot className="text-foreground/65 dark:text-foreground/60">
          <div className="relative h-11 w-11">
            <div className="absolute left-1/2 -top-3 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80 whitespace-nowrap">
              {dirLabel}
            </div>
            <svg
              className="absolute inset-0"
              width="44"
              height="44"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.14"
              />
              {gustD ? (
                <path
                  d={gustD}
                  fill="none"
                  stroke={windColor}
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  opacity="0.24"
                />
              ) : null}
              {speedD ? (
                <path
                  d={speedD}
                  fill="none"
                  stroke={windColor}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  opacity="0.92"
                />
              ) : null}

              <circle
                cx="22"
                cy="22"
                r="6"
                fill="currentColor"
                opacity="0.05"
              />
              <circle
                cx="22"
                cy="22"
                r="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.22"
              />

              <g transform={`rotate(${data.dir ?? 0} 22 22)`}>
                {/* Tail segment (kept off the inner circle) */}
                <line
                  x1="22"
                  y1="37"
                  x2="22"
                  y2="31"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  opacity="0.65"
                  strokeLinecap="round"
                />
                {/* Head segment (separated from inner + outer rings) */}
                <path
                  d="M22 5.6 L27.6 13.7 Q28.1 14.3 27.3 14.7 L22 12.35 L16.7 14.7 Q15.9 14.3 16.4 13.7 Z"
                  fill="currentColor"
                  opacity="0.86"
                />
              </g>
            </svg>
          </div>
        </VisualSlot>
      }
    />
  );
};

// Specialized compact stats with gauges where helpful
const EnergyStat = ({
  data,
  label,
  maxScale,
}: {
  data: { value: number; unit: string };
  label: string;
  maxScale?: number;
}) => {
  // Use 100 kJ as default max (typical range: 0-100 kJ for normal conditions)
  const effectiveMax = maxScale ?? 100;
  const valuePct = Math.round(toPct(data.value, 0, effectiveMax));
  const p = clamp(valuePct / 100, 0, 1);
  const descriptor =
    valuePct < 33 ? "Low" : valuePct < 66 ? "Moderate" : "High";
  const dots = 5;
  const filled = Math.max(1, Math.min(dots, Math.round(p * (dots - 1)) + 1));

  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight">
            {data.value}
          </span>
          <span className="text-[0.75rem] font-medium text-muted-foreground">
            {data.unit}
          </span>
        </>
      }
      secondary={
        <span className="text-[0.65rem] font-medium text-muted-foreground">
          {descriptor}
        </span>
      }
      visual={
        <VisualSlot>
          <div
            aria-hidden="true"
            className="flex items-center justify-center gap-0.5"
          >
            {Array.from({ length: dots }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i < filled
                    ? "bg-gradient-to-r from-indigo-500/75 to-cyan-500/75 dark:from-indigo-400/75 dark:to-cyan-400/75"
                    : "bg-foreground/10"
                )}
              />
            ))}
          </div>
        </VisualSlot>
      }
    />
  );
};

const PressureStat = ({
  data,
  label,
  minScale,
  maxScale,
  isFull,
  showMap,
}: {
  data: { value: number; unit: string; trend?: Trend };
  label: string;
  minScale?: number;
  maxScale?: number;
  isFull?: boolean;
  showMap?: boolean;
}) => {
  // Use fixed meteorological scale for accurate low/normal/high pressure display
  // Below 29.8 = low, 29.92 = normal, 30.2 = high
  const unit = String(data.unit || "").toLowerCase();

  const defaults = (() => {
    if (unit.includes("hpa") || unit === "mb" || unit.includes("millibar")) {
      // For hPa/mb: 1008 = low (29.8 inHg), 1013 = normal (29.92 inHg), 1023 = high (30.2 inHg)
      return { min: 1000, max: 1030 } as const;
    }
    // For inHg: use fixed scale centered on meteorological standards
    return { min: 29.4, max: 30.6 } as const;
  })();

  const effMin = Number.isFinite(minScale)
    ? (minScale as number)
    : defaults.min;
  const effMax = Number.isFinite(maxScale)
    ? (maxScale as number)
    : defaults.max;
  const pct = clamp(
    (data.value - effMin) / Math.max(1e-6, effMax - effMin),
    0,
    1
  );
  const trend: Trend = data.trend ?? "steady";
  const trendLabel =
    trend === "rising" ? "Rising" : trend === "falling" ? "Falling" : "Steady";
  const displayUnit = unit === "in" ? "inHg" : data.unit;
  const formattedValue = (() => {
    if (!Number.isFinite(data.value)) return "-";
    if (unit.includes("hpa") || unit === "mb" || unit.includes("millibar")) {
      return String(Math.round(data.value));
    }
    return data.value.toFixed(2);
  })();

  const gauge = (() => {
    const cx = 22;
    const cy = 26;
    const r = 14;
    const angle = Math.PI - pct * Math.PI; // 180..0 across the top half
    const tip = {
      x: cx + (r - 2) * Math.cos(angle),
      y: cy - (r - 2) * Math.sin(angle),
    };
    return { cx, cy, r, angle, tip };
  })();

  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight text-foreground/85">
            {formattedValue}
          </span>
          <span
            className={cn(
              "hidden @min-sm:block text-[0.72rem] font-medium text-muted-foreground",
              isFull && "@min-6xl:hidden",
              !showMap && "@min-4xl:hidden @min-6xl:block"
            )}
          >
            {displayUnit}
          </span>
        </>
      }
      secondary={
        <span className="text-[0.65rem] font-medium text-muted-foreground">
          {isFull ? (
            displayUnit
          ) : (
            <>
              <span
                className={cn(
                  "hidden @min-sm:inline",
                  !showMap && "@min-4xl:hidden @min-6xl:inline"
                )}
              >
                {trendLabel}
              </span>
              <span
                className={cn(
                  "inline @min-sm:hidden",
                  !showMap && "@min-4xl:inline @min-6xl:hidden"
                )}
              >
                {displayUnit}
              </span>
            </>
          )}
        </span>
      }
      visual={
        <VisualSlot className="text-foreground/70 dark:text-foreground/65">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            aria-hidden="true"
            style={{ marginTop: -6 }}
          >
            <path
              d="M8 26 A14 14 0 0 1 36 26"
              pathLength={100}
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.16"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M8 26 A14 14 0 0 1 36 26"
              pathLength={100}
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.45"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${pct * 100} 100`}
            />
            {Array.from({ length: 9 }, (_, i) => {
              const a = Math.PI - (i / 8) * Math.PI;
              const outer = gauge.r + 1;
              const major = i % 2 === 0;
              const inner = gauge.r - (major ? 6 : 3.5);
              const x1 = gauge.cx + outer * Math.cos(a);
              const y1 = gauge.cy - outer * Math.sin(a);
              const x2 = gauge.cx + inner * Math.cos(a);
              const y2 = gauge.cy - inner * Math.sin(a);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  opacity={major ? 0.32 : 0.22}
                  strokeWidth={major ? 1.25 : 1}
                  strokeLinecap="round"
                />
              );
            })}
            <line
              x1={gauge.cx}
              y1={gauge.cy}
              x2={gauge.tip.x}
              y2={gauge.tip.y}
              stroke="currentColor"
              strokeWidth="2.6"
              opacity="0.75"
              strokeLinecap="round"
            />
            <circle
              cx={gauge.cx}
              cy={gauge.cy}
              r="2.6"
              fill="currentColor"
              opacity="0.6"
            />
            <circle
              cx={gauge.tip.x}
              cy={gauge.tip.y}
              r="2.8"
              fill="currentColor"
              opacity="0.85"
            />
            <text
              x="10"
              y="37.5"
              textAnchor="middle"
              fontSize="8"
              fontWeight="700"
              fill="currentColor"
              opacity="0.55"
            >
              lo
            </text>
            <text
              x="34"
              y="37.5"
              textAnchor="middle"
              fontSize="8"
              fontWeight="700"
              fill="currentColor"
              opacity="0.55"
            >
              hi
            </text>
          </svg>
        </VisualSlot>
      }
    />
  );
};

const TideStat = ({
  data,
  label,
  maxAbs,
  isFull,
  showMap,
}: {
  data: { value: number | string; unit: string; pct?: number; trend?: Trend };
  label: string;
  maxAbs?: number;
  isFull?: boolean;
  showMap?: boolean;
}) => {
  const numeric =
    typeof data.value === "number"
      ? data.value
      : Number(String(data.value).replace(/[^-\d.]/g, ""));
  const magnitude = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
  const fallbackPct = clamp(
    toPct(magnitude, 0, Math.max(1, maxAbs ?? (magnitude || 1))) / 100,
    0,
    1
  );
  const pct = clamp(data.pct ?? fallbackPct, 0, 1);
  const stage = pct < 0.33 ? "Low" : pct < 0.66 ? "Mid" : "High";
  const trend = data.trend ?? "steady";
  const trendLabel =
    trend === "rising" ? "Rising" : trend === "falling" ? "Falling" : "Steady";
  const tideColor = (() => {
    // Subtle intensity cue: low -> green, mid -> amber, high -> red.
    if (pct < 0.33) return "#22c55e"; // green-500
    if (pct < 0.66) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  })();
  const bandOpacity = 0.06 + pct * 0.16;

  const marker = (() => {
    const t01 = pct < 0.5 ? pct * 2 : (pct - 0.5) * 2;
    // Path: M4 24 C10 14, 18 14, 24 24 S38 34, 40 24
    if (pct < 0.5) {
      return {
        x: cubicBezier(4, 10, 18, 24, t01),
        y: cubicBezier(24, 14, 14, 24, t01),
      };
    }
    // Smooth cubic reflection for "S": control1 is reflection of previous control2 over the join point.
    // prior: p2=(18,14), join=(24,24) => reflected=(30,34)
    return {
      x: cubicBezier(24, 30, 38, 40, t01),
      y: cubicBezier(24, 34, 34, 24, t01),
    };
  })();

  return (
    <HighlightCard
      label={label}
      primary={
        <>
          <span className="text-[1.15rem] @min-sm:text-[1.3rem] font-semibold tabular-nums tracking-tight">
            {typeof data.value === "number" ? data.value : String(data.value)}
          </span>
          <span className="text-[0.75rem] font-medium text-muted-foreground">
            {data.unit}
          </span>
        </>
      }
      secondary={
        <span className="text-[0.65rem] font-medium text-muted-foreground">
          {stage}{" "}
          <span
            className={cn(
              "hidden @min-sm:inline-block",
              isFull && "@min-6xl:hidden",
              !showMap && "@min-4xl:hidden @min-5xl:inline-block"
            )}
          >
            / {trendLabel}
          </span>
        </span>
      }
      visual={
        <VisualSlot>
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            aria-hidden="true"
            style={{ color: tideColor }}
          >
            <path
              d="M4 24 C10 14, 18 14, 24 24 S38 34, 40 24"
              stroke="currentColor"
              strokeWidth="2.25"
              opacity="0.55"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M4 24 C10 14, 18 14, 24 24 S38 34, 40 24"
              stroke="currentColor"
              strokeWidth="5.5"
              opacity={bandOpacity}
              fill="none"
              strokeLinecap="round"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r="3.1"
              fill="currentColor"
              opacity="0.85"
            />
            {trend === "rising" ? (
              <path
                d="M34 13 l0 7 M34 13 l-3 3 M34 13 l3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            ) : trend === "falling" ? (
              <path
                d="M34 20 l0-7 M34 20 l-3-3 M34 20 l3-3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            ) : (
              <path
                d="M31 16 h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.45"
              />
            )}
          </svg>
        </VisualSlot>
      }
    />
  );
};

function VisualSlot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-11 place-items-center rounded-xl bg-foreground/5 ring-1 ring-border/25",
        "shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function HighlightCard({
  label,
  primary,
  secondary,
  visual,
  isFull,
  className,
}: {
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  visual?: React.ReactNode;
  isFull?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <h3 className="absolute left-0 top-0 text-[0.65rem] font-semibold tracking-wide text-muted-foreground/90">
        {label.toUpperCase()}
      </h3>
      <div
        className={cn(
          "grid h-full w-full grid-cols-[1fr_auto] items-center pt-4",
          secondary && label === "swell"
            ? "@min-xl:gap-3 @min-3xl:gap-0 @min-6xl:gap-3"
            : "gap-3",
          label === "swell" && isFull && "@min-6xl:gap-0"
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "flex min-w-0 items-baseline gap-1 leading-none",
              label === "swell" &&
                "justify-center @min-xl:justify-start @min-3xl:justify-center @min-6xl:justify-start",
              label === "swell" && isFull && "@min-6xl:justify-center"
            )}
          >
            {primary}
          </div>
          {secondary ? (
            <div
              className={cn(
                "mt-1 min-w-0 leading-none",
                label === "swell" &&
                  "flex justify-center @min-xl:justify-start @min-3xl:justify-center @min-6xl:justify-start",
                label === "swell" && isFull && "@min-6xl:justify-center"
              )}
            >
              {secondary}
            </div>
          ) : null}
        </div>
        {visual ? <div className="shrink-0">{visual}</div> : null}
      </div>
    </div>
  );
}

import {
  getWindDirection,
  type DailyConditions,
  type ForecastData,
  type TidePoint,
} from "@/lib/supabase";
import {
  useBeachForecast,
  useCurrentConditions,
  useBeachTides,
  useDailyConditions,
  useBeachById,
  usePrefetchAdjacentHours,
} from "@/lib/hooks/useBeachData";
import { useMapFilters } from "../context/MapFilterContext";

type HighlightScales = {
  windMax: number;
  energyMax: number;
  waterMin: number;
  waterMax: number;
  pressureMin: number;
  pressureMax: number;
  swellMax: number;
  tideAbsMax: number;
};

type Trend = "rising" | "falling" | "steady";

type Stat =
  | {
      label: "weather";
      weather: { temp: number; condition?: string; code?: number | null };
    }
  | { label: "water"; temp: number }
  | {
      label: "swell";
      primary: {
        height: number;
        period: number;
        wind: { dir: string; deg: number };
      };
      secondary: [
        { height: number; period: number; wind: { dir: string; deg: number } },
        { height: number; period: number; wind: { dir: string; deg: number } }
      ];
    }
  | {
      label: "tide";
      tide: {
        value: number | string;
        unit: string;
        pct?: number;
        trend?: Trend;
      };
    }
  | { label: "moon"; phase: string | number }
  | { label: "wind"; wind: { speed: number; max: number; dir: number } }
  | {
      label: "pressure";
      pressure: { value: number; unit: string; trend?: Trend };
    }
  | { label: "energy"; energy: { value: number; unit: string } };

const PLACEHOLDER_STATS: Stat[] = [
  { label: "tide", tide: { value: 0, unit: "ft" } },
  {
    label: "swell",
    primary: {
      height: 0,
      period: 0,
      wind: { dir: "-", deg: 0 },
    },
    secondary: [
      { height: 0, period: 0, wind: { dir: "-", deg: 0 } },
      { height: 0, period: 0, wind: { dir: "-", deg: 0 } },
    ],
  },
  { label: "water", temp: 0 },
  { label: "weather", weather: { temp: 0, condition: "", code: null } },
  { label: "wind", wind: { speed: 0, max: 0, dir: 0 } },
  { label: "moon", phase: "" },
  { label: "pressure", pressure: { value: 0, unit: "in" } },
  { label: "energy", energy: { value: 0, unit: "kJ" } },
];

const Highlights = ({
  beachId,
  date,
  hour,
  startIdx = 0,
  endIdx = 7,
  isFull,
  forecastRows,
}: {
  beachId?: string;
  date?: Date;
  hour?: number;
  startIdx?: number;
  endIdx?: number;
  isFull?: boolean;
  forecastRows?: ForecastData[] | null;
}) => {
  // Calculate time windows (DST-aware for Pacific timezone)
  const { startWindow, endWindow } = useMemo(() => {
    const { start, end } = getPacificDayRange(
      date instanceof Date ? date : undefined
    );
    return { startWindow: start, endWindow: end };
  }, [date]);

  // Fetch beach data
  const { data: beach } = useBeachById(beachId ?? null);
  const resolvedId = beach?.id ?? beachId;

  const { showMap } = useMapFilters();

  // Fetch all data with React Query
  const { data: current } = useCurrentConditions(resolvedId ?? null);
  // TODO(overview-perf): When ForecastDataContext is present, rely on the shared daily forecast
  // rows instead of starting a separate React Query forecast pipeline here.
  const hasPrefetched = Boolean(forecastRows?.length);
  const { data: fetchedForecast = [] } = useBeachForecast(
    resolvedId ?? null,
    startWindow,
    endWindow,
    Boolean(resolvedId) && !hasPrefetched
  );
  const forecast = useMemo<ForecastData[]>(
    () =>
      hasPrefetched ? forecastRows ?? [] : (fetchedForecast as ForecastData[]),
    [hasPrefetched, forecastRows, fetchedForecast]
  );
  const { data: tides = [], isLoading: tidesLoading } = useBeachTides(
    resolvedId ?? null,
    startWindow,
    endWindow
  );

  const county = beach?.COUNTY ?? null;
  const { data: daily, isLoading: dailyLoading } = useDailyConditions(
    county,
    date instanceof Date ? date : undefined
  ) as { data: DailyConditions | null; isLoading: boolean };

  // Dynamic scales from forecast
  const percentile = (arr: number[], p: number) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.max(
      0,
      Math.min(sorted.length - 1, Math.round((p / 100) * (sorted.length - 1)))
    );
    return sorted[idx];
  };
  const computedScales = useMemo<HighlightScales>(() => {
    const winds = forecast
      .map((r) => Number(r.conditions.windSpeed ?? 0))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const energies = forecast
      .map((r) => Number(r.surf.waveEnergy ?? 0))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const waters = forecast
      .map((r) => Number(r.conditions.waterTemp ?? 0))
      .filter((n) => Number.isFinite(n));
    const pressures = forecast
      .map((r) => Number(r.conditions.pressure ?? 0))
      .filter((n) => Number.isFinite(n));
    const swellPowers = forecast
      .map((r) => {
        const h = Number(r.swell.primary.height ?? 0);
        const p = Number(r.swell.primary.period ?? 0);
        return h * Math.sqrt(Math.max(0, p));
      })
      .filter((n) => Number.isFinite(n) && n >= 0);

    // Tide levels for intensity banding
    const tideLevels = (tides as TidePoint[])
      .map((t) => Number(t.tideLevelFt ?? 0))
      .filter((n) => Number.isFinite(n));
    const tideAbs = tideLevels.map((n) => Math.abs(n));

    return {
      windMax: winds.length ? percentile(winds, 90) : 30,
      energyMax: energies.length
        ? Math.max(100, percentile(energies, 90))
        : 100,
      waterMin: waters.length ? percentile(waters, 10) : 45,
      waterMax: waters.length ? percentile(waters, 90) : 85,
      pressureMin: pressures.length ? percentile(pressures, 10) : 29,
      pressureMax: pressures.length ? percentile(pressures, 90) : 31,
      swellMax: swellPowers.length ? percentile(swellPowers, 90) : 20,
      tideAbsMax: tideAbs.length ? percentile(tideAbs, 90) : 6,
    };
  }, [forecast, tides]);
  const [scalesState, setScalesState] =
    useState<HighlightScales>(computedScales);

  // Prefetch adjacent hours
  usePrefetchAdjacentHours(resolvedId ?? null, date ?? null, hour ?? 0);

  // Memoize expensive calculations
  const baseRow = useMemo<ForecastData | undefined>(() => {
    if (!Array.isArray(forecast) || !forecast.length) return forecast[0];

    if (typeof hour === "number") {
      // Snap to nearest 3-hour slot and find the closest row
      const targetHour = (((Math.round(hour / 3) * 3) % 24) + 24) % 24;
      return forecast.reduce((best, r) => {
        const h = new Date(r.timestamp).getHours();
        const diff = Math.abs(h - targetHour);
        const bestH = new Date(best.timestamp).getHours();
        const bestDiff = Math.abs(bestH - targetHour);
        return diff < bestDiff ? r : best;
      }, forecast[0]);
    } else if (date) {
      // if date selected but no hour, prefer midday-ish row
      return forecast[Math.min(12, forecast.length - 1)];
    }

    return forecast[0];
  }, [forecast, hour, date]);

  const statsRef = useRef<Stat[] | null>(null);
  const [statsState, setStatsState] = useState<Stat[] | null>(null);
  const dataReady =
    (forecast.length > 0 || hasPrefetched) &&
    tides.length > 0 &&
    Boolean(daily) &&
    !tidesLoading &&
    !dailyLoading;

  const computedStats = useMemo(() => {
    if (!dataReady) {
      return null;
    }

    const nextStats: Stat[] = [];

    // tide - find the tide data point closest to the selected time
    let tideValue = 0;
    let tidePct: number | undefined;
    let tideTrend: Trend | undefined;
    if (tides && tides.length > 0) {
      // Get the target timestamp from baseRow or use current time
      const now = new Date();
      const targetTime = baseRow?.timestamp
        ? new Date(baseRow.timestamp).getTime()
        : now.getTime();

      // Find the closest tide data point (track index for rise/fall cue)
      let closestIdx = 0;
      let closestDiff = Number.POSITIVE_INFINITY;
      tides.forEach((tide, idx) => {
        const diff = Math.abs(new Date(tide.timestamp).getTime() - targetTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIdx = idx;
        }
      });

      const closestTide = tides[closestIdx];
      tideValue = Number(closestTide?.tideLevelFt ?? 0);

      const tideLevels = tides
        .map((t) => Number(t?.tideLevelFt ?? NaN))
        .filter((n) => Number.isFinite(n));
      if (tideLevels.length >= 2) {
        const min = Math.min(...tideLevels);
        const max = Math.max(...tideLevels);
        tidePct =
          max > min ? clamp((tideValue - min) / (max - min), 0, 1) : 0.5;
      }

      const neighbor =
        tides[closestIdx + 1] ?? tides[closestIdx - 1] ?? closestTide;
      const neighborValue = Number(neighbor?.tideLevelFt ?? tideValue);
      const d = neighborValue - tideValue;
      const eps = 0.02; // ft
      tideTrend = Math.abs(d) < eps ? "steady" : d > 0 ? "rising" : "falling";
    }

    nextStats.push({
      label: "tide",
      tide: {
        value: Number(tideValue.toFixed(1)),
        unit: "ft",
        pct: tidePct,
        trend: tideTrend,
      },
    });

    const base = date ? baseRow : current ?? baseRow;

    // swell primary/secondary
    if (baseRow) {
      const pDir = baseRow.swell.primary.direction ?? 0;
      const sDir = baseRow.swell.secondary.direction ?? 0;
      const tDir = baseRow.swell.tertiary?.direction ?? 0;
      nextStats.push({
        label: "swell",
        primary: {
          height: Number((baseRow.swell.primary.height ?? 0).toFixed(1)),
          period: Math.round(baseRow.swell.primary.period ?? 0),
          wind: { dir: getWindDirection(pDir), deg: pDir },
        },
        secondary: [
          {
            height: Number((baseRow.swell.secondary.height ?? 0).toFixed(1)),
            period: Math.round(baseRow.swell.secondary.period ?? 0),
            wind: { dir: getWindDirection(sDir), deg: sDir },
          },
          {
            height: Number((baseRow.swell.tertiary?.height ?? 0).toFixed(1)),
            period: Math.round(baseRow.swell.tertiary?.period ?? 0),
            wind: { dir: getWindDirection(tDir), deg: tDir },
          },
        ],
      });
    }
    // water temp
    nextStats.push({
      label: "water",
      temp: Math.round(base?.conditions.waterTemp ?? 0),
    });

    // weather air temp: if a date is selected, prefer forecast row; else use current
    nextStats.push({
      label: "weather",
      weather: {
        temp: Math.round(base?.conditions.airTemp ?? 0),
        condition: "sun",
        code: base?.conditions.weather ?? null,
      },
    });

    // wind
    nextStats.push({
      label: "wind",
      wind: {
        speed: Math.round(base?.conditions.windSpeed ?? 0),
        max: Math.round(base?.conditions.windGust ?? 0),
        dir: Math.round(base?.conditions.windDirection ?? 0),
      },
    });
    // moon
    const moonPhase = daily?.moon_phase ?? null;
    if (moonPhase != null) {
      nextStats.push({ label: "moon", phase: moonPhase });
    }
    // pressure
    const pressureValue = Number(base?.conditions.pressure ?? 0);
    const baseIdx = baseRow ? forecast.indexOf(baseRow) : -1;
    const nextPressure =
      baseIdx >= 0 && forecast[baseIdx + 1]
        ? Number(forecast[baseIdx + 1]?.conditions.pressure ?? pressureValue)
        : pressureValue;
    const pressureDelta = nextPressure - pressureValue;
    const pressureTrend: Trend =
      Math.abs(pressureDelta) < 0.02
        ? "steady"
        : pressureDelta > 0
        ? "rising"
        : "falling";
    nextStats.push({
      label: "pressure",
      pressure: {
        value: Number((pressureValue ?? 0).toFixed(2)),
        unit: "in",
        trend: pressureTrend,
      },
    });
    // energy
    nextStats.push({
      label: "energy",
      energy: { value: Math.round(base?.surf.waveEnergy ?? 0), unit: "kJ" },
    });

    return nextStats;
  }, [dataReady, forecast, baseRow, current, date, tides, daily]);

  useEffect(() => {
    if (!computedStats) return;
    statsRef.current = computedStats;
    setStatsState(computedStats);
    setScalesState(computedScales);
  }, [computedStats, computedScales]);

  const displayStats = statsState ?? statsRef.current;
  const isHydrated = Boolean(displayStats);
  const effectiveStats = displayStats ?? PLACEHOLDER_STATS;
  const visibleStats = effectiveStats.slice(
    startIdx,
    Math.min(effectiveStats.length, endIdx + 1)
  );
  const displayScales = scalesState;

  return (
    <div className="w-full max-w-7xl mx-auto p-1">
      <ul
        className={cn(
          "grid grid-cols-2 @min-xl:grid-cols-3 @min-3xl:grid-cols-4 gap-2",
          !isFull && "@min-2xl:grid-cols-3 @min-4xl:grid-cols-3",
          isFull && "@min-4xl:grid-cols-4 @min-6xl:grid-cols-8"
        )}
      >
        {visibleStats.map((stat, idx) => {
          let content;
          if (!isHydrated) {
            content = (
              <div className="w-full h-[62.5px] rounded-xl bg-highlight-6/70" />
            );
          } else {
            switch (stat.label) {
              case "swell": {
                if (!stat.primary || !stat.secondary) {
                  content = null;
                  break;
                }

                const SWELL_COLORS = {
                  primary: "#1d4ed8",
                  secondary: "#0ea5e9",
                  tertiary: "#22d3ee",
                } as const;

                const dirPill = (
                  dir: string,
                  deg: number,
                  primary: boolean = false
                ) => (
                  <span
                    className={cn(
                      "grid grid-cols-[auto] @min-sm:grid-cols-[5px_30px] @min-md:grid-cols-[10px_35px_20px] @min-3xl:grid-cols-[10px_30px] @min-4xl:grid-cols-[10px_35px_20px] items-center justify-center gap-1 rounded-full border border-border/25 px-1.5 py-0.5",
                      primary ? "bg-foreground/10" : "bg-foreground/5",
                      isFull &&
                        "@min-3xl:grid-cols-[10px_35px] @min-4xl:grid-cols-[10px_35px_20px] @min-6xl:grid-cols-[auto]"
                    )}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                      className="shrink-0 text-foreground/60"
                    >
                      <g transform={`rotate(${deg ?? 0} 6 6)`}>
                        <line
                          x1="6"
                          y1="10"
                          x2="6"
                          y2="4"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                        <path
                          d="M6 2 L9 5.5 L6 4.1 L3 5.5 Z"
                          fill="currentColor"
                          opacity="0.9"
                        />
                      </g>
                    </svg>
                    <span
                      className={cn(
                        "text-[0.55rem] @min-md:text-[0.6rem] mt-0.5 @min-md:mt-0 font-semibold uppercase tracking-wide text-center hidden @min-sm:block",
                        primary ? "" : "text-muted-foreground",
                        isFull && "@min-6xl:hidden"
                      )}
                    >
                      {dir}
                    </span>
                    <span
                      className={cn(
                        "hidden @min-md:block @min-3xl:hidden @min-4xl:block text-[0.6rem]",
                        !primary && "text-muted-foreground",
                        isFull &&
                          "@min-3xl:hidden @min-4xl:block @min-6xl:hidden"
                      )}
                    >
                      {deg.toFixed(0)}&deg;
                    </span>
                  </span>
                );

                content = (
                  <HighlightCard
                    isFull={isFull}
                    label={stat.label}
                    primary={
                      <div
                        className={cn(
                          "inline-grid min-w-0 grid-cols-[0.375rem_1.75rem_1.25rem_auto] @min-md:grid-cols-[0.375rem_2.3rem_1.8rem_auto] items-center gap-x-1.5",
                          isFull &&
                            "@min-6xl:grid-cols-[0.375rem_2rem_1.5rem_auto]"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: SWELL_COLORS.primary }}
                        />
                        <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap tabular-nums">
                          <span
                            className={cn(
                              "text-[0.7rem] @min-md:text-[0.8rem] font-semibold tabular-nums tracking-tight",
                              isFull && "@min-6xl:text-[0.75rem]"
                            )}
                          >
                            {stat.primary.height.toFixed(1)}
                          </span>
                          <span className="text-[0.58rem] @min-xs:text-[0.7rem] font-medium text-muted-foreground">
                            ft
                          </span>
                        </span>
                        <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "text-[0.7rem] @min-md:text-[0.8rem] font-semibold tabular-nums tracking-tight",
                              isFull && "@min-6xl:text-[0.75rem]"
                            )}
                          >
                            {stat.primary.period}
                          </span>
                          <span className="text-[0.7rem] font-medium text-muted-foreground">
                            s
                          </span>
                        </span>
                        {dirPill(
                          stat.primary.wind.dir,
                          stat.primary.wind.deg,
                          true
                        )}
                      </div>
                    }
                    secondary={
                      <div className="-mt-0.5 grid gap-y-0.5">
                        <div
                          className={cn(
                            "inline-grid min-w-0 grid-cols-[0.375rem_1.75rem_1.25rem_auto] @min-md:grid-cols-[0.375rem_2.3rem_1.8rem_auto] items-center gap-x-1.5",
                            isFull &&
                              "@min-6xl:grid-cols-[0.375rem_2rem_1.5rem_auto]"
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: SWELL_COLORS.secondary }}
                          />
                          <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap tabular-nums">
                            <span
                              className={cn(
                                "text-[0.7rem] @min-md:text-[0.8rem] font-medium tabular-nums tracking-tight text-foreground/80",
                                isFull && "@min-6xl:text-[0.75rem]"
                              )}
                            >
                              {stat.secondary[0].height.toFixed(1)}
                            </span>
                            <span className="text-[0.58rem] @min-xs:text-[0.7rem] font-medium text-muted-foreground">
                              ft
                            </span>
                          </span>
                          <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap">
                            <span
                              className={cn(
                                "text-[0.7rem] @min-md:text-[0.8rem] font-medium tabular-nums tracking-tight text-muted-foreground",
                                isFull && "@min-6xl:text-[0.75rem]"
                              )}
                            >
                              {stat.secondary[0].period}
                            </span>
                            <span className="text-[0.7rem] font-medium text-muted-foreground">
                              s
                            </span>
                          </span>
                          {dirPill(
                            stat.secondary[0].wind.dir,
                            stat.secondary[0].wind.deg
                          )}
                        </div>

                        <div
                          className={cn(
                            "inline-grid min-w-0 grid-cols-[0.375rem_1.75rem_1.25rem_auto] @min-md:grid-cols-[0.375rem_2.3rem_1.8rem_auto] items-center gap-x-1.5",
                            isFull &&
                              "@min-6xl:grid-cols-[0.375rem_2rem_1.5rem_auto]"
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: SWELL_COLORS.tertiary }}
                          />
                          <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap tabular-nums">
                            <span
                              className={cn(
                                "text-[0.7rem] @min-md:text-[0.8rem] font-medium tabular-nums tracking-tight text-foreground/80",
                                isFull && "@min-6xl:text-[0.75rem]"
                              )}
                            >
                              {stat.secondary[1].height.toFixed(1)}
                            </span>
                            <span className="text-[0.58rem] @min-xs:text-[0.7rem] font-medium text-muted-foreground">
                              ft
                            </span>
                          </span>
                          <span className="inline-flex w-full items-baseline justify-start gap-0.5 whitespace-nowrap">
                            <span
                              className={cn(
                                "text-[0.7rem] @min-md:text-[0.8rem] font-medium tabular-nums tracking-tight text-muted-foreground",
                                isFull && "@min-6xl:text-[0.75rem]"
                              )}
                            >
                              {stat.secondary[1].period}
                            </span>
                            <span className="text-[0.7rem] font-medium text-muted-foreground">
                              s
                            </span>
                          </span>
                          {dirPill(
                            stat.secondary[1].wind.dir,
                            stat.secondary[1].wind.deg
                          )}
                        </div>
                      </div>
                    }
                    visual={
                      <div
                        aria-hidden="true"
                        className={cn(
                          "hidden @min-xl:block @min-3xl:hidden relative -mt-4 overflow-hidden rounded-xl bg-foreground/5 ring-1 ring-border/25 w-[8rem] @min-xl:w-[8rem] @min-2xl:w-[12rem] @min-6xl:w-[8rem]",
                          "shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
                          isFull ? "" : "@min-6xl:block"
                        )}
                      >
                        <div className="flex h-full flex-col gap-1.5 px-2 py-2">
                          <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground/90 leading-none">
                            SWELL MIX
                          </div>
                          {(() => {
                            const swells = [
                              {
                                key: "primary",
                                color: SWELL_COLORS.primary,
                                height: Math.max(0, stat.primary.height),
                                period: Math.max(1, stat.primary.period),
                                size: 7,
                                opacity: 0.98,
                              },
                              {
                                key: "secondary",
                                color: SWELL_COLORS.secondary,
                                height: Math.max(0, stat.secondary[0].height),
                                period: Math.max(1, stat.secondary[0].period),
                                size: 7,
                                opacity: 0.9,
                              },
                              {
                                key: "tertiary",
                                color: SWELL_COLORS.tertiary,
                                height: Math.max(0, stat.secondary[1].height),
                                period: Math.max(1, stat.secondary[1].period),
                                size: 7,
                                opacity: 0.86,
                              },
                            ] as const;

                            const heightMax = Math.max(
                              1,
                              ...swells.map((s) => s.height)
                            );
                            const periodMax = Math.max(
                              1,
                              ...swells.map((s) => s.period)
                            );

                            const trackGradient =
                              "bg-gradient-to-r from-indigo-500/45 via-sky-400/35 to-cyan-300/30 dark:from-indigo-400/35 dark:via-sky-400/25 dark:to-cyan-300/20";

                            const computeDotOffsets = (pcts: number[]) => {
                              const sorted = pcts
                                .map((p, i) => ({ p, i }))
                                .sort((a, b) => a.p - b.p);
                              const thresholdPct = 4;
                              const collide01 =
                                Math.abs(sorted[1]!.p - sorted[0]!.p) <
                                thresholdPct;
                              const collide12 =
                                Math.abs(sorted[2]!.p - sorted[1]!.p) <
                                thresholdPct;
                              if (!collide01 && !collide12)
                                return [0, 0, 0] as const;

                              const offsets = [0, 0, 0];
                              offsets[sorted[0]!.i] = 0;
                              offsets[sorted[1]!.i] = 2;
                              offsets[sorted[2]!.i] = -2;
                              return offsets as const;
                            };

                            const mixPowers = swells.map(
                              (s) => s.height * s.period
                            );
                            const mixTotal =
                              mixPowers.reduce((sum, v) => sum + v, 0) || 1;
                            const mixPercents = mixPowers.map(
                              (v) => (v / mixTotal) * 100
                            );

                            const Track = ({
                              kind,
                              max,
                            }: {
                              kind: "height" | "period";
                              max: number;
                            }) => (
                              <div className="relative h-[3px] w-full overflow-visible">
                                <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-foreground/10 ring-1 ring-foreground/5">
                                  <div
                                    className={cn(
                                      "absolute inset-0 opacity-25",
                                      trackGradient
                                    )}
                                  />
                                </div>
                                {(() => {
                                  const pcts = swells.map((s) => {
                                    const value =
                                      kind === "height" ? s.height : s.period;
                                    return toPct(value, 0, max);
                                  });
                                  const offsets = computeDotOffsets(pcts);
                                  return swells.map((s, idx) => {
                                    const size = Math.max(3, s.size - 1);
                                    return (
                                      <span
                                        key={`${kind}-${s.key}`}
                                        className="absolute top-1/2 rounded-full shadow-sm ring-1 ring-background/70 dark:ring-background/40"
                                        style={{
                                          left: `${pcts[idx]}%`,
                                          width: size,
                                          height: size,
                                          background: s.color,
                                          opacity: s.opacity,
                                          transform: `translate(-50%, -50%) translateY(${offsets[idx]}px)`,
                                        }}
                                      />
                                    );
                                  });
                                })()}
                              </div>
                            );

                            return (
                              <div className="flex flex-1 flex-col gap-1.5">
                                <div className="h-[5px] w-full overflow-hidden rounded-full bg-foreground/10 ring-1 ring-foreground/5">
                                  <div className="flex h-full w-full">
                                    {swells.map((s, idx) => (
                                      <div
                                        key={`mix-${s.key}`}
                                        className="h-full"
                                        style={{
                                          width: `${mixPercents[idx]}%`,
                                          background: s.color,
                                          opacity: 0.55,
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-1 grid grid-cols-[0.9rem_1fr] grid-rows-2 items-center gap-x-2 gap-y-0 text-foreground/70 dark:text-foreground/65">
                                  <div className="row-start-1 col-start-1 grid place-items-center text-foreground/55 dark:text-foreground/50">
                                    <svg
                                      viewBox="0 0 16 16"
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="M1.75 10.75c2.1 0 2.1-2.5 4.2-2.5s2.1 2.5 4.2 2.5 2.1-2.5 4.2-2.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        opacity="0.95"
                                      />
                                      <path
                                        d="M1.75 6.75c2.1 0 2.1-2.5 4.2-2.5s2.1 2.5 4.2 2.5 2.1-2.5 4.2-2.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.4"
                                        strokeLinecap="round"
                                        opacity="0.55"
                                      />
                                    </svg>
                                  </div>
                                  <div className="row-start-1 col-start-2">
                                    <Track kind="height" max={heightMax} />
                                  </div>
                                  <div className="row-start-2 col-start-1 grid place-items-center text-foreground/55 dark:text-foreground/50">
                                    <svg
                                      viewBox="0 0 16 16"
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    >
                                      <circle
                                        cx="8"
                                        cy="8"
                                        r="5.25"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        opacity="0.85"
                                      />
                                      <path
                                        d="M8 5.6v2.9l2.2 1.25"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity="0.95"
                                      />
                                    </svg>
                                  </div>
                                  <div className="row-start-2 col-start-2">
                                    <Track kind="period" max={periodMax} />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    }
                  />
                );
                break;
              }
              case "weather":
                content = stat.weather && (
                  <WeatherStat
                    temp={stat.weather.temp}
                    label={stat.label}
                    weatherCode={stat.weather.code}
                    isFull={isFull}
                  />
                );
                break;
              case "water":
                content = (
                  <WaterStat
                    temp={stat.temp}
                    min={displayScales?.waterMin}
                    max={displayScales?.waterMax}
                  />
                );
                break;

              case "moon": {
                const hasPhase =
                  stat.phase !== null && stat.phase !== undefined;
                content = hasPhase ? (
                  <MoonStat
                    data={stat.phase}
                    label={stat.label}
                    showMap={showMap}
                  />
                ) : (
                  <HighlightCard
                    label={stat.label}
                    primary={
                      <span className="text-[0.9rem] font-semibold text-muted-foreground">
                        Unavailable
                      </span>
                    }
                    visual={
                      <VisualSlot>
                        <MoonStar className="h-5 w-5 text-violet-600/70 dark:text-violet-400/70" />
                      </VisualSlot>
                    }
                  />
                );
                break;
              }
              case "wind":
                content = stat.wind && (
                  <WindStat
                    data={stat.wind}
                    label={stat.label}
                    maxScale={displayScales.windMax}
                  />
                );
                break;
              case "pressure":
                content = stat.pressure && (
                  <PressureStat
                    data={stat.pressure}
                    label={stat.label}
                    minScale={displayScales.pressureMin}
                    maxScale={displayScales.pressureMax}
                    isFull={isFull}
                    showMap={showMap}
                  />
                );
                break;
              case "energy":
                content = stat.energy && (
                  <EnergyStat
                    data={stat.energy}
                    label={stat.label}
                    maxScale={displayScales.energyMax}
                  />
                );
                break;
              case "tide":
                content = stat.tide && (
                  <TideStat
                    data={stat.tide}
                    label={stat.label}
                    maxAbs={displayScales.tideAbsMax}
                    isFull={isFull}
                    showMap={showMap}
                  />
                );
                break;
            }
          }
          if (content) {
            return (
              <li
                key={`${stat.label}-${idx}`}
                className={cn(
                  "relative highlight-card shadow-even p-2.5 min-h-[74px] @min-3xl:min-h-[70px] @min-4xl:min-h-[95px]",
                  "transition-colors duration-200 motion-reduce:transition-none",
                  "hover:bg-highlight-7/70 active:bg-highlight-7/80",
                  stat.label === "swell" &&
                    "col-span-1 @min-xl:col-span-2 @min-3xl:col-span-1",
                  stat.label === "swell" && !isFull && "@min-4xl:col-span-2",
                  stat.label === "swell" && isFull && "@min-xl:col-span-2",
                  !isHydrated && "animate-pulse motion-reduce:animate-none"
                )}
              >
                <div className="flex-1 flex items-center justify-center gap-1 h-full">
                  {content}
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

export default Highlights;
