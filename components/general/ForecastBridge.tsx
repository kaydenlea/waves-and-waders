"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import Link from "next/link";
import { Pencil, Calendar } from "lucide-react";
import { useDateContext } from "../context/DateContext";
import dayjs from "dayjs";
import { LazyLoadForecastWaveEnergy } from "./LazyLoad/LazyLoadForecastWaveEnergy";
import { LazyLoadForecastSurf } from "./LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastWind } from "./LazyLoad/LazyLoadForecastWind";

// ------------------------------------------------------

type Props = { beachId: string };

/**
 * Note: This component intentionally avoids reading any client-only API
 * or client-only context during the server render, to prevent hydration mismatches.
 * It uses `isMounted` and initializes visible state in useEffect (client-only).
 */
const ForecastBridge: React.FC<Props> = ({ beachId }) => {
  // local selected date (kept for the DatePicker's controlled value)
  const [selected, setSelected] = useState<Date | null>(dayjs().toDate());

  // this context may be client-populated; we will only read it after mount to avoid hydration mismatch
  const { selectedDays } = useDateContext();

  // ref for the in-page date picker
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // mounted flag: false during SSR and initial client render; true after mount.
  // This is important to keep server-rendered markup consistent with the first client render.
  const [isMounted, setIsMounted] = useState(false);

  // whether the picker is visible in the viewport; default true so compact bar is NOT shown on SSR/initial render.
  const [isPickerVisible, setIsPickerVisible] = useState<boolean>(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set up the IntersectionObserver on client only (after mount). Keeps layout stable on SSR.
  useEffect(() => {
    if (!isMounted) return;
    if (!pickerRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // fail-safe: assume visible
      setIsPickerVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // update visibility based on intersection status
        setIsPickerVisible(Boolean(e.isIntersecting));
      },
      {
        root: null,
        // rootMargin triggers when the element is mostly out of view
        rootMargin: "0px 0px -70% 0px",
        threshold: 0,
      }
    );

    observer.observe(pickerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isMounted]);

  // Build the human readable window string only after mounted and when selectedDays exist.
  const windowString = useMemo(() => {
    if (!isMounted || !selectedDays || selectedDays.length === 0) {
      return "Select range";
    }
    const windowStart = selectedDays[0].toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    const windowEnd = selectedDays[selectedDays.length - 1].toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      }
    );
    return `${windowStart} - ${windowEnd}`;
  }, [isMounted, selectedDays]);

  return (
    <section className="relative flex flex-col gap-4 mb-2">
      {/* --- Date picker area: sticky on all sizes so behavior is identical everywhere --- */}
      <section
        ref={pickerRef}
        className="sticky top-[var(--nav-height,60px)] z-50"
        aria-label="Date picker region"
      >
        <h2 className="ml-2 text-muted-foreground text-lg">Weekly Forecast</h2>
        <div className="mt-4 mb-4">
          <LazyLoadDatePicker
            forecast
            beachId={beachId}
            className="rounded-b-xl"
            value={selected}
            onSelect={(d) => {
              setSelected(d);
            }}
          />
        </div>
      </section>

      {/* --- Main content header --- */}
      <section
        id="forecast-content"
        className="scroll-mt-[calc(var(--nav-height,72px)+1rem)]"
      >
        <header className="mx-2 flex gap-12 justify-between">
          <div>
            <h2 className="leading-none font-semibold text-2xl">
              {windowString}
            </h2>
            <span className="text-sm text-muted-foreground">
              Look at the days ahead
            </span>
          </div>
          <Link
            href={`/${beachId}/forecast/edit#forecast-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            aria-label="Edit forecast"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </header>
      </section>

      {/* --- Visuals --- */}
      <VisualWrapper label="Tide" unit="ft">
        <LazyLoadForecastTide
          beachId={beachId}
          date={selectedDays?.[0] ?? undefined}
        />
      </VisualWrapper>

      <div className="flex flex-col @min-2xl:flex-row gap-3">
        <VisualWrapper label="Surf" unit="ft">
          <LazyLoadForecastSurf beachId={beachId} days={selectedDays} />
        </VisualWrapper>
        <VisualWrapper label="Wind" unit="mph">
          <LazyLoadForecastWind beachId={beachId} days={selectedDays} />
        </VisualWrapper>
      </div>

      <VisualWrapper label="Hourly Stats">
        <LazyLoadTable
          beachId={beachId}
          numHours={3}
          numDays={7}
          header
          date={selected ?? undefined}
        />
      </VisualWrapper>

      <VisualWrapper label="Wave Energy" unit="kJ">
        <LazyLoadForecastWaveEnergy beachId={beachId} days={selectedDays} />
      </VisualWrapper>
    </section>
  );
};

export default ForecastBridge;
