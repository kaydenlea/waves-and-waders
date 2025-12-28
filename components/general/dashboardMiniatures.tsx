"use client";

import * as React from "react";
import {
  Atom,
  CircleGauge,
  Droplets,
  MoonStar,
  Shell,
  Waves,
  Wind as WindIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  DashboardType,
  WidgetId,
} from "@/components/general/dashboardLayout";

type Point = { x: number; y: number };

function buildSinePoints({
  points,
  cycles,
  baseline,
  amplitude,
}: {
  points: number;
  cycles: number;
  baseline: number;
  amplitude: number;
}): Point[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const x = t * 100;
    const y = baseline - Math.sin(t * cycles * Math.PI * 2) * amplitude;
    return { x, y };
  });
}

function toSmoothBezierPath(points: Point[]) {
  if (points.length < 2) return "";

  const p = points;
  let d = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;

  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;

    // Catmull-Rom to Bezier conversion
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(
      2
    )} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function buildTrendStops(
  values: number[],
  incColor: string,
  decColor: string
): { offset: string; color: string }[] {
  if (values.length < 2) {
    return [
      { offset: "0%", color: incColor },
      { offset: "100%", color: incColor },
    ];
  }

  const segInc: boolean[] = [];
  for (let i = 1; i < values.length; i++) {
    segInc.push(values[i] >= values[i - 1]);
  }

  const stops: { offset: string; color: string }[] = [];
  const colorOf = (inc: boolean) => (inc ? incColor : decColor);

  stops.push({ offset: "0%", color: colorOf(segInc[0]) });

  for (let i = 1; i < segInc.length; i++) {
    if (segInc[i] !== segInc[i - 1]) {
      const frac = (i / (values.length - 1)) * 100;
      const pct = `${frac}%`;
      stops.push({ offset: pct, color: colorOf(segInc[i - 1]) });
      stops.push({ offset: pct, color: colorOf(segInc[i]) });
    }
  }

  stops.push({ offset: "100%", color: colorOf(segInc[segInc.length - 1]) });
  return stops;
}

function MiniPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/25 bg-foreground/5 px-2.5 py-1",
        "text-[0.7rem] font-medium text-muted-foreground whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function getDashboardWidgetIcon(widgetId: WidgetId) {
  switch (widgetId) {
    case "stats":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <CircleGauge className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "tide":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <Waves className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "swell":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <Shell className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "surf":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <Droplets className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "energy":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <Atom className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "wind":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <WindIcon className="h-4 w-4 text-foreground/70" />
        </div>
      );
    case "table":
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
          <MoonStar className="h-4 w-4 text-foreground/70" />
        </div>
      );
    default:
      return (
        <div className="grid size-8 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25" />
      );
  }
}

function MiniHiLo({ unit }: { unit: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-2 gap-y-1 rounded-xl border border-border/25 bg-highlight-7/70 px-2.5 py-2 text-[0.65rem] uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <span className="font-semibold text-muted-foreground">Lo</span>
      <span className="text-foreground normal-case font-semibold tabular-nums">
        -- <span className="text-muted-foreground/90">{unit}</span>
      </span>
      <span className="font-semibold text-muted-foreground">Hi</span>
      <span className="text-foreground normal-case font-semibold tabular-nums">
        -- <span className="text-muted-foreground/90">{unit}</span>
      </span>
    </div>
  );
}

