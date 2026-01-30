"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import {
  getCachedHourSliderTrackGradient,
  setCachedHourSliderTrackGradient,
} from "@/lib/ui/hourSliderTrackCache";
import {
  buildSurfIntensityTrackGradientFromSegments,
  getSurfIntensityBand,
  type SurfIntensitySegment,
  summarizeForecastSurfMaxFtInHourRange,
} from "@/lib/forecast/surfIntensity";

type Props = {
  beachId?: string;
  date?: Date | null;
  value?: number | null;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  previewTrackGradient?: string;
  className?: string;
};

const HourSlider = ({
  beachId,
  date,
  value: controlled,
  onChange,
  onCommit,
  min = 0,
  max = 21,
  step = 3,
  previewTrackGradient,
  className = "",
}: Props) => {
  const [internal, setInternal] = useState<number>(() => {
    if (controlled !== undefined && controlled !== null) return controlled;
    const currentHour = new Date().getHours();
    const constrainedHour = Math.max(min, Math.min(max, currentHour));
    return Math.round(constrainedHour / step) * step;
  });

  const [isSliding, setIsSliding] = useState(false);
  const interactionLockReleaseRef = useRef<(() => void) | null>(null);
  const hour = controlled ?? internal;
  const displayValue = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
  const sliderValue = useMemo(() => [hour], [hour]);

  const {
    rows: forecastRows,
    start: windowStart,
    end: windowEnd,
    loading: forecastLoading,
  } = useForecastWindowData({
    beachId: beachId ? String(beachId) : undefined,
    date: date ?? undefined,
    hours: 24,
  });

  const stepSegments = useMemo(() => {
    const out: number[] = [];
    const safeStep = step > 0 ? step : 3;
    for (let h = min; h < max; h += safeStep) {
      out.push(h);
    }
    return out;
  }, [max, min, step]);

  const lastGradientRef = useRef<string | null>(null);
  const pendingWindowStartMsRef = useRef<number | null>(null);
  const pendingSinceMsRef = useRef<number | null>(null);
  const lastBeachKeyRef = useRef<string>("");
  const lastBeachIdRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedBeachId = beachId ? String(beachId) : "";
    const nextKey = `${normalizedBeachId}::${date?.toISOString?.() ?? ""}`;
    if (lastBeachKeyRef.current !== nextKey) {
      const beachChanged =
        lastBeachIdRef.current != null &&
        lastBeachIdRef.current !== normalizedBeachId;

      lastBeachIdRef.current = normalizedBeachId;
      lastBeachKeyRef.current = nextKey;

      // Keep the previous track gradient while switching dates so the slider
      // never flashes to an "unknown" state on the first uncached fetch.
      if (beachChanged) {
        lastGradientRef.current = null;
        setCachedHourSliderTrackGradient(null);
      } else if (lastGradientRef.current == null) {
        lastGradientRef.current = getCachedHourSliderTrackGradient();
      }

      pendingWindowStartMsRef.current = null;
      pendingSinceMsRef.current = null;
    }
  }, [beachId, date]);

  const computedTrackGradient = useMemo(() => {
    if (!beachId && previewTrackGradient) {
      return previewTrackGradient;
    }
    const safeRows = Array.isArray(forecastRows) ? forecastRows : [];
    const startMs = windowStart.getTime();
    const endMs = windowEnd.getTime();

    const hasRowInWindow =
      safeRows.length > 0 &&
      safeRows.some((row) => {
        const ts = new Date(row.timestamp).getTime();
        return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
      });

    const isWindowPending =
      !hasRowInWindow && (forecastLoading || safeRows.length > 0);

    if (pendingWindowStartMsRef.current !== startMs) {
      pendingWindowStartMsRef.current = startMs;
      pendingSinceMsRef.current = Date.now();
    }

    // Prevent flashing to "unknown" while switching windows (first uncached fetch).
    if (!hasRowInWindow && lastGradientRef.current) {
      const pendingForMs =
        pendingSinceMsRef.current != null
          ? Date.now() - pendingSinceMsRef.current
          : 0;
      if (isWindowPending || pendingForMs < 1200) {
        return lastGradientRef.current;
      }
    }

    if (safeRows.length === 0 && forecastLoading) {
      return (
        lastGradientRef.current ??
        `linear-gradient(90deg, var(--ww-surf-intensity-unknown) 0%, var(--ww-surf-intensity-unknown) 100%)`
      );
    }

    const safeStep = step > 0 ? step : 3;
    const segments: SurfIntensitySegment[] = stepSegments.map((startHour) => {
      const endHour = Math.min(max, startHour + safeStep);
      const includeEnd = endHour >= max;

      const intensityFt = summarizeForecastSurfMaxFtInHourRange(
        safeRows,
        windowStart,
        startHour,
        endHour,
        { includeEnd }
      );

      return {
        startHour,
        endHour,
        band: getSurfIntensityBand(intensityFt),
      };
    });

    return buildSurfIntensityTrackGradientFromSegments({
      segments,
      min,
      max,
      blendHours: Math.max(0.2, Math.min(0.5, safeStep * 0.1)),
    });
  }, [
    forecastLoading,
    forecastRows,
    max,
    min,
    previewTrackGradient,
    step,
    stepSegments,
    beachId,
    windowEnd,
    windowStart,
  ]);

  useEffect(() => {
    const safeRows = Array.isArray(forecastRows) ? forecastRows : [];
    const startMs = windowStart.getTime();
    const endMs = windowEnd.getTime();
    const hasRowInWindow =
      safeRows.length > 0 &&
      safeRows.some((row) => {
        const ts = new Date(row.timestamp).getTime();
        return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
      });

    if (hasRowInWindow) {
      lastGradientRef.current = computedTrackGradient;
      setCachedHourSliderTrackGradient(computedTrackGradient);
    }
  }, [computedTrackGradient, forecastRows, windowEnd, windowStart]);

  // Range tint: lighter during the day, darker at night (neutral slate)
  const rangeTint = useMemo(() => {
    const b = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const base = { r: 148, g: 163, b: 184 }; // slate-400
    const alpha = 0.22 + 0.28 * b; // 0.22 night -> 0.50 midday
    return `rgba(${base.r},${base.g},${base.b},${alpha.toFixed(3)})`;
  }, [hour]);

  const thumbShadow = useMemo(() => {
    const b = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const alpha = 0.1 + 0.22 * b; // subtle ring; stronger mid-day
    return `0 0 0 6px rgba(148,163,184,${alpha.toFixed(3)})`; // slate-400 ring
  }, [hour]);

  const handleChange = (vals: number[]) => {
    const v = Math.max(min, Math.min(max, Math.round(vals[0] ?? hour)));
    setInternal(v);
    onChange?.(v);
  };

  useEffect(() => {
    return () => {
      interactionLockReleaseRef.current?.();
      interactionLockReleaseRef.current = null;
    };
  }, []);

  return (
    <div
      className={cn(
        // "border border-border space-y-1 flex flex-col gap-2 relative py-[15px] px-6 bg-highlight-4 shadow-no-top rounded-full flex-1",
        "flex flex-col relative flex-1",
        className
      )}
    >
      {/* <h3 className="text-md font-medium">{`${displayValue} ${ampm}`}</h3> */}
      <Slider
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onValueChange={handleChange}
        onValueCommit={(vals) => {
          const v = Math.max(min, Math.min(max, Math.round(vals[0] ?? hour)));
          onCommit?.(v);
        }}
        onPointerDown={() => {
          setIsSliding(true);
          if (!interactionLockReleaseRef.current) {
            interactionLockReleaseRef.current = acquireInteractionLock();
          }
        }}
        onPointerUp={() => {
          setIsSliding(false);
          interactionLockReleaseRef.current?.();
          interactionLockReleaseRef.current = null;
        }}
        onPointerCancel={() => {
          setIsSliding(false);
          interactionLockReleaseRef.current?.();
          interactionLockReleaseRef.current = null;
        }}
        className="z-1"
        trackClassName="h-2 border border-border/50"
        rangeClassName={cn(
          "transition-colors",
          isSliding ? "duration-0" : "duration-300"
        )}
        thumbClassName="relative z-10 size-5 bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-white shadow-md"
        trackStyle={{
          backgroundImage:
            computedTrackGradient ??
            previewTrackGradient ??
            "linear-gradient(90deg, var(--ww-surf-intensity-unknown) 0%, var(--ww-surf-intensity-unknown) 100%)",
          backgroundColor: "var(--ww-surf-intensity-unknown)",
        }}
        // rangeStyle={{ background: rangeTint }}
        thumbStyle={{ boxShadow: thumbShadow }}
        // displayContent={
        //   <span
        //     className={cn(
        //       "font-medium absolute bottom-4.5 text-[0.7rem] w-10 text-center transform",
        //       hour === 0
        //         ? "-left-1"
        //         : hour === 21
        //         ? "-right-1.5"
        //         : "-translate-x-1/3"
        //     )}
        //   >
        //     {`${displayValue} ${ampm}`}
        //   </span>
        // }
      />
      {/* <div className="pointer-events-none relative -mt-2 h-3 w-full">
        {Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => {
          const val = min + i * step;
          const pct = ((val - min) / (max - min)) * 100;
          return (
            <span
              key={val}
              className="absolute top-0 h-3 w-[2px] rounded bg-border/70"
              style={{ left: `${pct}%`, transform: "translateX(-1px)" }}
            />
          );
        })}
      </div> */}
      <div className="w-full flex justify-between pl-1.5 pr-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="absolute bottom-1 h-[11px] @min-md:h-[12px] w-[2px] rounded-full bg-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourSlider;
