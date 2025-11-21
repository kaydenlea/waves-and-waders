"use client";
import { useMemo, useState, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Props = {
  value?: number | null;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

const HourSlider = ({
  value: controlled,
  onChange,
  onCommit,
  min = 0,
  max = 21,
  step = 3,
  className = "",
}: Props) => {
  const [internal, setInternal] = useState<number>(() => {
    if (controlled !== undefined && controlled !== null) return controlled;
    const currentHour = new Date().getHours();
    const constrainedHour = Math.max(min, Math.min(max, currentHour));
    return Math.round(constrainedHour / step) * step;
  });

  const [isSliding, setIsSliding] = useState(false);
  const hour = controlled ?? internal;
  const displayValue = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
  const sliderValue = useMemo(() => [hour], [hour]);

  // Subtle, desaturated day-night gradient aligned to hour ranges
  const trackGradient = useMemo(() => {
    const range = Math.max(1, max - min);
    const pct = (h: number) =>
      Math.max(0, Math.min(100, ((h - min) / range) * 100));
    const dawn = pct(6); // ~06:00
    const dusk = pct(18); // ~18:00
    const night = "#ebd9ffff"; // slate-800
    const twilight = "#edddffff"; // slate-400
    const day = "#ffefd0ff"; // slate-200
    return `linear-gradient(90deg,
      ${night} 0%,
      ${night} ${Math.max(0, dawn - 3)}%,
      ${twilight} ${dawn}%,
      ${day} ${Math.min(100, dawn + 3)}%,
      ${day} ${Math.max(dusk - 3, dawn + 3)}%,
      ${twilight} ${dusk}%,
      ${night} ${Math.min(100, dusk + 3)}%,
      ${night} 100%)`;
  }, [min, max]);

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
        onPointerDown={() => setIsSliding(true)}
        onPointerUp={() => setIsSliding(false)}
        className="z-1"
        trackClassName="h-2 border border-border/50"
        rangeClassName={cn(
          "transition-colors",
          isSliding ? "duration-0" : "duration-300"
        )}
        thumbClassName="size-5 bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-white shadow-md"
        trackStyle={{ background: trackGradient }}
        rangeStyle={{ background: rangeTint }}
        thumbStyle={{ boxShadow: thumbShadow }}
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
            <div className="absolute bottom-0 h-3.5 w-[2px] rounded-full bg-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourSlider;
