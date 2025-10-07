"use client";

import React from "react";
import Summary from "@/components/visuals/Summary";
import Highlights from "@/components/visuals/Highlights";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import Link from "next/link";
import { Pencil } from "lucide-react";
import GradientCircle from "./Stats/GradientCircle";
import BeachCrossSection from "@/components/visuals/WaveModel";

type Props = { beachId: string };

const DateSummaryBridge: React.FC<Props> = ({ beachId }) => {
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [hour, setHour] = React.useState<number>(() => {
    const currentHour = new Date().getHours();
    return Math.round(Math.max(0, Math.min(21, currentHour)) / 3) * 3;
  });
  const [currentTime, setCurrentTime] = React.useState<string>(() => {
    return new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  });
  const { setSelectedDate } =
    require("@/components/context/MapFilterContext").useMapFilters();

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      );
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Sync selected date with map context
  React.useEffect(() => {
    setSelectedDate(selected);
  }, [selected, setSelectedDate]);

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 ml-2 text-muted-foreground text-lg">
          {selected
            ? selected.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Select a day"}
        </h2>
        <Summary beachId={beachId} date={selected ?? undefined} />
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
          <Link
            href={`/${beachId}/overview/edit#overview-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </header>
        {/* <Dashboard /> */}
        <section className="mt-2 mb-8">
          <LazyLoadDatePicker
            beachId={beachId}
            value={selected}
            onSelect={setSelected}
          />
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
          <LazyLoadHourSlider
            value={hour}
            onChange={setHour}
            min={0}
            max={21}
            step={3}
          />
        </section>
        <section className="flex-1">
          <header className="ml-2 mb-6">
            {/* <Calendar className="h-7 w-7" /> */}
            <h3 className="leading-none font-semibold text-2xl">
              {selected
                ? selected.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </h3>
            <span className="text-sm text-muted-foreground">
              Local time: {currentTime}
            </span>
          </header>
          <Highlights
            beachId={beachId}
            date={selected ?? undefined}
            hour={hour}
            startIdx={0}
            endIdx={7}
          />
          <div className="py-2">
            <BeachCrossSection />
          </div>
        </section>
        <div className="flex flex-col @min-3xl:flex-row gap-3">
          <VisualWrapper label="Tide" unit="ft">
            <LazyLoadTide beachId={beachId} date={selected ?? undefined} />
          </VisualWrapper>
          <VisualWrapper label="Wind" unit="mph">
            <LazyLoadWind beachId={beachId} date={selected ?? undefined} />
          </VisualWrapper>
        </div>
        <div className="flex flex-col @min-3xl:flex-row gap-3 mt-3">
          <VisualWrapper label="Swell" unit="ft">
            <LazyLoadSwell beachId={beachId} date={selected ?? undefined} />
          </VisualWrapper>
          <VisualWrapper label="Surf" unit="ft">
            <LazyLoadSurf beachId={beachId} date={selected ?? undefined} />
          </VisualWrapper>
        </div>
        <div className="mt-3">
          <VisualWrapper label="Hourly Stats">
            <LazyLoadTable
              beachId={beachId}
              numHours={8}
              numDays={1}
              date={selected ?? undefined}
            />
          </VisualWrapper>
        </div>
      </section>
    </>
  );
};

export default DateSummaryBridge;
