import { MousePointer2 as ArrowIcon } from "lucide-react";

const WindStat = ({
  data,
}: {
  data: { direction: string; speed: number; loc: string; gust?: number };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-lg text-center">
        <ArrowIcon
          size={24}
          color="#ff6a34ff"
          fill="#ff6a34ff"
          className="mx-auto"
        />
        <span className="text-[.8rem] font-semibold">{data.direction}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-medium">
          {data.speed}
          <span className="text-xs font-normal">mph</span>
        </span>
        <span className="text-xs p-1 border border-border rounded-xl bg-highlight-1">
          {data.gust != null ? `Gust ${data.gust} mph` : data.loc}
        </span>
      </div>
    </div>
  );
};

export default WindStat;
