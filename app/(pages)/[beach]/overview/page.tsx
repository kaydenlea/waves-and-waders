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
      <section>
        <h2 className="mb-2">Thursday, Aug 14</h2>
        <Summary />
      </section>
      <section>
        <header>
          <h2>Daily Forecast</h2>
          <p>An insight into the forecast of any day</p>
        </header>
        <div>
          <DatePicker />
          <HourSlider />
        </div>
        <section>
          <Highlights />
        </section>
        <figure>
          <TideChart />
        </figure>
        <figure>
          <SwellChart />
        </figure>
        <figure>
          <SurfChart />
        </figure>
        <figure>
          <WindChart />
        </figure>
        <figure>
          <StatTable />
        </figure>
      </section>
    </div>
  );
};

export default Page;
