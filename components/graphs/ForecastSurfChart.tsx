"use client";

import * as React from "react";
import {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ChartTooltipViewportContent,
} from "@/components/ui/chart";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from "lucide-react";
import { cn, getPacificHour, getPacificMidnightUTC } from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import { useForecastData } from "@/components/context/ForecastDataContext";
import { useDateContext } from "@/components/context/DateContext";
import { useForecastChartContext } from "@/components/context/ForecastChartContext";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import {
  buildYAxisTicks,
  limitYAxisTicks,
} from "@/components/graphs/yAxisTicks";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegmentsForRange } from "@/components/graphs/sunSegments";
import { buildForecastShadingBackground } from "@/components/graphs/forecastShadingBackground";
import { getForecastDayHeaderLayout } from "./forecastDayHeaderLayout";
import {
  useForecastChartLoading,
  useForecastChartsBusyState,
} from "../context/ForecastChartsLoadingContext";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import type { ForecastData } from "@/lib/supabase";

const SurfTooltipIcon = () => <Droplets className="h-3 w-3" />;

const chartConfig = {
  surf: {
    label: "Surf",
    color: "#38bdf8",
    icon: SurfTooltipIcon,
  },
} satisfies ChartConfig;

type SurfPoint = {
  hour: number;
  surf: number;
};

type Props = { beachId?: string; days?: Date[] | null };

type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number };
  textAnchor?: string;
  fontSize?: number;
};

type TooltipPayload = Array<{ payload?: { hour?: number } }>;

type ChartMouseEvent = { activeLabel?: number | string | null };

type CursorProps = { x?: number; y?: number; width?: number; height?: number };

const HOURS_PER_DAY = 24;
const VISIBLE_DAYS = 4;
const MIN_DAY_PX = 275;
const CHART_LEFT_MARGIN = 5;
const CHART_RIGHT_MARGIN = 0;
const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;
const Y_AXIS_WIDTH = 30;
const DAY_LABEL_INSET = 6;
const Y_AXIS_OFFSET_VAR = "--forecast-y-axis-offset";
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const DRAG_THRESHOLD_PX = 8;
const TOUCH_INSPECT_LONG_PRESS_MS = 320;
const TOUCH_INSPECT_MOVE_TOLERANCE_PX = 10;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

