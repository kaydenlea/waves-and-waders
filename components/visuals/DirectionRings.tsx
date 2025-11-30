"use client";

import React from "react";
import { Waves, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

type DirectionTriple = {
  primary: number | null | undefined;
  secondary: number | null | undefined;
  tertiary: number | null | undefined;
};

type DirectionLabels = {
  primary?: string | null;
  secondary?: string | null;
  tertiary?: string | null;
};

const normalize = (direction: number | null | undefined) => {
  if (direction == null || Number.isNaN(direction)) return 0;
  return ((direction % 360) + 360) % 360;
};

const directionsEqual = (a?: DirectionTriple, b?: DirectionTriple) =>
  a?.primary === b?.primary &&
  a?.secondary === b?.secondary &&
  a?.tertiary === b?.tertiary;

const labelsEqual = (a?: DirectionLabels, b?: DirectionLabels) =>
  a?.primary === b?.primary &&
  a?.secondary === b?.secondary &&
  a?.tertiary === b?.tertiary;

const SwellRingsBase: React.FC<{
  directions: DirectionTriple;
  labels?: DirectionLabels;
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
    { key: "primary", radius: 40 * scale, color: "#1d4ed8" },
    { key: "secondary", radius: 64 * scale, color: "#0ea5e9" },
    { key: "tertiary", radius: 88 * scale, color: "#22d3ee" },
  ];

  const renderArrow = (
    direction: number,
    radius: number,
    color: string,
    kind?: "primary" | "secondary" | "tertiary"
  ): React.ReactNode => {
    const normalized = normalize(direction);
    const isPreview = variant === "preview";
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    const badgeRadius = 7 * scale;
    const badgeOffsetX = arrowWidth * 0.62;
    const badgeCy = baseY - headLen * 0.04;
    return (
      <g
        key={`${color}-${radius}`}
        transform={`rotate(${normalized} ${center} ${center})`}
      >
        <g transform={`translate(${center} ${center - radius})`}>
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
        <path
          id="ring-path-primary"
          d={`M ${center + 40 * scale},${center} a ${40 * scale},${40 * scale} 0 1,1 ${
            -80 * scale
          },0 a ${40 * scale},${40 * scale} 0 1,1 ${80 * scale},0`}
        />
        <path
          id="ring-path-secondary"
          d={`M ${center + 64 * scale},${center} a ${64 * scale},${64 * scale} 0 1,1 ${
            -128 * scale
          },0 a ${64 * scale},${64 * scale} 0 1,1 ${128 * scale},0`}
        />
        <path
          id="ring-path-tertiary"
          d={`M ${center + 88 * scale},${center} a ${88 * scale},${88 * scale} 0 1,1 ${
            -176 * scale
          },0 a ${88 * scale},${88 * scale} 0 1,1 ${176 * scale},0`}
        />
        <path
          id="ring-path-primary-rev"
          d={`M ${center - 40 * scale},${center} a ${40 * scale},${40 * scale} 0 1,0 ${
            80 * scale
          },0 a ${40 * scale},${40 * scale} 0 1,0 ${-80 * scale},0`}
        />
        <path
          id="ring-path-secondary-rev"
          d={`M ${center - 64 * scale},${center} a ${64 * scale},${64 * scale} 0 1,0 ${
            128 * scale
          },0 a ${64 * scale},${64 * scale} 0 1,0 ${-128 * scale},0`}
        />
        <path
          id="ring-path-tertiary-rev"
          d={`M ${center - 88 * scale},${center} a ${88 * scale},${88 * scale} 0 1,0 ${
            176 * scale
          },0 a ${88 * scale},${88 * scale} 0 1,0 ${-176 * scale},0`}
        />
      </defs>

      {rings.map(({ key, radius, color }) => {
        const direction = directions[key];
        if (direction == null || Number.isNaN(direction)) return null;
        const labelText = labels?.[key];
        const circ = 2 * Math.PI * radius;
        const badgeOffset = 9 * scale;
        const centerOffset = -3 * radius - badgeOffset;
        const pathD = `M ${center + radius},${center} a ${radius},${radius} 0 1,1 ${
          -2 * radius
        },0 a ${radius},${radius} 0 1,1 ${2 * radius},0`;
        const pathDRev = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,0 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`;
        const fontSize = 12 * scale;
        const estimate = (t: string | null | undefined) =>
          (t?.length ?? 0) * fontSize * 0.48;
        const labelLen = labelText ? estimate(labelText) : 0;
        const gapLen = labelText ? labelLen + 10 * scale : 0;
        const dashLen = Math.max(0, circ - gapLen);
        const labelStart = ((centerOffset + circ) % circ) + 8;
        const gapStart = ((centerOffset - gapLen / 2 + circ) % circ) + 8;
        const useRev = variant !== "preview" && key === "tertiary";
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
              <text fill={color} fontSize={12 * scale} fontWeight={800}>
                <textPath
                  href={`#ring-path-${key}${useRev ? "-rev" : ""}`}
                  textAnchor="middle"
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

const WindRingBase: React.FC<{
  direction: number | null | undefined;
  label?: string | null;
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({ direction, label, scale = 1, className = "", variant = "full" }) => {
  const size = 160 * scale;
  const center = size / 2;
  const radius = 108 * scale;
  const color = "#a855f7";
  const finalDirection = normalize(direction);

  const renderArrow = (dir: number): React.ReactNode => {
    const normalized = normalize(dir);
    const isPreview = variant === "preview";
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - radius})`}>
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
        <path
          id="wind-ring-path"
          d={`M ${center + radius},${center} a ${radius},${radius} 0 1,1 ${
            -2 * radius
          },0 a ${radius},${radius} 0 1,1 ${2 * radius},0`}
        />
        <path
          id="wind-ring-path-rev"
          d={`M ${center - radius},${center} a ${radius},${radius} 0 1,0 ${
            2 * radius
          },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`}
        />
      </defs>
      <g>
        {(() => {
          const circ = 2 * Math.PI * radius;
          const labelText = label ?? null;
          const fontSize = 12 * scale;
          const estimate = (t: string | null | undefined) =>
            (t?.length ?? 0) * fontSize * 0.48;
          const labelLen = labelText ? estimate(labelText) : 0;
          const gapLen = labelText ? labelLen + 10 * scale : 0;
          const dashLen = Math.max(0, circ - gapLen);
          const centerOffset = circ / 2;
          const gapStart = (centerOffset - gapLen / 2 + circ) % circ;
          return (
            <path
              d={`M ${center + radius},${center} a ${radius},${radius} 0 1,1 ${
                -2 * radius
              },0 a ${radius},${radius} 0 1,1 ${2 * radius},0`}
              fill="none"
              stroke={color}
              strokeWidth={variant === "preview" ? 5 * scale : 6 * scale}
              strokeOpacity={variant === "preview" ? 0.25 : 0.35}
              strokeDasharray={
                variant === "preview"
                  ? "4 4"
                  : labelText
                  ? `${dashLen} ${gapLen}`
                  : undefined
              }
              strokeDashoffset={
                variant === "preview"
                  ? undefined
                  : labelText
                  ? (dashLen - gapStart + circ) % circ
                  : undefined
              }
            />
          );
        })()}
        {renderArrow(finalDirection)}
        {label && variant !== "preview" && (
          <text fill={color} fontSize={12 * scale} fontWeight={800}>
            <textPath
              href="#wind-ring-path"
              startOffset="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              dy={3 * scale}
            >
              {label}
            </textPath>
          </text>
        )}
      </g>
    </svg>
  );
};

export const SwellRings = React.memo(
  SwellRingsBase,
  (prev, next) =>
    directionsEqual(prev.directions, next.directions) &&
    labelsEqual(prev.labels, next.labels) &&
    prev.scale === next.scale &&
    prev.className === next.className &&
    prev.variant === next.variant
);

export const WindRing = React.memo(
  WindRingBase,
  (prev, next) =>
    prev.direction === next.direction &&
    prev.label === next.label &&
    prev.scale === next.scale &&
    prev.className === next.className &&
    prev.variant === next.variant
);

export type { DirectionTriple as SwellDirections, DirectionLabels };
