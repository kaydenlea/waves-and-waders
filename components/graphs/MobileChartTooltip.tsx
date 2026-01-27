"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

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
      document.body.classList.remove("ww-mobile-tooltip-active");
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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Check if any tooltip is active
  const isAnyActive = state.active && state.syncHour !== null;
  // Check if this is the chart being directly touched
  const isThisChartActive = state.chartId === chartId;

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

  if (!mounted || (!isAnyActive && !isPresent)) {
    return null;
  }

  // Need anchorRef for positioning
  if (!anchorRef?.current) {
    return null;
  }

  // Get the data point to display
  let dataPoint: MobileTooltipDataPoint | null = null;

  if (isThisChartActive && state.dataIndex !== null) {
    // This chart is being touched - use exact index
    dataPoint = getDataPoint(state.dataIndex);
  } else if (getDataPointForHour) {
    // This chart is synced - use syncHour to find data
    dataPoint = getDataPointForHour(state.syncHour!);
  }

  if (isAnyActive && dataPoint) {
    lastDataPointRef.current = dataPoint;
  }

  if (!dataPoint) {
    dataPoint = lastDataPointRef.current;
  }

  if (!dataPoint) {
    return null;
  }

  const labelToValueGapClass =
    dataPoint.labelSpacing === "spacious" ? "mt-2" : "mt-0.5";

  const anchorEl = anchorRef.current;
  const headerPortalEl = (anchorEl
    .closest?.("[data-ww-overview-card]")
    ?.querySelector?.("[data-ww-mobile-tooltip-host]") ??
    null) as HTMLElement | null;

  const visibilityClassName = isAnyActive
    ? "opacity-100 translate-y-0"
    : "opacity-0 -translate-y-1 delay-75";

  if (headerPortalEl) {
    const headerRect = headerPortalEl.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
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
      if (state.syncHour != null && getXPositionForHour) {
        const chartX = getXPositionForHour(state.syncHour);
        if (typeof chartX === "number" && Number.isFinite(chartX)) {
          return baseRect.left + chartX;
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

    const hostWidth = headerRect.width;
    const hostHeight = headerRect.height;
    const horizontalPadding = 16;
    const topPadding = 0;
    const bottomPadding = 0;
    const contentLeft = horizontalPadding;
    const contentWidth = Math.max(0, hostWidth - horizontalPadding * 2);
    const contentTop = topPadding;
    const contentHeight = Math.max(0, hostHeight - topPadding - bottomPadding);

    const maxTooltipWidth = Math.max(0, hostWidth - horizontalPadding * 2);
    const fallbackTooltipWidth = Math.min(
      280,
      Math.max(80, Math.min(Math.round(hostWidth * 0.66), maxTooltipWidth)),
    );
    const tooltipWidth = Math.min(
      300,
      Math.max(
        80,
        Math.min(
          measuredTooltipSize?.width ?? fallbackTooltipWidth,
          maxTooltipWidth,
        ),
      ),
    );
    const halfTooltipWidth = tooltipWidth / 2;

    const isForecastChart = topOffset > 20;
    const minTop = contentTop + (isForecastChart ? 0 : 6);
    const bottomClampPadding = isForecastChart ? 4 : 8;
    const tooltipHeight = Math.max(1, measuredTooltipSize?.height ?? 64);
    const maxTop = Math.max(
      minTop,
      contentTop + contentHeight - bottomClampPadding - tooltipHeight,
    );
    const desiredTopActive = contentTop + (isForecastChart ? 0 : 8);
    const desiredTopInactive = contentTop + (contentHeight - tooltipHeight) / 2;
    const clampedTopInHost = clamp(
      isAnyActive ? desiredTopActive : desiredTopInactive,
      minTop,
      maxTop,
    );

    const desiredCenterXInHost =
      stableCenterClientX != null
        ? stableCenterClientX - headerRect.left
        : null;

    const clampedCenterXInHost = isAnyActive
      ? desiredCenterXInHost != null && Number.isFinite(desiredCenterXInHost)
        ? clamp(
            desiredCenterXInHost,
            contentLeft + halfTooltipWidth,
            contentLeft + contentWidth - halfTooltipWidth,
          )
        : contentLeft + contentWidth / 2
      : contentLeft + contentWidth / 2;

    const cursorX =
      renderCursor && getXPositionForHour && state.syncHour != null
        ? getXPositionForHour(state.syncHour)
        : null;

    const cursorWidth =
      renderCursor &&
      cursorX != null &&
      getXPositionForHour &&
      state.syncHour != null
        ? (() => {
            const step = 3;
            const next = getXPositionForHour(state.syncHour + step);
            const prev = getXPositionForHour(state.syncHour - step);
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
                isAnyActive ? "opacity-100" : "opacity-0",
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
                const topInset = clipRect ? 0 : (cursorInsets?.top ?? 0);
                const bottomInset = clipRect ? 0 : (cursorInsets?.bottom ?? 0);

                const plotY = clipRect?.y ?? topInset;
                const plotHeight =
                  clipRect?.height ??
                  Math.max(0, svgHeight - topInset - bottomInset);
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
          "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
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
                <div className={cn(labelToValueGapClass, "flex w-full min-w-0 justify-center")}>
                  <div className="min-w-0">
                    {dataPoint.formattedValue ?? (
                      <span className="text-foreground inline-flex items-baseline justify-center gap-1 font-semibold tabular-nums whitespace-nowrap">
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
              "transition-[left,top] duration-150 ease-out motion-reduce:transition-none",
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
              <div className={cn(labelToValueGapClass, "flex w-full min-w-0 justify-center")}>
                <div className="min-w-0">
                  {dataPoint.formattedValue ?? (
                    <span className="text-foreground inline-flex items-baseline justify-center gap-1 font-semibold tabular-nums whitespace-nowrap">
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
  enabled?: boolean;
}) {
  const { activate, deactivate, updatePosition } = useMobileTooltip();

  const stateRef = React.useRef<
    "IDLE" | "INSPECTING" | "PANNING" | "SCROLLING"
  >("IDLE");
  const startRef = React.useRef({ x: 0, y: 0 });
  const lastRef = React.useRef({ x: 0, y: 0 });
  const lastIndexRef = React.useRef<number | null>(null);

  const DRAG_THRESHOLD = 14;
  const DATA_STEP_HOURS = 3;

  // Default: assume 3-hour intervals like surf/wind/swell/waveenergy charts
  const defaultGetHourFromIndex = React.useCallback(
    (index: number) => index * DATA_STEP_HOURS,
    [],
  );
  const getHour = getHourFromIndex ?? defaultGetHourFromIndex;

  const getChartX = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      return clientX - rect.left;
    },
    [containerRef],
  );

  const getChartY = React.useCallback(
    (clientY: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      return clientY - rect.top;
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

      const chartX = getChartX(ev.clientX);
      const chartY = getChartY(ev.clientY);

      // Check if touch started on a bar - if so, inspect; otherwise, pan
      const touchedBar = isOnBar ? isOnBar(chartX, chartY) : true;

      startRef.current = { x: ev.clientX, y: ev.clientY };
      lastRef.current = { x: ev.clientX, y: ev.clientY };

      if (touchedBar) {
        // Touch started on a bar - enter inspection mode
        stateRef.current = "INSPECTING";

        const index = Math.max(
          0,
          Math.min(dataLength - 1, getIndexFromX(chartX)),
        );
        lastIndexRef.current = index;

        const rect = containerRef.current?.getBoundingClientRect() ?? null;
        if (rect) {
          const hour = getHour(index);
          activate(chartId, index, hour, ev.clientX, ev.clientY, rect);
          // Notify for cross-chart syncing
          onInspect?.(index, hour);
        }
      } else {
        // Touch started off a bar - enter pan mode
        stateRef.current = "PANNING";
      }

      containerRef.current?.setPointerCapture(ev.pointerId);
    },
    [
      enabled,
      containerRef,
      chartId,
      dataLength,
      getIndexFromX,
      getHour,
      isOnBar,
      getChartX,
      getChartY,
      activate,
      onInspect,
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
        if (ev.cancelable) ev.preventDefault();
        onPan?.(dx);
        return;
      }

      if (stateRef.current === "INSPECTING") {
        const totalDx = clientX - startRef.current.x;
        const totalDy = clientY - startRef.current.y;
        const absDx = Math.abs(totalDx);
        const absDy = Math.abs(totalDy);

        // Check if this is a vertical scroll gesture (scrolling the page)
        // Only allow vertical scrolling if moving mostly vertically early on
        if (absDy > DRAG_THRESHOLD && absDy > absDx * 2) {
          // User is scrolling vertically - allow page scroll
          deactivate();
          lastIndexRef.current = null;
          onInspectEnd?.();
          stateRef.current = "SCROLLING";
          containerRef.current?.releasePointerCapture(ev.pointerId);
          return;
        }

        // Horizontal or diagonal movement - continue scrubbing through data
        // Prevent default to stop page interactions while scrubbing
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
    ],
  );

  const handlePointerUp = React.useCallback(
    (ev: React.PointerEvent) => {
      containerRef.current?.releasePointerCapture(ev.pointerId);

      if (stateRef.current === "INSPECTING") {
        deactivate();
        lastIndexRef.current = null;
        onInspectEnd?.();
      } else if (stateRef.current === "PANNING") {
        onPanEnd?.();
      }

      stateRef.current = "IDLE";
    },
    [containerRef, deactivate, onPanEnd, onInspectEnd],
  );

  const handlePointerCancel = React.useCallback(
    (ev: React.PointerEvent) => {
      containerRef.current?.releasePointerCapture(ev.pointerId);

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
    [containerRef, deactivate, onPanEnd, onInspectEnd],
  );

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    styles: {
      // Use 'none' to take full control of touch - we handle vertical scrolling
      // by releasing pointer capture when a vertical gesture is detected
      touchAction: "none",
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
