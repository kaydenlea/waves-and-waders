"use client";

import React from "react";

type Props = {
  className?: string;
  size?: number;
  moonStroke?: string;
  cloudStroke?: string;
  strokeWidth?: number;
};

export default function MixedCloudMoonIcon({
  className,
  size,
  moonStroke = "#9b8cff",
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
      <g stroke={moonStroke}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </g>
      <path
        d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"
        stroke={cloudStroke}
      />
    </svg>
  );
}