function MiniChartFrame({
  children,
  className,
  legendCount = 1,
  legendColors,
}: {
  children: React.ReactNode;
  className?: string;
  legendCount?: number;
  legendColors?: string[];
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[18px] bg-foreground/5 ring-1 ring-border/25",
        className
      )}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-y-3 left-3 w-9 flex flex-col justify-between">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-2 w-6 rounded bg-foreground/10" />
          ))}
        </div>
        <div className="absolute left-14 right-3 top-3 bottom-8">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-px w-full bg-border/40" />
              ))}
            </div>
            <div className="absolute right-0 top-0 flex items-center gap-2">
              {Array.from({ length: legendCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className={cn("h-2 w-2 rounded-full bg-foreground/20")}
                    style={
                      legendColors?.[idx]
                        ? { backgroundColor: legendColors[idx] }
                        : undefined
                    }
                  />
                  <span className="h-2 w-8 rounded bg-foreground/10" />
                </div>
              ))}
            </div>
            {children}
          </div>
        </div>
        <div className="absolute left-14 right-3 bottom-3 flex justify-between">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-2 w-7 rounded bg-foreground/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniLineChart({
  className,
  isFull,
  stroke,
}: {
  className?: string;
  isFull?: boolean;
  stroke?: string;
}) {
  const path = React.useMemo(() => {
    const cycles = isFull ? 6 : 4;
    return toSmoothBezierPath(
      buildSinePoints({
        points: 40,
        cycles,
        baseline: 30,
        amplitude: 22,
      })
    );
  }, [isFull]);

  return (
    <MiniChartFrame
      className={cn("h-full", className)}
      legendCount={1}
      legendColors={stroke ? [stroke] : undefined}
    >
      <div className="absolute inset-0 px-1 pb-1 pt-1">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke={stroke ?? "rgba(59,130,246,0.85)"}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </MiniChartFrame>
  );
}

function MiniAreaChart({
  className,
  isFull,
  variant = "default",
}: {
  className?: string;
  isFull?: boolean;
  variant?: "default" | "energy";
}) {
  const idRaw = React.useId();
  const id = React.useMemo(() => idRaw.replace(/:/g, ""), [idRaw]);
  const fillGradientId = `miniEnergyFill-${id}`;
  const strokeGradientId = `miniEnergyStroke-${id}`;

  const { fillPath, linePath, fillStops, strokeStops } = React.useMemo(() => {
    const cycles = isFull ? 6.5 : 4.5;
    const pts = buildSinePoints({
      points: 44,
      cycles,
      baseline: 28,
      amplitude: 14,
    });

    // ensure a clear down-then-up shape so the energy trend colors read well
    const shaped = pts.map((pt, idx) => {
      const t = idx / Math.max(1, pts.length - 1);
      const valley = -4 * Math.sin(t * Math.PI);
      return { x: pt.x, y: pt.y - valley };
    });

    const line = toSmoothBezierPath(shaped);
    const fill = `${line} L 100 60 L 0 60 Z`;

    const values = shaped.map((p) => 60 - p.y);
    return {
      fillPath: fill,
      linePath: line,
      fillStops:
        variant === "energy"
          ? buildTrendStops(
              values,
              "var(--energy-fill-inc)",
              "var(--energy-fill-dec)"
            )
          : [],
      strokeStops:
        variant === "energy"
          ? buildTrendStops(
              values,
              "var(--energy-stroke-inc)",
              "var(--energy-stroke-dec)"
            )
          : [],
    };
  }, [isFull, variant]);

  return (
    <MiniChartFrame
      className={cn("h-full", className)}
      legendCount={variant === "energy" ? 2 : 1}
      legendColors={
        variant === "energy"
          ? ["var(--energy-stroke-dec)", "var(--energy-stroke-inc)"]
          : undefined
      }
    >
      <div className="absolute inset-0 px-1 pb-1 pt-1">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {variant === "energy" ? (
            <defs>
              <linearGradient id={fillGradientId} x1="0" y1="0" x2="1" y2="0">
                {fillStops.map((s, i) => (
                  <stop
                    key={i}
                    offset={s.offset}
                    stopColor={s.color}
                    stopOpacity="0.22"
                  />
                ))}
              </linearGradient>
              <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
                {strokeStops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
          ) : null}

          <path
            d={fillPath}
            fill={
              variant === "energy"
                ? `url(#${fillGradientId})`
                : "rgba(249,115,22,0.18)"
            }
          />
          <path
            d={linePath}
            fill="none"
            stroke={
              variant === "energy"
                ? `url(#${strokeGradientId})`
                : "rgba(249,115,22,0.88)"
            }
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </MiniChartFrame>
  );
}

function MiniMultiSwellChart({
  className,
  isFull,
}: {
  className?: string;
  isFull?: boolean;
}) {
  const { primary, secondary, tertiary } = React.useMemo(() => {
    const make = (cycles: number, amp: number, phase: number) => {
      const pts = Array.from({ length: 44 }, (_, i) => {
        const t = i / 43;
        const x = t * 100;
        const y = 30 - Math.sin(t * cycles * Math.PI * 2 + phase) * amp;
        return { x, y };
      });
      return toSmoothBezierPath(pts);
    };
    return {
      primary: make(isFull ? 6.2 : 4.2, 18, 0),
      secondary: make(isFull ? 5.4 : 3.7, 14, Math.PI / 5),
      tertiary: make(isFull ? 4.7 : 3.2, 10, Math.PI / 3),
    };
  }, [isFull]);

  return (
    <MiniChartFrame
      className={cn("h-full", className)}
      legendCount={3}
      legendColors={[
        "rgba(29,78,216,0.85)",
        "rgba(14,165,233,0.78)",
        "rgba(34,211,238,0.7)",
      ]}
    >
      <div className="absolute inset-0 px-1 pb-1 pt-1">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={primary}
            fill="none"
            stroke="rgba(29,78,216,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={secondary}
            fill="none"
            stroke="rgba(14,165,233,0.78)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={tertiary}
            fill="none"
            stroke="rgba(34,211,238,0.7)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </MiniChartFrame>
  );
}

function MiniBarChart({
  className,
  isFull,
}: {
  className?: string;
  isFull?: boolean;
}) {
  const bars = React.useMemo(() => {
    const count = isFull ? 44 : 22;
    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.4) * 18 + 28;
      return Math.min(46, Math.max(10, Math.round(wave)));
    });
  }, [isFull]);

  return (
    <MiniChartFrame
      className={cn("h-full", className)}
      legendCount={1}
      legendColors={["#9ccaffff"]}
    >
      <div className="absolute inset-0 flex items-end gap-px px-1 pb-1">
        {bars.map((h, idx) => {
          const color =
            h >= 40
              ? "#74b0ffff"
              : h >= 32
              ? "#86bbffff"
              : h >= 22
              ? "#9ccaffff"
              : "#b8d9ffff";
          return (
            <div
              key={idx}
              className="flex-1 rounded-t-sm"
              style={{ height: `${h}%`, backgroundColor: color, opacity: 0.95 }}
            />
          );
        })}
      </div>
    </MiniChartFrame>
  );
}

