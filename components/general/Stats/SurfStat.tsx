import { MousePointer2 as ArrowIcon } from "lucide-react";

const SurfStat = ({
  data,
}: {
  data: { direction: string; height: string; period: number };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-xl text-center">
        <ArrowIcon size={30} color="#51e72bff" fill="#51e72bff" />
        <span className="text-[.7rem]">{data.direction}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-medium">
          {data.height}
          <span className="text-xs font-normal">ft</span>
        </span>
        <span className="text-2xl font-medium">
          {data.period}
          <span className="text-xs font-normal">s</span>
        </span>
      </div>
    </div>
  );
};

export default SurfStat;
