"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { cn, getPacificDayRange } from "@/lib/utils";
import SwellStat from "../general/Stats/SwellStat";

import {
  Sun,
  Droplets,
  MoonStar,
  Wind,
  CircleGauge,
  Waves,
  Atom,
  Shell,
  Cloud as CloudIcon,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  MousePointer2 as ArrowIcon,
  Snowflake,
} from "lucide-react";

// Module-scope helpers and segmented gauge for compact, legible intensity visuals
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const toPct = (v: number, min: number, max: number) =>
  clamp(((v - min) / Math.max(1, max - min)) * 100, 0, 100);

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

type WeatherGaugeConfig = {
  valuePct: number;
  segments?: number;
  showCaret?: boolean;
} | null;

const WeatherStat = ({
  temp,
  condition,
  label,
  weatherCode,
  gaugeConfig = null,
}: {
  temp: number;
  condition?: string;
  label: string;
  weatherCode?: number | null;
  gaugeConfig?: WeatherGaugeConfig;
}) => {
  // Function to get weather icon based on WMO code
  const getWeatherIcon = (code: number | null) => {
    if (label === "water")
      return <Droplets className="w-5 h-5" color="#1CACD4" />;
    if (code == null)
      return <Sun className="w-5 h-5" strokeWidth={3} color="#fbbf24" />;

    // WMO code groupings
    if (code === 0)
      return <Sun className="w-5 h-5" strokeWidth={3} color="#fbbf24" />; // Clear - yellow sun
    if ([1, 2, 3].includes(code))
      return <CloudSun className="w-5 h-5" color="#bdbdbdff" />; // Partly cloudy/overcast
    if ([45, 48].includes(code))
      return <CloudIcon className="w-5 h-5" color="#bdbdbdff" />; // Fog
    if ([51, 53, 55].includes(code))
      return <CloudDrizzle className="w-5 h-5" color="#66a3ffff" />; // Drizzle
    if ([56, 57].includes(code))
      return <CloudDrizzle className="w-5 h-5" color="#66a3ffff" />; // Freezing drizzle
    if ([61, 63, 65].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Rain
    if ([66, 67].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Freezing rain
    if ([71, 73, 75].includes(code))
      return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow
    if (code === 77) return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow grains
    if ([80, 81, 82].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Showers
    if ([85, 86].includes(code))
      return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow showers
    if ([95, 96, 99].includes(code))
      return <CloudLightning className="w-5 h-5" color="#ff8d6bff" />; // Thunderstorm/hail

    return <CloudIcon className="w-5 h-5" color="#bdbdbdff" />;
  };

  return (
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-0.5">
        {getWeatherIcon(weatherCode ?? null)}
        <span className="text-2xl font-semibold inline-flex items-start">
          <span>{temp}</span>
          <span className="text-xs font-normal ml-0.5">&deg;F</span>
        </span>
      </div>
      {gaugeConfig && label !== "water" && (
        <div className="w-full px-2 mt-2">
          <SegmentedGauge
            valuePct={gaugeConfig.valuePct}
            segments={gaugeConfig.segments ?? 5}
            showCaret={gaugeConfig.showCaret ?? true}
          />
        </div>
      )}
    </HighlightCard>
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
    <HighlightCard label={label}>
      <span className="text-2xl font-semibold rounded-md pb-5">
        {data.value}
        <span className="text-sm font-normal">{data.unit}</span>
      </span>
    </HighlightCard>
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

const MoonStat = ({
  label,
  data,
}: {
  label: string;
  data: string | number;
}) => {
  const info = getMoonPhaseInfo(data);
  const MoonImg = () => {
    return (
      <span
        role="img"
        aria-label={`${info.lines[0]} ${info.lines[1]}`}
        style={{ fontSize: 26, lineHeight: 1 }}
      >
        {getMoonEmoji(info.kind)}
      </span>
    );
  };
  return (
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-0.5">
        <MoonImg />
        <div className="flex flex-col font-semibold">
          <span className="@min-3xl:text-[0.7rem] text-[0.8rem] @min-4xl:text-[0.8rem] -mb-1">
            {info.lines[0]}
          </span>
          <span className="@min-3xl:text-[0.7rem] text-[0.8rem] @min-4xl:text-[0.8rem]">
            {info.lines[1]}
          </span>
        </div>
      </div>
    </HighlightCard>
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
  const rotation = typeof data.dir === "number" ? data.dir - 315 : 0;
  const dirLabel = getWindDirection(
    typeof data.dir === "number" && Number.isFinite(data.dir) ? data.dir : 0
  );
  const valuePct = Math.round(
    toPct(data.speed, 0, Math.max(1, maxScale ?? 30))
  );
  return (
    <HighlightCard label={label}>
      <div className="flex items-center w-full px-2 justify-center">
        <div className="relative w-9 h-9 @min-3xl:w-6.5 @min-3xl:h-6.5 @min-4xl:w-9 @min-4xl:h-9 mb-0.5">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${`hsl(${Math.max(
                0,
                Math.min(140, 140 - valuePct * 1.4)
              )} 75% 45%)`} ${valuePct}%, var(--border) ${valuePct}% 100%)`,
            }}
          />
          <div className="absolute inset-[4px] @min-3xl:inset-[3px] @min-4xl:inset-[4px] rounded-full bg-background dark:bg-highlight-4 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center leading-none">
              <div
                style={{
                  transform: `rotate(${rotation}deg)`,
                  display: "inline-block",
                }}
              >
                <ArrowIcon className="w-4 h-4 @min-3xl:w-3.5 @min-3xl:h-3.5 @min-4xl:w-4 @min-4xl:h-4 fill-foreground/20 text-foreground/50" />
              </div>
              {/* <span className="text-[0.6rem] font-medium mt-[3px] mb-0.5">
                {dirLabel}
              </span> */}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 whitespace-nowrap min-w-15 justify-center">
          <span className="text-[21.5px] font-semibold tabular-nums">
            {data.speed}
          </span>
          <span className="mb-0.5 flex flex-col -space-y-0.5 leading-tight text-left">
            <span className="text-[0.7rem] font-medium">{data.max}</span>
            <span className="text-[0.6rem]">mph</span>
          </span>
        </div>
      </div>
    </HighlightCard>
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

  return (
    <HighlightCard label={label}>
      <span className="text-2xl font-semibold rounded-md pb-1">
        {data.value}
        <span className="text-sm font-normal ml-1">{data.unit}</span>
      </span>
      <div className="w-full mt-1 max-w-40">
        <SegmentedGauge
          className="w-full"
          valuePct={valuePct}
          segments={5}
          showCaret
          colors={["#22c55e", "#84cc16", "#eab308", "#f59e0b", "#ef4444"]}
          height={8}
        />
      </div>
    </HighlightCard>
  );
};

const PressureStat = ({
  data,
  label,
  minScale,
  maxScale,
}: {
  data: { value: number; unit: string };
  label: string;
  minScale?: number;
  maxScale?: number;
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

  const effMin = defaults.min;
  const effMax = defaults.max;

  const ClientPressureDial = useMemo(
    () =>
      dynamic(() => import("./PressureDial"), {
        ssr: false,
      }),
    []
  );

  return (
    <HighlightCard label={label}>
      <div className="w-full flex items-center justify-center">
        <ClientPressureDial
          value={data.value}
          min={effMin}
          max={effMax}
          unit={data.unit}
          size={75}
          thickness={6}
          focusDeg={14}
        />
      </div>
    </HighlightCard>
  );
};

const TideStat = ({
  data,
  label,
  maxAbs,
}: {
  data: { value: number | string; unit: string };
  label: string;
  maxAbs?: number;
}) => {
  const numeric =
    typeof data.value === "number"
      ? data.value
      : Number(String(data.value).replace(/[^-\d.]/g, ""));
  const magnitude = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
  const valuePct = Math.round(
    toPct(magnitude, 0, Math.max(1, maxAbs ?? (magnitude || 1)))
  );
  return (
    <HighlightCard label={label}>
      <span className="text-2xl font-semibold rounded-md pb-1">
        {typeof data.value === "number" ? data.value : String(data.value)}
        <span className="text-sm font-normal ml-1">{data.unit}</span>
      </span>
      <div className="w-full mt-1 max-w-40">
        <SegmentedGauge
          className="w-full"
          valuePct={valuePct}
          segments={5}
          showCaret
          colors={["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"]}
          height={8}
        />
      </div>
    </HighlightCard>
  );
};

const HighlightCard = ({
  children,
  label,
  className,
  statVisual,
}: {
  children: React.ReactNode;
  label: string;
  statVisual?: React.ReactNode;
  className?: string;
}) => {
  const iconMap: Record<string, { icon: React.ReactNode; bgColor: string }> = {
    wind: {
      icon: <Wind size={16} className="text-gray-700" />,
      bgColor: "bg-gray-50",
    },
    water: {
      icon: <Droplets size={16} className="text-blue-400" />,
      bgColor: "bg-blue-100",
    },
    weather: {
      icon: <Sun size={16} className="text-orange-500" />,
      bgColor: "bg-orange-100",
    },
    moon: {
      icon: <MoonStar size={16} className="text-purple-600" />,
      bgColor: "bg-purple-100",
    },
    pressure: {
      icon: <CircleGauge size={16} className="text-yellow-800" />,
      bgColor: "bg-yellow-100",
    },
    swell: {
      icon: <Shell size={16} className="text-blue-900" />,
      bgColor: "bg-blue-200",
    },
    tide: {
      icon: <Waves size={16} className="text-blue-500" />,
      bgColor: "bg-blue-100",
    },
    energy: {
      icon: <Atom size={16} className="text-red-400" />,
      bgColor: "bg-red-100",
    },
  };
  return (
    <div
      className={cn(
        "flex flex-col gap-4 items-center",
        (label === "tide" || label === "energy") && "w-full",
        className
        // label === "swell" && "@min-lg:w-full @min-2xl:w-auto @min-5xl:w-full"
      )}
    >
      <h3 className="absolute top-2 left-2 text-muted-foreground text-[0.7rem] font-medium whitespace-nowrap">
        {label.toUpperCase()}
      </h3>
      {/* {statVisual && <div className="absolute top-2 right-1">{statVisual}</div>} */}
      {/* <div className="p-0.5 rounded-full bg-highlight-5/50 border border-border/40 absolute -top-3 right-1">
        <div
          className={cn(
            "flex justify-center items-center w-8 h-8 rounded-full",
            iconMap[label].bgColor
          )}
        >
          {iconMap[label].icon}
        </div>
      </div> */}
      <div
        className={cn(
          "w-full px-2",
          label === "swell" || label === "pressure"
            ? "mt-3 @min-md:mt-2"
            : "mt-2",
          label === "pressure" && "mb-1.5"
        )}
      >
        {children}
      </div>
    </div>
  );
};

import { getWindDirection } from "@/lib/supabase";
import {
  useBeachForecast,
  useCurrentConditions,
  useBeachTides,
  useDailyConditions,
  useBeachById,
  usePrefetchAdjacentHours,
} from "@/lib/hooks/useBeachData";
import type { ForecastData } from "@/lib/supabase";
import GradientCircle from "../general/Stats/GradientCircle";
import { clampIntensity } from "./Summary";

type HighlightScales = any;

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
  | { label: "tide"; tide: { value: number | string; unit: string } }
  | { label: "moon"; phase: string | number }
  | { label: "wind"; wind: { speed: number; max: number; dir: number } }
  | { label: "pressure"; pressure: { value: number; unit: string } }
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

  // Fetch all data with React Query
  const { data: current } = useCurrentConditions(resolvedId ?? null);
  const hasPrefetched = Boolean(forecastRows?.length);
  const { data: fetchedForecast = [] } = useBeachForecast(
    resolvedId ?? null,
    startWindow,
    endWindow,
    Boolean(resolvedId) && !hasPrefetched
  );
  const forecast = useMemo(
    () => (hasPrefetched ? forecastRows ?? [] : fetchedForecast),
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
  );

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
      .map((r: any) => Number(r?.conditions?.windSpeed ?? 0))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const energies = forecast
      .map((r: any) => Number(r?.surf?.waveEnergy ?? 0))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const waters = forecast
      .map((r: any) => Number(r?.conditions?.waterTemp ?? 0))
      .filter((n) => Number.isFinite(n));
    const pressures = forecast
      .map((r: any) => Number(r?.conditions?.pressure ?? 0))
      .filter((n) => Number.isFinite(n));
    const swellPowers = forecast
      .map((r: any) => {
        const h = Number(r?.swell?.primary?.height ?? 0);
        const p = Number(r?.swell?.primary?.period ?? 0);
        return h * Math.sqrt(Math.max(0, p));
      })
      .filter((n) => Number.isFinite(n) && n >= 0);

    // Tide levels for intensity banding
    const tideLevels = (tides as any[])
      .map((t) => Number(t?.tideLevelFt ?? 0))
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
  const baseRow = useMemo(() => {
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
    if (tides && tides.length > 0) {
      // Get the target timestamp from baseRow or use current time
      const now = new Date();
      const targetTime = baseRow?.timestamp
        ? new Date(baseRow.timestamp).getTime()
        : now.getTime();

      // Find the closest tide data point
      const closestTide = tides.reduce((closest, tide) => {
        const diff = Math.abs(new Date(tide.timestamp).getTime() - targetTime);
        const closestDiff = Math.abs(
          new Date(closest.timestamp).getTime() - targetTime
        );
        return diff < closestDiff ? tide : closest;
      }, tides[0]);

      tideValue = closestTide.tideLevelFt ?? 0;
    }

    nextStats.push({
      label: "tide",
      tide: {
        value: Number(tideValue.toFixed(1)),
        unit: "ft",
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
    if (daily?.moon_phase != null) {
      nextStats.push({ label: "moon", phase: (daily as any).moon_phase });
    }
    // pressure
    nextStats.push({
      label: "pressure",
      pressure: {
        value: Number((base?.conditions.pressure ?? 0).toFixed(2)),
        unit: "in",
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
    <div className="w-full max-w-7xl mx-auto p-1.5">
      <ul
        className={cn(
          "grid grid-cols-2 @min-md:grid-cols-3 @min-2xl:grid-cols-4 gap-2.5",
          !isFull && "@min-3xl:grid-cols-3",
          isFull && "@min-4xl:grid-cols-4 @min-6xl:grid-cols-8"
        )}
      >
        {visibleStats.map((stat, idx) => {
          let content;
          if (!isHydrated) {
            content = (
              <div className="w-full h-16 rounded-xl bg-highlight-6/70" />
            );
          } else {
            switch (stat.label) {
              case "swell":
                content = stat.primary && stat.secondary && (
                  <div
                    className={cn(
                      "flex justify-between items-center gap-0 @min-lg:w-full @min-2xl:w-auto",
                      !isFull && "@min-5xl:w-full"
                    )}
                  >
                    <HighlightCard
                      className={cn(
                        "@min-lg:w-47 @min-2xl:w-auto",
                        !isFull && "@min-5xl:w-47"
                      )}
                      label={stat.label}
                    >
                      <ul>
                        <li>
                          <SwellStat
                            primary
                            data={stat.primary}
                            small
                            isFull={isFull}
                          />
                        </li>
                        <li>
                          <SwellStat
                            data={stat.secondary[0]}
                            small
                            isFull={isFull}
                          />
                        </li>
                        <li>
                          <SwellStat
                            data={stat.secondary[1]}
                            small
                            isFull={isFull}
                          />
                        </li>
                      </ul>
                    </HighlightCard>
                    <div
                      className={cn(
                        "relative shadow-even border border-border/20 font-semibold @container hidden @min-lg:block @min-2xl:hidden -mt-2 bg-highlight-6 py-3 px-3 flex-1 rounded-md text-center max-w-40",
                        isFull ? "@min-6xl:hidden" : "@min-5xl:block"
                      )}
                    >
                      <GradientCircle
                        className="mx-auto @min-[110px]:mx-0"
                        condition="surf"
                        data={stat.primary.height}
                        percentage={clampIntensity(stat.primary.height, 12)}
                        size={50}
                        strokeWidth={4}
                        showIcon={false}
                        content={
                          <span className="flex flex-col items-center mt-1">
                            <span className="text-[0.9rem]">
                              {stat.primary.height.toFixed(1)}
                            </span>
                            <span className="text-[0.55rem] -mt-1">ft</span>
                          </span>
                        }
                      />
                      <span className="hidden @min-[110px]:block text-[0.7rem] absolute right-2.5 bottom-2">
                        PRIMARY
                      </span>
                      <span className="hidden @min-[110px]:block p-0.5 rounded-full bg-highlight-5/50 border border-border/40 absolute -top-3 right-1">
                        <span className="flex justify-center items-center w-6 h-6 rounded-full bg-blue-100">
                          <Waves size={16} className="text-blue-500" />
                        </span>
                      </span>
                    </div>
                  </div>
                );
                break;
              case "weather":
                content = stat.weather && (
                  <WeatherStat
                    temp={stat.weather.temp}
                    condition={stat.weather.condition}
                    label={stat.label}
                    weatherCode={stat.weather.code}
                  />
                );
                break;
              case "water":
                content = stat.temp && (
                  <WeatherStat temp={stat.temp} label={stat.label} />
                );
                break;

              case "moon": {
                const hasPhase =
                  stat.phase !== null && stat.phase !== undefined;
                content = hasPhase ? (
                  <MoonStat data={stat.phase as any} label={stat.label} />
                ) : (
                  <HighlightCard label={stat.label}>
                    <div className="flex flex-col items-center text-sm text-muted-foreground">
                      <span>Moon data unavailable</span>
                    </div>
                  </HighlightCard>
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
                  "relative highlight-card shadow-even min-h-22 @min-3xl:min-h-20 @min-4xl:min-h-22",
                  isFull && "@min-4xl:min-h-25",
                  stat.label === "swell" &&
                    "col-span-1 @min-md:col-span-2 @min-2xl:col-span-1",
                  stat.label === "swell" && !isFull && "@min-3xl:col-span-2",
                  stat.label === "swell" && isFull && "@min-md:col-span-2",
                  !isHydrated && "animate-pulse"
                )}
              >
                <div className="flex-1 flex items-center justify-center gap-1 mt-1 h-full">
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
