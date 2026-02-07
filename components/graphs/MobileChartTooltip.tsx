"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";

function parseSvgNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function getLargestClipRect(
  surfaceEl: SVGElement,
  viewBox?: { width: number; height: number },
): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const rects = surfaceEl.querySelectorAll("clipPath rect");
  if (!rects.length) return null;

  let best: { x: number; y: number; width: number; height: number } | null =
    null;
  let bestArea = 0;

  rects.forEach((rect) => {
    const x = parseSvgNumber(rect.getAttribute("x")) ?? 0;
    const y = parseSvgNumber(rect.getAttribute("y")) ?? 0;
    const width = parseSvgNumber(rect.getAttribute("width")) ?? 0;
    const height = parseSvgNumber(rect.getAttribute("height")) ?? 0;
    if (!(width > 1) || !(height > 1)) return;
    if (
      viewBox &&
      Math.abs(width - viewBox.width) < 1 &&
      Math.abs(height - viewBox.height) < 1
    ) {
      return;
    }
    const area = width * height;
    if (area > bestArea) {
      bestArea = area;
      best = { x, y, width, height };
    }
  });

  return best;
}

/**
 * Data point that can be displayed in the mobile tooltip
 */
export interface MobileTooltipDataPoint {
  hour: number;
  label: string; // e.g., "9 AM"
  value: number;
  unit: string; // e.g., "ft", "mph"
  formattedValue?: React.ReactNode; // Custom formatted value display
  color?: string;
  icon?: React.ReactNode;
  /** Optional: small indicator shown inline before the value */
  valueIcon?: React.ReactNode;
  /** Optional: increase time-to-value spacing for dense tooltips (e.g. swell) */
  labelSpacing?: "default" | "spacious";
}

/**
 * Active tooltip state - stored in refs for synchronous updates
 */
export interface MobileTooltipState {
  active: boolean;
  dataIndex: number | null;
  /** The actual hour value (for cross-chart syncing) */
  hour: number | null;
  /** For cross-chart sync: hour rounded to 3-hour intervals */
  syncHour: number | null;
  chartId: string | null;
  clientX: number;
  clientY: number;
  chartRect: DOMRect | null;
}

/**
 * Context for coordinating mobile tooltips across multiple charts
 */
interface MobileTooltipContextValue {
  /** Current tooltip state (ref-based for synchronous access) */
  stateRef: React.MutableRefObject<MobileTooltipState>;
  /** Notify listeners that state changed */
  notifyChange: () => void;
  /** Subscribe to state changes */
  subscribe: (callback: () => void) => () => void;
  /** Set tooltip active with data */
  activate: (
    chartId: string,
    dataIndex: number,
    hour: number,
    clientX: number,
    clientY: number,
    chartRect: DOMRect,
  ) => void;
  /** Deactivate tooltip */
  deactivate: () => void;
  /** Update position while active */
  updatePosition: (
    dataIndex: number,
    hour: number,
    clientX: number,
    clientY: number,
  ) => void;
}

const MobileTooltipContext =
  React.createContext<MobileTooltipContextValue | null>(null);

/**
 * Provider that manages mobile tooltip state across all charts
 */
export function MobileTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stateRef = React.useRef<MobileTooltipState>({
    active: false,
    dataIndex: null,
    hour: null,
    syncHour: null,
    chartId: null,
    clientX: 0,
    clientY: 0,
    chartRect: null,
  });

  const listenersRef = React.useRef<Set<() => void>>(new Set());
  const bodyClassRemovalTimeoutRef = React.useRef<number | null>(null);

  const notifyChange = React.useCallback(() => {
    listenersRef.current.forEach((cb) => cb());
  }, []);

  const subscribe = React.useCallback((callback: () => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const DATA_STEP_HOURS = 3;

  const activate = React.useCallback(
    (
      chartId: string,
      dataIndex: number,
      hour: number,
      clientX: number,
      clientY: number,
      chartRect: DOMRect,
    ) => {
      // Calculate sync hour (rounded to 3-hour intervals for cross-chart sync)
      const syncHour = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;

      // Always update state immediately - no batching
      stateRef.current = {
        active: true,
        dataIndex,
        hour,
        syncHour,
        chartId,
        clientX,
        clientY,
        chartRect,
      };
      if (typeof document !== "undefined") {
        if (bodyClassRemovalTimeoutRef.current != null) {
          window.clearTimeout(bodyClassRemovalTimeoutRef.current);
          bodyClassRemovalTimeoutRef.current = null;
        }
        document.body.classList.add("ww-mobile-tooltip-active");
      }
      notifyChange();
    },
    [notifyChange],
  );

  const deactivate = React.useCallback(() => {
    stateRef.current = {
      active: false,
      dataIndex: null,
      hour: null,
      syncHour: null,
      chartId: null,
      clientX: 0,
      clientY: 0,
      chartRect: null,
    };
    if (typeof document !== "undefined") {
      if (bodyClassRemovalTimeoutRef.current != null) {
        window.clearTimeout(bodyClassRemovalTimeoutRef.current);
      }
      bodyClassRemovalTimeoutRef.current = window.setTimeout(() => {
        document.body.classList.remove("ww-mobile-tooltip-active");
        bodyClassRemovalTimeoutRef.current = null;
      }, 180);
    }
    notifyChange();
  }, [notifyChange]);

  const updatePosition = React.useCallback(
    (dataIndex: number, hour: number, clientX: number, clientY: number) => {
      if (!stateRef.current.active) return;
      const syncHour = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      stateRef.current = {
        ...stateRef.current,
        dataIndex,
        hour,
        syncHour,
        clientX,
        clientY,
      };
      notifyChange();
    },
    [notifyChange],
  );

  const value = React.useMemo(
    () => ({
      stateRef,
      notifyChange,
      subscribe,
      activate,
      deactivate,
      updatePosition,
    }),
    [notifyChange, subscribe, activate, deactivate, updatePosition],
  );

  return (
    <MobileTooltipContext.Provider value={value}>
      {children}
    </MobileTooltipContext.Provider>
  );
}

/**
 * Hook to access mobile tooltip context
 */
export function useMobileTooltip() {
  const ctx = React.useContext(MobileTooltipContext);
  if (!ctx) {
    throw new Error(
      "useMobileTooltip must be used within MobileTooltipProvider",
    );
  }
  return ctx;
}

/**
 * Hook that subscribes to tooltip state changes and triggers re-renders
 */
export function useMobileTooltipState() {
  const { stateRef, subscribe } = useMobileTooltip();
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    return subscribe(forceUpdate);
  }, [subscribe]);

  return stateRef.current;
}

