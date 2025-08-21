import { cn } from "@/lib/utils";
import { MousePointer2 as ArrowIcon } from "lucide-react";

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data: {
    height: number;
    period: number;
    wind: { dir: string; deg: number };
  };
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
          ? "border border-border shadow-sm rounded-md px-2 gap-1"
          : "gap-1"
      )}
    >
      {stats.map((stat) => {
        if (stat.label === "swell wind arrow") {
          return (
            <ArrowIcon
              size={12}
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
              primary ? "text-md font-semibold" : "text-sm font-medium"
            )}
          >
            {stat.value}
            <span
              className={cn(
                "font-normal",
                primary ? "text-xs" : "text-[0.6rem]"
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
