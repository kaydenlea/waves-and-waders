import { MousePointer2 as ArrowIcon } from "lucide-react";
import GradientCircle from "./GradientCircle";

const WindStat = ({
  data,
}: {
  data: {
    speed: number;
    loc?: string;
    gust?: number;
    intensity: number;
    direction?: number;
  };
}) => {
  // Arrow points at 315° by default, adjust rotation based on wind direction
  const rotation = data.direction != null ? data.direction - 315 : 0;

  const circleContent = (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-lg font-semibold">
        {data.speed}
        <span className="text-xs font-normal ml-1">mph</span>
      </span>
      <span className="text-[12px] text-muted-foreground flex items-center gap-1">
        <ArrowIcon
          className="w-4 h-4 fill-foreground/20 text-foreground/50"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
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
