import { MousePointer2 as ArrowIcon } from "lucide-react";
import GradientCircle from "./GradientCircle";

const SurfStat = ({
  data,
}: {
  data: { height: string; period: number; intensity: number };
}) => {
  const circleContent = (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-lg font-semibold">
        {data.height}
        <span className="text-xs font-normal ml-1">ft</span>
      </span>
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <ArrowIcon className="w-4 h-4 fill-foreground/20 text-foreground/50" />
        <span>{data.period}s</span>
      </span>
    </div>
  );

  return (
    <GradientCircle
      condition="surf"
      data={data.height}
      percentage={data.intensity}
      size={90}
      strokeWidth={8}
      showIcon={false}
      content={circleContent}
    />
  );
};

export default SurfStat;
