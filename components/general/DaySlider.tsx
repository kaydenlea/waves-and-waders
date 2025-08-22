import React from "react";
import { Button } from "../ui/button";

import { ArrowLeft, ArrowRight } from "lucide-react";

const DaySlider = ({
  handleBack,
  handleNext,
  startIndex,
  windowSize,
  length,
  days,
}: {
  handleBack: () => void;
  handleNext: () => void;
  startIndex: number;
  windowSize: number;
  length: number;
  days: string;
}) => {
  return (
    <div className="flex gap-2 items-center justify-center mb-4">
      <Button
        aria-label="previous slide"
        size="icon"
        variant="outline"
        className="border border-border bg-background rounded-full drop-shadow-sm"
        onClick={handleBack}
        disabled={startIndex === 0}
      >
        <ArrowLeft />
      </Button>
      <span className="font-semibold text-sm bg-background border border-border drop-shadow-sm px-4 py-2 rounded-2xl">
        {days}
      </span>
      <Button
        aria-label="next slide"
        size="icon"
        variant="outline"
        className="border border-border bg-background rounded-full drop-shadow-sm"
        onClick={handleNext}
        disabled={startIndex + windowSize >= length}
      >
        <ArrowRight />
      </Button>
    </div>
  );
};

export default DaySlider;
