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
  console.log("isFull", isFull);
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        primary
          ? "border border-border shadow-sm rounded-md px-1.5 gap-1"
          : "gap-1",
        primary && !isFull && "-ml-4"
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
              fill="#51e72bff"
              color="#51e72bff"
              key={stat.label}
              style={{ transform: `rotate(${arrowRotation}deg)` }}
            />
          );
        }
        return (
          <span
            key={stat.label}
            className={cn(
              stat.label === "swell period" && "min-w-5 text-center",
              stat.label === "swell wind" &&
                !primary &&
                !isFull &&
                "min-w-8 @min-md:min-w-15",
              stat.label === "swell wind" &&
                primary &&
                !isFull &&
                "min-w-5 @min-md:min-w-8",
              stat.label === "swell wind" && !primary && isFull && "min-w-8",
              stat.label === "swell wind" && primary && isFull && "min-w-5",
              !small && !primary && "text-sm font-medium",
              !small && primary && "text-md font-semibold",
              small && !primary && "text-xs font-medium",
              small && primary && "text-sm font-semibold"
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
                  "ml-0.5 hidden @min-md:inline-flex"
              )}
            >
              {(stat.label !== "swell wind" || !isFull) && stat.unit}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default SwellStat;
