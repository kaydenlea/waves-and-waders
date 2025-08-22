import Highlights from "@/components/visuals/Highlights";
import Summary from "@/components/visuals/Summary";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";

import type { Metadata } from "next";
import TideSun from "@/components/general/Stats/TideSun";

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

export const metadata: Metadata = {
  title: "Surf Daily Forecast | Waves and Waders",
  description:
    "Check the daily and hourly surf conditions of your local beaches",
};

const Page = ({ params }: { params: { beach: string } }) => {
  // const { beach } = params;
  return (
    <div id="content-container" className="@container">
      <header className="ml-2">
        <h1 className="font-semibold text-3xl tracking-tight">
          Huntington Beach
        </h1>
      </header>
      <section className="mb-8">
        <h2 className="mb-2 ml-2">Thursday, Aug 14</h2>
        <Summary />
      </section>
      <section className="flex flex-col gap-2 w-full mb-2">
        <header className="ml-2">
          <h2 className="text-2xl font-semibold">Daily Forecast</h2>
          <p className="text-sm">An insight into the forecast of any day</p>
        </header>
        <div className="mt-2 mb-4">
          <LazyLoadDatePicker />
          <LazyLoadHourSlider />
        </div>
        <div className="flex flex-col @min-3xl:flex-row gap-2">
          <section className="@min-3xl:min-w-100">
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
        {/* <figure>
          <WindChart />
        </figure> */}
        <figure className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-3 mt-3 mb-4">
            <h3 className="leading-none font-semibold">Hourly Statistics</h3>
            <span className="text-muted-foreground text-sm">
              Hourly stats for the week
            </span>
          </header>
          <LazyLoadTable numHours={8} numDays={1} />
        </figure>
      </section>
    </div>
  );
};

export default Page;
