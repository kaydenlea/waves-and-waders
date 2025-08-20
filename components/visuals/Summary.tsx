import { cn } from "@/lib/utils";
import { TidePreview } from "../graphs/TideChart";

import { IoIosWater as WaterIcon } from "react-icons/io";
import {
  FaSun as SunIcon,
  FaDog as DogIcon,
  FaParking as ParkingIcon,
  FaRestroom as BathroomIcon,
  FaLifeRing as LifeRingIcon,
} from "react-icons/fa";
import {
  BsArrowDownCircleFill as SArrowIcon,
  BsArrowDownLeftCircleFill as SWArrowIcon,
  BsArrowLeftCircleFill as WArrowIcon,
  BsArrowUpLeftCircleFill as NWArrowIcon,
  BsArrowUpCircleFill as NArrowIcon,
  BsArrowUpRightCircleFill as NEArrowIcon,
  BsArrowRightCircleFill as EArrowIcon,
  BsArrowDownRightCircleFill as SEArrowIcon,
} from "react-icons/bs";
import {
  GiFishingPole as FishingPoleIcon,
  GiBeachBucket as SandIcon,
} from "react-icons/gi";
import SwellStat from "../general/SwellStat";

const GradientCircle = ({
  data,
  percentage = 75,
  size = 75,
  strokeWidth = 7,
  condition = "sun",
}: {
  data?: React.ReactNode;
  percentage?: number;
  size?: number;
  strokeWidth?: number;
  condition?: string;
}) => {
  const angle = (percentage / 100) * 360;
  const colors =
    condition === "water"
      ? ["#3b82f6", "#60a5fa", "#0ea5e9", "#22d3ee"]
      : ["#facc15", "#f97316", "#f59e0b", "#fbbf24"];
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gray-200" />

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from -90deg,
            ${colors[0]} 0deg,          
            ${colors[1]} ${angle * 0.33}deg, 
            ${colors[2]} ${angle * 0.66}deg,
            ${colors[3]} ${angle}deg,
            transparent ${angle}deg 360deg
          )`,
          filter: `drop-shadow(0 0 2px ${colors[0]}) drop-shadow(0 0 1px ${colors[1]})`,
        }}
      />

      <div
        className="absolute rounded-full bg-background"
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      />
      <div className="z-1 flex items-center">
        {condition === "water" ? (
          <WaterIcon size={18} className="text-[#1CACD4]" />
        ) : (
          <SunIcon size={18} className="text-[#FF8D0B]" />
        )}
        <span className="flex items-center font-medium whitespace-nowrap">
          {data} <span className="text-xs font-normal">&deg;F</span>
        </span>
      </div>
    </div>
  );
};

const WindStat = ({
  data,
}: {
  data: { direction: string; speed: number; loc: string };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-xl text-center">
        <NEArrowIcon size={30} color="#ff6a34ff" />
        <span className="text-[.7rem]">{data.direction}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-medium">
          {data.speed}
          <span className="text-xs font-normal">mph</span>
        </span>
        <span className="text-xs p-1 border border-border rounded-xl bg-highlight-1">
          {data.loc}
        </span>
      </div>
    </div>
  );
};

const SurfStat = ({
  data,
}: {
  data: { direction: string; height: string; period: number };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-xl text-center">
        <NWArrowIcon size={30} color="#51e72bff" />
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

const Tag = ({
  data,
}: {
  data: { label: string; icon: React.ReactNode; color: string };
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 py-1.5 px-4 rounded-md border border-border",
        data.color
      )}
    >
      {data.icon}
      <span className="text-xs">{data.label}</span>
    </div>
  );
};

const Summary = () => {
  const stats = [
    { type: "water", temp: 64 },
    { type: "weather", temp: 60 },
    {
      type: "swell",
      primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      secondary: [
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      ],
    },
    { type: "tide", height: 2.4 },
    { type: "wind", wind: { direction: "NNE", speed: 12, loc: "offshore" } },
    { type: "surf", surf: { direction: "NNW", height: "2-3", period: 11 } },
    {
      type: "features",
      tags: [
        { label: "Fishing", icon: <FishingPoleIcon />, color: "bg-blue" },
        { label: "Bathrooms", icon: <BathroomIcon />, color: "bg-yellow" },
        { label: "Parking", icon: <ParkingIcon />, color: "bg-green" },
        { label: "Dogs", icon: <DogIcon />, color: "bg-red" },
        { label: "Sandy", icon: <SandIcon />, color: "bg-orange" },
        { label: "Lifeguard", icon: <LifeRingIcon />, color: "bg-purple" },
      ],
    },
  ];
  return (
    <ul className="grid grid-cols-2 @min-xl:grid-cols-3 @min-4xl:grid-cols-6 gap-2">
      {stats.map((stat) => {
        let content;
        switch (stat.type) {
          case "water":
            content = <GradientCircle condition="water" data={stat.temp} />;
            break;
          case "weather":
            content = <GradientCircle condition="sun" data={stat.temp} />;
            break;
          case "swell":
            content = stat.primary && stat.secondary && (
              <div className="flex flex-col items-center">
                <SwellStat primary data={stat.primary} />
                <SwellStat data={stat.secondary[0]} />
                <SwellStat data={stat.secondary[1]} />
              </div>
            );
            break;
          case "tide":
            content = (
              <div className="flex flex-col w-full">
                <span className="text-2xl font-medium">
                  {stat.height}
                  <span className="text-xs">ft</span>
                </span>
                <TidePreview />
              </div>
            );
            break;
          case "wind":
            content = stat.wind && <WindStat data={stat.wind} />;
            break;
          case "surf":
            content = stat.surf && <SurfStat data={stat.surf} />;
            break;
          case "features":
            content =
              stat.tags &&
              stat.tags.map((tag) => <Tag key={tag.label} data={tag} />);
            break;
        }

        if (content) {
          return (
            <li
              key={stat.type}
              className={cn(
                "highlight-card flex flex-col overflow-hidden",
                stat.type === "features" &&
                  "col-span-2 @min-xl:col-span-3 @min-4xl:col-span-6"
              )}
            >
              <h3 className="highlight-title">{stat.type.toUpperCase()}</h3>
              <div
                className={cn(
                  "flex-1 flex items-center gap-1 mt-1",
                  stat.type !== "features" && "justify-center"
                )}
              >
                {content}
              </div>
            </li>
          );
        }
      })}
    </ul>
  );
};

export default Summary;