function MiniForecastChart({
  kind,
  isFull,
  lineStroke,
  children,
}: {
  kind: "line" | "bar" | "area";
  isFull?: boolean;
  lineStroke?: string;
  children?: React.ReactNode;
}) {
  const idRaw = React.useId();
  const id = React.useMemo(() => idRaw.replace(/:/g, ""), [idRaw]);
  const energyFillId = `energyMiniFill-${id}`;
  const energyStrokeId = `energyMiniStroke-${id}`;

  const linePath = React.useMemo(() => {
    const cycles = isFull ? 7 : 5;
    return toSmoothBezierPath(
      buildSinePoints({
        points: 48,
        cycles,
        baseline: 30,
        amplitude: 22,
      })
    );
  }, [isFull]);

  const area = React.useMemo(() => {
    const cycles = isFull ? 6.5 : 4.5;
    const pts = buildSinePoints({
      points: 46,
      cycles,
      baseline: 28,
      amplitude: 14,
    });

    const shaped = pts.map((pt, idx) => {
      const t = idx / Math.max(1, pts.length - 1);
      const valley = -4 * Math.sin(t * Math.PI);
      return { x: pt.x, y: pt.y - valley };
    });

    const line = toSmoothBezierPath(shaped);
    const fill = `${line} L 100 60 L 0 60 Z`;
    const values = shaped.map((p) => 60 - p.y);
    return {
      fill,
      line,
      fillStops: buildTrendStops(
        values,
        "var(--energy-fill-inc)",
        "var(--energy-fill-dec)"
      ),
      strokeStops: buildTrendStops(
        values,
        "var(--energy-stroke-inc)",
        "var(--energy-stroke-dec)"
      ),
    };
  }, [isFull]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[18px] bg-highlight-5/70 ring-1 ring-border/25 p-3">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-highlight-6/60 px-2 py-1.5 ring-1 ring-border/20"
          >
            <div className="space-y-1">
              <div className="h-2 w-10 rounded bg-highlight-7/70" />
              <div className="h-2 w-14 rounded bg-highlight-7/60" />
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-2 flex-1 overflow-hidden rounded-xl border border-border/30 bg-background/40">
        {children != null ? children : null}
        {children == null && kind === "bar" ? (
          <div className="absolute inset-0 px-3 pb-3 pt-2">
            <div className="flex h-full items-end gap-[2px]">
              {Array.from({ length: isFull ? 48 : 30 }).map((_, idx) => {
                const wave = Math.sin(idx * 0.35) * 22 + 40;
                const height = Math.min(86, Math.max(18, Math.round(wave)));
                const color =
                  height >= 68
                    ? "#74b0ffff"
                    : height >= 54
                    ? "#86bbffff"
                    : height >= 40
                    ? "#9ccaffff"
                    : "#b8d9ffff";
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      opacity: 0.95,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
        {children == null && kind === "line" ? (
          <div className="absolute inset-0 px-2 pb-2 pt-1">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={linePath}
                fill="none"
                stroke={lineStroke ?? "rgba(59,130,246,0.85)"}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        ) : null}
        {children == null && kind === "area" ? (
          <div className="absolute inset-0 px-2 pb-2 pt-1">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={energyFillId} x1="0" y1="0" x2="1" y2="0">
                  {area.fillStops.map((s, i) => (
                    <stop
                      key={i}
                      offset={s.offset}
                      stopColor={s.color}
                      stopOpacity="0.22"
                    />
                  ))}
                </linearGradient>
                <linearGradient id={energyStrokeId} x1="0" y1="0" x2="1" y2="0">
                  {area.strokeStops.map((s, i) => (
                    <stop key={i} offset={s.offset} stopColor={s.color} />
                  ))}
                </linearGradient>
              </defs>
              <path d={area.fill} fill={`url(#${energyFillId})`} />
              <path
                d={area.line}
                fill="none"
                stroke={`url(#${energyStrokeId})`}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MiniForecastMultiSwellChart({ isFull }: { isFull?: boolean }) {
  const { primary, secondary, tertiary } = React.useMemo(() => {
    const make = (cycles: number, amp: number, phase: number) => {
      const pts = Array.from({ length: 52 }, (_, i) => {
        const t = i / 51;
        const x = t * 100;
        const y = 30 - Math.sin(t * cycles * Math.PI * 2 + phase) * amp;
        return { x, y };
      });
      return toSmoothBezierPath(pts);
    };
    return {
      primary: make(isFull ? 7.2 : 5.4, 18, 0),
      secondary: make(isFull ? 6.4 : 4.8, 14, Math.PI / 5),
      tertiary: make(isFull ? 5.7 : 4.1, 10, Math.PI / 3),
    };
  }, [isFull]);

  return (
    <MiniForecastChart kind="line" isFull={isFull}>
      <div className="absolute inset-0 px-2 pb-2 pt-1">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={primary}
            fill="none"
            stroke="rgba(29,78,216,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={secondary}
            fill="none"
            stroke="rgba(14,165,233,0.78)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={tertiary}
            fill="none"
            stroke="rgba(34,211,238,0.7)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </MiniForecastChart>
  );
}

function MiniTable() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[18px] border border-border/25 bg-foreground/5 p-2.5">
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] items-center gap-x-2 pb-1 text-[0.65rem] text-muted-foreground">
          <div className="text-left">Time</div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-center">
              <div className="h-2 w-10 rounded bg-foreground/10" />
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] grid-rows-4 items-stretch gap-x-2 gap-y-0.5">
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <div key={rowIdx} className="contents">
              <div className="flex items-center">
                <div className="h-2 w-8 rounded bg-foreground/10" />
              </div>
              {Array.from({ length: 4 }).map((_, colIdx) => (
                <div key={colIdx} className="flex items-center justify-center">
                  <div className="h-4 w-full rounded-sm bg-foreground/10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniHighlights({ isFull }: { isFull: boolean }) {
  const stats = [
    { label: "tide" },
    { label: "swell" },
    { label: "water" },
    { label: "weather" },
    { label: "wind" },
    { label: "moon" },
    { label: "pressure" },
    { label: "energy" },
  ] as const;

  return (
    <div className="h-full w-full p-1">
      <ul
        className={cn(
          "grid h-full w-full auto-rows-fr grid-cols-2 @min-xl:grid-cols-3 gap-2",
          !isFull && "@min-2xl:grid-cols-3 @min-4xl:grid-cols-3",
          isFull &&
            "@min-3xl:grid-cols-4 @min-4xl:grid-cols-4 @min-6xl:grid-cols-8"
        )}
      >
        {stats.map((stat, idx) => {
          const isSwell = stat.label === "swell";
          return (
            <li
              key={`${stat.label}-${idx}`}
              className={cn(
                "relative highlight-card shadow-even p-1.5 h-full min-h-0",
                "transition-colors duration-200 motion-reduce:transition-none",
                "hover:bg-highlight-7/70 active:bg-highlight-7/80",
                isFull && "@min-6xl:p-4",
                isSwell && "col-span-1 @min-xl:col-span-2",
                isSwell && !isFull && "@min-4xl:col-span-2",
                isSwell && isFull && "@min-3xl:col-span-1 @min-xl:col-span-2"
              )}
            >
              <div className="flex h-full w-full items-center justify-center gap-1">
                <div className="h-full w-full rounded-md bg-highlight-6/70" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashboardWidgetMiniature({
  dashboardType,
  widgetId,
  isFull,
}: {
  dashboardType: DashboardType;
  widgetId: WidgetId;
  isFull: boolean;
}) {
  if (widgetId === "stats") {
    return <MiniHighlights isFull={isFull} />;
  }

  if (widgetId === "table") {
    return <MiniTable />;
  }

  const isForecast = dashboardType === "forecast";

  switch (widgetId) {
    case "tide":
      return isForecast ? (
        <MiniForecastChart kind="line" isFull={isFull} lineStroke="#aaaaaaff" />
      ) : (
        <MiniLineChart isFull={isFull} stroke="#aaaaaaff" />
      );
    case "energy":
      return isForecast ? (
        <MiniForecastChart kind="area" isFull={isFull} />
      ) : (
        <MiniAreaChart isFull={isFull} variant="energy" />
      );
    case "surf":
      return isForecast ? (
        <MiniForecastChart kind="bar" isFull={isFull} />
      ) : (
        <MiniBarChart isFull={isFull} />
      );
    case "wind":
      return isForecast ? (
        <MiniForecastChart kind="bar" isFull={isFull} />
      ) : (
        <MiniBarChart isFull={isFull} />
      );
    case "swell":
      return isForecast ? (
        <MiniForecastMultiSwellChart isFull={isFull} />
      ) : (
        <MiniMultiSwellChart isFull={isFull} />
      );
    default:
      return (
        <div className="space-y-3">
          <MiniPill>Preview</MiniPill>
          <MiniLineChart />
        </div>
      );
  }
}

export function DashboardWidgetHeaderMiniature({
  widgetId,
}: {
  widgetId: WidgetId;
}) {
  switch (widgetId) {
    case "tide":
    case "surf":
    case "swell":
      return <MiniHiLo unit="ft" />;
    case "wind":
      return <MiniHiLo unit="mph" />;
    case "energy":
      return <MiniHiLo unit="kJ" />;
    case "table":
      return <MiniPill>Hourly</MiniPill>;
    case "stats":
      return <MiniPill>Now</MiniPill>;
    default:
      return null;
  }
}
