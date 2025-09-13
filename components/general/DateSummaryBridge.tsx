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

type Props = { beachId: string };

const DateSummaryBridge: React.FC<Props> = ({ beachId }) => {
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [hour, setHour] = React.useState<number>(10);

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 ml-2 text-muted-foreground text-lg">
          {selected ? selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a day'}
        </h2>
        <Summary beachId={beachId} date={selected ?? undefined} />
      </section>
      <div className="mt-2 mb-6">
        <LazyLoadDatePicker beachId={beachId} value={selected} onSelect={setSelected} />
      </div>
      {/* Daily Overview title + Hour slider above Highlights */}
      <header className="mx-2 flex gap-5 justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Daily Overview</h2>
          <p className="text-sm text-muted-foreground">
            An insight into the forecast of any day
          </p>
        </div>
      </header>
      <div className="mt-2 mb-6">
        <LazyLoadHourSlider value={hour} onChange={setHour} min={0} max={23} step={3} />
      </div>
      <section className="mb-4">
        <Highlights beachId={beachId} date={selected ?? undefined} hour={hour} startIdx={0} endIdx={7} />
      </section>
      <div className="flex flex-col @min-3xl:flex-row gap-3">
        <VisualWrapper label="Wind" unit="mph">
          <LazyLoadWind beachId={beachId} date={selected ?? undefined} />
        </VisualWrapper>
        <VisualWrapper label="Tide" unit="ft">
          <LazyLoadTide beachId={beachId} date={selected ?? undefined} />
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
          <LazyLoadTable beachId={beachId} numHours={8} numDays={1} date={selected ?? undefined} />
        </VisualWrapper>
      </div>
    </>
  );
};

export default DateSummaryBridge;
