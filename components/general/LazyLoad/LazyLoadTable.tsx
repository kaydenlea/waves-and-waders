"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = {
  beachId?: string;
  numHours: number;
  numDays: number;
  header?: boolean;
  date?: Date;
};

const StatTable = dynamic<React.ComponentProps<any>>(
  () => import("../../visuals/StatTable").then((m) => m.default),
  {
    ssr: false,
    // TODO(overview-perf): Keep this skeleton in sync with StatTable's eventual height
    // and row count across daily/weekly modes to minimize layout shifts when data loads.
    loading: () => (
      <div className="rounded-2xl border border-border bg-highlight-2 p-4">
        <ul>
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <li key={rowIdx} className="p-2">
              <div className="h-10 w-full rounded bg-highlight-3" />
            </li>
          ))}
        </ul>
      </div>
    ),
  }
);

export const LazyLoadTable: React.FC<Props> = (props) => {
  return <StatTable {...props} />;
};
