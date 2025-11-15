"use client";

import * as React from "react";

type Props = {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
  thickness?: number;
  focusDeg?: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export default function PressureDial({
  value,
  min,
  max,
  unit,
  size = 84,
  thickness = 10,
  focusDeg = 16,
}: Props) {
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

  const baseD = arcPath(startDeg, startDeg + spanDeg);
  const half = Math.max(2, focusDeg / 2);
  const ns = Math.max(startDeg, angle - half);
  const ne = Math.min(startDeg + spanDeg, angle + half);
  const needleD = arcPath(ns, ne);

  const ticks: React.ReactNode[] = [];
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

  const ax = center + r * Math.cos(toRad(angle));
  const ay = center + r * Math.sin(toRad(angle));
  const labelRadius = r - thickness * 0.5 - 6;
  const labelY = center + Math.max(10, thickness * 0.7) + 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-foreground -mb-7"
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
        const ri = r - thickness;
        const ro = r + thickness * 0.6;
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
        y={center - 8}
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
        y={center + 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="11"
        opacity={0.7}
      >
        {unit}
      </text>
      <text
        x={center - labelRadius - 4}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fill="currentColor"
        opacity={0.6}
      >
        lo
      </text>
      <text
        x={center + labelRadius + 4}
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
