import React from "react";
import { Button } from "../ui/button";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useForecastChartContext } from "../context/ForecastChartContext";

const DaySlider = ({
  chartHandleBack,
  chartHandleNext,
  chartStartIndex,
  chartWindowSize,
  chartLength,
  chartDays,
}: {
  chartHandleBack?: () => void;
  chartHandleNext?: () => void;
  chartStartIndex?: number;
  chartWindowSize?: number;
  chartLength?: number;
  chartDays?: string;
}) => {
  const { setStartIndex, windowSize, startIndex, daysLabel, length } =
    useForecastChartContext();
  const handleNext = () => {
    if (!windowSize) return;
    if (startIndex + windowSize < length) {
      setStartIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 1);
    }
  };
  const handleBackFinal = chartHandleBack ? chartHandleBack : handleBack;
  const handleNextFinal = chartHandleNext ? chartHandleNext : handleNext;
  const windowSizeFinal = chartWindowSize ? chartWindowSize : windowSize;
  const startIndexFinal = chartStartIndex ? chartStartIndex : startIndex;
  const daysLabelFinal = chartDays ? chartDays : daysLabel;
  const lengthFinal = chartLength ? chartLength : length;
  return (
    <div className="flex gap-2 items-center justify-center mb-4">
      <Button
        aria-label="previous slide"
        size="icon"
        variant="outline"
        className="border border-border bg-background rounded-full drop-shadow-sm"
        onClick={handleBackFinal}
        disabled={startIndexFinal === 0}
      >
        <ArrowLeft />
      </Button>
      <span className="font-semibold text-sm bg-highlight-4 border border-border drop-shadow-sm px-4 py-2 rounded-2xl">
        {daysLabelFinal}
      </span>
      <Button
        aria-label="next slide"
        size="icon"
        variant="outline"
        className="border border-border bg-background rounded-full drop-shadow-sm"
        onClick={handleNextFinal}
        disabled={startIndexFinal + windowSizeFinal >= lengthFinal}
      >
        <ArrowRight />
      </Button>
    </div>
  );
};

export default DaySlider;