const ForecastSurfChart: React.FC<Props> = ({ beachId, days }) => {
  const { setPanFraction, subscribePan } = useForecastChartContext();
  const myId = React.useId();
  const {
    hour: selectedHour,
    setHoveredHour,
    hoveredHourRef,
    subscribeToHover,
  } = useDateContext();
  const { getSunData } = useSunData();
  const chartTheme = useChartTheme();
  const [loading, setLoading] = useState(true);
  const [sunReady, setSunReady] = useState(false);
  const [surfData, setSurfData] = useState<SurfPoint[]>([]);
  const [baseStartMs, setBaseStartMs] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [axisPadding, setAxisPadding] = useState(10);

  // Function to get color based on surf height intensity
  const getSurfColor = (value: number): string => {
    // Define thresholds and colors (light to dark blue)
    if (value >= 5) return "#74b0ffff"; // Very dark blue for 5+ ft
    if (value >= 3) return "#86bbffff"; // Dark blue for 3-5 ft
    if (value >= 1.5) return "#9ccaffff"; // Medium blue for 1.5-3 ft
    return "#b8d9ffff"; // Light blue for < 1.5 ft
  };

  // Scrollable state
  const [dayOffset, setDayOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);
  const { selected: selectedDate } = useDateContext();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const [isTouchTooltipSyncActive, setIsTouchTooltipSyncActive] =
    useState(false);
  const [isTouchInspecting, setIsTouchInspecting] = useState(false);
  const [touchDefaultIndex, setTouchDefaultIndex] = useState<number | null>(
    null
  );
  const touchInspectStartRef = useRef<{
    startChartX: number;
    chartX: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const rechartsMoveTargetRef = useRef<HTMLElement | null>(null);

  const touchInspectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const clearTouchInspectTimer = useCallback(() => {
    if (!touchInspectTimerRef.current) return;
    clearTimeout(touchInspectTimerRef.current);
    touchInspectTimerRef.current = null;
  }, []);
  useEffect(() => () => clearTouchInspectTimer(), [clearTouchInspectTimer]);

  useEffect(() => {
    if (!isTouchOnlyDevice) {
      setIsTouchTooltipSyncActive(false);
      return;
    }

    const update = () => {
      const next = hoveredHourRef.current != null;
      setIsTouchTooltipSyncActive((prev) => (prev === next ? prev : next));
    };

    update();
    return subscribeToHover(update);
  }, [hoveredHourRef, isTouchOnlyDevice, subscribeToHover]);

  // Pointer & animation refs
  const currentTranslateRef = useRef(0);
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingTranslateRef = useRef<number | null>(null);

  // Derived dimensions
  const normalizedDays = useMemo(() => {
    if (!days || days.length === 0) {
      return null;
    }
    return [...days].sort((a, b) => a.getTime() - b.getTime());
  }, [days]);

  const totalFetchedDays = useMemo(() => {
    return normalizedDays && normalizedDays.length > 0
      ? normalizedDays.length
      : VISIBLE_DAYS;
  }, [normalizedDays]);
  const domainMin = -HALF_STEP_HOURS;
  const domainMax = totalFetchedDays * HOURS_PER_DAY + HALF_STEP_HOURS;

  const dayPx = useMemo(() => {
    // Day width is derived from the visible container width (4 days shown) with a floor,
    // so each 24h segment keeps a stable pixel width and stays aligned across charts.
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );
  const surfTicks = useMemo(
    () =>
      limitYAxisTicks(
        buildYAxisTicks(
          surfData.map((d) => d.surf),
          0,
          4,
          0.2,
          5
        ),
        4
      ),
    [surfData]
  );
  const yAxisTick = useCallback(
    (props: YAxisTickProps) => {
      const { x, y, payload, textAnchor, fontSize } = props ?? {};
      const xNum = typeof x === "number" ? x : Number(x);
      const yNum = typeof y === "number" ? y : Number(y);
      if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return <text />;

      const resolvedTextAnchor: "start" | "middle" | "end" | "inherit" =
        textAnchor === "start" ||
        textAnchor === "middle" ||
        textAnchor === "end" ||
        textAnchor === "inherit"
          ? textAnchor
          : "end";

      const value = payload?.value;
      const minTick = surfTicks[0] ?? 0;
      const maxTick = surfTicks[surfTicks.length - 1] ?? minTick;
      const valueNum = typeof value === "number" ? value : Number(value);
      const isMinTick =
        Number.isFinite(valueNum) && Math.abs(valueNum - minTick) < 1e-6;
      const isMaxTick =
        Number.isFinite(valueNum) && Math.abs(valueNum - maxTick) < 1e-6;

      return (
        <text
          x={xNum + 6}
          y={yNum}
          // Nudge the bottom tick up so it stays visually contained within the shaded plot area.
          dy={isMinTick ? -8 : isMaxTick ? 8 : 0}
          textAnchor={resolvedTextAnchor}
          dominantBaseline="central"
          fontSize={typeof fontSize === "number" ? fontSize : 11}
          {...Y_AXIS_TICK}
        >
          {value}
        </text>
      );
    },
    [surfTicks]
  );
  const hoursSpan = useMemo(
    () => totalFetchedDays * HOURS_PER_DAY,
    [totalFetchedDays]
  );
  const edgePadHours = useMemo(() => {
    if (!chartInnerWidth || hoursSpan === 0) return 0;
    return (axisPadding / chartInnerWidth) * hoursSpan;
  }, [axisPadding, chartInnerWidth, hoursSpan]);

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );
  const isScrollable = chartInnerWidth > viewportWidth + 1;
  const xAxisLeftPadding = useMemo(
    () => Math.max(6, axisPadding / 2),
    [axisPadding]
  );

  // Header alignment: this matches Recharts' inner plot rect (chart width minus margins + axis gutter),
  // keeping each header column pixel-aligned with the 24h day boundaries. The axis gutter doubles as an
  // in-plot inset so series never render beneath the sticky Y-axis labels.
  const dayLabelLeftOffset = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const dataAreaWidth =
    chartInnerWidth - CHART_LEFT_MARGIN - CHART_RIGHT_MARGIN - Y_AXIS_WIDTH;

  const getTouchActivationFromChartX = useCallback(
    (chartX: number) => {
      if (!Number.isFinite(chartX) || !dataAreaWidth) return null;
      const plotX = Math.max(
        0,
        Math.min(chartX - dayLabelLeftOffset, dataAreaWidth)
      );
      const t = dataAreaWidth > 0 ? plotX / dataAreaWidth : 0;
      const hour = domainMin + t * (domainMax - domainMin);
      const roundedHour = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const clampedHour = Math.max(
        0,
        Math.min(roundedHour, totalFetchedDays * HOURS_PER_DAY)
      );
      const defaultIndex = Math.round(clampedHour / DATA_STEP_HOURS);
      const maxIndex = surfData.length - 1;
      if (!Number.isFinite(defaultIndex) || maxIndex < 0) return null;
      const clampedIndex = Math.max(0, Math.min(defaultIndex, maxIndex));
      return {
        defaultIndex: clampedIndex,
        hour: clampedIndex * DATA_STEP_HOURS,
      };
    },
    [
      dataAreaWidth,
      dayOffset,
      dayPx,
      dayLabelLeftOffset,
      domainMin,
      domainMax,
      totalFetchedDays,
      surfData.length,
    ]
  );

  const dayHeaderLayout = useMemo(
    () =>
      getForecastDayHeaderLayout({
        leftOffsetPx: dayLabelLeftOffset,
        dataAreaWidthPx: dataAreaWidth,
        totalDays: totalFetchedDays,
        domainMinHours: domainMin,
        domainMaxHours: domainMax,
        hoursPerDay: HOURS_PER_DAY,
        includeDomainPaddingInEdgeDays: true,
      }),
    [dayLabelLeftOffset, dataAreaWidth, totalFetchedDays, domainMin, domainMax]
  );

  const shadingBackground = useMemo(
    () =>
      buildForecastShadingBackground({
        dayAreas,
        nightAreas,
        domainMin,
        domainMax,
        // `chartWidthPx` is where the X-scale ends (last X value), so day/night transitions stop before the right margin.
        chartWidthPx: chartInnerWidth - CHART_RIGHT_MARGIN,
        plotLeftPx: dayLabelLeftOffset,
        plotWidthPx: dataAreaWidth,
        dayColor: chartTheme.dayShading,
        nightColor: chartTheme.nightShading,
        opacity: chartTheme.shadingOpacity,
      }),
    [
      dayAreas,
      nightAreas,
      domainMin,
      domainMax,
      chartInnerWidth,
      dayLabelLeftOffset,
      dataAreaWidth,
      chartTheme.dayShading,
      chartTheme.nightShading,
      chartTheme.shadingOpacity,
    ]
  );

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively
  const setInnerTranslatePx = useCallback(
    (px: number, withTransition = false) => {
      const node = innerRef.current;
      if (!node) return;
      if (withTransition) {
        node.style.transition = "transform 360ms cubic-bezier(.2,.9,.2,1)";
      } else {
        node.style.transition = "none";
      }
      // Keep a CSS var for HTML overlays, and pin the SVG Y-axis via an imperative transform.
      node.style.setProperty(Y_AXIS_OFFSET_VAR, `${px}px`);
      node.style.transform = `translate3d(-${px}px,0,0)`;
      currentTranslateRef.current = px;
    },
    []
  );

  // animate to target px
  const animateToPx = useCallback(
    (targetPx: number, onEnd?: () => void) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = currentTranslateRef.current;
      const delta = targetPx - start;
      if (Math.abs(delta) < 1) {
        setInnerTranslatePx(targetPx, true);
        onEnd?.();
        return;
      }
      const duration = 320;
      const startTime = performance.now();

      const step = (t: number) => {
        const p = Math.min(1, (t - startTime) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // Pointer handlers
  const startDrag = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pointerStateRef.current) {
      pointerStateRef.current.dragging = true;
    }
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    pointerStateRef.current = {
      dragging: false,
      startX: ev.clientX,
      startY: ev.clientY,
      startTranslate: currentTranslateRef.current,
    };
    setInnerTranslatePx(currentTranslateRef.current, false);
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      clearTouchInspectTimer();
      setIsTouchInspecting(false);
      setTouchDefaultIndex(null);
      setHoveredHour(null);
      const bounds = (ev.currentTarget as Element).getBoundingClientRect();
      const startChartX = ev.clientX - bounds.left;
      touchInspectStartRef.current = {
        startChartX,
        chartX: startChartX,
        clientX: ev.clientX,
        clientY: ev.clientY,
      };
      rechartsMoveTargetRef.current =
        innerRef.current?.querySelector(".recharts-wrapper") ?? null;
      touchInspectTimerRef.current = setTimeout(() => {
        touchInspectTimerRef.current = null;
        if (pointerStateRef.current?.dragging) return;
        const start = touchInspectStartRef.current;
        if (!start) return;
        const activation = getTouchActivationFromChartX(start.chartX);
        if (!activation) return;
        setTouchDefaultIndex((prev) =>
          prev === activation.defaultIndex ? prev : activation.defaultIndex
        );
        if (hoveredHourRef.current !== activation.hour) {
          setHoveredHour(activation.hour);
        }
        setIsTouchInspecting(true);
        requestAnimationFrame(() => {
          const target =
            rechartsMoveTargetRef.current ??
            innerRef.current?.querySelector(".recharts-wrapper");
          if (!(target instanceof HTMLElement)) return;
          rechartsMoveTargetRef.current = target;
          target.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              cancelable: true,
              clientX: start.clientX,
              clientY: start.clientY,
            })
          );
        });
      }, TOUCH_INSPECT_LONG_PRESS_MS);
    }
    if (ev.pointerType === "mouse") {
      startDrag(ev);
    }
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps) return;
    const deltaX = ev.clientX - ps.startX;
    const deltaY = ev.clientY - ps.startY;
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      if (isTouchInspecting) {
        const target =
          rechartsMoveTargetRef.current ??
          innerRef.current?.querySelector(".recharts-wrapper");
        if (target instanceof HTMLElement) {
          rechartsMoveTargetRef.current = target;
          target.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              cancelable: true,
              clientX: ev.clientX,
              clientY: ev.clientY,
            })
          );
        }
        return;
      }
      const start = touchInspectStartRef.current;
      if (touchInspectTimerRef.current && start) {
        start.chartX = start.startChartX + deltaX;
        start.clientX = ev.clientX;
        start.clientY = ev.clientY;
      }
      if (
        Math.hypot(deltaX, deltaY) >
        Math.max(DRAG_THRESHOLD_PX, TOUCH_INSPECT_MOVE_TOLERANCE_PX)
      ) {
        clearTouchInspectTimer();
      }
    }
    if (!ps.dragging) {
      if (
        Math.abs(deltaX) < DRAG_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }
      clearTouchInspectTimer();
      startDrag(ev);
    }
    if (!pointerStateRef.current?.dragging) return;
    const next = clampTranslatePx(
      pointerStateRef.current.startTranslate - deltaX
    );
    pendingTranslateRef.current = next;
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pendingPx = pendingTranslateRef.current;
        if (typeof pendingPx !== "number") return;
        setInnerTranslatePx(pendingPx, false);
        setPanFraction(pendingPx / dayPx, myId, "drag");
      });
    }
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      setTouchDefaultIndex(null);
      touchInspectStartRef.current = null;
      setHoveredHour(null);
    }
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    if (!ps.dragging) return;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (typeof pendingTranslateRef.current === "number") {
      setInnerTranslatePx(pendingTranslateRef.current, false);
      pendingTranslateRef.current = null;
    }

    const finalPx = clampTranslatePx(currentTranslateRef.current);
    const fractionalDayOffset = finalPx / dayPx;
    setDayOffset(fractionalDayOffset);
    setInnerTranslatePx(finalPx, false);
    setPanFraction(fractionalDayOffset, myId, "animate");

    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  };

  // Button controls
  const handleNext = useCallback(() => {
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.min(maxOffset, currentFractionalOffset + 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, totalFetchedDays, chartInnerWidth, viewportWidth]);

  const handleBack = useCallback(() => {
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.max(0, currentFractionalOffset - 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, chartInnerWidth, viewportWidth]);

  useEffect(() => {
    const unsub = subscribePan(
      (fraction, sourceId, mode) => {
        if (sourceId === myId) return;
        const px = clampTranslatePx(fraction * dayPx);
        if (mode === "animate") {
          const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
          setIsAtRightEdge(px >= maxTranslate - 1);
          setDayOffset(fraction);
          animateToPx(px);
        } else {
          setInnerTranslatePx(px, false);
        }
      },
      { immediate: true }
    );
    return () => unsub();
  }, [
    subscribePan,
    myId,
    dayPx,
    clampTranslatePx,
    setInnerTranslatePx,
    animateToPx,
  ]);

  // Update transform when dayOffset changes
  useEffect(() => {
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    setInnerTranslatePx(px, true);
  }, [dayOffset, dayPx, clampTranslatePx, setInnerTranslatePx]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        setContainerWidth(w);
        if (w < 350) {
          setAxisPadding(8);
        } else if (w < 800) {
          setAxisPadding(20);
        } else {
          setAxisPadding(32);
        }
        const maxTranslate = Math.max(
          0,
          chartInnerWidth - Math.min(w || 0, dayPx * VISIBLE_DAYS)
        );
        setIsAtRightEdge(currentTranslateRef.current >= maxTranslate - 1);
      }
    });
    ro.observe(el);

    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth]);

  // Hydrate sun shading immediately (runs in parallel with data fetch)
  useEffect(() => {
    let cancelled = false;
    const hydrateSun = async () => {
      const totalDays =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays.length
          : VISIBLE_DAYS;
      if (!beachId || totalDays <= 0) {
        setDayAreas([]);
        setNightAreas([]);
        return;
      }

      const baseDate =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays[0]
          : new Date();
      const startDate = getPacificMidnightUTC(baseDate);

      try {
        const segments = await buildSunSegmentsForRange({
          fetchSun: (date) => getSunData(String(beachId), date),
          startDate,
          days: totalDays,
          hourSnap: 3,
        });
        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
        }
      } catch (err) {
        if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: totalDays * HOURS_PER_DAY }]);
        }
      }
      if (!cancelled) {
        setSunReady(true);
      }
    };

    void hydrateSun();

    return () => {
      cancelled = true;
      setSunReady(false);
    };
  }, [beachId, getSunData, normalizedDays]);

  // Build surf series from forecast rows
  const { rows: sharedRows } = useForecastData();

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (!beachId) {
          if (!cancelled) {
            setSurfData([]);
            setBaseStartMs(null);
          }
          return;
        }

        const numDaysToFetch =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays.length
            : VISIBLE_DAYS;
        const baseDateValue =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays[0]
            : new Date();
        const start = getPacificMidnightUTC(baseDateValue);
        const end = new Date(
          start.getTime() + numDaysToFetch * 24 * 60 * 60 * 1000
        );
        const startMs = start.getTime();
        const endMs = end.getTime();
        const coverageToleranceMs = 3 * 60 * 60 * 1000;

        const filterSharedRows = (): ForecastData[] => {
          if (!sharedRows?.length) {
            return [];
          }
          const filtered =
            sharedRows
              .filter((row) => {
                const ts = new Date(row.timestamp).getTime();
                return ts >= startMs && ts <= endMs;
              })
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              ) ?? [];
          if (!filtered.length) {
            return [];
          }
          const firstTs = new Date(filtered[0].timestamp).getTime();
          const lastTs = new Date(
            filtered[filtered.length - 1].timestamp
          ).getTime();
          const coversStart = firstTs <= startMs + coverageToleranceMs;
          const coversEnd = lastTs >= endMs - coverageToleranceMs;
          return coversStart && coversEnd ? filtered : [];
        };

        let rows: ForecastData[] = filterSharedRows();
        if (!rows?.length) {
          rows = await getForecastCached(String(beachId), start, end);
        }

        if (!rows || !rows.length) {
          if (!cancelled) {
            setSurfData([]);
            setBaseStartMs(null);
          }
          return;
        }

        rows.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const shadingBaseDate = baseDateValue;

        // Get midnight in Pacific timezone for the base date (DST-aware)
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(shadingBaseDate);
        const year = parseInt(
          dateParts.find((p) => p.type === "year")?.value || "0"
        );
        const month =
          parseInt(dateParts.find((p) => p.type === "month")?.value || "1") - 1;
        const day = parseInt(
          dateParts.find((p) => p.type === "day")?.value || "1"
        );

        // Calculate UTC timestamp for Pacific midnight using offset at noon
        const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
        const noonDate = new Date(noonUTC);
        const noonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
        const offsetHours = pacificNoonHour - 12;

        const baseMs = Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
        if (!cancelled) {
          setBaseStartMs(baseMs);
        }

        // Create data points every 3 hours at the window start
        const series: SurfPoint[] = [];
        const maxHour = numDaysToFetch * 24;

        for (
          let windowStart = 0;
          windowStart <= maxHour;
          windowStart += DATA_STEP_HOURS
        ) {
          const centerHour = windowStart + HALF_STEP_HOURS;

          // Filter rows close to this 3-hour window center (within 1.5 hours)
          const nearbyRows = rows.filter((r) => {
            const ts = new Date(r.timestamp).getTime();
            const rowHour = Math.round((ts - baseMs) / 3600000);
            return Math.abs(rowHour - centerHour) <= HALF_STEP_HOURS;
          });

          if (nearbyRows.length === 0) continue;

          // Find the closest row to this hour
          const closest = nearbyRows.reduce<{
            dist: number;
            row: ForecastData;
          } | null>((best, cur) => {
            const ts = new Date(cur.timestamp).getTime();
            const rowHour = Math.round((ts - baseMs) / 3600000);
            const dist = Math.abs(rowHour - centerHour);
            if (!best || dist < best.dist) {
              return { dist, row: cur };
            }
            return best;
          }, null);

          if (closest && closest.row) {
            const r = closest.row;

            // Calculate surf height using swell data
            const h1 = r.swell.primary.height ?? 0;
            const p1 = r.swell.primary.period ?? 10;
            const h2 = r.swell.secondary.height ?? 0;
            const p2 = r.swell.secondary.period ?? 10;
            const h3 = r.swell.tertiary?.height ?? 0;
            const p3 = r.swell.tertiary?.period ?? 10;
            const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
            const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
            const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
            const w1 = 1.0,
              w2 = 0.6,
              w3 = 0.3;
            const combined = Math.sqrt(
              Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
            );
            const wind = r.conditions.windSpeed ?? 0;
            const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
            const effective = Math.max(0, combined * (1 - windPenalty));

            // Calculate estimate from heightMin and heightMax (same as SurfChart)
            const heightMin = r.surf.heightMin ?? null;
            const heightMax = r.surf.heightMax ?? null;

            let estimate = 0;
            if (heightMin !== null && heightMax !== null) {
              estimate = (heightMin + heightMax) / 2;
            } else if (heightMax !== null) {
              estimate = heightMax;
            } else if (heightMin !== null) {
              estimate = heightMin;
            }

            let representative = effective;

            if (!Number.isFinite(representative) || representative <= 0) {
              representative = estimate > 0 ? estimate : 0;
            } else if (estimate > 0) {
              representative = representative * 0.7 + estimate * 0.3;
            }

            series.push({
              hour: windowStart,
              surf: Number(Math.max(0, representative).toFixed(1)),
            });
          }
        }

        if (!cancelled) {
          setSurfData(series);
          setLoading(series.length === 0);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load surf data", e);
        }
        if (!cancelled) {
          setSurfData([]);
          setBaseStartMs(null);
          setDayAreas([]);
          setNightAreas([]);
          setLoading(true);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, normalizedDays, sharedRows]);

  const dayStats = React.useMemo(() => {
    if (!surfData.length) return [];

    const stats: { high: number; low: number }[] = [];
    const hoursPerDay = 24;

    for (let dayIdx = 0; dayIdx < totalFetchedDays; dayIdx++) {
      const dayStartHour = dayIdx * hoursPerDay;
      const dayEndHour = dayStartHour + hoursPerDay;

      const dayData = surfData.filter(
        (point) => point.hour >= dayStartHour && point.hour < dayEndHour
      );

      if (dayData.length > 0) {
        const surfValues = dayData.map((p) => p.surf);
        const high = Math.max(...surfValues);
        const low = Math.min(...surfValues);
        stats.push({
          high: Math.round(high * 10) / 10,
          low: Math.round(low * 10) / 10,
        });
      } else {
        stats.push({ high: 0, low: 0 });
      }
    }

    return stats;
  }, [surfData, totalFetchedDays]);

  const dayLabels =
    normalizedDays && normalizedDays.length > 0
      ? normalizedDays.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  // Generate hour ticks centered beneath each bar
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    const totalHours = totalFetchedDays * HOURS_PER_DAY;
    for (let start = 0; start <= totalHours; start += DATA_STEP_HOURS) {
      ticks.push(start);
    }
    return ticks;
  }, [totalFetchedDays]);
  const formatHourLabel = useCallback(
    (label: unknown, payload: TooltipPayload) => {
      let hour = payload?.[0]?.payload?.hour;
      if (typeof hour !== "number" && typeof label === "number") {
        hour = label;
      }
      if (typeof hour !== "number") return "";
      const nearestSlot = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const normalized = ((nearestSlot % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";
      return `${displayHour} ${ampm}`;
    },
    []
  );

  // Hover sync handlers
  const lastHoveredRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (e: ChartMouseEvent) => {
      if (isTouchOnlyDevice && !isTouchInspecting) return;
      if (e?.activeLabel !== undefined) {
        const hour = Number(e.activeLabel);
        if (!isNaN(hour)) {
          // Round to nearest 3-hour increment
          const roundedHour = Math.round(hour / 3) * 3;

          if (lastHoveredRef.current !== roundedHour) {
            lastHoveredRef.current = roundedHour;
            setHoveredHour(roundedHour);
          }
        }
      }
    },
    [isTouchInspecting, isTouchOnlyDevice, setHoveredHour]
  );

  const handleMouseLeave = useCallback(() => {
    if (isTouchOnlyDevice) return;
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [isTouchOnlyDevice, setHoveredHour]);

  const tooltipCursor = useMemo(
    () => ({
      fill: "var(--foreground)",
      fillOpacity: chartTheme.hoverOpacity,
      stroke: "var(--foreground)",
      strokeOpacity: Math.min(0.28, chartTheme.hoverOpacity + 0.08),
      strokeWidth: 1,
    }),
    [chartTheme.hoverOpacity]
  );
  const tooltipViewport = useMemo(
    () => ({
      x: clampTranslatePx(dayOffset * dayPx),
      y: 0,
      width: viewportWidth,
      height: Math.max(0, 250 - X_AXIS_SHADE_EXCLUDE_PX),
    }),
    [clampTranslatePx, dayOffset, dayPx, viewportWidth]
  );

  const [stableSelectedHour, setStableSelectedHour] = useState<number | null>(
    null
  );
  const { setReady } = useForecastChartLoading("forecast-surf");
  const daysReady = Array.isArray(days) && days.length > 0;
  const dashboardBusy = useForecastChartsBusyState();
  const wasBusyRef = useRef(dashboardBusy);

  // Mark this widget as not ready until the day range exists (day headers depend on it).
  useEffect(() => {
    if (!daysReady) {
      setReady(false);
    }
  }, [daysReady, setReady]);

  // When the visible day range changes (user adjusts the forecast date range),
  // pessimistically mark this widget as not ready so the global forecast
  // overlay turns on before any of the day headers or hour highlights change.
  useLayoutEffect(() => {
    if (!days) return;
    setReady(false);
  }, [days, setReady]);

  // Mark this widget as not ready whenever its sun/shading pipeline is not ready.
  useEffect(() => {
    if (!sunReady) {
      setReady(false);
    }
  }, [sunReady, setReady]);

  // Mark this widget as not ready whenever its local loading flag is true.
  useEffect(() => {
    if (loading) {
      setReady(false);
    }
  }, [loading, setReady]);

  // Mark ready only after data and sun/shading are fully ready.
  useEffect(() => {
    if (daysReady && !loading && sunReady) {
      setReady(true);
    }
  }, [daysReady, loading, sunReady, setReady]);

  useEffect(() => {
    if (dashboardBusy && !wasBusyRef.current) {
      setStableSelectedHour(selectedHour ?? null);
    }
    if (!dashboardBusy && wasBusyRef.current) {
      setStableSelectedHour(null);
    }
    wasBusyRef.current = dashboardBusy;
  }, [dashboardBusy, selectedHour]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: 300,
          overflow: "hidden",
          background: "transparent",
          contain: "layout style paint",
          willChange: "transform",
        }}
      >
        {/* prev/next buttons */}
        <button
          aria-label="Back one day"
          onClick={handleBack}
          className={cn(
            "absolute left-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
            (!isScrollable || dayOffset === 0) && "hidden"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          aria-label="Next one day"
          onClick={handleNext}
          className={cn(
            "absolute right-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
            (!isScrollable || isAtRightEdge) && "hidden"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* moving inner (chart + day labels) */}
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="chart-touch-no-select"
          style={{
            marginTop: 60,
            position: "absolute",
            left: 0,
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            cursor: "grab",
            touchAction: isTouchInspecting ? "none" : "pan-y",
          }}
        >
          {/* Day label bar */}
          <div
            className="rounded-t-md overflow-hidden border border-border/20 border-b-0 bg-highlight-5/40 backdrop-blur-md"
            style={{
              position: "absolute",
              zIndex: 40,
              top: -58,
              left: 0,
              width: chartInnerWidth,
              display: "flex",
              pointerEvents: "none",
              backgroundImage: `linear-gradient(to bottom, color-mix(in oklab, ${chartTheme.dayShading} 14%, transparent), hsl(var(--background) / 0.75))`,
            }}
          >
            <div
              className="h-14 p-1"
              style={{ width: dayHeaderLayout.left, flex: "0 0 auto" }}
            >
              <div className="h-full rounded-md bg-highlight-3/40 dark:bg-highlight-5/50" />
            </div>
            <div
              style={{
                width: dayHeaderLayout.width,
                display: "grid",
                gridTemplateColumns: dayHeaderLayout.gridTemplateColumns,
              }}
            >
              {dayLabels?.map((label, idx) => (
                <div
                  key={idx}
                  className="h-14 p-1"
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    color: "var(--foreground)",
                    pointerEvents: "none",
                  }}
                >
                  <div className="flex h-full items-center justify-between gap-3 rounded-md bg-highlight-3/50 dark:bg-highlight-5/50 px-3 py-2">
                    {(() => {
                      const [weekdayRaw, monthDayRaw] = label.split(",");
                      const weekday = (weekdayRaw ?? label).trim();
                      const monthDay = (monthDayRaw ?? "").trim();
                      const high = dayStats[idx]?.high;
                      const low = dayStats[idx]?.low;

                      return (
                        <>
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                              {weekday}
                            </span>
                            <span className="text-sm font-semibold truncate">
                              {monthDay || label}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 whitespace-nowrap text-[0.72rem] text-muted-foreground rounded-md py-1 pl-1 bg-foreground/5">
                            <div className="grid grid-cols-[14px_18px_32px_16px] items-center gap-x-1 leading-none">
                              <ArrowUp className="h-3 w-3 text-emerald-500/80" />
                              <span className="mt-0.5 text-[0.68rem] font-semibold text-muted-foreground">
                                Hi
                              </span>
                              <span className="mt-0.5 tabular-nums text-right text-foreground font-semibold">
                                {typeof high === "number"
                                  ? high.toFixed(1)
                                  : "--"}
                              </span>
                              <span className="text-[0.7rem] text-muted-foreground">
                                ft
                              </span>
                            </div>
                            <div className="grid grid-cols-[14px_18px_32px_16px] items-center gap-x-1 leading-none">
                              <ArrowDown className="h-3 w-3 text-rose-500/80" />
                              <span className="mt-0.5 text-[0.68rem] font-semibold text-muted-foreground">
                                Lo
                              </span>
                              <span className="mt-0.5 tabular-nums text-right text-foreground font-semibold">
                                {typeof low === "number"
                                  ? low.toFixed(1)
                                  : "--"}
                              </span>
                              <span className="mt-0.5 text-[0.7rem] text-muted-foreground">
                                ft
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {containerWidth > 0 && (
            <div className="relative w-full overflow-hidden rounded-b-md border border-border/20 border-t-0 border-x-0">
              {/* Shade only the plot area (not the X-axis label band), matching prior ReferenceArea behavior. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: CHART_RIGHT_MARGIN,
                  bottom: X_AXIS_SHADE_EXCLUDE_PX,
                  backgroundImage: shadingBackground,
                  backgroundRepeat: "no-repeat",
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  pointerEvents: "none",
                }}
              />
              {/* Left divider clipped to shaded plot height (stops above X-axis labels). */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: X_AXIS_SHADE_EXCLUDE_PX,
                  left: dayLabelLeftOffset,
                  width: 1,
                  backgroundColor: "var(--border)",
                  opacity: 0.85,
                  pointerEvents: "none",
                  transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                  zIndex: 2,
                }}
              />
              {/* Sticky in-plot Y-axis (separate overlay chart) to avoid mutating Recharts' SVG output. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: dayLabelLeftOffset,
                  pointerEvents: "none",
                  // Counter-translate by the same px as the pan transform (set on `innerRef`)
                  // so the Y-axis stays pinned while the chart content drags underneath.
                  transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                  zIndex: 3,
                }}
              >
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[250px] w-full !justify-start"
                >
                  <BarChart
                    accessibilityLayer={false}
                    width={dayLabelLeftOffset}
                    height={250}
                    data={[{ x: 0 }]}
                    margin={{
                      left: CHART_LEFT_MARGIN,
                      right: 0,
                      bottom: 5,
                      top: 0,
                    }}
                  >
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={[0, 1]}
                      ticks={[]}
                      tick={false}
                      tickLine={false}
                      axisLine={false}
                      height={X_AXIS_SHADE_EXCLUDE_PX}
                    />
                    <YAxis
                      width={Y_AXIS_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={11}
                      tick={yAxisTick}
                      domain={[
                        surfTicks[0] ?? 0,
                        surfTicks[surfTicks.length - 1] ?? 6,
                      ]}
                      ticks={surfTicks}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <ChartContainer
                  key={chartInnerWidth}
                  config={chartConfig}
                  className="forecast-surf-chart-container aspect-auto h-[250px] w-full !justify-start"
                >
                  <BarChart
                    accessibilityLayer={false}
                    width={chartInnerWidth}
                    data={surfData}
                    margin={{
                      left: dayLabelLeftOffset,
                      right: CHART_RIGHT_MARGIN,
                      bottom: 5,
                      top: 0,
                    }}
                    syncId="allCharts"
                    syncMethod={syncToNearestThirdHour}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* vertical boundaries every day */}
                    {Array.from({ length: totalFetchedDays + 1 }, (_, i) => {
                      if (i !== 0 && i !== totalFetchedDays) {
                        return (
                          <ReferenceLine
                            key={`boundary-${i}`}
                            x={i * 24}
                            stroke="var(--foreground)"
                            strokeOpacity={0.25}
                            strokeWidth={0.5}
                          />
                        );
                      }
                    })}
                    <XAxis
                      dataKey="hour"
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={0}
                      fontSize={11}
                      domain={[
                        -HALF_STEP_HOURS,
                        totalFetchedDays * 24 + HALF_STEP_HOURS,
                      ]}
                      ticks={hourTicks}
                      tickFormatter={(value: number) => {
                        const nearestSlot =
                          Math.round(value / DATA_STEP_HOURS) * DATA_STEP_HOURS;
                        const normalized = ((nearestSlot % 24) + 24) % 24;
                        const labelHour =
                          normalized % 12 === 0 ? 12 : normalized % 12;
                        return String(labelHour);
                      }}
                    />
                    {isTouchOnlyDevice ? (
                      isTouchInspecting || isTouchTooltipSyncActive ? (
                        <ChartTooltip
                          defaultIndex={
                            isTouchInspecting
                              ? touchDefaultIndex ?? undefined
                              : hoveredHourRef.current != null &&
                                surfData.length > 0
                              ? Math.min(
                                  surfData.length - 1,
                                  Math.max(
                                    0,
                                    Math.round(
                                      hoveredHourRef.current / DATA_STEP_HOURS
                                    )
                                  )
                                )
                              : undefined
                          }
                          content={
                            <ChartTooltipViewportContent
                              viewport={tooltipViewport}
                              labelFormatter={formatHourLabel}
                            />
                          }
                          cursor={tooltipCursor}
                          wrapperStyle={{ transform: "translate(0px, 0px)" }}
                          animationDuration={0}
                          isAnimationActive={false}
                        />
                      ) : null
                    ) : (
                      <ChartTooltip
                        content={
                          <ChartTooltipViewportContent
                            viewport={tooltipViewport}
                            labelFormatter={formatHourLabel}
                          />
                        }
                        cursor={tooltipCursor}
                        wrapperStyle={{ transform: "translate(0px, 0px)" }}
                        animationDuration={0}
                        isAnimationActive={false}
                      />
                    )}
                    {/* Selected hour marker */}
                    {(() => {
                      try {
                        const effectiveHour = dashboardBusy
                          ? stableSelectedHour ?? selectedHour ?? null
                          : selectedHour ?? null;
                        const base =
                          normalizedDays && normalizedDays.length > 0
                            ? normalizedDays[0]
                            : null;
                        if (!base || !selectedDate || effectiveHour == null)
                          return null;
                        const baseMid = new Date(
                          base.getFullYear(),
                          base.getMonth(),
                          base.getDate()
                        ).getTime();
                        const selMid = new Date(
                          selectedDate.getFullYear(),
                          selectedDate.getMonth(),
                          selectedDate.getDate()
                        ).getTime();
                        const dayDelta = Math.floor(
                          (selMid - baseMid) / (24 * 3600 * 1000)
                        );
                        const baseX = dayDelta * 24 + effectiveHour;
                        if (baseX < 0 || baseX > totalFetchedDays * 24)
                          return null;
                        const snappedX =
                          Math.round(baseX / DATA_STEP_HOURS) * DATA_STEP_HOURS;
                        return (
                          <ReferenceLine
                            x={snappedX}
                            stroke="var(--foreground)"
                            strokeDasharray="3 3"
                          />
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    <Bar
                      dataKey="surf"
                      fill="var(--color-surf)"
                      radius={6}
                      // stroke="#5f5f5fff"
                      // strokeWidth={0.5}
                      minPointSize={15}
                      isAnimationActive={false}
                      animationDuration={0}
                      animationBegin={0}
                    >
                      <LabelList
                        dataKey="surf"
                        position="middle"
                        content={(props: LabelProps) => {
                          const safeX =
                            typeof props.x === "number" ? props.x : 0;
                          const safeY =
                            typeof props.y === "number" ? props.y : 0;
                          const safeWidth =
                            typeof props.width === "number" ? props.width : 0;
                          const safeHeight =
                            typeof props.height === "number" ? props.height : 0;
                          const fontSize = Math.max(10, safeWidth * 0.15);
                          const label =
                            typeof props.value === "number"
                              ? props.value.toFixed(1)
                              : "";

                          // Get color based on surf value
                          const surfValue =
                            typeof props.value === "number" ? props.value : 0;
                          const barColor = getSurfColor(surfValue);

                          if (label) {
                            return (
                              <g>
                                {/* Render the colored bar */}
                                <rect
                                  x={safeX}
                                  y={safeY}
                                  width={safeWidth}
                                  height={safeHeight}
                                  fill={barColor}
                                  rx={6}
                                  // stroke="#5f5f5fff"
                                  // strokeWidth={0.5}
                                />
                                <text
                                  x={safeX + safeWidth / 2}
                                  y={safeY + safeHeight / 2 + fontSize / 3}
                                  fill="#2c2c2cff"
                                  textAnchor="middle"
                                  fontWeight="600"
                                  fontSize={fontSize}
                                >
                                  {label === "0.0" ? "0" : label}
                                </text>
                              </g>
                            );
                          }
                          return null;
                        }}
                        fill="black"
                      />
                    </Bar>
                    <YAxis
                      hide
                      width={0}
                      domain={[
                        surfTicks[0] ?? 0,
                        surfTicks[surfTicks.length - 1] ?? 6,
                      ]}
                      ticks={surfTicks}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}
        </div>

        {/* invisible overlay to prevent pointer events leaking */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 56,
            width: viewportWidth,
            height: 220,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(ForecastSurfChart);
