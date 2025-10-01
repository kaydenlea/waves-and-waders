import { cn } from "@/lib/utils";
import { Droplets, Sun, Waves, Wind } from "lucide-react";

// const GradientCircle = ({
//   data,
//   percentage = 75,
//   size = 75,
//   strokeWidth = 7,
//   condition = "sun",
//   color,
// }: {
//   data?: React.ReactNode;
//   percentage?: number;
//   size?: number;
//   strokeWidth?: number;
//   condition?: string;
//   color?: string;
// }) => {
//   const angle = (percentage / 100) * 360;
//   const colorsMap: Record<string, string[]> = {
//     water: ["#3b82f6", "#60a5fa", "#0ea5e9", "#22d3ee"],
//     sun: ["#facc15", "#f97316", "#f59e0b", "#fbbf24"],
//     tide: ["#1ceb49ff", "#1ceb49ff", "#1ceb49ff", "#1ceb49ff"],
//     wind: ["#ec291bff", "#ec291bff", "#ec291bff", "#ec291bff"],
//   };
//   const iconsMap: Record<string, React.ReactNode> = {
//     water: <Droplets size={18} className="text-[#1CACD4]" />,
//     sun: <Sun size={18} className="text-[#FF8D0B]" />,
//     tide: <Waves size={18} className="text-foreground" />,
//     wind: <Wind size={18} className="text-foreground" />,
//   };
//   const unitsMap: Record<string, string> = {
//     water: "°F",
//     sun: "°F",
//     tide: "ft",
//     wind: "mph",
//   };
//   const icon = iconsMap[condition];
//   const colors = colorsMap[condition];
//   const unit = unitsMap[condition];
//   const bgColor = color ? color : "bg-highlight-4";

//   return (
//     <div
//       className="relative flex items-center justify-center"
//       style={{ width: size, height: size }}
//     >
//       <div className="absolute inset-0 rounded-full bg-gray-200" />

//       <div
//         className="absolute inset-0 rounded-full"
//         style={{
//           background: `conic-gradient(
//             from -90deg,
//             ${colors[0]} 0deg,
//             ${colors[1]} ${angle * 0.33}deg,
//             ${colors[2]} ${angle * 0.66}deg,
//             ${colors[3]} ${angle}deg,
//             transparent ${angle}deg 360deg
//           )`,
//           filter: `drop-shadow(0 0 2px ${colors[0]}) drop-shadow(0 0 1px ${colors[1]})`,
//         }}
//       />

//       <div
//         className={cn("absolute rounded-full", bgColor)}
//         style={{
//           width: size - strokeWidth * 2,
//           height: size - strokeWidth * 2,
//         }}
//       />
//       <div className="z-1 flex items-center gap-0.5">
//         {icon}
//         <span className="flex items-center font-medium whitespace-nowrap">
//           {data} <span className="text-xs font-normal">{unit}</span>
//         </span>
//       </div>
//     </div>
//   );
// };

// export default GradientCircle;

const GradientCircle = ({
  data,
  percentage = 75,
  size = 75,
  strokeWidth = 7,
  condition = "sun",
  color,
}: {
  data?: React.ReactNode;
  percentage?: number;
  size?: number;
  strokeWidth?: number;
  condition?: string;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const iconsMap: Record<string, React.ReactNode> = {
    water: <Droplets size={18} className="text-[#1CACD4]" />,
    sun: <Sun size={18} className="text-[#FF8D0B]" />,
    tide: <Waves size={18} className="text-foreground" />,
    wind: <Wind size={18} className="text-foreground" />,
  };

  const unitsMap: Record<string, string> = {
    water: "°F",
    sun: "°F",
    tide: "ft",
    wind: "mph",
  };

  const bgColor = color ? color : "bg-highlight-4";
  const icon = iconsMap[condition];
  const unit = unitsMap[condition];

  // Define gradient colors
  const colorsMap: Record<string, string[]> = {
    water: ["#3b82f6", "#60a5fa", "#0ea5e9", "#22d3ee"],
    sun: ["#facc15", "#f97316", "#f59e0b", "#fbbf24"],
    tideGreen: ["#34D399", "#22C55E", "#10B981", "#059669"],
    tideOrange: ["#FDE68A", "#FACC15", "#F59E0B", "#D97706"],
    tideRed: ["#FCA5A5", "#F87171", "#d45858ff", "#c74343ff"],
  };

  // Select gradient for tide/wind based on percentage
  let selectedColors: string[] = [];
  if (condition === "tide" || condition === "wind") {
    if (percentage <= 33) selectedColors = colorsMap.tideRed;
    else if (percentage <= 66) selectedColors = colorsMap.tideOrange;
    else selectedColors = colorsMap.tideGreen;
  } else {
    selectedColors = colorsMap[condition];
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-gray-200" />

      <svg
        className="absolute"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`grad-${condition}`} x1="1" y1="0" x2="0" y2="1">
            {selectedColors.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / (selectedColors.length - 1)) * 100}%`}
                stopColor={c}
              />
            ))}
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#grad-${condition})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 2px ${selectedColors[0]}) drop-shadow(0 0 1px ${selectedColors[1]})`,
          }}
        />
      </svg>

      {/* Inner fill */}
      <div
        className={cn("absolute rounded-full", bgColor)}
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      />

      {/* Content */}
      <div className="z-10 flex items-center gap-0.5">
        {icon}
        <span className="flex items-center font-medium whitespace-nowrap">
          {data} <span className="text-xs font-normal">{unit}</span>
        </span>
      </div>
    </div>
  );
};

export default GradientCircle;
