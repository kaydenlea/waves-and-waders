"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  TimerReset,
  Waves,
} from "lucide-react";

import { cn } from "@/lib/utils";

import noaaLogo from "@/public/noaa.png";
import HourSlider from "@/components/general/HourSlider";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { SwellRings, WindRing } from "@/components/visuals/DirectionRings";

const FALLBACK_SELECTED_MS = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
const FALLBACK_HOUR = 12;

type CardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: React.ReactNode;
  children: React.ReactNode;
};

const PREVIEW_BEACH_ID = "000b44bb-e4b7-452b-b28b-dd596d202cdf";
const PREVIEW_BEACH_IMAGE = `/beach_pictures/${PREVIEW_BEACH_ID}.png`;

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/55 bg-background shadow-xs ring-1 ring-black/5",
        "h-full flex flex-col",
        "transition-[box-shadow,border-color,background-color] duration-300 ease-out motion-reduce:transition-none",
        "hover:border-border/60 hover:shadow-lg hover:shadow-black/10",
        "dark:border-border/60 dark:bg-highlight-5"
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  description,
  cta,
}: Omit<CardProps, "children">) {
  return (
    <header className="flex items-start justify-between gap-4 px-4 pt-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-foreground/5 text-foreground/75 ring-1 ring-border/25 dark:bg-highlight-4/60 dark:text-foreground/90">
            {icon}
          </span>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        <p className="ml-1 mt-2 line-clamp-2 text-xs text-foreground/70 dark:text-foreground/80">
          {description}
        </p>
      </div>
      {cta ? <div className="shrink-0">{cta}</div> : null}
    </header>
  );
}

function MediaFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-4 pb-4 pt-2">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/15" />
        {children}
      </div>
    </div>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm",
        "transition-colors motion-reduce:transition-none hover:opacity-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      )}
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border/40 bg-highlight-1 px-3 py-1.5 text-xs font-medium text-foreground/90 shadow-sm backdrop-blur",
        "transition-colors motion-reduce:transition-none hover:bg-highlight-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      )}
    >
      {children}
    </Link>
  );
}

function WindowPickerVisual({
  initialSelectedMs,
  initialHour,
}: {
  initialSelectedMs: number;
  initialHour: number;
}) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    return new Date(initialSelectedMs);
  });
  const [selectedHour, setSelectedHour] =
    React.useState<number>(initialHour);

  const timeLabel = React.useMemo(() => {
    const hour = selectedHour;
    const displayValue = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
    return `${displayValue} ${ampm}`;
  }, [selectedHour]);

  const dateLabel = React.useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "numeric",
      day: "numeric",
    }).format(selectedDate);
  }, [selectedDate]);

  const previewGradient =
    "linear-gradient(90deg, var(--ww-surf-intensity-low) 0%, var(--ww-surf-intensity-low) 22%, var(--ww-surf-intensity-mid) 22%, var(--ww-surf-intensity-mid) 58%, var(--ww-surf-intensity-high) 58%, var(--ww-surf-intensity-high) 78%, var(--ww-surf-intensity-mid) 78%, var(--ww-surf-intensity-mid) 100%)";

  return (
    <div className="relative aspect-[4/3] w-full">
      <div className="absolute inset-0 bg-gradient-to-b from-highlight-5/30 via-transparent to-transparent" />

      <div className="relative flex h-full w-full flex-col gap-3 @min-[385px]:gap-7 px-2 py-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/70 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
            <TimerReset className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{timeLabel}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/70 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{dateLabel}</span>
          </div>
        </div>

        <div
          className="@min-[350px]:mt-0 w-full"
          data-ww-essentials-deck-no-swipe="1"
        >
          <LazyLoadDatePicker
            beachId={PREVIEW_BEACH_ID}
            forecast={false}
            value={selectedDate}
            onSelect={(next) => setSelectedDate(next)}
            maxDays={3}
            showNav={false}
            itemsPerView={3}
            disableDrag
            className="mx-auto max-w-[420px] px-0 py-0"
          />
        </div>

        <div className="w-full px-1" data-ww-essentials-deck-no-swipe="1">
          <div className="mb-2 text-xs font-semibold tracking-wide text-foreground/70 dark:text-foreground/85">
            Slide to scan the day
          </div>
          <HourSlider
            className="w-full"
            previewTrackGradient={previewGradient}
            date={selectedDate}
            value={selectedHour}
            onChange={(next) => setSelectedHour(next)}
          />
        </div>
      </div>
    </div>
  );
}

