"use client";

import React from "react";
import {
  BsArrowDownCircleFill as SIcon,
  BsArrowDownLeftCircleFill as SWArrowIcon,
  BsArrowLeftCircleFill as WArrowIcon,
  BsArrowUpLeftCircleFill as NWArrowIcon,
  BsArrowUpCircleFill as NArrowIcon,
  BsArrowUpRightCircleFill as NEArrowIcon,
  BsArrowRightCircleFill as EArrowIcon,
  BsArrowDownRightCircleFill as SEArrowIcon,
} from "react-icons/bs";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

const data = Array.from({ length: 8 }, (_, index) => ({
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
}));

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
        <SWArrowIcon size={16} color="#51e72bff" />
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
        <NEArrowIcon size={20} color="#ff6a34ff" />
        <span className="text-[.6rem]">{data.dir}</span>
      </div>
      <span className="flex-1 justify-center flex gap-1 bg-highlight-1 rounded-md py-2 px-3">
        <span className="text-xl font-medium">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.6rem]">{data.max}</span>
          <span className="text-[0.7rem]">mph</span>
        </span>
      </span>
    </div>
  );
};

const StatTable = ({
  visibleCols,
  className,
}: {
  visibleCols?: number;
  className?: string;
}) => {
  const COLUMNS = [
    { id: "wind", label: "Wind" },
    { id: "surf", label: "Surf" },
    { id: "swellPriamry", label: "Swell" },
    { id: "swellSecond", label: "Secondary Swell" },
    { id: "pressure", label: "Pressure" },
  ];
  const columnPages =
    typeof visibleCols === "number"
      ? [
          COLUMNS.slice(0, visibleCols),
          COLUMNS.slice(visibleCols, COLUMNS.length),
        ]
      : [COLUMNS];
  const [currentPage, setCurrentPage] = React.useState(0);

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const visibleColumns = columnPages[currentPage];

  return (
    <div
      className={cn(
        "h-full bg-background border border-border p-2 rounded-md shadow-sm",
        className
      )}
    >
      <header className="mx-4 mt-4 mb-6">
        <h3 className="leading-none font-semibold">Hourly Statistics</h3>
        <span className="text-muted-foreground text-sm">
          Hourly stats for the week
        </span>
      </header>
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-1 bg-background" />
            {visibleColumns.map((col, colIdx) => {
              return (
                <th
                  key={col.id}
                  className={cn(
                    "px-2 pb-3 text-left font-medium",
                    colIdx !== visibleColumns.length - 1 &&
                      "border-r border-border"
                  )}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((entry, rowIdx) => {
            return (
              <tr
                key={entry.index}
                className="border-b border-border hover:bg-gray-50 transition"
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
    </div>
  );
};

export default StatTable;
