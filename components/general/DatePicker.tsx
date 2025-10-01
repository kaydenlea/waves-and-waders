"use client";

import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Cloudy, Sun } from "lucide-react";

const DatePicker = ({
  className,
  forecast = false,
}: {
  className?: string;
  forecast?: boolean;
}) => {
  const today = dayjs();
  const totalDays = 14;
  const days = Array.from({ length: totalDays }, (_, i) => today.add(i, "day"));

  const [api, setApi] = useState<CarouselApi>();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(today);

  const scrollBy = 3;

  const handleNext = () => {
    if (!api) return;
    const nextIndex = Math.min(
      api.selectedScrollSnap() + scrollBy,
      api.scrollSnapList().length - 1
    );
    api.scrollTo(nextIndex);
  };

  const handlePrev = () => {
    if (!api) return;
    const prevIndex = Math.max(api.selectedScrollSnap() - scrollBy, 0);
    api.scrollTo(prevIndex);
  };

  let startIdx: number = 0;
  let endIdx: number;
  days.forEach((day, index) => {
    if (selectedDate.isSame(day, "day")) {
      startIdx = index;
      return;
    }
  });
  // if (startIdx + 6 > days.length - 1) {
  //   endIdx = startIdx;
  //   startIdx -= 6;
  // } else {
  //   endIdx = startIdx + 6;
  // }
  if (startIdx + 3 > days.length - 1) {
    endIdx = startIdx;
    startIdx -= 3;
  } else {
    endIdx = startIdx + 3;
  }

  return (
    <div
      className={cn(
        "relative w-full bg-highlight-4 px-2 py-3 rounded-t-xl shadow-even",
        className
      )}
    >
      <Carousel
        opts={{ align: "start", loop: false, dragFree: true }}
        setApi={setApi}
        className="w-full flex items-center gap-1"
      >
        <CarouselPrevious onClick={handlePrev} />
        <CarouselContent className="mx-1">
          {days.map((day, index) => {
            const isSelected = selectedDate.isSame(day, "day");
            const color =
              index % 3 === 0
                ? "bg-green-400"
                : index % 2 === 0
                ? "bg-red-400"
                : "bg-orange-400";
            const weather =
              index % 3 === 0 ? (
                <Sun
                  className="w-4 h-4 @min-xl:w-5 @min-xl:h-5"
                  strokeWidth={3}
                  color="#f79e55ff"
                />
              ) : (
                <Cloudy
                  className="w-4 h-4 @min-xl:w-5 @min-xl:h-5"
                  color="#bdbdbdff"
                />
              );
            let itemStyle = "bg-highlight-4 rounded-md";
            if (typeof startIdx === "number" && forecast) {
              if (startIdx === index) {
                itemStyle =
                  "bg-highlight-7 rounded-l-md border-y-border border-y-2 border-l-border border-l-2";
              } else if (index === endIdx) {
                itemStyle =
                  "bg-highlight-7 rounded-r-md border-y-border border-y-2 border-r-border border-r-2";
              } else if (startIdx <= index && index <= endIdx) {
                itemStyle = "bg-highlight-7 border-y-border border-y-2";
              }
            }
            return (
              <CarouselItem
                key={index}
                className={cn(
                  "basis-1/3 @min-md:basis-1/5 @min-3xl:basis-1/7 @min-6xl:basis-1/10 flex justify-center"
                )}
              >
                <button
                  onClick={() => {
                    // if (!forecast || startIdx > index || index > endIdx) {
                    //   setSelectedDate(day);
                    // }
                    setSelectedDate(day);
                  }}
                  className={cn(
                    "flex flex-col items-center w-full py-3 text-center text-sm font-medium transition-colors hover:bg-highlight-5/60",
                    !forecast && "rounded-md",
                    !forecast &&
                      isSelected &&
                      "bg-highlight-7 border-border border-2",
                    forecast && itemStyle
                  )}
                >
                  <span className="font-semibold text-[0.65rem] @min-xl:text-xs whitespace-nowrap">
                    {day.format("ddd")}, {day.format("M/D")}
                  </span>
                  <span
                    className={cn(
                      "inline-block w-12 @min-xl:w-16 h-1 rounded-full",
                      color
                    )}
                  />
                  <span className="text-md @min-xl:text-lg font-semibold mb-1">
                    2-3<span className="text-xs font-normal">ft</span>
                  </span>
                  {weather}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselNext onClick={handleNext} />
      </Carousel>
    </div>
  );
};

export default DatePicker;