function DirectionsVisual() {
  const [ringScale, setRingScale] = React.useState(0.5);

  React.useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const next = w < 390 ? 0.6 : w < 520 ? 0.7 : 0.7;
      setRingScale((prev) => (prev === next ? prev : next));
    };
    compute();
    window.addEventListener("resize", compute, { passive: true });
    return () => window.removeEventListener("resize", compute);
  }, []);

  const ringSize = 160 * ringScale;
  const labelDistance = 148 * ringScale;
  const centerOffset = ringSize / 2;
  const cardinalLabels = [
    {
      id: "N" as const,
      style: {
        top: `${centerOffset - labelDistance}px`,
        left: `${centerOffset}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "S" as const,
      style: {
        top: `${centerOffset + labelDistance}px`,
        left: `${centerOffset}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "E" as const,
      style: {
        top: `${centerOffset}px`,
        left: `${centerOffset + labelDistance}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "W" as const,
      style: {
        top: `${centerOffset}px`,
        left: `${centerOffset - labelDistance}px`,
        transform: "translate(-50%, -50%)",
      },
    },
  ];

  return (
    <div className="relative aspect-[4/3] w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-blue-200 dark:from-slate-900 dark:to-slate-950" />
      <Image
        src={PREVIEW_BEACH_IMAGE}
        alt="Beach preview with direction rings overlay"
        fill
        sizes="(max-width: 768px) calc(100vw - 2rem), 420px"
        quality={95}
        className="object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/5 via-transparent to-background/25"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div
          className="pointer-events-none relative flex items-center justify-center overflow-visible"
          style={{ width: ringSize, height: ringSize }}
          aria-hidden="true"
        >
          <div className="pointer-events-none absolute inset-0">
            {cardinalLabels.map(({ id, style }) => (
              <span
                key={id}
                className="w-5 text-center bg-background/85 dark:bg-highlight-5/85 p-1 rounded-sm font-black absolute text-[10px] uppercase leading-none text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] select-none"
                style={style}
              >
                {id}
              </span>
            ))}
          </div>
          <SwellRings
            variant="full"
            scale={ringScale}
            directions={{ primary: 300, secondary: 250, tertiary: 210 }}
            labels={{
              primary: "4.8 ft • 12s",
              secondary: "2.3 ft • 9s",
              tertiary: "1.2 ft • 7s",
            }}
            showLegend
            className="absolute inset-0"
          />
          <WindRing
            variant="full"
            scale={ringScale}
            direction={315}
            label="9 mph"
            showLegend
            className="absolute inset-0"
          />
          <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/80 shadow-sm ring-1 ring-border/60" />
        </div>
      </div>
    </div>
  );
}

function TrustedSourcesVisual() {
  return (
    <div className="relative aspect-[4/3] w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/15" />

      <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 px-6">
        <div className="grid place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/10">
          <div className="relative size-24 p-3 sm:size-24 sm:p-3.5">
            <Image
              src={noaaLogo}
              alt="NOAA"
              fill
              sizes="128px"
              quality={100}
              className="object-contain"
              placeholder="blur"
            />
          </div>
        </div>
        <p className="text-xs font-semibold tracking-wide text-foreground/70 dark:text-foreground/85">
          NOAA model grids + tide stations
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://www.noaa.gov/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center rounded-full border border-border/50 bg-background/80 px-3 py-2 text-xs font-semibold text-foreground/85 shadow-sm backdrop-blur",
              "transition-colors duration-200 motion-reduce:transition-none hover:bg-highlight-5/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
              "dark:bg-highlight-4/70 dark:border-border/55 dark:text-foreground/90"
            )}
          >
            NOAA grids
          </a>
          <a
            href="https://tidesandcurrents.noaa.gov/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center rounded-full border border-border/50 bg-background/80 px-3 py-2 text-xs font-semibold text-foreground/85 shadow-sm backdrop-blur",
              "transition-colors duration-200 motion-reduce:transition-none hover:bg-highlight-5/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
              "dark:bg-highlight-4/70 dark:border-border/55 dark:text-foreground/90"
            )}
          >
            NOAA tides
          </a>
        </div>
      </div>
    </div>
  );
}

function EssentialsCard({
  icon,
  title,
  description,
  cta,
  children,
}: CardProps) {
  return (
    <CardShell>
      <CardHeader
        icon={icon}
        title={title}
        description={description}
        cta={cta}
      />
      <MediaFrame>{children}</MediaFrame>
    </CardShell>
  );
}

function useCarousel(total: number, initial = 0) {
  const [active, setActive] = React.useState(initial);

  const goTo = React.useCallback(
    (index: number) => {
      setActive(((index % total) + total) % total);
    },
    [total]
  );
  const next = React.useCallback(() => {
    setActive((v) => (v + 1) % total);
  }, [total]);
  const prev = React.useCallback(() => {
    setActive((v) => (v - 1 + total) % total);
  }, [total]);

  return { active, goTo, next, prev } as const;
}

export default function AllEssentialsCardsDeck({
  initialSelectedMs = FALLBACK_SELECTED_MS,
  initialHour = FALLBACK_HOUR,
}: {
  initialSelectedMs?: number;
  initialHour?: number;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const cards = React.useMemo(
    () =>
      [
        {
          key: "essentials-1",
          node: (
            <EssentialsCard
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              title="Pick a window"
              description="Scan conditions hour-by-hour for the next 7 days."
              cta={
                <SecondaryLink href="/beaches?tab=nearby">
                  Beaches
                </SecondaryLink>
              }
            >
              <WindowPickerVisual
                initialSelectedMs={initialSelectedMs}
                initialHour={initialHour}
              />
            </EssentialsCard>
          ),
        },
        {
          key: "sources",
          node: (
            <EssentialsCard
              icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              title="Trusted sources"
              description="Forecasts sourced directly from NOAA model grids and tide stations."
              cta={<SecondaryLink href="/privacy">Privacy</SecondaryLink>}
            >
              <TrustedSourcesVisual />
            </EssentialsCard>
          ),
        },
        {
          key: "essentials-2",
          node: (
            <EssentialsCard
              icon={<Waves className="h-4 w-4" aria-hidden="true" />}
              title="Visualize data"
              description="Visual data to speed up and simplify reading forecasts."
              cta={
                <SecondaryLink href="/beaches?tab=nearby">
                  Explore
                </SecondaryLink>
              }
            >
              <DirectionsVisual />
            </EssentialsCard>
          ),
        },
      ] as const,
    [initialHour, initialSelectedMs]
  );

  const { active, goTo, next, prev } = useCarousel(cards.length, 1);

  const touchStartX = React.useRef<number | null>(null);
  const touchDeltaX = React.useRef<number>(0);
  const touchIgnoreSwipeRef = React.useRef(false);

  const total = cards.length;
  const leftIndex = (active - 1 + total) % total;
  const rightIndex = (active + 1) % total;

  return (
    <div className="mt-8" ref={rootRef}>
      {/* Coverflow: always show centered card + left/right neighbors (looped). */}
      <div
        className="ww-reveal"
        style={{ "--delay": "60ms" } as React.CSSProperties}
      >
        <div
          className="relative"
          aria-roledescription="carousel"
          aria-label="Forecast essentials"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
          }}
          onTouchStart={(e) => {
            const target = e.target as HTMLElement | null;
            if (
              target?.closest?.(
                '[data-ww-essentials-deck-no-swipe="1"]',
              )
            ) {
              touchIgnoreSwipeRef.current = true;
              touchStartX.current = null;
              touchDeltaX.current = 0;
              return;
            }
            touchIgnoreSwipeRef.current = false;
            touchStartX.current = e.touches[0]?.clientX ?? null;
            touchDeltaX.current = 0;
          }}
          onTouchMove={(e) => {
            if (touchIgnoreSwipeRef.current) return;
            if (touchStartX.current == null) return;
            const x = e.touches[0]?.clientX ?? touchStartX.current;
            touchDeltaX.current = x - touchStartX.current;
          }}
          onTouchEnd={() => {
            if (touchIgnoreSwipeRef.current) {
              touchIgnoreSwipeRef.current = false;
              touchStartX.current = null;
              touchDeltaX.current = 0;
              return;
            }
            const dx = touchDeltaX.current;
            touchStartX.current = null;
            touchDeltaX.current = 0;
            if (Math.abs(dx) < 50) return;
            if (dx > 0) prev();
            else next();
          }}
          onTouchCancel={() => {
            touchIgnoreSwipeRef.current = false;
            touchStartX.current = null;
            touchDeltaX.current = 0;
          }}
        >
          <div className="relative w-full overflow-hidden py-4">
            <div
              className="relative mx-auto w-full"
              style={
                {
                  ["--ww-card-w" as any]: "min(375px, calc(100vw - 2rem))",
                  ["--ww-gap" as any]: "24px",
                } as React.CSSProperties
              }
            >
              <div
                className="relative mx-auto"
                style={
                  {
                    width: "var(--ww-card-w)",
                  } as React.CSSProperties
                }
              >
                {cards.map((card, idx) => {
                  const isActive = idx === active;
                  const isLeft = idx === leftIndex;
                  const x = isLeft
                    ? "calc(-1 * (var(--ww-card-w) * 0.72 + var(--ww-gap)))"
                    : "calc(var(--ww-card-w) * 0.72 + var(--ww-gap))";

                  if (isActive) {
                    return (
                      <div key={card.key} className="relative z-20">
                        {card.node}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={card.key}
                      className={cn(
                        "pointer-events-none absolute top-0 left-1/2 z-10 rounded-3xl",
                        "opacity-55 saturate-75 blur-[0.6px]",
                        "transition-[opacity,filter,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                      )}
                      style={
                        {
                          width: "var(--ww-card-w)",
                          transform: `translateX(-50%) translateX(${x}) scale(0.94)`,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    >
                      {card.node}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                prev();
              }}
              aria-label="Previous card"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-highlight-7 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center justify-center gap-1.5 min-w-25">
              {cards.map((card, idx) => {
                const isActive = idx === active;
                return (
                  <button
                    key={card.key}
                    type="button"
                    aria-label={`Go to card ${idx + 1}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      goTo(idx);
                    }}
                    className={cn(
                      "relative h-2.5 overflow-hidden rounded-full border border-border/60 bg-highlight-5 backdrop-blur",
                      "transition-all motion-reduce:transition-none",
                      isActive ? "w-12" : "w-2.5 hover:bg-highlight-5/70"
                    )}
                  >
                    <span className="sr-only">{card.key}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                next();
              }}
              aria-label="Next card"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-highlight-7 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
