"use client";

import React from "react";
import { Waves, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

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
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({ directions, labels, scale = 1, className = "", variant = "full" }) => {
  const size = 160 * scale;
  const center = size / 2;
  const rings: Array<{
    key: "primary" | "secondary" | "tertiary";
    radius: number;
    color: string;
  }> = [
    // Slightly spaced-out radii to reduce cross-ring arrow overlap
    { key: "primary", radius: 40 * scale, color: "#1d4ed8" }, // deep blue
    { key: "secondary", radius: 64 * scale, color: "#0ea5e9" }, // sky
    { key: "tertiary", radius: 88 * scale, color: "#22d3ee" }, // cyan
  ];

  const renderArrow = (
    direction: number,
    radius: number,
    color: string,
    kind?: "primary" | "secondary" | "tertiary"
  ): React.ReactNode => {
    const normalized = ((direction % 360) + 360) % 360;
    const isPreview = variant === "preview";
    // Pointer-like, softly-rounded arrowhead sized to fit icon snugly
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    const connectorLen = 1.5 * scale;
    const badgeRadius = 7 * scale;
    // Place badge to the side so it stays out of adjacent rings
    const badgeOffsetX = arrowWidth * 0.62;
    const badgeCy = baseY - headLen * 0.04;
    return (
      <g
        key={`${color}-${radius}`}
        transform={`rotate(${normalized} ${center} ${center})`}
      >
        <g transform={`translate(${center} ${center - radius})`}>
          {/* Head: pointer-like arrow with gentle rounding */}
          <path
            d={`M 0 ${tipY}
                L ${arrowWidth / 2} ${shoulderY}
                L ${arrowWidth * 0.38} ${baseY}
                Q 0 ${baseY + headLen * 0.1} ${-arrowWidth * 0.38} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {/* Swell icon rotates with arrow; badge stays upright (hidden in preview) */}
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
                  {/* <line
                    x1={0}
                    y1={baseY}
                    x2={badgeOffsetX * 0.82}
                    y2={badgeCy - badgeRadius * 0.65}
                    stroke="#ffffff"
                    strokeWidth={2 * scale}
                    strokeLinecap="round"
                    opacity={0.8}
                  /> */}
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
      {/* Path defs for curved labels around rings (cw and ccw for flipping) */}
      <defs>
        {rings.map(({ key, radius }) => (
          <g key={`ring-defs-${key}`}>
            <path
              id={`ring-path-${key}`}
              d={`M ${center - radius},${center} a ${radius},${radius} 0 1,1 ${
                2 * radius
              },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`}
            />
            <path
              id={`ring-path-${key}-rev`}
              d={`M ${center - radius},${center} a ${radius},${radius} 0 1,0 ${
                2 * radius
              },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`}
            />
          </g>
        ))}
      </defs>
      {rings.map(({ key, radius, color }) => {
        const dir = directions[key];
        // Default to 0 (North) if direction is null/undefined
        const direction = typeof dir === "number" && !isNaN(dir) ? dir : 0;
        // Curved label: compute startOffset along ring path and optionally flip side
        const needsFlip = direction > 90 && direction < 270;
        const circ = 2 * Math.PI * radius;
        const baseAngle = (direction + 90) % 360;
        // Spacing from arrowhead and additional offset when flipped (keep label away from arrow)
        const delta = 45 * scale;
        const extra = needsFlip ? -100 * scale : 0;
        const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center of label/gap
        const useRev = needsFlip;
        const centerOffset = useRev ? circ - baseOffset : baseOffset;
        const labelText = labels?.[key] ?? null;
        // Build path commands for ring (normal and reversed)
        const pathD = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,1 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`;
        const pathDRev = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,0 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`;
        // Estimate gap length and apply stroke-dasharray to remove ring segment under label
        const fontSize = 11 * scale;
        const estimate = (t: string | null | undefined) =>
          (t?.length ?? 0) * fontSize * 0.48;
        const labelLen = labelText ? estimate(labelText) : 0;
        // Slightly larger gap pad so text breathes inside the removed segment
        const gapLen = labelText ? labelLen + 12 * scale : 0;
        const dashLen = Math.max(0, circ - gapLen);
        const labelStart = ((centerOffset - labelLen / 2 + circ) % circ) + 10;
        const gapStart = ((centerOffset - gapLen / 2 + circ) % circ) + 10;
        return (
          <g key={key}>
            <path
              d={useRev ? pathDRev : pathD}
              fill="none"
              stroke={color}
              strokeWidth={4 * scale}
              strokeOpacity={0.35}
              strokeDasharray={labelText ? `${dashLen} ${gapLen}` : undefined}
              strokeDashoffset={
                labelText ? (dashLen - gapStart + circ) % circ : undefined
              }
            />
            {renderArrow(direction, radius, color, key)}
            {labelText && (
              <text fill={color} fontSize={11 * scale} fontWeight={800}>
                <textPath
                  href={`#ring-path-${key}${useRev ? "-rev" : ""}`}
                  startOffset={labelStart}
                  dy={3 * scale}
                >
                  {labelText}
                </textPath>
              </text>
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
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({ direction, label, scale = 1, className = "", variant = "full" }) => {
  const size = 160 * scale;
  const center = size / 2;
  // Slightly larger wind ring radius to increase spacing from swell rings
  const radius = 108 * scale;
  const color = "#a855f7"; // purple-500

  const renderArrow = (dir: number): React.ReactNode => {
    const normalized = ((dir % 360) + 360) % 360;
    const isPreview = variant === "preview";
    // Arrowhead centered on ring; no shaft
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - radius})`}>
          {/* Head: compact arrowhead */}
          <path
            d={`M 0 ${tipY}
                L ${arrowWidth / 2} ${shoulderY}
                L ${arrowWidth * 0.38} ${baseY}
                Q 0 ${baseY + headLen * 0.1} ${-arrowWidth * 0.38} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {/* No shaft */}
          {/* Wind icon follows arrow rotation */}
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

  // Default to 0 (North) if direction is null/undefined
  const finalDirection =
    typeof direction === "number" && !isNaN(direction) ? direction : 0;

  return (
    <svg
      className={cn("pointer-events-none overflow-visible", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Path defs for curved label on wind ring (cw and ccw) */}
      <defs>
        <path
          id="wind-ring-path"
          d={`M ${center - radius},${center} a ${radius},${radius} 0 1,1 ${
            2 * radius
          },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`}
        />
        <path
          id="wind-ring-path-rev"
          d={`M ${center - radius},${center} a ${radius},${radius} 0 1,0 ${
            2 * radius
          },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`}
        />
      </defs>
      {(() => {
        const circ = 2 * Math.PI * radius;
        const pathD = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,1 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`;
        const pathDRev = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,0 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`;
        const needsFlip = finalDirection > 90 && finalDirection < 270;
        const baseAngle = (finalDirection + 90) % 360;
        // Match swell logic for consistent spacing and placement
        const delta = 45 * scale;
        const extra = needsFlip ? -90 * scale : 0;
        const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center
        const centerOffset = needsFlip ? circ - baseOffset : baseOffset;
        const labelText = label ?? null;
        const estimate = (t: string | null) =>
          (t?.length ?? 0) * (11 * scale) * 0.55;
        const labelLen = labelText ? estimate(labelText) : 0;
        const gapLen = labelText ? labelLen + 25 * scale : 0;
        const dashLen = Math.max(0, circ - gapLen);
        const gapStart = (centerOffset - gapLen / 2 + circ) % circ;
        return (
          <path
            d={needsFlip ? pathDRev : pathD}
            fill="none"
            stroke={color}
            strokeWidth={4 * scale}
            strokeOpacity={0.35}
            strokeDasharray={labelText ? `${dashLen} ${gapLen}` : undefined}
            strokeDashoffset={
              labelText ? (dashLen - gapStart + circ) % circ : undefined
            }
          />
        );
      })()}
      {renderArrow(finalDirection)}
      {label && (
        <text fill={color} fontSize={11 * scale} fontWeight={800}>
          <textPath
            href={`#${
              finalDirection > 90 && finalDirection < 270
                ? "wind-ring-path-rev"
                : "wind-ring-path"
            }`}
            startOffset={(() => {
              const circ = 2 * Math.PI * radius;
              const needsFlip = finalDirection > 90 && finalDirection < 270;
              const baseAngle = (finalDirection + 90) % 360;
              // Match swell logic for text start offset as well
              const delta = 40 * scale;
              const extra = needsFlip ? -80 * scale : 0;
              const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center
              const centerOffset = needsFlip ? circ - baseOffset : baseOffset;
              const estimate = (t: string | null) =>
                (t?.length ?? 0) * (11 * scale) * 0.55;
              const labelLen = label ? estimate(label) : 0;
              const labelStart = (centerOffset - labelLen / 2 + circ) % circ;
              return labelStart;
            })()}
            dy={3 * scale}
          >
            {label}
          </textPath>
        </text>
      )}
    </svg>
  );
};
