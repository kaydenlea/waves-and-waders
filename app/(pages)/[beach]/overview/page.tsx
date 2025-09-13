import Link from "next/link";

import Highlights from "@/components/visuals/Highlights";
import Summary from "@/components/visuals/Summary";
import DateSummaryBridge from "@/components/general/DateSummaryBridge";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import { LazyLoadEnergy } from "@/components/general/LazyLoad/LazyLoadEnergy";
import VisualWrapper from "@/components/general/VisualWrapper";
import PageTabs from "@/components/general/PageTabs";
import BackButton from "@/components/general/BackButton";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchBeachByIdLoose } from "@/lib/supabase";
import { Pencil, ArrowLeft as BackIcon, Heart } from "lucide-react";
import SaveButton from "@/components/general/SaveButton";

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

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;
  // If user visits /beach/overview (literal "beach"), send them to selector
  if (beach === "beach") {
    redirect("/beaches");
  }

  // Resolve the beach param to a concrete ID and name (supports id/uuid/slug)
  const resolved = await fetchBeachByIdLoose(beach);
  const beachId = (resolved?.id ?? beach).toString();
  const beachName = resolved?.Name ?? beach;
  const isFav = false;
  return (
    <div id="content" className="@container p-2 scroll-mt-30">
      <header className="relative w-full flex flex-col gap-6 px-2">
        <PageTabs
          defaultPage="overview"
          beach={beach}
          tabs={["overview", "forecast"]}
        />
        <h1 className="font-semibold text-4xl tracking-tight">{beachName}</h1>
      </header>
      <DateSummaryBridge beachId={beachId} />
      <section
        id="overview-content"
        className="flex flex-col gap-3 w-full mb-2 scroll-mt-25"
      >
        {/* Daily Overview title and Hour Slider moved above Highlights in DateSummaryBridge */}
        {/* Highlights for selected date are now shown above via DateSummaryBridge */}
        {/* <span className="leading-none font-semibold text-2xl ml-2 mt-10 mb-3">
          Visuals
        </span> */}
        {/* Chart rows moved into DateSummaryBridge to share selected date */}
        {/* <div className="flex flex-col @min-3xl:flex-row gap-2">
          <figure className="flex-1">
            <div className="h-full bg-highlight-4 border border-border/40 p-2 rounded-xl shadow-sm">
              <header className="mx-2 mb-4 mt-2">
                <h3 className="leading-none font-semibold">
                  Wave Energy{" "}
                  <span className="text-base font-medium">(ft)</span>
                </h3>
                <span className="text-muted-foreground text-sm">
                  Showing the wave energy for the day
                </span>
              </header>
              <LazyLoadEnergy />
            </div>
          </figure>
        </div> */}
        {/* Hourly Stats moved into DateSummaryBridge so it follows DatePicker */}
      </section>
    </div>
  );
};

export default Page;

// import Highlights from "@/components/visuals/Highlights";
// import Summary from "@/components/visuals/Summary";
// import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
// import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
// import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
// import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
// import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
// import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";

// import type { Metadata } from "next";
// import TideSun from "@/components/general/Stats/TideSun";

// const chartData = [
//   { hour: 0, tide: 5, isPeak: 5 },
//   { hour: 1, tide: 4.5 },
//   { hour: 2, tide: 4.3 },
//   { hour: 3, tide: 4.1 },
//   { hour: 4, tide: 3 },
//   { hour: 5, tide: 2 },
//   { hour: 6, tide: 1, isPeak: 1 },
//   { hour: 7, tide: 2 },
//   { hour: 8, tide: 2.5 },
//   { hour: 9, tide: 2.8 },
//   { hour: 10, tide: 3 },
//   { hour: 11, tide: 4.5 },
//   { hour: 12, tide: 5 },
//   { hour: 13, tide: 5.1 },
//   { hour: 14, tide: 5.2 },
//   { hour: 15, tide: 5.3 },
//   { hour: 16, tide: 5.5 },
//   { hour: 17, tide: 5.3 },
//   { hour: 18, tide: 5.5, isPeak: 5.5 },
//   { hour: 19, tide: 5 },
//   { hour: 20, tide: 4.5 },
//   { hour: 21, tide: 4.3 },
//   { hour: 22, tide: 3 },
//   { hour: 23, tide: 2 },
//   { hour: 24, tide: 1, isPeak: 1 },
// ];

// export const metadata: Metadata = {
//   title: "Surf Daily Forecast | Waves and Waders",
//   description:
//     "Check the daily and hourly surf conditions of your local beaches",
// };

// import React from "react";
// import Dashboard from "@/components/general/Dashboard";

// const Page = ({ params }: { params: { beach: string } }) => {
//   // const { beach } = params;
//   return (
//     <div className="mx-auto max-w-6xl px-4">
//       <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
//           <p className="mt-1 text-sm text-gray-600">
//             Customize which widgets are visible, drag entire rows, or reorder
//             widgets inside a row.
//           </p>
//         </div>
//       </header>

//       {/* Client interactive part */}
//       <Dashboard />
//     </div>
//   );
// };

// export default Page;
