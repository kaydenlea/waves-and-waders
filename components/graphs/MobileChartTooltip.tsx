"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Data point that can be displayed in the mobile tooltip
 */
export interface MobileTooltipDataPoint {
  hour: number;
  label: string;  // e.g., "9 AM"
  value: number;
  unit: string;   // e.g., "ft", "mph"
  formattedValue?: React.ReactNode;  // Custom formatted value display
  color?: string;
  icon?: React.ReactNode;
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
  activate: (chartId: string, dataIndex: number, hour: number, clientX: number, clientY: number, chartRect: DOMRect) => void;
  /** Deactivate tooltip */
  deactivate: () => void;
  /** Update position while active */
  updatePosition: (dataIndex: number, hour: number, clientX: number, clientY: number) => void;
}

const MobileTooltipContext = React.createContext<MobileTooltipContextValue | null>(null);

/**
 * Provider that manages mobile tooltip state across all charts
 */
export function MobileTooltipProvider({ children }: { children: React.ReactNode }) {
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
    listenersRef.current.forEach(cb => cb());
  }, []);
  
  const subscribe = React.useCallback((callback: () => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);
  
  const DATA_STEP_HOURS = 3;
  
  const activate = React.useCallback((
    chartId: string,
    dataIndex: number,
    hour: number,
    clientX: number,
    clientY: number,
    chartRect: DOMRect
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
    notifyChange();
  }, [notifyChange]);
  
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
    notifyChange();
  }, [notifyChange]);
  
  const updatePosition = React.useCallback((
    dataIndex: number,
    hour: number,
    clientX: number,
    clientY: number
  ) => {
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
  }, [notifyChange]);
  
  const value = React.useMemo(() => ({
    stateRef,
    notifyChange,
    subscribe,
    activate,
    deactivate,
    updatePosition,
  }), [notifyChange, subscribe, activate, deactivate, updatePosition]);
  
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
    throw new Error("useMobileTooltip must be used within MobileTooltipProvider");
  }
  return ctx;
}

/**
 * Hook that subscribes to tooltip state changes and triggers re-renders
 */
export function useMobileTooltipState() {
  const { stateRef, subscribe } = useMobileTooltip();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
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
}

/**
 * Renders a mobile-optimized tooltip for chart data
 * Uses a portal to render outside the chart DOM
 * Shows on ALL charts when any chart is being touched (synced tooltips)
 * Positioned at top-center of chart, in header area between title and unit
 */
export function MobileChartTooltip({ 
  chartId, 
  getDataPoint, 
  getDataPointForHour,
  anchorRef,
  getXPositionForHour,
}: MobileChartTooltipProps) {
  const state = useMobileTooltipState();
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Check if any tooltip is active
  const isAnyActive = state.active && state.syncHour !== null;
  // Check if this is the chart being directly touched
  const isThisChartActive = state.chartId === chartId;
  
  if (!mounted || !isAnyActive) {
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
  
  if (!dataPoint) {
    return null;
  }
  
  // Position tooltip at top-center of chart container (in header area)
  const rect = anchorRef.current.getBoundingClientRect();
  const tooltipX = rect.left + rect.width / 2;
  // Position just above the chart container, in the header row
  const tooltipY = rect.top - 4;
  
  return createPortal(
    <div
      className="pointer-events-none fixed z-20"
      style={{
        left: tooltipX,
        top: tooltipY,
        transform: "translate(-50%, -100%)", // Center horizontally, position above
      }}
    >
      {/* Compact horizontal tooltip - fits in header area */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg",
          "border border-border/50 bg-background/95 px-2.5 py-1.5",
          "shadow-md backdrop-blur-sm",
          "animate-in fade-in-0 zoom-in-95 duration-100"
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
                    minimumFractionDigits: Number.isInteger(dataPoint.value) ? 0 : 1,
                    maximumFractionDigits: 1 
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
    document.body
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
  
  const stateRef = React.useRef<"IDLE" | "INSPECTING" | "PANNING" | "SCROLLING">("IDLE");
  const startRef = React.useRef({ x: 0, y: 0 });
  const lastRef = React.useRef({ x: 0, y: 0 });
  const lastIndexRef = React.useRef<number | null>(null);
  
  const DRAG_THRESHOLD = 14;
  const DATA_STEP_HOURS = 3;
  
  // Default: assume 3-hour intervals like surf/wind/swell/waveenergy charts
  const defaultGetHourFromIndex = React.useCallback((index: number) => index * DATA_STEP_HOURS, []);
  const getHour = getHourFromIndex ?? defaultGetHourFromIndex;
  
  const getChartX = React.useCallback((clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientX - rect.left;
  }, [containerRef]);

  const getChartY = React.useCallback((clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientY - rect.top;
  }, [containerRef]);
  
  const handlePointerDown = React.useCallback((ev: React.PointerEvent) => {
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
      
      const index = Math.max(0, Math.min(dataLength - 1, getIndexFromX(chartX)));
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
  }, [enabled, containerRef, chartId, dataLength, getIndexFromX, getHour, isOnBar, getChartX, getChartY, activate, onInspect]);
  
  const handlePointerMove = React.useCallback((ev: React.PointerEvent) => {
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
      const index = Math.max(0, Math.min(dataLength - 1, getIndexFromX(chartX)));
      
      // Update tooltip position even if index hasn't changed (for smooth cursor feel)
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        const hour = getHour(index);
        updatePosition(index, hour, clientX, clientY);
        // Notify for cross-chart syncing
        onInspect?.(index, hour);
      }
    }
  }, [enabled, containerRef, dataLength, getIndexFromX, getHour, getChartX, deactivate, updatePosition, onPan, onInspect, onInspectEnd]);
  
  const handlePointerUp = React.useCallback((ev: React.PointerEvent) => {
    containerRef.current?.releasePointerCapture(ev.pointerId);
    
    if (stateRef.current === "INSPECTING") {
      deactivate();
      lastIndexRef.current = null;
      onInspectEnd?.();
    } else if (stateRef.current === "PANNING") {
      onPanEnd?.();
    }
    
    stateRef.current = "IDLE";
  }, [containerRef, deactivate, onPanEnd, onInspectEnd]);
  
  const handlePointerCancel = React.useCallback((ev: React.PointerEvent) => {
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
  }, [containerRef, deactivate, onPanEnd, onInspectEnd]);
  
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
  const showCursor = state.active && state.chartId !== chartId && state.dataIndex !== null;
  
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
