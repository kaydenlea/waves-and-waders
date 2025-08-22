import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadForecastSurf } from "@/components/general/LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Surf Weekly Forecast | Waves and Waders",
  description: "Check the weekly surf conditions of your local beaches",
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
      <section className="flex flex-col gap-2 mb-2">
        <h2 className="ml-2">Surf in the days ahead</h2>
        <LazyLoadDatePicker className="rounded-b-sm" />
        <figure className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="m-2">
            <h3 className="leading-none font-semibold">
              Tide <span className="text-base font-medium">(ft)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the tides for the week
            </span>
          </header>
          <LazyLoadForecastTide />
        </figure>
        <figure className="flex-1 h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="m-2">
            <h3 className="leading-none font-semibold">
              Surf <span className="text-base font-medium">(ft)</span>
            </h3>
            <span className="text-muted-foreground text-sm">
              Showing the surf for the week
            </span>
          </header>
          <LazyLoadForecastSurf />
        </figure>
        <figure className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
          <header className="mx-3 mt-3 mb-2">
            <h3 className="leading-none font-semibold">Weekly Statistics</h3>
            <span className="text-muted-foreground text-sm">
              Hourly stats for the week
            </span>
          </header>
          <LazyLoadTable numHours={3} numDays={7} header />
        </figure>
      </section>
    </div>
  );
};

export default Page;
