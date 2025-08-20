import { cn } from "@/lib/utils";
import SwellStat from "../general/SwellStat";

import { FaSun, FaWind } from "react-icons/fa";
import { IoIosWater } from "react-icons/io";
import { WiMoonAltWaningCrescent2 } from "react-icons/wi";

const WeatherStat = ({
  temp,
  condition,
}: {
  temp: number;
  condition?: string;
}) => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {condition && condition === "sun" ? (
        <FaSun size={22} color="#fa9847ff" />
      ) : (
        <IoIosWater size={22} color="#80b7ffff" />
      )}
      <span className="text-2xl font-medium">
        {temp}
        <span className="text-sm font-normal">&deg;F</span>
      </span>
    </div>
  );
};

const BasicStat = ({
  data,
}: {
  data: { value: number | string; unit: string };
}) => {
  return (
    <span
      className={cn(
        "text-2xl font-medium px-3 py-2 border border-border rounded-md",
        typeof data.value === "number" ? "bg-green" : "bg-red"
      )}
    >
      {data.value}
      <span className="text-sm font-normal">{data.unit}</span>
    </span>
  );
};

const MoonStat = ({ data }: { data: string }) => {
  const phase = data.split(" ");
  return (
    <div className="flex items-center justify-center">
      <WiMoonAltWaningCrescent2 size={28} />
      <div className="flex flex-col">
        <span className="text-sm">{phase[0]}</span>
        <span className="text-sm">{phase[1]}</span>
      </div>
    </div>
  );
};

const WindStat = ({ data }: { data: { speed: number; max: number } }) => {
  return (
    <span className="flex gap-1 bg-orange border border-border rounded-md py-2 px-3">
      <span className="text-2xl font-medium">{data.speed}</span>
      <span className="flex flex-col -space-y-1">
        <span className="text-[0.7rem]">{data.max}</span>
        <span className="text-xs">mph</span>
      </span>
    </span>
  );
};

const Highlights = () => {
  const stats = [
    { label: "weather", weather: { temp: 64, condition: "sun" } },
    { label: "water", temp: 60 },
    {
      label: "swell",
      primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      secondary: [
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      ],
    },
    { label: "tide", tide: { value: "2-3", unit: "ft" } },
    { label: "moon phase", phase: "Waning Cresent" },
    { label: "wind", wind: { speed: 12, max: 17 } },
    { label: "pressure", pressure: { value: 29.9, unit: "in" } },
    { label: "wave energy", energy: { value: 278, unit: "kJ" } },
  ];

  return (
    <div className="p-2 border border-border rounded-md shadow-sm">
      <header className="ml-1 mb-4 mt-2">
        <h3 className="text-xl font-semibold">Current Conditions</h3>
        <p className="text-sm -mt-0.5">Showing the stats for the day</p>
      </header>
      <ul className="grid grid-cols-2 gap-2">
        {stats.map((stat) => {
          let content;
          switch (stat.label) {
            case "swell":
              content = stat.primary && stat.secondary && (
                <div className="flex flex-col items-center">
                  <SwellStat primary data={stat.primary} />
                  <SwellStat data={stat.secondary[0]} />
                  <SwellStat data={stat.secondary[1]} />
                </div>
              );
              break;
            case "weather":
              content = stat.weather && (
                <WeatherStat
                  temp={stat.weather.temp}
                  condition={stat.weather.condition}
                />
              );
              break;
            case "water":
              content = stat.temp && <WeatherStat temp={stat.temp} />;
              break;
            case "tide":
              content = stat.tide && <BasicStat data={stat.tide} />;
              break;
            case "moon phase":
              content = stat.phase && <MoonStat data={stat.phase} />;
              break;
            case "wind":
              content = stat.wind && <WindStat data={stat.wind} />;
              break;
            case "pressure":
              content = stat.pressure && <BasicStat data={stat.pressure} />;
              break;
            case "wave energy":
              content = stat.energy && <BasicStat data={stat.energy} />;
              break;
          }
          if (content) {
            return (
              <li key={stat.label} className="highlight-card">
                <h4 className="highlight-title">{stat.label.toUpperCase()}</h4>
                <div
                  className={
                    "flex-1 flex items-center justify-center gap-1 mt-1"
                  }
                >
                  {content}
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

export default Highlights;
