import { cn } from "@/lib/utils";
import { MousePointer2 as ArrowIcon } from "lucide-react";

const SwellStat = ({
  primary = false,
  data,
  small = false,
}: {
  primary?: boolean;
  data: {
    height: number;
    period: number;
    wind: { dir: string; deg?: number };
  };
  small?: boolean;
}) => {
  const heightVal =
    typeof data.height === "number"
      ? Number(data.height.toFixed(1))
      : (data.height as any);
  const periodVal =
    typeof data.period === "number"
      ? Number(data.period.toFixed(1))
      : (data.period as any);
  const degVal =
    typeof data.wind.deg === "number"
      ? Number(data.wind.deg.toFixed(1))
      : (data.wind.deg as any);

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
      unit: `${typeof degVal === "number" ? degVal.toFixed(1) : degVal}°`,
    },
  ];
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        primary
          ? "border border-border shadow-sm rounded-md px-1.5 gap-1"
          : "gap-1"
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
            />
          );
        }
        return (
          <span
            key={stat.label}
            className={cn(
              !small && !primary && "text-sm font-medium",
              !small && primary && "text-md font-semibold",
              small && !primary && "text-xs font-medium",
              small && primary && "text-sm font-semibold"
            )}
          >
            {typeof stat.value === "number"
              ? stat.value.toFixed(1)
              : stat.value}
            <span
              className={cn(
                "font-normal",
                primary ? "text-[0.7rem]" : "text-[0.6rem]"
              )}
            >
              {stat.label !== "swell wind" && stat.unit}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default SwellStat;
