"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
} from "lucide-react";

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data: { height: number; period: number; dir: string; deg: number };
}) => {
  return (
    <div
      className={cn(
        "flex-1 flex items-center justify-center space-x-2 rounded-sm p-1 h-10",
        primary ? "bg-highlight-1" : "bg-highlight-2"
      )}
    >
      <div
        className={cn(
          "flex items-center mt-0.5",
          primary ? "gap-1.5" : "gap-1"
        )}
      >
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.height}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            ft
          </span>
        </span>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.period}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            s
          </span>
        </span>
        <ArrowIcon size={16} color="#51e72bff" fill="#51e72bff" />
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.dir}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.55rem]")}>
            {data.deg}&deg;
          </span>
        </span>
      </div>
    </div>
  );
};

const WindStat = ({
  data,
}: {
  data: { dir: string; speed: number; max: number };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-md text-center">
        <ArrowIcon size={16} color="#ff6a34ff" fill="#ff6a34ff" />
        <span className="text-[.6rem]">{data.dir}</span>
      </div>
      <span className="flex-1 justify-center flex gap-1 bg-highlight-1 rounded-md py-2 px-3">
        <span className="text-lg font-medium">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.6rem]">{data.max}</span>
          <span className="text-[0.7rem]">mph</span>
        </span>
      </span>
    </div>
  );
};

const StatTable = ({
  numDays,
  numHours,
  header = false,
}: {
  numDays: number;
  numHours: number;
  header?: boolean;
}) => {
  const data = Array.from({ length: numDays }, () => ({
    date: "Monday, July 10",
    vals: Array.from({ length: numHours }, (_, index) => ({
      index: index * 3,
      time: `${(index * 3) % 12 === 0 ? 12 : (index * 3) % 12} ${
        index * 3 >= 12 ? "PM" : "AM"
      }`,
      wind: { label: "wind", dir: "NNE", speed: 12, max: 17 },
      surf: { label: "surf", height: "2-3" },
      swell: {
        label: "swell",
        primary: { height: 2.1, period: 7, dir: "W", deg: 272 },
        secondary: [
          { height: 2.1, period: 7, dir: "W", deg: 272 },
          { height: 2.1, period: 7, dir: "W", deg: 272 },
        ],
      },
      pressure: { label: "pressure", value: 29.94 },
    })),
  }));

  const COLUMNS = [
    { id: "wind", label: "Wind" },
    { id: "surf", label: "Surf" },
    { id: "swellPriamry", label: "Swell" },
    { id: "swellSecond", label: "Secondary Swell" },
    { id: "pressure", label: "Pressure" },
  ];

  const [visibleCols, setVisibleCols] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      const tableContainer = document.querySelector("#content-container");
      const width = tableContainer ? tableContainer.clientWidth : 0;

      if (width < 750) {
        setVisibleCols(3);
      } else {
        setVisibleCols(5);
        setCurrentPage(0);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columnPages =
    visibleCols !== 5
      ? [
          COLUMNS.slice(0, visibleCols),
          COLUMNS.slice(visibleCols, COLUMNS.length),
        ]
      : [COLUMNS];

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const visibleColumns = columnPages[currentPage];

  return (
    <>
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-1 bg-background" />
            {visibleColumns.map((col) => {
              return (
                <th
                  key={col.id}
                  className={cn(
                    "px-2 pb-3 text-left font-medium text-xs sm:text-sm"
                  )}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((day, i) => {
            const content = day.vals.map((entry, rowIdx) => {
              return (
                <tr
                  key={`${i}-${entry.index}`}
                  className={cn(
                    rowIdx !== day.vals.length - 1 && "border-b border-border"
                  )}
                >
                  <th
                    scope="row"
                    className="relative w-5 h-14 border-r border-border p-0"
                  >
                    <span className="-translate-x-1/2 -translate-y-1/2 transform absolute top-1/2 left-1/2 -rotate-90 text-xs">
                      {entry.index % 12 === 0 ? 12 : entry.index % 12}
                      <span className="font-medium text-[0.6rem]">
                        {entry.index >= 12 ? "PM" : "AM"}
                      </span>
                    </span>
                  </th>
                  {visibleColumns.map((col, colIdx) => {
                    const level =
                      rowIdx % 3 === 0
                        ? "bg-green"
                        : rowIdx % 2 === 0
                        ? "bg-orange"
                        : "bg-red";
                    let content;
                    switch (col.label) {
                      case "Wind":
                        content = <WindStat data={entry.wind} />;
                        break;
                      case "Surf":
                        content = (
                          <span
                            className={cn(
                              "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
                              level
                            )}
                          >
                            {entry.surf.height}
                            <span className="text-xs hidden sm:inline">ft</span>
                          </span>
                        );
                        break;
                      case "Swell":
                        content = (
                          <SwellStat primary data={entry.swell.primary} />
                        );
                        break;
                      case "Secondary Swell":
                        content = (
                          <div className="flex gap-1">
                            <SwellStat data={entry.swell.secondary[0]} />
                            <SwellStat data={entry.swell.secondary[1]} />
                          </div>
                        );
                        break;
                      case "Pressure":
                        content = (
                          <span
                            className={cn(
                              "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
                              level
                            )}
                          >
                            {entry.pressure.value}
                            <span className="text-xs hidden sm:inline">in</span>
                          </span>
                        );
                        break;
                    }
                    return (
                      <td
                        key={`${col.id}-${entry.index}`}
                        className={cn(
                          "px-1",
                          colIdx !== visibleColumns.length - 1 &&
                            "border-r border-border"
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            });
            return (
              <React.Fragment key={i}>
                {header && (
                  <tr key={`${i}-date`}>
                    <td
                      colSpan={6}
                      className="p-3 bg-highlight-1 font-semibold rounded-sm"
                    >
                      {day.date}
                    </td>
                  </tr>
                )}
                {content}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {columnPages.length > 1 && (
        <div className="flex gap-2 items-center justify-center mt-2">
          <Button
            aria-label="previous columns"
            size="icon"
            className="border border-gray-100 hover:bg-gray-200 bg-gray-50 rounded-full"
            onClick={handleBack}
            disabled={currentPage === 0}
          >
            <ArrowLeft color="#494949ff" />
          </Button>
          <div className="flex gap-1">
            {columnPages.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentPage ? "bg-foreground" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          <Button
            aria-label="next columns"
            size="icon"
            className="border border-gray-100 hover:bg-gray-200 bg-gray-50 rounded-full"
            onClick={handleNext}
            disabled={currentPage === columnPages.length - 1}
          >
            <ArrowRight color="#494949ff" />
          </Button>
        </div>
      )}
    </>
  );
};

export default StatTable;
