import React from "react";

import Highlights from "@/components/visuals/Highlights";
import TideSun from "@/components/general/Stats/TideSun";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadEnergy } from "@/components/general/LazyLoad/LazyLoadEnergy";

const chartData = [
  { hour: 0, tide: 5, isPeak: 5 },
  { hour: 1, tide: 4.5 },
  { hour: 2, tide: 4.3 },
  { hour: 3, tide: 4.1 },
  { hour: 4, tide: 3 },
  { hour: 5, tide: 2 },
  { hour: 6, tide: 1, isPeak: 1 },
  { hour: 7, tide: 2 },
  { hour: 8, tide: 2.5 },
  { hour: 9, tide: 2.8 },
  { hour: 10, tide: 3 },
  { hour: 11, tide: 4.5 },
  { hour: 12, tide: 5 },
  { hour: 13, tide: 5.1 },
  { hour: 14, tide: 5.2 },
  { hour: 15, tide: 5.3 },
  { hour: 16, tide: 5.5 },
  { hour: 17, tide: 5.3 },
  { hour: 18, tide: 5.5, isPeak: 5.5 },
  { hour: 19, tide: 5 },
  { hour: 20, tide: 4.5 },
  { hour: 21, tide: 4.3 },
  { hour: 22, tide: 3 },
  { hour: 23, tide: 2 },
  { hour: 24, tide: 1, isPeak: 1 },
];

const OverviewContent = () => {
  return (
    <>
      <div className="mt-2 mb-4">
        <LazyLoadDatePicker />
        <LazyLoadHourSlider />
      </div>
      <div className="flex flex-col @min-3xl:flex-row gap-2">
        <section className="@min-3xl:min-w-100 flex-1">
          <Highlights />
        </section>
        <figure className="flex-1">
          <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
            <header className="mx-2 mb-4 mt-2">
              <h3 className="leading-none font-semibold">
                Tide <span className="text-base font-medium">(ft)</span>
              </h3>
              <span className="text-muted-foreground text-sm">
                Showing the tides for the day
              </span>
            </header>
            <LazyLoadTide chartData={chartData} />
            <figcaption className="flex justify-between ml-10 mr-8 mt-2">
              <TideSun chartData={chartData} />
            </figcaption>
          </div>
        </figure>
      </div>
      <div className="flex flex-col @min-3xl:flex-row gap-2">
        <figure className="flex-1 h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-2 mb-4 mt-2">
            <h3 className="leading-none font-semibold">
              Swell <span className="text-base font-medium">(ft)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the swell for the day
            </span>
          </header>
          <LazyLoadSwell />
        </figure>
        <figure className="flex-1 h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-2 mb-4 mt-2">
            <h3 className="leading-none font-semibold">
              Surf <span className="text-base font-medium">(ft)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the surf for the day
            </span>
          </header>
          <LazyLoadSurf />
        </figure>
      </div>
      <div className="flex flex-col @min-3xl:flex-row gap-2">
        <figure className="flex-1 h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-2 mb-4 mt-2">
            <h3 className="leading-none font-semibold">
              Wave Energy <span className="text-base font-medium">(ft)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the wave energy for the day
            </span>
          </header>
          <LazyLoadEnergy />
        </figure>
        <figure className="flex-1 h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-2 mb-4 mt-2">
            <h3 className="leading-none font-semibold">
              Wind <span className="text-base font-medium">(mph)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the wind for the day
            </span>
          </header>
          <LazyLoadWind />
        </figure>
      </div>
      <figure className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
        <header className="mx-3 mt-3 mb-4">
          <h3 className="leading-none font-semibold">Hourly Statistics</h3>
          <span className="text-muted-foreground text-sm">
            Hourly stats for the week
          </span>
        </header>
        <LazyLoadTable numHours={8} numDays={1} />
      </figure>
    </>
  );
};

export default OverviewContent;
