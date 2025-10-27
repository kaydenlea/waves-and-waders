"use client";

import React from "react";
import { Calendar, Clock } from "lucide-react";
import { useDateContext } from "../context/DateContext";
import { useMapFilters } from "../context/MapFilterContext";
import { LazyLoadDatePicker } from "./LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "./LazyLoad/LazyLoadHourSlider";

type Props = {
  beachId: string;
  size?: "md" | "lg";
  trailingActions?: React.ReactNode;
};

const TimeRail: React.FC<Props> = ({
  beachId,
  size = "md",
  trailingActions,
}) => {
  const { selected, setSelected, hour, setHour } = useDateContext();
  const { setSelectedDate, setSelectedHour } = useMapFilters();

  const onNow = () => {
    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();
    const rounded = Math.max(0, Math.min(21, Math.round(currentHour / 3) * 3));
    setSelected(dateOnly);
    setSelectedDate(dateOnly);
    setHour(rounded);
    setSelectedHour(rounded);
  };

  const railPad = size === "lg" ? "py-3 @min-4xl:py-3" : "py-2";
  const labelWidth = size === "lg" ? "w-12" : "w-14";

  // Manual popover: center relative to the entire rail (not the button)
  const [open, setOpen] = React.useState(false);
  const railRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const rail = railRef.current;
      const btn = buttonRef.current;
      if (!rail) return;
      const panel = rail.querySelector("[data-time-rail-panel]");
      if (btn && btn.contains(target)) return; // allow toggle via button
      if (panel && (panel as HTMLElement).contains(target as Node)) return; // clicks inside panel
      if (rail && !rail.contains(target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={railRef}
      className={`relative w-full grid grid-cols-[auto_1fr_auto] items-center @min-lg:gap-2 rounded-full bg-background @min-4xl:dark:bg-highlight-5/50 @min-4xl:bg-highlight-5/10 backdrop-blur dark:supports-[backdrop-filter]:bg-highlight-5/90 supports-[backdrop-filter]:bg-background/80 shadow-even px-3 ${railPad} @min-4xl:border @min-4xl:border-border/60`}
    >
      <div className="flex items-center @min-lg:gap-1">
        <button
          type="button"
          onClick={onNow}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-highlight-5/50 hover:bg-highlight-3 px-2.5 @min-lg:px-3 py-2 @min-lg:py-2 text-xs font-medium"
        >
          <Clock size={16} />{" "}
          <span className="hidden @min-md:inline-block">Now</span>
        </button>
        <span
          className={`text-xs @min-lg:text-sm font-medium dark:text-foreground text-muted-foreground text-center ${labelWidth} inline-block`}
        >
          {(() => {
            const v = hour;
            const d = v % 12 === 0 ? 12 : v % 12;
            const ampm = v >= 12 ? "PM" : "AM";
            return `${d} ${ampm}`;
          })()}
        </span>
      </div>

      <LazyLoadHourSlider
        value={hour}
        onChange={setHour}
        min={0}
        max={21}
        step={3}
        className="-mb-1"
      />

      <div className="ml-2 flex items-center gap-2">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-highlight-5/50 hover:bg-highlight-3 px-2.5 @min-lg:px-3 py-2 @min-lg:py-2 text-xs font-medium"
        >
          <Calendar size={16} />
          <span className="tabular-nums hidden @min-md:inline-block text-center w-9">
            {selected
              ? selected.toLocaleDateString(undefined, {
                  month: "numeric",
                  day: "numeric",
                })
              : "Date"}
          </span>
        </button>
        {trailingActions && (
          <>
            <span className="hidden @min-4xl:inline-block h-7 w-px bg-border/80" />
            <div className="hidden @min-4xl:flex items-center">
              {trailingActions}
            </div>
          </>
        )}
      </div>
      {/* Manually positioned panel centered under the entire rail */}
      <div
        data-time-rail-panel
        className={`absolute left-1/2 top-full z-[60] mt-3 w-[min(720px,92vw)] -translate-x-1/2 bg-transparent transition-all duration-200 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <LazyLoadDatePicker
          beachId={beachId}
          value={selected ?? undefined}
          onSelect={(d) => {
            setSelected(d);
            setSelectedDate(d);
          }}
        />
      </div>
    </div>
  );
};

export default TimeRail;
