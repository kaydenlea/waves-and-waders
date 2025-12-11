import { cn } from "@/lib/utils";
import { MousePointer2 as ArrowIcon } from "lucide-react";

const SwellStat = ({
  primary = false,
  data,
  small = false,
  isFull,
}: {
  primary?: boolean;
  data: {
    height: number;
    period: number;
    wind: { dir: string; deg?: number };
  };
  small?: boolean;
  isFull?: boolean;
}) => {
  const heightVal =
    typeof data.height === "number"
      ? Number(data.height.toFixed(1))
      : (data.height as any);

  // Keep period as whole number (no decimals)
  const periodVal =
    typeof data.period === "number"
      ? Math.round(data.period)
      : (data.period as any);

  const degVal = typeof data.wind.deg === "number" ? data.wind.deg : 0;

  // Calculate rotation: arrow points at 315° by default, so we need to adjust
  // If swell is coming from 270° (W), arrow should point at 270°
  // Rotation needed = degVal - 315
  const arrowRotation = degVal - 315;

  const stats = [
    { label: "swell height", value: heightVal, unit: "ft" },
    { label: "swell period", value: periodVal, unit: "s" },
    {
      label: "swell wind arrow",
      value: data.wind.dir,
      unit: degVal,
    },
    {
      label: "swell wind",
      value: data.wind.dir,
      unit: `${typeof degVal === "number" ? Math.round(degVal) : degVal}°`,
    },
  ];
  return (
    <div
      className={cn(
        "grid grid-cols-[35px_30px_20px_1fr] @min-sm:grid-cols-[45px_35px_20px_1fr] @min-3xl:grid-cols-[40px_35px_20px_1fr] @min-4xl:grid-cols-[45px_38px_20px_1fr] items-center @min-sm:-my-0.5",
        isFull && "@min-6xl:grid-cols-[35px_32px_15px_1fr] @min-6xl:my-0",
        // primary ? "border border-border shadow-sm rounded-md px-1" : "mx-3",
        primary && !isFull && ""
        // primary
        //   ? "border border-border shadow-sm rounded-md px-1.5 gap-1"
        //   : "gap-1"
      )}
    >
      {stats.map((stat) => {
        if (stat.label === "swell wind arrow") {
          return (
            <ArrowIcon
              size={primary ? 16 : 12}
              key={stat.label}
              style={{ transform: `rotate(${arrowRotation}deg)` }}
              className={cn(
                primary ? "fill-muted-foreground -ml-[5px]" : "-ml-1"
              )}
            />
          );
        }
        return (
          <span
            key={stat.label}
            className={cn(
              // stat.label === "swell period" && "min-w-5 text-center",
              // stat.label === "swell wind" &&
              //   !primary &&
              //   !isFull &&
              //   "min-w-8 @min-md:min-w-15",
              // stat.label === "swell wind" &&
              //   primary &&
              //   !isFull &&
              //   "min-w-5 @min-md:min-w-8",
              // stat.label === "swell wind" && !primary && isFull && "min-w-8",
              // stat.label === "swell wind" && primary && isFull && "min-w-5",
              // stat.label !== "swell wind" && "text-center",
              !small && !primary && "text-sm font-medium",
              !small && primary && "text-md font-semibold",
              small &&
                !primary &&
                "text-[0.7rem] @min-sm:text-[0.8rem] @min-md:text-sm @min-lg:text-[0.8rem] @min-3xl:text-xs @min-4xl:text-[0.8rem] font-medium text-foreground/80",
              small && !primary && isFull && "@min-6xl:text-[0.7rem]",
              small &&
                primary &&
                "text-[0.8rem] @min-sm:text-[0.9rem] @min-md:text-base @min-lg:text-[0.9rem] @min-3xl:text-sm @min-4xl:text-[0.8rem] font-bold",
              small && primary && isFull && "@min-6xl:text-xs"
            )}
          >
            {typeof stat.value === "number"
              ? stat.label === "swell period"
                ? stat.value // Already rounded, no decimal needed
                : stat.value.toFixed(1)
              : stat.value}
            <span
              className={cn(
                "font-normal",
                primary ? "text-[0.7rem] font-medium" : "text-[0.6rem]",
                stat.label === "swell wind" &&
                  !isFull &&
                  "ml-[0.1rem] hidden @min-md:inline-block @min-3xl:hidden @min-3xl:inline-block",
                stat.label === "swell wind" &&
                  isFull &&
                  "ml-[0.1rem] hidden @min-md:inline-block @min-3xl:hidden @min-4xl:inline-block @min-6xl:hidden"
              )}
            >
              {stat.unit}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default SwellStat;
