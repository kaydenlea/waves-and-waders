"use client";

import React from "react";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import Link from "next/link";
import { Pencil } from "lucide-react";

type Props = { beachId: string };

const ForecastBridge: React.FC<Props> = ({ beachId }) => {
  const [selected, setSelected] = React.useState<Date | null>(null);
  return (
    <>
      <section>
        <h2 className="ml-2 text-muted-foreground text-lg">Weekly Forecast</h2>
        <LazyLoadDatePicker
          forecast
          beachId={beachId}
          className="rounded-b-xl mt-4 mb-4"
          value={selected}
          onSelect={setSelected}
        />
      </section>
      <section id="forecast-content" className="scroll-mt-25">
        <header className="mx-2 flex gap-12 justify-between">
          <div>
            <h2 className="leading-none font-semibold text-2xl">
              Mon, Aug 14 - Sun, Aug 20
            </h2>
            <span className="text-sm text-muted-foreground">
              Local time: 8:30 PM, PDT
            </span>
          </div>
          <Link
            href={`/${beachId}/forecast/edit#forecast-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </header>
      </section>
      <VisualWrapper label="Tide" unit="ft">
        <LazyLoadForecastTide beachId={beachId} date={selected ?? undefined} />
      </VisualWrapper>
      <VisualWrapper label="Hourly Stats">
        <LazyLoadTable
          beachId={beachId}
          numHours={3}
          numDays={7}
          header
          date={selected ?? undefined}
        />
      </VisualWrapper>
    </>
  );
};

export default ForecastBridge;
