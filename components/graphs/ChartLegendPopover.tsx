"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ChartLegendItem = {
  label: React.ReactNode;
  description?: React.ReactNode;
  color?: string;
  marker?: React.ReactNode;
};

export function ChartLegendPopover({
  title,
  items,
  buttonLabel,
  align = "end",
  side = "bottom",
  className,
}: {
  title: string;
  items: ChartLegendItem[];
  buttonLabel?: string;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  side?: React.ComponentProps<typeof PopoverContent>["side"];
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ariaLabel = buttonLabel ?? `Open ${title} legend`;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);

    const isInteractivePopoverTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('[data-slot="popover-content"],[data-slot="popover-trigger"]'),
      );
    };

    const isChartTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('[data-slot="chart"],.recharts-wrapper,.recharts-surface'),
      );
    };

    const onDocPointerOver = (e: Event) => {
      if (isInteractivePopoverTarget(e.target)) return;
      if (!isChartTarget(e.target)) return;
      close();
    };

    const onDocTouchStart = (e: Event) => {
      if (isInteractivePopoverTarget(e.target)) return;
      if (!isChartTarget(e.target)) return;
      close();
    };

    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    document.addEventListener("scroll", close, { passive: true, capture: true });
    document.addEventListener("touchmove", close, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerover", onDocPointerOver, { capture: true });
    document.addEventListener("touchstart", onDocTouchStart, { capture: true });

    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("touchmove", close);
      window.removeEventListener("wheel", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("touchmove", close, true);
      document.removeEventListener("pointerover", onDocPointerOver, true);
      document.removeEventListener("touchstart", onDocTouchStart, true);
    };
  }, [open]);

  // Avoid SSR hydration mismatches from Popover internals (ids/portals).
  // Render a stable trigger button until the client mounts.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "border border-border/25 bg-foreground/5 text-muted-foreground",
          className,
        )}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          title={ariaLabel}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            "border border-border/25 bg-foreground/5 text-muted-foreground",
            "transition-colors duration-150 motion-reduce:transition-none",
            "hover:bg-foreground/10 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0",
            className,
          )}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        className="w-72 max-w-[min(18rem,calc(100vw-2rem))] touch-pan-y"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title} legend
        </div>
        <div className="mt-2 space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 text-[12px] leading-4"
            >
              <div className="flex h-4 w-4 items-center justify-center shrink-0">
                {item.marker ? (
                  item.marker
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-[3px] border border-border/30"
                    style={
                      item.color
                        ? ({ backgroundColor: item.color } as React.CSSProperties)
                        : undefined
                    }
                  />
                )}
              </div>
              <div className="min-w-0 leading-snug">
                <div className="flex min-h-4 items-center text-foreground">
                  {item.label}
                </div>
                {item.description ? (
                  <div className="mt-0.5 text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
