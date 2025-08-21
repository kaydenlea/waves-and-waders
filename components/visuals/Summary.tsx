import { cn } from "@/lib/utils";
import TidePreview from "../graphs/TidePreview";
import SwellStat from "../general/Stats/SwellStat";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import {
  Dog,
  CircleParking,
  Toilet,
  LifeBuoy,
  Fish,
  Shell,
} from "lucide-react";

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
        { label: "Fishing", icon: <Fish size={16} />, color: "bg-blue" },
        { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow" },
        {
          label: "Parking",
          icon: <CircleParking size={16} />,
          color: "bg-green",
        },
        { label: "Dogs", icon: <Dog size={16} />, color: "bg-red" },
        { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange" },
        {
          label: "Lifeguard",
          icon: <LifeBuoy size={16} />,
          color: "bg-purple",
        },
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
                  stat.type !== "features" && "justify-center",
                  stat.type === "features" && "flex-wrap"
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
