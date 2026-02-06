"use client";

import React, {
  startTransition,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Calendar, TimerReset } from "lucide-react";
import { useDateContext } from "../context/DateContext";
import { LazyLoadDatePicker } from "./LazyLoad/LazyLoadDatePicker";
import { LazyLoadHourSlider } from "./LazyLoad/LazyLoadHourSlider";
import { cn, getPacificHour, getPacificMidnightUTC } from "@/lib/utils";

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
  const [hourChanged, setHourChanged] = useState(false);
  const hourChangedTimeoutRef = useRef<number | null>(null);

  const triggerHourChanged = () => {
    setHourChanged(true);
    if (hourChangedTimeoutRef.current != null) {
      window.clearTimeout(hourChangedTimeoutRef.current);
    }
    hourChangedTimeoutRef.current = window.setTimeout(() => {
      hourChangedTimeoutRef.current = null;
      setHourChanged(false);
    }, 600);
  };

  // Handler that updates UI immediately with rAF throttling for smoothness
  const hourRafRef = useRef<number | null>(null);
  const nextHourRef = useRef<number>(hour);
  const handleHourChange = (newHour: number) => {
    nextHourRef.current = newHour;
    if (hourRafRef.current == null) {
      hourRafRef.current = requestAnimationFrame(() => {
        hourRafRef.current = null;
        // Immediate UI update (frame-throttled)
        setHour(nextHourRef.current);
        triggerHourChanged();
      });
    }
  };

  const handleHourCommit = (newHour: number) => {
    // Apply selected hour immediately on commit to keep everything in sync
    startTransition(() => {
      setHour(newHour);
    });
  };

  useEffect(() => {
    return () => {
      if (hourRafRef.current != null) {
        cancelAnimationFrame(hourRafRef.current);
        hourRafRef.current = null;
      }
      if (hourChangedTimeoutRef.current != null) {
        window.clearTimeout(hourChangedTimeoutRef.current);
        hourChangedTimeoutRef.current = null;
      }
    };
  }, []);

  const onNow = () => {
    const now = new Date();
    const dateOnly = getPacificMidnightUTC(now);
    const currentHour = getPacificHour(now);
    const rounded = Math.max(0, Math.min(21, Math.round(currentHour / 3) * 3));
    startTransition(() => {
      setSelected(dateOnly);
      setHour(rounded);
    });
  };

  const railPad = size === "lg" ? "py-2.5 @min-4xl:py-2.5" : "py-2";

  const [open, setOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const hasOpenedRef = React.useRef(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const railRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setClosing(false);
      return;
    }
    if (!hasOpenedRef.current) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setClosing(false);
      closeTimerRef.current = null;
    }, 0);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

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

  const panelActive = open || closing;

  return (
    <div ref={railRef} className="relative w-full" data-time-rail-root>
      <Collapsible.Root open={open} onOpenChange={setOpen} className="w-full">
        <div
          className={cn(
            "grid grid-cols-[auto_1fr_auto] items-center @min-lg:gap-2 rounded-full bg-background/80 dark:bg-highlight-5/80 @min-4xl:dark:bg-highlight-5/90 @min-4xl:bg-background/80 backdrop-blur shadow-even px-2 @min-md:px-3 transition-[background-color,border-color,box-shadow] duration-300",
            railPad,
            panelActive ? "rounded-t-[1.75rem] rounded-b-none" : "rounded-full"
          )}
        >
          <div className="flex items-center @min-lg:gap-1 mr-1.5">
            <button
              type="button"
              onClick={onNow}
              aria-label="Jump to current hour"
              title="Jump to current hour"
              className="inline-flex items-center gap-1 rounded-full bg-highlight-3/75 dark:bg-highlight-2 dark:hover:bg-highlight-5 hover:bg-highlight-5 hover:shadow-sm justify-center py-2 w-16 @min-md:w-20 text-xs font-semibold"
            >
              <TimerReset className="w-3.5 h-3.5 @min-md:w-4 @min-md:h-4 -mt-[2px]" />
              <span
                className={cn(
                  "text-[0.7rem] @min-md:text-xs -mb-[1px] @min-md:mb-0 transition-all duration-300",
                  hourChanged
                    ? "scale-110 text-blue-500 dark:text-blue-400 font-semibold"
                    : "text-foreground scale-100"
                )}
              >
                {(() => {
                  const v = hour;
                  const d = v % 12 === 0 ? 12 : v % 12;
                  const ampm = v >= 12 ? "PM" : "AM";
                  return `${d} ${ampm}`;
                })()}
              </span>
            </button>
          </div>

          <LazyLoadHourSlider
            beachId={beachId}
            date={selected}
            value={hour}
            onChange={handleHourChange}
            onCommit={handleHourCommit}
            min={0}
            max={21}
            step={3}
            className="-mb-0"
          />

          <div className="ml-1.5 flex items-center gap-2">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Choose date"
              title="Choose date"
              className="inline-flex items-center gap-1 rounded-full bg-highlight-3/75 dark:bg-highlight-2 dark:hover:bg-highlight-5 hover:bg-highlight-5 hover:shadow-sm px-2.5 @min-lg:px-3 py-2 @min-lg:py-2 text-xs font-semibold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 @min-md:w-4 @min-md:h-4" />
              <span className="tabular-nums hidden @min-md:inline-block text-center w-9">
                {selected
                  ? selected.toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                      timeZone: "America/Los_Angeles",
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
        </div>
        <Collapsible.Content
          forceMount
          data-time-rail-panel
          id={`time-rail-panel-${beachId}`}
          className={cn(
            "@container absolute left-0 right-0 top-full z-[60] mt-[0.03rem] rounded-b-[1.75rem] shadow-even bg-background/80 dark:bg-highlight-5/80 @min-4xl:dark:bg-highlight-5/90 @min-4xl:bg-background/80 backdrop-blur px-1 py-0.5 overflow-hidden transition-all duration-200",
            "data-[state=closed]:max-h-0 data-[state=open]:max-h-[520px] data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
          )}
        >
            <LazyLoadDatePicker
              beachId={beachId}
              value={selected ?? undefined}
              onSelect={(d) => {
                startTransition(() => {
                  setSelected(d);
                });
              }}
            />
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
};

export default TimeRail;
