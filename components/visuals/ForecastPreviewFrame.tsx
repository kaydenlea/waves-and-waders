"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PreviewImage } from "@/components/visuals/ForecastPreviewCards";

export default function ForecastPreviewFrame({
  title,
  description,
  image,
  sizes,
  onPrev,
  onNext,
  badgeLabel = "Preview",
  className,
}: {
  title: string;
  description: string;
  image: PreviewImage;
  sizes: string;
  onPrev: () => void;
  onNext: () => void;
  badgeLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lg shadow-black/10 ring-1 ring-black/5",
        "dark:border-border/80 dark:shadow-black/40 dark:ring-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
              aria-label="Previous card"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onNext}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
              aria-label="Next card"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <span className="ml-2 hidden rounded-full border border-border/50 bg-highlight-5/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 sm:inline-flex">
            {badgeLabel}
          </span>
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>
          <div className="truncate text-xs font-medium text-muted-foreground">
            {description}
          </div>
        </div>
      </div>

      <div className="relative h-[calc(100%-3.25rem)] w-full bg-background">
        <div className="absolute inset-0 p-3 sm:p-4">
          <div
            className={cn(
              "relative h-full w-full overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm",
              "dark:border-border/60 dark:bg-background/50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/15 pointer-events-none" />
            <Image
              src={image.light}
              alt=""
              fill
              sizes={sizes}
              quality={100}
              className="object-cover object-top dark:hidden"
              placeholder="blur"
            />
            <Image
              src={image.dark}
              alt=""
              fill
              sizes={sizes}
              quality={100}
              className="hidden object-cover object-top dark:block"
              placeholder="blur"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
