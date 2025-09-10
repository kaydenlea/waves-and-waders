"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = {
  beachId?: string;
  numHours: number;
  numDays: number;
  header?: boolean;
};

const StatTable = dynamic<React.ComponentProps<any>>(
  () => import("../../visuals/StatTable"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadTable: React.FC<Props> = (props) => {
  return <StatTable {...props} />;
};
