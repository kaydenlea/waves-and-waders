import Link from "next/link";

import Highlights from "@/components/visuals/Highlights";
import Summary from "@/components/visuals/Summary";
import TideSun from "@/components/general/Stats/TideSun";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadEnergy } from "@/components/general/LazyLoad/LazyLoadEnergy";
import VisualWrapper from "@/components/general/VisualWrapper";
import PageTabs from "@/components/general/PageTabs";
import BackButton from "@/components/general/BackButton";

import type { Metadata } from "next";
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
          <h1 className="font-semibold text-4xl tracking-tight">
            Huntington Beach
          </h1>
        </header>
        <section className="mb-8">
          <h2 className="mb-2 ml-2 text-muted-foreground text-lg">
            Thursday, Aug 14
          </h2>
          <Summary />
        </section>
        <section
          id="overview-content"
          className="flex flex-col gap-3 w-full mb-2 scroll-mt-25"
        >
          <header className="mx-2 flex gap-5 justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Daily Overview</h2>
              <p className="text-sm text-muted-foreground">
                An insight into the forecast of any day
              </p>
            </div>
            {/* <Button
            aria-label="edit layout"
            size="icon"
            variant="outline"
            className="border border-border bg-background rounded-full drop-shadow-sm"
          >
            <Pencil />
          </Button> */}
            <Link
              href={`/${beach}/overview/edit#overview-content`}
              className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            >
              <Pencil size={16} />
              Edit
            </Link>
          </header>
          {/* <Dashboard /> */}
          <section className="mt-2 mb-8">
            <LazyLoadDatePicker />
            <section className="p-4 bg-highlight-4 border-y border-border/60 shadow-even flex justify-center gap-2">
              <div className="relative p-2 w-50 rounded-lg bg-highlight-7 hidden @min-3xl:block shadow-sm border border-border/50">
                <h3 className="absolute top-2 left-2 text-xs font-semibold">
                  TIDE
                </h3>
                <div className="flex justify-center items-center h-full">
                  <GradientCircle
                    color="bg-highlight-6"
                    condition="tide"
                    size={90}
                    strokeWidth={9}
                    percentage={80}
                    data={"2-3"}
                  />
                </div>
              </div>
              <div className="flex-1 p-3 bg-highlight-7 rounded-lg border border-border/50 shadow-even space-y-4">
                {/* <div className="w-30 h-30 bg-gray-700 rounded-lg" /> */}
                <div className="flex gap-2">
                  <div className="w-1 p-1 rounded-full bg-green-400" />
                  <header>
                    <h3 className="text-xl font-semibold">
                      Huntington Beach Summary
                    </h3>
                    <span className="text-sm">Tues, Sep 3, 1 PM PDT</span>
                  </header>
                </div>
                <p className="text-base">
                  The waves are <span className="font-bold">2-3 ft</span> and{" "}
                  <span className="font-bold">calm</span>. Be careful of winds
                  coming in at <span className="font-bold">12 mph SW</span>.
                </p>
              </div>
              <div className="relative p-2 w-50 rounded-lg bg-highlight-7 hidden @min-3xl:block shadow-sm border border-border/50">
                <h3 className="absolute top-2 left-2 text-xs font-semibold">
                  WIND
                </h3>
                <div className="flex justify-center items-center h-full">
                  <GradientCircle
                    color="bg-highlight-6"
                    condition="wind"
                    size={90}
                    strokeWidth={9}
                    percentage={20}
                    data={"12"}
                  />
                </div>
              </div>
            </section>
            <LazyLoadHourSlider />
          </section>
          <section className="flex-1">
            <header className="ml-2 mb-6">
              {/* <Calendar className="h-7 w-7" /> */}
              <h3 className="leading-none font-semibold text-2xl">
                Monday, August 14
              </h3>
              <span className="text-sm text-muted-foreground">
                Local time: 8:30 PM, PDT
              </span>
            </header>
            <Highlights startIdx={0} endIdx={7} />
            <div className="py-2">
              <BeachCrossSection />
            </div>
          </section>
          {/* <span className="leading-none font-semibold text-2xl ml-2 mt-10 mb-3">
          Visuals
        </span> */}
          <div className="flex flex-col @min-3xl:flex-row gap-3">
            <VisualWrapper label="Wind" unit="mph">
              <LazyLoadWind />
            </VisualWrapper>
            <VisualWrapper label="Tide" unit="ft">
              <LazyLoadTide chartData={chartData} />
              <figcaption className="flex justify-between ml-10 mr-8 mt-2">
                <TideSun chartData={chartData} />
              </figcaption>
            </VisualWrapper>
          </div>
          <div className="flex flex-col @min-3xl:flex-row gap-3">
            <VisualWrapper label="Swell" unit="ft">
              <LazyLoadSwell />
            </VisualWrapper>
            <VisualWrapper label="Surf" unit="ft">
              <LazyLoadSurf />
            </VisualWrapper>
          </div>
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
          <VisualWrapper label="Hourly Stats">
            <LazyLoadTable numHours={8} numDays={1} />
          </VisualWrapper>
        </section>
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
