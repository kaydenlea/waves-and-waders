import type { Metadata } from "next";

import DatePicker from "@/components/general/DatePicker";
import HourSlider from "@/components/general/HourSlider";
import SurfChart from "@/components/graphs/SurfChart";
import SwellChart from "@/components/graphs/SwellChart";
import { TideChart } from "@/components/graphs/TideChart";
import WindChart from "@/components/graphs/WindChart";
import Highlights from "@/components/visuals/Highlights";
import StatTable from "@/components/visuals/StatTable";
import Summary from "@/components/visuals/Summary";

export const metadata: Metadata = {
  title: "Surf Daily Forecast | Waves and Waders",
  description:
    "Check the daily and hourly surf conditions of your local beaches",
};

const Page = ({ params }: { params: { beach: string } }) => {
  // const { beach } = params;
  return (
    <div className="@container">
      <header>
        <h1 className="font-semibold text-3xl tracking-tight">
          Huntington Beach
        </h1>
      </header>
      <section className="mb-8">
        <h2 className="mb-2">Thursday, Aug 14</h2>
        <Summary />
      </section>
      <section className="flex flex-col gap-2 w-full">
        <header>
          <h2 className="text-2xl font-semibold">Daily Forecast</h2>
          <p className="text-sm">An insight into the forecast of any day</p>
        </header>
        <div className="mt-2 mb-4">
          <DatePicker />
          <HourSlider />
        </div>
        <div className="flex flex-col @min-3xl:flex-row gap-2">
          <section className="@min-3xl:min-w-100">
            <Highlights />
          </section>
          <figure className="flex-1">
            <TideChart />
          </figure>
        </div>
        <div className="flex flex-col @min-3xl:flex-row gap-2">
          <figure>
            <SwellChart />
          </figure>
          <figure>
            <SurfChart />
          </figure>
        </div>
        {/* <figure>
          <WindChart />
        </figure> */}
        <figure>
          <StatTable visibleCols={3} className="@min-3xl:hidden" />
          <StatTable className="hidden @min-3xl:block" />
        </figure>
      </section>
    </div>
  );
};

export default Page;
