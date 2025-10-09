"use client";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";

type Props = {
  value?: number | null;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

const HourSlider = ({
  value: controlled,
  onChange,
  min = 0,
  max = 21,
  step = 3,
}: Props) => {
  const [internal, setInternal] = useState<number>(() => {
    if (controlled !== undefined && controlled !== null) return controlled;
    const currentHour = new Date().getHours();
    const constrainedHour = Math.max(min, Math.min(max, currentHour));
    return Math.round(constrainedHour / step) * step;
  });

  const hour = controlled ?? internal;
  const displayValue = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
  const sliderValue = useMemo(() => [hour], [hour]);

  const handleChange = (vals: number[]) => {
    const v = Math.max(min, Math.min(max, Math.round(vals[0] ?? hour)));
    setInternal(v);
    onChange?.(v);
  };

  return (
    <div className="border border-border space-y-1 flex flex-col gap-2 relative p-3 bg-highlight-4 shadow-no-top rounded-b-xl">
      <h3 className="text-md font-medium">{`${displayValue} ${ampm}`}</h3>
      <Slider
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onValueChange={handleChange}
        className="z-1"
      />
      <div className="w-full flex justify-between pl-1.5 pr-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="absolute bottom-6 h-3 w-1 rounded-full bg-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourSlider;
