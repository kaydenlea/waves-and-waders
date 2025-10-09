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
import GradientCircle from "@/components/general/Stats/GradientCircle";
import BeachCrossSection from "@/components/visuals/WaveModel";

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
    <>
      <div className="block @min-3xl:hidden flex justify-center pt-5 pb-7">
        <div className="bg-gray-300 w-16 h-1.5 rounded-full" />
      </div>
      <div className="@container p-2">
        <header
          id="content"
          className="relative w-full flex flex-col gap-6 px-2 scroll-mt-30"
        >
          <PageTabs
            defaultPage="overview"
            beach={beach}
            tabs={["overview", "forecast"]}
          />
          <h1 className="font-semibold text-4xl tracking-tight w-full @min-3xl:max-w-3/5">
            {beachName}
          </h1>
        </header>
        <DateSummaryBridge beachId={beachId} />
      </div>
    </>
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
