"use client";

import dynamic from "next/dynamic";
import React, { Suspense } from "react";

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
    suspense: true,
  }
);

const TableSkeleton: React.FC<{
  rowsPerDay: number;
  days: number;
  header?: boolean;
}> = ({ rowsPerDay, days, header }) => {
  const columns = 6;
  return (
    <div className="relative -mx-1 @min-md:mx-2 @min-2xl:mx-4">
      <div className="rounded-2xl border border-border/50 bg-highlight-2/70 shadow-even px-2 pb-3 pt-3">
        <table className="w-full table-auto border-separate text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-1 bg-highlight-4" />
              {Array.from({ length: columns }).map((_, colIdx) => (
                <th
                  key={`skeleton-head-${colIdx}`}
                  className="px-2 pb-3 text-center font-medium text-xs sm:text-sm"
                >
                  <div className="mx-auto h-3 w-12 rounded bg-highlight-3" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }).map((_, dayIdx) => (
              <React.Fragment key={`day-${dayIdx}`}>
                {header && (
                  <tr>
                    <td
                      colSpan={columns + 1}
                      className="p-3 bg-highlight-5 rounded-sm shadow-even"
                    >
                      <div className="h-4 w-32 rounded bg-highlight-3" />
                    </td>
                  </tr>
                )}
                {Array.from({ length: rowsPerDay }).map((_, rowIdx) => (
                  <tr
                    key={`skeleton-row-${dayIdx}-${rowIdx}`}
                    className="border-b border-border/20 last:border-b-0"
                  >
                    <th className="relative w-5 h-14 border-r border-border/40 p-0">
                      <div className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded bg-highlight-3" />
                    </th>
                    {Array.from({ length: columns }).map((_, colIdx) => (
                      <td
                        key={`skeleton-${colIdx}-${dayIdx}-${rowIdx}`}
                        className="px-1 border-r border-border/20 last:border-r-0"
                      >
                        <div className="h-10 w-full rounded bg-highlight-3" />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Reserve pager space to avoid jump when controls render */}
      <div aria-hidden className="h-12" />
    </div>
  );
};

export const LazyLoadTable: React.FC<Props> = ({
  numHours,
  numDays,
  header,
  ...props
}) => {
  const rowsPerDay = Math.max(numHours, 8);
  const days = Math.max(numDays, 1);

  return (
    <Suspense
      fallback={
        <TableSkeleton rowsPerDay={rowsPerDay} days={days} header={header} />
      }
    >
      <StatTable
        numHours={numHours}
        numDays={numDays}
        header={header}
        {...props}
      />
    </Suspense>
  );
};
