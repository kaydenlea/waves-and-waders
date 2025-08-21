import { Sunrise, Sunset } from "lucide-react";

const TideSun = ({
  chartData,
}: {
  chartData: { hour: number; tide: number; isPeak?: number }[];
}) => {
  return chartData
    .filter((d) => d.hour === 6 || d.hour === 20)
    .map((entry) => {
      const sunStatus =
        entry.hour === 6
          ? ["Sunrise", "First Light"]
          : ["Sunset", "Last Light"];
      const times =
        entry.hour === 6 ? ["6:30 AM", "6:10 AM"] : ["8:00 PM", "8:30 PM"];
      return (
        <div
          className="text-center gap-8 bg-highlight-1 py-1 px-3 ring-1 ring-slate-900/5 rounded-sm"
          key={entry.hour}
        >
          <div className="flex gap-4 items-center">
            <span className="flex flex-col text-left">
              <span className="font-medium text-xs">{sunStatus[0]}</span>
              <span className="text-[11px]">{times[0]}</span>
            </span>
            {entry.hour === 6 ? (
              <Sunrise fill={"#ff9946ff"} size={20} />
            ) : (
              <Sunset fill={"#ff9946ff"} size={20} />
            )}
          </div>
          <span className="flex flex-col text-left">
            <span className="font-medium text-xs">{sunStatus[1]}</span>
            <span className="text-[11px]">{times[1]}</span>
          </span>
        </div>
      );
    });
};

export default TideSun;
