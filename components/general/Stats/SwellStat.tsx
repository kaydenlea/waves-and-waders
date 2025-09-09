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
    wind: { dir: string; deg: number };
  };
  small?: boolean;
}) => {
  const stats = [
    { label: "swell height", value: data.height, unit: "ft" },
    { label: "swell period", value: data.period, unit: "s" },
    {
      label: "swell wind arrow",
      value: data.wind.dir,
      unit: data.wind.deg,
    },
    {
      label: "swell wind",
      value: data.wind.dir,
      unit: `${data.wind.deg}°`,
    },
  ];
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        primary
          ? "border border-border shadow-sm rounded-md px-0.5 gap-1"
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
            {stat.value}
            <span
              className={cn(
                "font-normal",
                primary ? "text-[0.7rem]" : "text-[0.6rem]"
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
