"use client";

import React from "react";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";

type Props = { beachId: string };

const ForecastBridge: React.FC<Props> = ({ beachId }) => {
  const [selected, setSelected] = React.useState<Date | null>(null);
  return (
    <>
      <section>
        <h2 className="ml-2 text-muted-foreground text-lg">Weekly Forecast</h2>
        <LazyLoadDatePicker beachId={beachId} className="rounded-b-xl mt-4 mb-4" value={selected} onSelect={setSelected} />
      </section>
      <VisualWrapper label="Tide" unit="ft">
        <LazyLoadForecastTide beachId={beachId} date={selected ?? undefined} />
      </VisualWrapper>
      <VisualWrapper label="Hourly Stats">
        <LazyLoadTable beachId={beachId} numHours={3} numDays={7} header date={selected ?? undefined} />
      </VisualWrapper>
    </>
  );
};

export default ForecastBridge;

