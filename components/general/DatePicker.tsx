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

const DatePicker = ({ className }: { className?: string }) => {
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
  return (
    <div
      className={cn(
        "relative w-full bg-background px-2 py-1 rounded-t-sm drop-shadow-sm border border-border",
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
                <Sun size={16} strokeWidth={3} color="#f79e55ff" />
              ) : (
                <Cloudy size={16} color="#bdbdbdff" />
              );
            return (
              <CarouselItem
                key={index}
                className={cn(
                  "basis-1/3 @min-md:basis-1/5 @min-2xl:basis-1/7 @min-4xl:basis-1/10 flex justify-center py-1 px-1 border-r border-border",
                  index === 0 && "border-l"
                )}
              >
                <button
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center w-full py-1.5 rounded-sm text-center text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-highlight-1 border border-border"
                      : "hover:bg-highlight-2"
                  )}
                >
                  <span className="font-semibold text-[0.6rem] whitespace-nowrap">
                    {day.format("ddd")}, {day.format("M/D")}
                  </span>
                  <span
                    className={cn("inline-block w-10 h-1 rounded-full", color)}
                  />
                  <span className="text-md font-semibold mb-1">
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
