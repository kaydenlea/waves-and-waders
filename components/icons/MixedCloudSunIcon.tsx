"use client";

import React from "react";

type Props = {
  className?: string;
  size?: number;
  sunStroke?: string;
  cloudStroke?: string;
  strokeWidth?: number;
};

export default function MixedCloudSunIcon({
  className,
  size,
  sunStroke = "#f79e55ff",
  cloudStroke = "#bdbdbdff",
  strokeWidth = 2,
}: Props) {
  const sizeProps =
    typeof size === "number" ? { width: size, height: size } : undefined;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      {...sizeProps}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke={sunStroke}>
        <path d="M12 2v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="M20 12h2" />
        <path d="m19.07 4.93-1.41 1.41" />
        <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
      </g>
      <path
        d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"
        stroke={cloudStroke}
      />
    </svg>
  );
}

