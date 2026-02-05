"use client";

import * as React from "react";
import Link from "next/link";
import {
  HandHeart,
  HeartHandshake,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Tier = {
  amount: number;
  title: string;
  description: string;
  iconKey: "waves" | "sparkles" | "handshake" | "handheart";
  href: string;
  selected: boolean;
};

const ICONS: Record<Tier["iconKey"], LucideIcon> = {
  waves: Waves,
  sparkles: Sparkles,
  handshake: HeartHandshake,
  handheart: HandHeart,
};

export default function DonationTierCarousel({ tiers }: { tiers: Tier[] }) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const pointerDownRef = React.useRef(false);
  const draggingRef = React.useRef(false);
  const didDragRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const dragStartRef = React.useRef<{ x: number; left: number } | null>(null);
  const dragRafRef = React.useRef<number | null>(null);
  const dragPendingLeftRef = React.useRef<number | null>(null);
  const lastDragTsRef = React.useRef<number>(0);
  const [canScroll, setCanScroll] = React.useState({
    left: false,
    right: false,
  });

  const updateCanScroll = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScroll({
      left: el.scrollLeft > 2,
      right: el.scrollLeft < max - 2,
    });
  }, []);

  const clampScrollLeft = React.useCallback(
    (el: HTMLDivElement, value: number) => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      return Math.min(max, Math.max(0, value));
    },
    [],
  );

  React.useEffect(() => {
    updateCanScroll();
  }, [tiers.length, updateCanScroll]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const handler = () => updateCanScroll();
    el.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [updateCanScroll]);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollerRef.current;
      if (!el) return;
      if (event.pointerType === "touch") return;
      if (event.button !== 0) return;
      pointerDownRef.current = true;
      draggingRef.current = false;
      didDragRef.current = false;
      pointerIdRef.current = event.pointerId;
      dragStartRef.current = { x: event.clientX, left: el.scrollLeft };
    },
    [],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollerRef.current;
      const start = dragStartRef.current;
      if (!el || !pointerDownRef.current || !start) return;
      if (event.pointerType === "touch") return;
      if (event.buttons !== 1) return;
      const dx = event.clientX - start.x;
      const DRAG_THRESHOLD = 6;
      if (!draggingRef.current && Math.abs(dx) < DRAG_THRESHOLD) {
        return;
      }
      if (!draggingRef.current) {
        draggingRef.current = true;
        didDragRef.current = true;
        try {
          (event.currentTarget as HTMLDivElement).setPointerCapture(
            event.pointerId,
          );
        } catch {
          // ignore capture failures
        }
      }
      if (event.cancelable) {
        event.preventDefault();
      }

      dragPendingLeftRef.current = clampScrollLeft(el, start.left - dx);
      if (dragRafRef.current == null) {
        dragRafRef.current = window.requestAnimationFrame(() => {
          dragRafRef.current = null;
          const pending = dragPendingLeftRef.current;
          if (pending == null) return;
          dragPendingLeftRef.current = null;
          el.scrollLeft = pending;
        });
      }
    },
    [clampScrollLeft],
  );

  const endDrag = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;
      draggingRef.current = false;
      dragStartRef.current = null;
      dragPendingLeftRef.current = null;
      if (dragRafRef.current != null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      try {
        (event.currentTarget as HTMLDivElement).releasePointerCapture(
          event.pointerId,
        );
      } catch {
        // ignore
      }
      if (didDragRef.current) {
        lastDragTsRef.current = Date.now();
      }
      didDragRef.current = false;
      pointerIdRef.current = null;
    },
    [],
  );

  return (
    <div className="-mx-6 mt-6 sm:mx-0">
      <div className="relative">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background/60 to-transparent dark:from-background/40",
            canScroll.left ? "opacity-100" : "opacity-0",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "sm:hidden",
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/60 to-transparent dark:from-background/40",
            canScroll.right ? "opacity-100" : "opacity-0",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "sm:hidden",
          )}
        />

        <div className="hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
          {tiers.map((tier) => {
            const Icon = ICONS[tier.iconKey];
            return (
              <Link
                key={tier.amount}
                href={tier.href}
                className={cn(
                  "rounded-3xl border bg-background/60 p-4 shadow-sm",
                  "transition-[box-shadow,transform,border-color] duration-200 motion-reduce:transition-none",
                  "hover:border-border/60 hover:shadow-md hover:shadow-black/10 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  tier.selected
                    ? "border-sky-500/60 bg-sky-500/5 dark:bg-sky-400/10"
                    : "border-border/40",
                )}
                aria-label={`Donate ${tier.amount} dollars`}
                aria-current={tier.selected ? "true" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-2xl border border-border/40 bg-background/70 text-foreground/80"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold tabular-nums shadow-sm",
                      tier.selected
                        ? "bg-sky-600 text-white dark:bg-sky-500"
                        : "bg-foreground text-background",
                    )}
                  >
                    ${tier.amount}
                  </span>
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">
                  {tier.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </div>
              </Link>
            );
          })}
        </div>

        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            "sm:hidden",
            "grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3",
            "snap-x snap-mandatory overflow-x-auto px-6 py-2",
            "overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "touch-pan-x cursor-grab active:cursor-grabbing",
            "sm:auto-cols-[minmax(220px,1fr)]",
          )}
          style={{
            WebkitOverflowScrolling: "touch",
            scrollPaddingInline: "1.5rem",
          }}
          role="region"
          aria-label="Donation amount options"
          aria-roledescription="carousel"
        >
          {tiers.map((tier) => {
            const Icon = ICONS[tier.iconKey];
            const onClickCapture = (
              event: React.MouseEvent<HTMLAnchorElement>,
            ) => {
              if (Date.now() - lastDragTsRef.current < 250) {
                event.preventDefault();
                event.stopPropagation();
              }
            };
            return (
              <Link
                key={tier.amount}
                href={tier.href}
                className={cn(
                  "snap-start",
                  "rounded-3xl border bg-background/60 p-4 shadow-sm",
                  "transition-[box-shadow,transform,border-color] duration-200 motion-reduce:transition-none",
                  "hover:border-border/60 hover:shadow-md hover:shadow-black/10 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  tier.selected
                    ? "border-sky-500/60 bg-sky-500/5 dark:bg-sky-400/10"
                    : "border-border/40",
                )}
                aria-label={`Donate ${tier.amount} dollars`}
                aria-current={tier.selected ? "true" : undefined}
                onClickCapture={onClickCapture}
                draggable={false}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-2xl border border-border/40 bg-background/70 text-foreground/80"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold tabular-nums shadow-sm",
                        tier.selected
                          ? "bg-sky-600 text-white dark:bg-sky-500"
                          : "bg-foreground text-background",
                      )}
                    >
                      ${tier.amount}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">
                  {tier.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
