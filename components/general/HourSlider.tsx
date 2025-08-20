"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const HourSlider = () => {
  const [value, setValue] = useState([10]);
  const displayValue = value[0] % 12 === 0 ? 12 : value[0] % 12;
  const min = 0;
  const max = 23;
  const step = 1;
  // const ticks = Array.from(
  //   { length: (max - min) / step + 1 },
  //   (_, i) => min + i * step
  // );
  return (
    <div className="flex flex-col gap-2 relative p-2.5 bg-background border-x border-b border-border shadow-md rounded-b-sm">
      <h3 className="text-md font-medium">{`${displayValue} ${
        value[0] >= 12 && value[0] < 24 ? "PM" : "AM"
      }`}</h3>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={setValue}
        className="z-1"
      />
    </div>
  );
};

export default HourSlider;