interface MobileChartTooltipProps {
  /** Unique ID for this chart */
  chartId: string;
  /** Function to get data point for a given index (used for active chart) */
  getDataPoint: (index: number) => MobileTooltipDataPoint | null;
  /** Function to get data point for a given hour (used for synced charts) */
  getDataPointForHour?: (hour: number) => MobileTooltipDataPoint | null;
  /** Anchor ref for positioning (required for synced tooltips) */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** X position getter for synced charts to position tooltip horizontally */
  getXPositionForHour?: (hour: number) => number | null;
  /** Position tooltip inside the chart (at top) instead of above it */
  positionInside?: boolean;
  /** Top offset in pixels when positionInside is true (default: 12) */
  topOffset?: number;
  /** Render a cursor indicator for mobile (bar charts) */
  renderCursor?: boolean;
  /** Cursor containment inset inside the chart container (px) */
  cursorInsets?: { top?: number; bottom?: number; radius?: number };
  /** Cursor visual styling (should match desktop cursor exactly) */
  cursorStyle?: {
    fill: string;
    fillOpacity: number;
    stroke: string;
    strokeOpacity: number;
    strokeWidth: number;
    radius?: number;
  };
  /** When true, tooltip interactions and rendering are disabled (e.g., while loading) */
  disabled?: boolean;
}

/**
 * Renders a mobile-optimized tooltip for chart data
 * Uses a portal to render outside the chart DOM
 * Shows on ALL charts when any chart is being touched (synced tooltips)
 * On Overview widgets, renders into the widget header overlay slot to avoid
 * overlapping chart content/axes while scrubbing.
 */
