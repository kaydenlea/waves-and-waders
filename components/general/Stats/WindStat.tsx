import { MousePointer2 as ArrowIcon } from "lucide-react";
import GradientCircle from "./GradientCircle";

const WindStat = ({
  data,
}: {
  data: { speed: number; loc?: string; gust?: number; intensity: number };
}) => {
  const circleContent = (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-lg font-semibold">
        {data.speed}
        <span className="text-xs font-normal ml-1">mph</span>
      </span>
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <ArrowIcon className="w-4 h-4 fill-foreground/20 text-foreground/50" />
        <span>{data.gust != null ? `${data.gust}` : "No gust"}</span>
      </span>
    </div>
  );

  return (
    <GradientCircle
      condition="wind"
      data={data.speed}
      percentage={data.intensity}
      size={90}
      strokeWidth={8}
      showIcon={false}
      content={circleContent}
    />
  );
};

export default WindStat;
