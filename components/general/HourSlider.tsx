"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const HourSlider = () => {
  const [value, setValue] = useState([10]);
  const displayValue = value[0] % 12 === 0 ? 12 : value[0] % 12;
  const min = 0;
  const max = 24;
  const step = 1;
  return (
    <div className="space-y-1 flex flex-col gap-2 relative p-3 bg-highlight-4 border-t border-border shadow-md rounded-b-xl">
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
      <div className="w-full flex justify-between pl-1.5 pr-2.5">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i}>
            <div className="absolute bottom-6 h-3 w-1 rounded-full bg-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourSlider;