export function MobileChartTooltip({
  chartId,
  getDataPoint,
  getDataPointForHour,
  anchorRef,
  getXPositionForHour,
  positionInside = false,
  topOffset = 12,
  renderCursor = false,
  cursorInsets,
  cursorStyle,
  disabled = false,
}: MobileChartTooltipProps) {
  const state = useMobileTooltipState();
  const [mounted, setMounted] = React.useState(false);
  const [isPresent, setIsPresent] = React.useState(false);
  const [measuredTooltipSize, setMeasuredTooltipSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);
  const lastDataPointRef = React.useRef<MobileTooltipDataPoint | null>(null);
  const lastDesiredCenterClientXRef = React.useRef<number | null>(null);
  const lastClampedCenterXInHostRef = React.useRef<number | null>(null);
  const lastClampedTopInHostRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Check if any tooltip is active
  const isAnyActive = state.active && state.syncHour !== null;
  // Check if this is the chart being directly touched
  const isThisChartActive = state.chartId === chartId;
  const isHoverFine =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  React.useEffect(() => {
    if (isAnyActive) {
      setIsPresent(true);
      return;
    }

    if (!isPresent) return;
    const timeoutId = window.setTimeout(() => setIsPresent(false), 140);
    return () => window.clearTimeout(timeoutId);
  }, [isAnyActive, isPresent]);

  React.useLayoutEffect(() => {
    if (!isAnyActive) return;
    if (measuredTooltipSize != null) return;
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        Number.isFinite(rect.width) &&
        Number.isFinite(rect.height)
      ) {
        setMeasuredTooltipSize({
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        });
      }
    };

    measure();
    const raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [isAnyActive, measuredTooltipSize]);

  React.useEffect(() => {
    if (!isPresent) setMeasuredTooltipSize(null);
  }, [isPresent]);

  const shouldAttemptRender = mounted && (isAnyActive || isPresent);
  const anchorEl = anchorRef?.current ?? null;
  const headerPortalEl = (anchorEl
    ?.closest?.("[data-ww-overview-card]")
    ?.querySelector?.("[data-ww-mobile-tooltip-host]") ??
    null) as HTMLElement | null;
  const cardEl = (anchorEl?.closest?.("[data-ww-overview-card]") ??
    null) as HTMLElement | null;

  // Get the data point to display (only when we're actually trying to render)
  let dataPoint: MobileTooltipDataPoint | null = null;

  if (shouldAttemptRender) {
    if (isThisChartActive && state.dataIndex !== null) {
      // This chart is being touched - use exact index
      dataPoint = getDataPoint(state.dataIndex);
    } else if (getDataPointForHour && state.syncHour !== null) {
      // This chart is synced - use syncHour to find data
      dataPoint = getDataPointForHour(state.syncHour);
    }

    if (isAnyActive && dataPoint) {
      lastDataPointRef.current = dataPoint;
    }

    if (!dataPoint) {
      dataPoint = lastDataPointRef.current;
    }
  }

  const shouldMarkCard = Boolean(
    cardEl && headerPortalEl && shouldAttemptRender && dataPoint,
  );

  React.useEffect(() => {
    if (!cardEl) return;
    if (shouldMarkCard) {
      cardEl.setAttribute("data-ww-tooltip-active", "");
      return () => {
        cardEl.removeAttribute("data-ww-tooltip-active");
      };
    }
    cardEl.removeAttribute("data-ww-tooltip-active");
  }, [cardEl, shouldMarkCard]);

  // When disabled (e.g., chart loading), don't render anything
  // This check is placed after all hooks to satisfy React's Rules of Hooks
  if (disabled) {
    return null;
  }

  if (!shouldAttemptRender) {
    return null;
  }

  // Need anchorRef for positioning
  if (!anchorEl) {
    return null;
  }

  if (!dataPoint) {
    return null;
  }

  const labelToValueGapClass =
    dataPoint.labelSpacing === "default" ? "mt-0.5" : "mt-1.5";

  const visibilityClassName = isAnyActive
    ? "opacity-100"
    : "opacity-0 delay-75";

  if (headerPortalEl) {
    const headerRect = headerPortalEl.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const isHeroDeck = Boolean(
      headerPortalEl.closest?.("[data-ww-hero-deck]") ||
      cardEl?.closest?.("[data-ww-hero-deck]"),
    );
    const hostLayoutWidth = headerPortalEl.offsetWidth || headerRect.width;
    const hostLayoutHeight = headerPortalEl.offsetHeight || headerRect.height;
    const hostScaleX =
      isHeroDeck && hostLayoutWidth > 0
        ? headerRect.width / hostLayoutWidth
        : 1;
    const hostScaleY =
      isHeroDeck && hostLayoutHeight > 0
        ? headerRect.height / hostLayoutHeight
        : 1;

    const surfaceEl = (() => {
      const surfaces =
        anchorEl.querySelectorAll<SVGElement>(".recharts-surface");
      return surfaces.length ? surfaces[surfaces.length - 1] : null;
    })();
    const surfaceRect = surfaceEl?.getBoundingClientRect() ?? null;
    const baseRect =
      surfaceRect && surfaceRect.width > 4 && surfaceRect.height > 4
        ? surfaceRect
        : anchorRect;

    const desiredCenterClientX = (() => {
      const hourForX =
        isThisChartActive && state.hour != null ? state.hour : state.syncHour;

      if (hourForX != null && getXPositionForHour) {
        const chartX = getXPositionForHour(hourForX);
        if (typeof chartX === "number" && Number.isFinite(chartX)) {
          const viewBoxWidth =
            (surfaceEl as unknown as SVGSVGElement | null)?.viewBox?.baseVal
              ?.width ?? baseRect.width;
          const scaleX =
            viewBoxWidth > 0 && baseRect.width > 0
              ? baseRect.width / viewBoxWidth
              : 1;
          return baseRect.left + chartX * scaleX;
        }
      }

      if (isAnyActive && Number.isFinite(state.clientX)) return state.clientX;
      return null;
    })();

    if (isAnyActive && desiredCenterClientX != null) {
      lastDesiredCenterClientXRef.current = desiredCenterClientX;
    }

    const stableCenterClientX =
      desiredCenterClientX ?? lastDesiredCenterClientXRef.current;

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    // IMPORTANT: In the hero deck, the whole card is transformed (scaled/translated).
    // getBoundingClientRect() is in "visual" pixels, but CSS left/top/width are in layout pixels.
    // Convert to layout units so the tooltip doesn't drift as X increases.
    const hostWidth = isHeroDeck ? hostLayoutWidth : headerRect.width;
    const hostHeight = isHeroDeck ? hostLayoutHeight : headerRect.height;
    const horizontalPadding = isHeroDeck ? 10 : 16;
    const topPadding = 0;
    const bottomPadding = 0;
    const contentLeft = horizontalPadding;
    const contentWidth = Math.max(0, hostWidth - horizontalPadding * 2);
    const contentTop = topPadding;
    const contentHeight = Math.max(0, hostHeight - topPadding - bottomPadding);

    const maxTooltipWidth = Math.max(0, hostWidth - horizontalPadding * 2);
    const tooltipWidthCap = isHeroDeck ? 170 : 300;
    const fallbackTooltipWidth = Math.min(
      isHeroDeck ? 160 : 280,
      Math.max(80, Math.min(Math.round(hostWidth * 0.66), maxTooltipWidth)),
    );
    const measuredTooltipWidth = measuredTooltipSize?.width ?? null;
    const measuredTooltipHeight = measuredTooltipSize?.height ?? null;
    const measuredTooltipWidthLayout =
      measuredTooltipWidth != null
        ? measuredTooltipWidth / Math.max(1e-6, hostScaleX)
        : null;
    const measuredTooltipHeightLayout =
      measuredTooltipHeight != null
        ? measuredTooltipHeight / Math.max(1e-6, hostScaleY)
        : null;
    const tooltipWidth = Math.min(
      tooltipWidthCap,
      Math.max(
        80,
        Math.min(
          measuredTooltipWidthLayout ?? fallbackTooltipWidth,
          maxTooltipWidth,
        ),
      ),
    );
    const halfTooltipWidth = tooltipWidth / 2;

    const isForecastChart = topOffset > 20;
    const minTop = contentTop + (isForecastChart ? 0 : 6);
    const bottomClampPadding = isForecastChart ? 4 : 8;
    const tooltipHeight = Math.max(1, measuredTooltipHeightLayout ?? 64);
    const maxTop = Math.max(
      minTop,
      contentTop + contentHeight - bottomClampPadding - tooltipHeight,
    );
    const desiredTopActive = contentTop + (isForecastChart ? 0 : 8);
    const desiredTopInactive = contentTop + (contentHeight - tooltipHeight) / 2;
    const clampedTopInHost = clamp(
      isAnyActive
        ? desiredTopActive
        : (lastClampedTopInHostRef.current ?? desiredTopActive),
      minTop,
      maxTop,
    );

    if (isAnyActive) {
      lastClampedTopInHostRef.current = clampedTopInHost;
    }

    const desiredCenterXInHost =
      stableCenterClientX != null
        ? stableCenterClientX - headerRect.left
        : null;
    const desiredCenterXInHostLayout =
      desiredCenterXInHost != null && Number.isFinite(desiredCenterXInHost)
        ? desiredCenterXInHost / Math.max(1e-6, hostScaleX)
        : null;

    const computedClampedCenterXInHost =
      desiredCenterXInHostLayout != null &&
      Number.isFinite(desiredCenterXInHostLayout)
        ? clamp(
            desiredCenterXInHostLayout,
            contentLeft + halfTooltipWidth,
            contentLeft + contentWidth - halfTooltipWidth,
          )
        : contentLeft + contentWidth / 2;

    if (isAnyActive) {
      lastClampedCenterXInHostRef.current = computedClampedCenterXInHost;
    }

    const clampedCenterXInHost =
      computedClampedCenterXInHost ??
      lastClampedCenterXInHostRef.current ??
      contentLeft + contentWidth / 2;

    const cursorX = (() => {
      if (!renderCursor || !getXPositionForHour) return null;
      const hourForX =
        isThisChartActive && state.hour != null ? state.hour : state.syncHour;
      if (hourForX == null) return null;
      return getXPositionForHour(hourForX);
    })();

    const cursorWidth =
      renderCursor &&
      cursorX != null &&
      getXPositionForHour &&
      state.syncHour != null
        ? (() => {
            const step = 3;
            const baseHour =
              isThisChartActive && state.hour != null
                ? state.hour
                : state.syncHour;
            if (baseHour == null) return 20;
            const next = getXPositionForHour(baseHour + step);
            const prev = getXPositionForHour(baseHour - step);
            const delta =
              typeof next === "number" && Number.isFinite(next)
                ? Math.abs(next - cursorX)
                : typeof prev === "number" && Number.isFinite(prev)
                  ? Math.abs(cursorX - prev)
                  : null;
            if (delta == null || !Number.isFinite(delta) || delta <= 0) {
              const fallback = anchorEl.getBoundingClientRect().width / 16;
              return Math.max(14, Math.min(26, Math.round(fallback)));
            }
            return Math.max(10, Math.min(44, Math.round(delta)));
          })()
        : null;

    const cursorPortal =
      renderCursor && cursorX != null && cursorWidth != null
        ? createPortal(
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0",
                "transition-opacity duration-150 ease-out motion-reduce:transition-none",
                isAnyActive && (!isHoverFine || !isThisChartActive)
                  ? "opacity-100"
                  : "opacity-0",
              )}
            >
              {(() => {
                const radius = cursorStyle?.radius ?? cursorInsets?.radius ?? 6;
                const left = baseRect.left - anchorRect.left;
                const top = baseRect.top - anchorRect.top;
                const fill = cursorStyle?.fill ?? "var(--foreground)";
                const fillOpacity = cursorStyle?.fillOpacity ?? 0.12;
                const stroke = cursorStyle?.stroke ?? "var(--foreground)";
                const strokeOpacity = cursorStyle?.strokeOpacity ?? 0.18;
                const strokeWidth = cursorStyle?.strokeWidth ?? 1;

                const svgWidth =
                  ((surfaceEl as unknown as SVGSVGElement | null)?.viewBox
                    ?.baseVal?.width ??
                    baseRect.width) ||
                  baseRect.width;
                const svgHeight =
                  ((surfaceEl as unknown as SVGSVGElement | null)?.viewBox
                    ?.baseVal?.height ??
                    baseRect.height) ||
                  baseRect.height;

                const clipRect = surfaceEl
                  ? getLargestClipRect(surfaceEl, {
                      width: svgWidth,
                      height: svgHeight,
                    })
                  : null;
                const topInset = cursorInsets?.top ?? 0;
                const bottomInset = cursorInsets?.bottom ?? 0;

                const clipTop = clipRect?.y ?? 0;
                const clipBottom = clipRect
                  ? clipRect.y + clipRect.height
                  : svgHeight;

                const plotTop = Math.max(clipTop, topInset);
                const plotBottom = Math.min(
                  clipBottom,
                  svgHeight - bottomInset,
                );
                const plotY = plotTop;
                const plotHeight = Math.max(0, plotBottom - plotTop);
                const strokeInset = strokeWidth > 0 ? strokeWidth / 2 : 0;
                const cursorY = plotY + strokeInset;
                const cursorHeight = Math.max(0, plotHeight - strokeInset * 2);
                const rx = Math.max(
                  0,
                  Math.min(radius, cursorWidth / 2, cursorHeight / 2),
                );

                return (
                  <div
                    className="absolute"
                    style={{
                      left,
                      top,
                      width: baseRect.width,
                      height: baseRect.height,
                    }}
                  >
                    <svg
                      className="absolute inset-0"
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      preserveAspectRatio="none"
                    >
                      <rect
                        x={cursorX - cursorWidth / 2}
                        y={cursorY}
                        width={cursorWidth}
                        height={cursorHeight}
                        rx={rx}
                        fill={fill}
                        fillOpacity={fillOpacity}
                        stroke={stroke}
                        strokeOpacity={strokeOpacity}
                        strokeWidth={strokeWidth}
                      />
                    </svg>
                  </div>
                );
              })()}
            </div>,
            anchorEl,
          )
        : null;

    const headerTooltip = createPortal(
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          "transition-opacity duration-150 ease-out motion-reduce:transition-none",
          visibilityClassName,
        )}
      >
        <div className="absolute inset-0">
          <div
            className={cn(
              "absolute inset-0",
              "bg-[var(--widget-header-surface)]",
              "supports-[backdrop-filter]:bg-[color-mix(in_oklch,var(--widget-header-surface)_82%,transparent)] supports-[backdrop-filter]:backdrop-blur-md",
            )}
          />
          <div
            ref={measureRef}
            aria-hidden="true"
            className="absolute -left-[10000px] top-0 w-max"
          >
            <div
              className={cn(
                "rounded-2xl",
                "bg-[var(--widget-header-surface)] ring-1 ring-border/25 shadow-xs",
                "px-3 py-2 supports-[backdrop-filter]:bg-[color-mix(in_oklch,var(--widget-header-surface)_78%,transparent)] supports-[backdrop-filter]:backdrop-blur-md",
              )}
            >
              <div className="min-w-0">
                <div className="text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90 whitespace-nowrap tabular-nums leading-none">
                  {dataPoint.label}
                </div>
                <div
                  className={cn(
                    labelToValueGapClass,
                    "flex w-full min-w-0 justify-center",
                  )}
                >
                  <div className="min-w-0">
                    {dataPoint.formattedValue ?? (
                      <span className="text-foreground inline-flex items-baseline justify-center gap-1 font-semibold tabular-nums whitespace-nowrap">
                        {dataPoint.valueIcon ? (
                          <span className="inline-flex items-center text-foreground/60">
                            {dataPoint.valueIcon}
                          </span>
                        ) : null}
                        <span className="text-[0.96rem] leading-none">
                          {typeof dataPoint.value === "number"
                            ? dataPoint.value.toLocaleString(undefined, {
                                minimumFractionDigits: Number.isInteger(
                                  dataPoint.value,
                                )
                                  ? 0
                                  : 1,
                                maximumFractionDigits: 1,
                              })
                            : dataPoint.value}
                        </span>
                        {dataPoint.unit && (
                          <span className="text-[0.7rem] font-medium leading-none text-muted-foreground">
                            {dataPoint.unit}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "absolute max-h-full",
              "rounded-2xl",
              "bg-[var(--widget-header-surface)]",
              "px-3 py-2 supports-[backdrop-filter]:bg-[color-mix(in_oklch,var(--widget-header-surface)_78%,transparent)] supports-[backdrop-filter]:backdrop-blur-md",
              "ease-out",
            )}
            style={{
              width: tooltipWidth,
              left: clampedCenterXInHost,
              top: clampedTopInHost,
              transform: "translate(-50%, 0)",
            }}
          >
            <div className="min-w-0">
              <div className="text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90 whitespace-nowrap tabular-nums leading-none">
                {dataPoint.label}
              </div>
              <div
                className={cn(
                  labelToValueGapClass,
                  "flex w-full min-w-0 justify-center",
                )}
              >
                <div className="min-w-0">
                  {dataPoint.formattedValue ?? (
                    <span className="text-foreground inline-flex items-baseline justify-center gap-1 font-semibold tabular-nums whitespace-nowrap">
                      {dataPoint.valueIcon ? (
                        <span className="inline-flex items-center text-foreground/60">
                          {dataPoint.valueIcon}
                        </span>
                      ) : null}
                      <span className="text-[0.96rem] leading-none">
                        {typeof dataPoint.value === "number"
                          ? dataPoint.value.toLocaleString(undefined, {
                              minimumFractionDigits: Number.isInteger(
                                dataPoint.value,
                              )
                                ? 0
                                : 1,
                              maximumFractionDigits: 1,
                            })
                          : dataPoint.value}
                      </span>
                      {dataPoint.unit && (
                        <span className="text-[0.7rem] font-medium leading-none text-muted-foreground">
                          {dataPoint.unit}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      headerPortalEl,
    );

    return (
      <>
        {cursorPortal}
        {headerTooltip}
      </>
    );
  }

  const isTouchLike =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  // On hover devices, prefer the existing desktop tooltip when no header host exists
  // to avoid rendering two tooltips (desktop Recharts tooltip + this fallback).
  if (!isTouchLike) {
    return null;
  }

  // Position tooltip relative to chart container
  const rect = anchorEl.getBoundingClientRect();
  const rectValid =
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    rect.width > 4 &&
    rect.height > 4;
  if (!rectValid) {
    return null;
  }
  const tooltipX = rect.left + rect.width / 2;
  // Clamp to chart bounds to avoid drifting to the viewport edge.
  const clampPadding = Math.min(16, rect.width / 2);
  const clampedX = Math.min(
    rect.right - clampPadding,
    Math.max(rect.left + clampPadding, tooltipX),
  );
  // Position inside chart (at top with padding) or above it (in header row)
  const tooltipY = positionInside ? rect.top + topOffset : rect.top - 4;
  const transform = positionInside
    ? "translate(-50%, 0)" // Center horizontally, position from top
    : "translate(-50%, -100%)"; // Center horizontally, position above

  return createPortal(
    <div
      className="pointer-events-none fixed z-20"
      style={{
        left: clampedX,
        top: tooltipY,
        transform,
      }}
    >
      {/* Compact horizontal tooltip - fits in header area */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg",
          "border border-border/50 bg-background/95 px-2.5 py-1.5",
          "shadow-md backdrop-blur-sm",
          "animate-in fade-in-0 zoom-in-95 duration-100",
        )}
      >
        {/* Time label */}
        <span className="text-[0.7rem] font-medium text-muted-foreground whitespace-nowrap">
          {dataPoint.label}
        </span>

        {/* Value display - inline */}
        {dataPoint.formattedValue ?? (
          <span className="text-foreground inline-flex items-baseline gap-1 font-semibold tabular-nums whitespace-nowrap">
            {dataPoint.valueIcon ? (
              <span className="inline-flex items-center text-foreground/60">
                {dataPoint.valueIcon}
              </span>
            ) : null}
            <span className="text-sm leading-none">
              {typeof dataPoint.value === "number"
                ? dataPoint.value.toLocaleString(undefined, {
                    minimumFractionDigits: Number.isInteger(dataPoint.value)
                      ? 0
                      : 1,
                    maximumFractionDigits: 1,
                  })
                : dataPoint.value}
            </span>
            {dataPoint.unit && (
              <span className="text-[0.65rem] font-medium leading-none text-muted-foreground">
                {dataPoint.unit}
              </span>
            )}
          </span>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Hook for handling mobile touch interactions on a chart
 * Returns handlers and the current touch state
 */
export function useMobileChartTouch({
  chartId,
  containerRef,
  dataLength,
  getIndexFromX,
  getHourFromIndex,
  isOnBar,
  onPan,
  onPanEnd,
  onInspect,
  onInspectEnd,
  enableHoverInspect = false,
  enabled = true,
}: {
  chartId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  dataLength: number;
  /** Convert chart X coordinate to data index */
  getIndexFromX: (chartX: number) => number;
  /** Convert data index to hour value (for cross-chart syncing) */
  getHourFromIndex?: (index: number) => number;
  /** Check if the touch coordinates are on a bar (for deciding inspect vs pan) */
  isOnBar?: (chartX: number, chartY: number) => boolean;
  onPan?: (deltaX: number) => void;
  onPanEnd?: () => void;
  /** Called when inspection starts or moves to a new index */
  onInspect?: (index: number, hour: number) => void;
  /** Called when inspection ends */
  onInspectEnd?: () => void;
  /** On hover devices, also call onInspect/onInspectEnd (does not affect touch behavior). */
  enableHoverInspect?: boolean;
  enabled?: boolean;
}) {
  const { activate, deactivate, updatePosition } = useMobileTooltip();
  const interactionLockReleaseRef = React.useRef<null | (() => void)>(null);

  const stateRef = React.useRef<
    "IDLE" | "PENDING" | "INSPECTING" | "PANNING" | "SCROLLING"
  >("IDLE");
  const startRef = React.useRef({ x: 0, y: 0 });
  const lastRef = React.useRef({ x: 0, y: 0 });
  const lastIndexRef = React.useRef<number | null>(null);
  const canInspectRef = React.useRef(false);
  const longPressTimeoutRef = React.useRef<number | null>(null);
  const hoverActiveRef = React.useRef(false);
  const hoverLastIndexRef = React.useRef<number | null>(null);
  const hoverMoveRafRef = React.useRef<number | null>(null);
  const hoverPendingRef = React.useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const DRAG_THRESHOLD = 14;
  const LONG_PRESS_MS = 320;
  const LONG_PRESS_SLOP_PX = 10;
  const DATA_STEP_HOURS = 3;

  const ensureInteractionLock = React.useCallback(() => {
    if (interactionLockReleaseRef.current) return;
    interactionLockReleaseRef.current = acquireInteractionLock();
  }, []);

  const releaseInteractionLock = React.useCallback(() => {
    interactionLockReleaseRef.current?.();
    interactionLockReleaseRef.current = null;
  }, []);

  // Default: assume 3-hour intervals like surf/wind/swell/waveenergy charts
  const defaultGetHourFromIndex = React.useCallback(
    (index: number) => index * DATA_STEP_HOURS,
    [],
  );
  const getHour = getHourFromIndex ?? defaultGetHourFromIndex;

  const setTouchAction = React.useCallback(
    (value: "none" | "pan-y") => {
      const el = containerRef.current;
      if (!el) return;
      el.style.touchAction = value;
    },
    [containerRef],
  );

  const getChartX = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const layoutWidth = containerRef.current.offsetWidth;
      const scaleX =
        rect.width > 0 && layoutWidth > 0 ? layoutWidth / rect.width : 1;
      return (clientX - rect.left) * scaleX;
    },
    [containerRef],
  );

  const getChartY = React.useCallback(
    (clientY: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const layoutHeight = containerRef.current.offsetHeight;
      const scaleY =
        rect.height > 0 && layoutHeight > 0 ? layoutHeight / rect.height : 1;
      return (clientY - rect.top) * scaleY;
    },
    [containerRef],
  );

  const handlePointerDown = React.useCallback(
    (ev: React.PointerEvent) => {
      if (!enabled) return;

      // Mouse users just pan
      if (ev.pointerType === "mouse") {
        stateRef.current = "PANNING";
        containerRef.current?.setPointerCapture(ev.pointerId);
        startRef.current = { x: ev.clientX, y: ev.clientY };
        lastRef.current = { x: ev.clientX, y: ev.clientY };
        return;
      }

      startRef.current = { x: ev.clientX, y: ev.clientY };
      lastRef.current = { x: ev.clientX, y: ev.clientY };
      // Long-press to inspect should work anywhere within the chart container
      // so users don't need to aim precisely at a bar/line.
      canInspectRef.current = true;

      if (longPressTimeoutRef.current != null) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // Touch: start pending. A long-press activates tooltip inspection; a
      // horizontal drag pans; a vertical drag scrolls the page.
      stateRef.current = "PENDING";
      if (canInspectRef.current) {
        longPressTimeoutRef.current = window.setTimeout(() => {
          longPressTimeoutRef.current = null;
          if (stateRef.current !== "PENDING") return;

          const rect = containerRef.current?.getBoundingClientRect() ?? null;
          if (!rect) return;

          const clientX = lastRef.current.x;
          const clientY = lastRef.current.y;
          const nextChartX = getChartX(clientX);
          const index = Math.max(
            0,
            Math.min(dataLength - 1, getIndexFromX(nextChartX)),
          );
          lastIndexRef.current = index;

          stateRef.current = "INSPECTING";
          ensureInteractionLock();
          setTouchAction("none");
          try {
            containerRef.current?.setPointerCapture(ev.pointerId);
          } catch {
            // ignore capture failures
          }

          const hour = getHour(index);
          activate(chartId, index, hour, clientX, clientY, rect);
          onInspect?.(index, hour);
        }, LONG_PRESS_MS);
      }
    },
    [
      enabled,
      containerRef,
      chartId,
      dataLength,
      getIndexFromX,
      getHour,
      getChartX,
      activate,
      onInspect,
      setTouchAction,
    ],
  );

  const handlePointerMove = React.useCallback(
    (ev: React.PointerEvent) => {
      if (!enabled) return;

      const clientX = ev.clientX;
      const clientY = ev.clientY;
      const dx = clientX - lastRef.current.x;

      lastRef.current = { x: clientX, y: clientY };

      if (stateRef.current === "SCROLLING") {
        return;
      }

      if (stateRef.current === "PANNING") {
        setTouchAction("none");
        if (ev.cancelable) ev.preventDefault();
        onPan?.(dx);
        return;
      }

      if (stateRef.current === "PENDING") {
        const totalDx = clientX - startRef.current.x;
        const totalDy = clientY - startRef.current.y;
        const absDx = Math.abs(totalDx);
        const absDy = Math.abs(totalDy);

        if (
          longPressTimeoutRef.current != null &&
          Math.hypot(absDx, absDy) > LONG_PRESS_SLOP_PX
        ) {
          window.clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }

          if (Math.hypot(absDx, absDy) > DRAG_THRESHOLD) {
            if (absDy > DRAG_THRESHOLD && absDy > absDx * 2) {
              stateRef.current = "SCROLLING";
              setTouchAction("pan-y");
              releaseInteractionLock();
              return;
            }

            stateRef.current = "PANNING";
            ensureInteractionLock();
            setTouchAction("none");
            try {
              containerRef.current?.setPointerCapture(ev.pointerId);
            } catch {
            // ignore capture failures
          }
          if (ev.cancelable) ev.preventDefault();
          onPan?.(totalDx);
        }
        return;
      }

      if (stateRef.current === "INSPECTING") {
        // Horizontal or diagonal movement - continue scrubbing through data
        // Prevent default to stop page interactions while scrubbing
        ensureInteractionLock();
        setTouchAction("none");
        if (ev.cancelable) ev.preventDefault();

        const chartX = getChartX(clientX);
        const index = Math.max(
          0,
          Math.min(dataLength - 1, getIndexFromX(chartX)),
        );

        // Update tooltip position even if index hasn't changed (for smooth cursor feel)
        if (index !== lastIndexRef.current) {
          lastIndexRef.current = index;
          const hour = getHour(index);
          updatePosition(index, hour, clientX, clientY);
          // Notify for cross-chart syncing
          onInspect?.(index, hour);
        }
      }
    },
    [
      enabled,
      containerRef,
      dataLength,
      getIndexFromX,
      getHour,
      getChartX,
      deactivate,
      updatePosition,
      onPan,
      onInspect,
      onInspectEnd,
      setTouchAction,
    ],
  );

  const handlePointerUp = React.useCallback(
    (ev: React.PointerEvent) => {
      if (longPressTimeoutRef.current != null) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      try {
        containerRef.current?.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }

      setTouchAction("pan-y");
      releaseInteractionLock();
      if (stateRef.current === "INSPECTING") {
        deactivate();
        lastIndexRef.current = null;
        onInspectEnd?.();
      } else if (stateRef.current === "PANNING") {
        onPanEnd?.();
      }

      stateRef.current = "IDLE";
    },
    [containerRef, deactivate, onPanEnd, onInspectEnd, setTouchAction],
  );

  const handlePointerCancel = React.useCallback(
    (ev: React.PointerEvent) => {
      if (longPressTimeoutRef.current != null) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      try {
        containerRef.current?.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }

      setTouchAction("pan-y");
      releaseInteractionLock();
      if (stateRef.current === "INSPECTING") {
        deactivate();
        lastIndexRef.current = null;
        onInspectEnd?.();
      }
      if (stateRef.current === "PANNING") {
        onPanEnd?.();
      }

      stateRef.current = "IDLE";
    },
    [containerRef, deactivate, onPanEnd, onInspectEnd, setTouchAction],
  );

  React.useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current != null) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      releaseInteractionLock();
    };
  }, [releaseInteractionLock]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(hover: hover) and (pointer: fine)")
        : null;
    if (!mq?.matches) return;

    const headerHost = el
      .closest?.("[data-ww-overview-card]")
      ?.querySelector?.("[data-ww-mobile-tooltip-host]");
    if (!headerHost) return;

    const clampIndex = (index: number) =>
      Math.max(0, Math.min(dataLength - 1, index));

    const shouldCallHoverInspect = Boolean(enableHoverInspect);

    const isPointerInsidePlotArea = (clientX: number, clientY: number) => {
      const surfaces = el.querySelectorAll<SVGElement>(".recharts-surface");
      const surfaceEl = surfaces.length ? surfaces[surfaces.length - 1] : null;
      if (!surfaceEl) return true;

      const surfaceRect = surfaceEl.getBoundingClientRect();
      if (!(surfaceRect.width > 4) || !(surfaceRect.height > 4)) return true;

      const svg = surfaceEl as unknown as SVGSVGElement | null;
      const viewBoxWidth = svg?.viewBox?.baseVal?.width ?? surfaceRect.width;
      const viewBoxHeight = svg?.viewBox?.baseVal?.height ?? surfaceRect.height;
      if (!(viewBoxWidth > 0) || !(viewBoxHeight > 0)) return true;

      const clipRect = getLargestClipRect(surfaceEl, {
        width: viewBoxWidth,
        height: viewBoxHeight,
      });
      if (!clipRect) return true;

      const svgX =
        ((clientX - surfaceRect.left) / surfaceRect.width) * viewBoxWidth;
      const svgY =
        ((clientY - surfaceRect.top) / surfaceRect.height) * viewBoxHeight;

      return (
        svgX >= clipRect.x &&
        svgX <= clipRect.x + clipRect.width &&
        svgY >= clipRect.y &&
        svgY <= clipRect.y + clipRect.height
      );
    };

    const flushHoverMove = () => {
      hoverMoveRafRef.current = null;
      const pending = hoverPendingRef.current;
      hoverPendingRef.current = null;
      if (!pending) return;

      if (stateRef.current !== "IDLE") return;

      if (!isPointerInsidePlotArea(pending.clientX, pending.clientY)) {
        if (hoverActiveRef.current) {
          hoverActiveRef.current = false;
          hoverLastIndexRef.current = null;
          deactivate();
          if (shouldCallHoverInspect || enabled) onInspectEnd?.();
        }
        return;
      }

      const rect = el.getBoundingClientRect();
      if (!(rect.width > 4) || !(rect.height > 4)) return;
      const layoutWidth = el.offsetWidth;
      const scaleX =
        rect.width > 0 && layoutWidth > 0 ? layoutWidth / rect.width : 1;

      const chartX = (pending.clientX - rect.left) * scaleX;
      const index = clampIndex(getIndexFromX(chartX));
      const hour = getHour(index);

      if (!hoverActiveRef.current) {
        hoverActiveRef.current = true;
        hoverLastIndexRef.current = index;
        activate(chartId, index, hour, pending.clientX, pending.clientY, rect);
        if (shouldCallHoverInspect || enabled) onInspect?.(index, hour);
        return;
      }

      updatePosition(index, hour, pending.clientX, pending.clientY);

      if (index !== hoverLastIndexRef.current) {
        hoverLastIndexRef.current = index;
        if (shouldCallHoverInspect || enabled) onInspect?.(index, hour);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (stateRef.current !== "IDLE") return;
      if (
        ev.pointerType &&
        ev.pointerType !== "mouse" &&
        ev.pointerType !== "pen"
      )
        return;
      if (typeof document !== "undefined") {
        if (document.body.dataset.wwInteractionLock === "1") {
          endHover();
          return;
        }
      }
      if (typeof ev.buttons === "number" && ev.buttons !== 0) {
        endHover();
        return;
      }

      hoverPendingRef.current = { clientX: ev.clientX, clientY: ev.clientY };
      if (hoverMoveRafRef.current == null) {
        hoverMoveRafRef.current = window.requestAnimationFrame(flushHoverMove);
      }
    };

    const endHover = () => {
      if (hoverMoveRafRef.current != null) {
        window.cancelAnimationFrame(hoverMoveRafRef.current);
        hoverMoveRafRef.current = null;
      }
      hoverPendingRef.current = null;
      if (!hoverActiveRef.current) return;
      hoverActiveRef.current = false;
      hoverLastIndexRef.current = null;
      deactivate();
      if (shouldCallHoverInspect || enabled) onInspectEnd?.();
    };

    const onPointerLeave = (ev: PointerEvent) => {
      if (
        ev.pointerType &&
        ev.pointerType !== "mouse" &&
        ev.pointerType !== "pen"
      )
        return;
      endHover();
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (
        ev.pointerType &&
        ev.pointerType !== "mouse" &&
        ev.pointerType !== "pen"
      )
        return;
      if (typeof document !== "undefined") {
        if (document.body.dataset.wwInteractionLock === "1") {
          endHover();
          return;
        }
      }
      endHover();
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (
        ev.pointerType &&
        ev.pointerType !== "mouse" &&
        ev.pointerType !== "pen"
      )
        return;
      endHover();
    };

    const onWindowBlur = () => endHover();

    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerleave", onPointerLeave, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("blur", onWindowBlur);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [
    activate,
    chartId,
    containerRef,
    dataLength,
    deactivate,
    enableHoverInspect,
    getHour,
    getIndexFromX,
    onInspect,
    onInspectEnd,
    updatePosition,
  ]);

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    styles: {
      // Allow native vertical scrolling; only preventDefault/capture once the
      // user commits to a horizontal pan or long-press inspection.
      touchAction: "pan-y",
      userSelect: "none",
      WebkitUserSelect: "none",
    } as React.CSSProperties,
    isInspecting: stateRef.current === "INSPECTING",
  };
}

/**
 * Synchronized tooltip cursor overlay
 * Renders the highlight bar on charts that aren't being directly touched
 */
export function MobileTooltipSyncCursor({
  chartId,
  containerRef,
  getXFromIndex,
  barWidth = 20,
}: {
  chartId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  /** Get X position for a data index */
  getXFromIndex: (index: number) => number;
  barWidth?: number;
}) {
  const state = useMobileTooltipState();

  // Show sync cursor when another chart is active
  const showCursor =
    state.active && state.chartId !== chartId && state.dataIndex !== null;

  if (!showCursor || !containerRef.current) {
    return null;
  }

  const x = getXFromIndex(state.dataIndex!);

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0"
      style={{
        left: x - barWidth / 2,
        width: barWidth,
        backgroundColor: "var(--foreground)",
        opacity: 0.08,
      }}
    />
  );
}
