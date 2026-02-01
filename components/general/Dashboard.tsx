"use client";

import React, { useMemo, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import Link from "next/link";
import { useSessionContext } from "@supabase/auth-helpers-react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  DragStartEvent,
  type CollisionDetection,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  pointerWithin,
  TouchSensor,
  AutoScrollActivator,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  rid,
  type DashboardType,
  type Row,
  type WidgetId,
  type WidgetMeta,
  normalizeRowsForSingleColumn,
  packRowsForTwoColumn,
} from "./dashboardLayout";
import {
  DashboardWidgetMiniature,
  DashboardWidgetHeaderMiniature,
} from "./dashboardMiniatures";

import { Check, X, RotateCcw, GripVertical } from "lucide-react";

export type DashboardRowLayout = "compact" | "spacious";

/* ------------------------------ Widget Miniatures ---------------------------- */

const StableNode = React.memo(
  function StableNodeImpl({ node }: { node: React.ReactNode }) {
    return <>{node}</>;
  },
  (prev, next) => prev.node === next.node,
);

const DashboardDragOverlay = React.memo(function DashboardDragOverlay({
  id,
  variant,
  renderWidget,
}: {
  id: WidgetId;
  variant: "full" | "half";
  renderWidget: (id: WidgetId, variant: "full" | "half") => React.ReactNode;
}) {
  const node = React.useMemo(
    () => renderWidget(id, variant),
    [id, renderWidget, variant],
  );
  if (!node) return null;

  return (
    <div
      style={{ pointerEvents: "none" }}
      className="relative"
      data-ww-dashboard-edit-card
      data-ww-dashboard-dragging=""
      aria-hidden="true"
    >
      <div className="pointer-events-none select-none">
        <StableNode node={node} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[22px] bg-foreground/10"
      />
      <div
        aria-hidden="true"
        className={cn(
          "touch-none cursor-grabbing rounded-full",
          "grid size-9 place-items-center",
          "border border-border/80 bg-background/85 shadow-lg ring-1 ring-foreground/10",
          "supports-[backdrop-filter]:backdrop-blur-md",
          "text-foreground",
          "absolute left-4 top-4 z-[60]",
        )}
      >
        <GripVertical className="h-5 w-5 text-foreground" />
      </div>
    </div>
  );
});

/* ------------------------------ Drop Target IDs --------------------------- */

const gapId = (index: number) => `gap:${index}` as const; // 0..rows.length
const isGapId = (id: string) => id.startsWith("gap:");
const parseGap = (id: string): number | null => {
  if (!isGapId(id)) return null;
  const n = Number(id.split(":")[1]);
  return Number.isFinite(n) ? n : null;
};

const slotId = (rowId: string, pos: 0 | 1) => `slot:${rowId}:${pos}` as const;
const isSlotId = (id: string) => id.startsWith("slot:");
const parseSlot = (id: string): { rowId: string; pos: 0 | 1 } | null => {
  if (!isSlotId(id)) return null;
  // Row ids can contain ":" (e.g. auto-generated ids), so parse from the end.
  const rest = id.slice("slot:".length);
  const last = rest.lastIndexOf(":");
  if (last === -1) return null;
  const rowId = rest.slice(0, last);
  const pos = Number(rest.slice(last + 1));
  if ((pos !== 0 && pos !== 1) || !rowId) return null;
  return { rowId, pos: pos as 0 | 1 };
};

/* ------------------------------ Draggable Card ---------------------------- */

const DraggableCard = React.memo(function DraggableCard({
  id,
  meta,
  dashboardType,
  dim,
  isFull,
  renderVariant,
  renderWidget,
  onGrabPointerDownCapture,
}: {
  id: WidgetId;
  meta: WidgetMeta | undefined;
  dashboardType: DashboardType;
  dim: boolean;
  isFull: boolean;
  renderVariant?: "full" | "half";
  renderWidget?: (id: WidgetId, variant: "full" | "half") => React.ReactNode;
  onGrabPointerDownCapture?: (id: WidgetId, handleEl: HTMLElement) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    transform,
  } = useDraggable({
    id: `w:${id}`,
  });

  const resolvedVariant = renderVariant ?? (isFull ? "full" : "half");
  const renderedWidgetNode = React.useMemo(() => {
    if (!renderWidget) return null;
    if (!meta) return null;
    return renderWidget(id, resolvedVariant);
  }, [id, meta, renderWidget, resolvedVariant]);

  if (!meta) return null;

  const isShortStats =
    id === "stats" && dashboardType === "overview" && isFull === true;
  const cardHeight = isShortStats ? "h-[13rem]" : "h-[13rem]";

  const usesDragOverlay = Boolean(renderWidget);
  const dragStyle: React.CSSProperties | undefined =
    transform && !(usesDragOverlay && isDragging)
      ? {
          transform: CSS.Translate.toString(transform),
          willChange: "transform",
        }
      : isDragging && !usesDragOverlay
        ? { willChange: "transform" }
        : undefined;

  if (renderWidget) {
    const content = renderedWidgetNode;
    if (!content) return null;

    const opacityClass = dim
      ? "opacity-60"
      : isDragging && usesDragOverlay
        ? "opacity-20 grayscale"
        : isDragging
          ? "opacity-80"
          : "opacity-100";

    return (
      <div
        ref={setNodeRef}
        style={dragStyle}
        className={cn(
          "relative w-full transition-opacity",
          opacityClass,
          isDragging && !usesDragOverlay && "z-50 cursor-grabbing",
        )}
        data-ww-dashboard-edit-card
        data-ww-dashboard-dragging={
          isDragging && !usesDragOverlay ? "" : undefined
        }
        aria-roledescription="card"
      >
        <div className="pointer-events-none select-none">
          <StableNode node={content} />
        </div>
        {dim || isDragging ? (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[22px] z-50",
              dim ? "bg-foreground/10" : "bg-foreground/5",
            )}
          />
        ) : null}
        <button
          type="button"
          aria-label={`Drag ${meta.title}`}
          title="Drag to move"
          onPointerDownCapture={(e) =>
            onGrabPointerDownCapture?.(id, e.currentTarget)
          }
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          className={cn(
            "touch-none cursor-grab rounded-full",
            "grid size-9 place-items-center",
            "border border-border/80 bg-background/85 shadow-lg ring-1 ring-foreground/10",
            "supports-[backdrop-filter]:backdrop-blur-md",
            "hover:bg-background/95 hover:shadow-xl active:cursor-grabbing",
            "absolute left-4 top-4 z-[60]",
          )}
        >
          <GripVertical className="h-5 w-5 text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "relative w-full h-full transition-opacity",
        dim ? "opacity-60" : "opacity-100",
        isDragging && "z-50 cursor-grabbing",
      )}
      data-ww-dashboard-dragging={isDragging ? "" : undefined}
      aria-roledescription="card"
    >
      <article
        className={cn(
          "flex flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5",
          cardHeight,
        )}
      >
        <header className="relative flex items-center gap-2">
          <button
            type="button"
            aria-label={`Drag ${meta.title}`}
            title="Drag to move"
            onPointerDownCapture={(e) =>
              onGrabPointerDownCapture?.(id, e.currentTarget)
            }
            {...attributes}
            {...listeners}
            ref={setActivatorNodeRef}
            className={cn(
              "touch-none cursor-grab rounded-full",
              "grid size-9 place-items-center",
              "border border-border/80 bg-background/85 shadow-lg ring-1 ring-foreground/10",
              "supports-[backdrop-filter]:backdrop-blur-md",
              "hover:bg-background/95 hover:shadow-xl active:cursor-grabbing",
            )}
          >
            <GripVertical className="h-5 w-5 text-foreground" />
          </button>
          <h3 className="text-sm font-semibold min-w-0 flex-1 truncate">
            {meta.title}
          </h3>
          {(id === "table" || id === "stats") && (
            <div className="ml-auto flex items-center gap-2">
              <DashboardWidgetHeaderMiniature widgetId={id} />
            </div>
          )}
        </header>
        <div className="mt-3 flex-1 overflow-hidden text-sm text-gray-700">
          <div className="h-full w-full pointer-events-none select-none">
            <DashboardWidgetMiniature
              dashboardType={dashboardType}
              widgetId={id}
              isFull={isFull}
            />
          </div>
        </div>
      </article>
    </div>
  );
});

/* ------------------------------ Droppable Gaps & Slots -------------------- */

const Gap = React.memo(function Gap({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: gapId(index) });
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const [overlayRect, setOverlayRect] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  React.useLayoutEffect(() => {
    if (!isOver) {
      setOverlayRect(null);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    if (typeof window === "undefined") return;

    const measure = () => {
      const el = localRef.current;
      if (!el) {
        setOverlayRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const next = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      setOverlayRect((prev) => {
        if (
          prev &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.height === next.height
        )
          return prev;
        return next;
      });
      rafRef.current = window.requestAnimationFrame(measure);
    };

    rafRef.current = window.requestAnimationFrame(measure);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isOver]);

  const showOverlay =
    isOver && overlayRect != null && typeof document !== "undefined";
  const showInline = isOver && !showOverlay;

  return (
    <>
      <div
        ref={setRefs}
        className={cn("relative w-full select-none py-4", className)}
      >
        <div
          className={cn(
            "h-2 rounded transition-colors",
            showInline ? "bg-indigo-500/90" : "bg-transparent",
          )}
        />
        {showInline ? (
          <div
            className="pointer-events-none absolute -mt-8 w-full text-center text-xs font-medium text-indigo-400"
            aria-hidden
          >
            Drop to create a new row
          </div>
        ) : null}
      </div>
      {showOverlay
        ? createPortal(
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                left: overlayRect.left,
                top: overlayRect.top,
                width: overlayRect.width,
                height: overlayRect.height,
                pointerEvents: "none",
                zIndex: 1000002,
              }}
            >
              <div
                className={cn("relative w-full select-none py-4", className)}
              >
                <div className="h-2 rounded bg-indigo-500/90" />
                <div className="pointer-events-none absolute -mt-8 w-full text-center text-xs font-medium text-indigo-400">
                  Drop to create a new row
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
});

const Slot = React.memo(function Slot({
  rowId,
  pos,
  highlightEnabled,
  showEmptyOutline,
  children,
  className,
}: {
  rowId: string;
  pos: 0 | 1;
  highlightEnabled: boolean;
  showEmptyOutline?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId(rowId, pos),
    disabled: !highlightEnabled,
  });
  const highlight = highlightEnabled && isOver;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col flex-1 min-w-0 self-stretch",
        highlight && "rounded-[22px] ring-2 ring-indigo-400",
        className,
      )}
    >
      {showEmptyOutline ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[22px] border border-dashed border-border/50"
        />
      ) : null}
      {children}
    </div>
  );
});

/* --------------------------------- Helpers -------------------------------- */

function cloneRows(rows: Row[]): Row[] {
  return rows.map((r) => ({ id: r.id, items: [...r.items] }));
}

function sanitizeRows(
  rows: Row[],
  meta: Partial<Record<WidgetId, WidgetMeta>>,
): Row[] {
  const usedRowIds = new Set<string>();
  const usedWidgets = new Set<WidgetId>();
  const next: Row[] = [];

  for (const row of rows) {
    const items = row.items.filter((id) => {
      if (!meta[id]) return false;
      if (usedWidgets.has(id)) return false;
      usedWidgets.add(id);
      return true;
    });
    if (!items.length) continue;

    let id = row.id || rid();
    if (usedRowIds.has(id)) {
      let suffix = 1;
      while (usedRowIds.has(`${id}:${suffix}`)) suffix++;
      id = `${id}:${suffix}`;
    }
    usedRowIds.add(id);

    next.push({ id, items });
  }

  return next;
}

function finalizeRows(
  prev: Row[],
  next: Row[],
  meta: Partial<Record<WidgetId, WidgetMeta>>,
) {
  const sanitized = sanitizeRows(next, meta);
  return rowsEqual(prev, sanitized) ? prev : sanitized;
}

function rowsEqual(a: Row[], b: Row[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (!ra || !rb) return false;
    if (ra.id !== rb.id) return false;
    if (ra.items.length !== rb.items.length) return false;
    for (let j = 0; j < ra.items.length; j++) {
      if (ra.items[j] !== rb.items[j]) return false;
    }
  }
  return true;
}

/* -------------------------------- Dashboard -------------------------------- */

export default function Dashboard({
  type = "overview",
  meta,
  rows,
  setMeta,
  setRows,
  reset,
  allowAnonymous = false,
  rowLayout = "compact",
  renderWidget,
}: {
  type?: DashboardType;
  meta: Partial<Record<WidgetId, WidgetMeta>>;
  rows: Row[];
  setMeta: (
    next:
      | Partial<Record<WidgetId, WidgetMeta>>
      | ((
          prev: Partial<Record<WidgetId, WidgetMeta>>,
        ) => Partial<Record<WidgetId, WidgetMeta>>),
  ) => void;
  setRows: (next: Row[] | ((prev: Row[]) => Row[])) => void;
  reset: () => void;
  allowAnonymous?: boolean;
  rowLayout?: DashboardRowLayout;
  renderWidget?: (id: WidgetId, variant: "full" | "half") => React.ReactNode;
}) {
  const { session } = useSessionContext();
  const [activeWidget, setActiveWidget] = useState<WidgetId | null>(null);
  const [grabbedWidget, setGrabbedWidget] = useState<WidgetId | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const twoColumnSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [isTwoColumn, setIsTwoColumn] = React.useState(true);
  const lastBreakpointTwoColumnRef = React.useRef<boolean | null>(null);
  const grabHandleRef = React.useRef<{
    id: WidgetId;
    node: HTMLElement;
    rect: DOMRect;
    didScroll: boolean;
  } | null>(null);

  // If the user presses a drag handle but doesn't actually start dragging
  // (e.g. pointer up without movement), clear the "grabbed" state to avoid
  // leaving the 2-up layout in its drag-preview mode.
  React.useEffect(() => {
    if (!grabbedWidget) return;
    if (activeWidget) return;
    if (typeof window === "undefined") return;

    const clear = () => {
      setGrabbedWidget(null);
      grabHandleRef.current = null;
    };
    window.addEventListener("pointerup", clear, { passive: true });
    window.addEventListener("pointercancel", clear, { passive: true });
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, [activeWidget, grabbedWidget]);

  // In 2-up layouts we preview all widgets as half-width on grab. That can cause
  // a one-time layout shift before the drag actually starts; keep the grab handle
  // under the pointer by scrolling by the same delta.

  const safeRows = useMemo(() => sanitizeRows(rows, meta), [meta, rows]);

  React.useLayoutEffect(() => {
    if (activeWidget) return;
    if (rowsEqual(rows, safeRows)) return;
    setRows(safeRows);
  }, [activeWidget, rows, safeRows, setRows]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (!activeWidget) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [activeWidget]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
  );

  const visibleRows = useMemo(
    () => safeRows.filter((r) => r.items.some((id) => meta[id]?.visible)),
    [safeRows, meta],
  );
  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (!twoColumnSentinelRef.current) return;
    if (typeof ResizeObserver === "undefined") return;
    const el = containerRef.current;
    const sentinel = twoColumnSentinelRef.current;

    const update = () => {
      // Use the same container-query breakpoint as the row layout so the drop rules match what the user sees.
      const dir = window.getComputedStyle(sentinel).flexDirection;
      const next = dir === "row";
      setIsTwoColumn((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    if (activeWidget) return;
    // Only normalize/pack when the breakpoint actually changes.
    // Continuously repacking during 2-up editing can cause unexpected row moves.
    const last = lastBreakpointTwoColumnRef.current;
    if (last === null) {
      lastBreakpointTwoColumnRef.current = isTwoColumn;
      return;
    }
    if (last === isTwoColumn) return;
    lastBreakpointTwoColumnRef.current = isTwoColumn;

    setRows((prev) => {
      const next = isTwoColumn
        ? packRowsForTwoColumn(prev, meta)
        : normalizeRowsForSingleColumn(prev);
      return finalizeRows(prev, next, meta);
    });
  }, [activeWidget, isTwoColumn, meta, setRows]);
  if (!session && !allowAnonymous) {
    return (
      <div className="mt-3 overflow-hidden @container">
        <div className="mx-1 my-2 rounded-2xl border border-border/40 bg-highlight-4 p-6 shadow-sm">
          <h3 className="text-base font-semibold">Sign in required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Editing dashboard layouts is only available to authenticated users.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-highlight-7/70 px-4 py-2 text-sm font-medium shadow-even hover:bg-highlight-6/60"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------- DnD Handlers ---------------------------- */
  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("w:")) {
      setActiveWidget(id.slice(2) as WidgetId);
      setGrabbedWidget(null);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const over = e.over?.id ? String(e.over.id) : null;
    const active = activeWidget;

    if (!active || !over) {
      flushSync(() => setActiveWidget(null));
      setGrabbedWidget(null);
      return;
    }

    // In 1-column layouts, treat every widget as its own row and only allow
    // reordering via gaps (no slot drops).
    if (!isTwoColumn) {
      if (!isGapId(over)) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }
      const gapIndex = parseGap(over);
      if (gapIndex === null) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }
      flushSync(() => {
        setRows((prev) => {
          const srcRowIndex = prev.findIndex((r) => r.items.includes(active));
          if (srcRowIndex === -1) return prev;
          const next = cloneRows(prev);
          const [movedRow] = next.splice(srcRowIndex, 1);
          const insertIndex = gapIndex > srcRowIndex ? gapIndex - 1 : gapIndex;
          next.splice(
            Math.max(0, Math.min(insertIndex, next.length)),
            0,
            movedRow,
          );
          return finalizeRows(prev, next, meta);
        });
        setActiveWidget(null);
        setGrabbedWidget(null);
      });
      return;
    }

    const span = meta[active]?.span;
    const allowSlotDropAsHalf =
      span === "full" && isSlotId(over) && !meta[active]?.immutableFull;

    // FULL -> only allow drops on gaps
    if (span === "full" && !allowSlotDropAsHalf) {
      if (!isGapId(over)) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }
      const gapIndex = parseGap(over);
      if (gapIndex === null) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }
      flushSync(() => {
        setRows((prev) => {
          const srcRowIndex = prev.findIndex((r) => r.items.includes(active));
          if (srcRowIndex === -1) return prev;

          const next = cloneRows(prev);
          const [movedRow] = next.splice(srcRowIndex, 1);

          const insertIndex = gapIndex > srcRowIndex ? gapIndex - 1 : gapIndex;
          next.splice(
            Math.max(0, Math.min(insertIndex, next.length)),
            0,
            movedRow,
          );
          return finalizeRows(prev, next, meta);
        });
        setActiveWidget(null);
        setGrabbedWidget(null);
      });
      return;
    }

    // HALF -> allow slot drops and gap drops
    if (isSlotId(over)) {
      const slot = parseSlot(over);
      if (!slot) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }
      const { rowId, pos } = slot;
      const targetRow = safeRows.find((r) => r.id === rowId);
      const sourceRowId =
        safeRows.find((r) => r.items.includes(active))?.id ?? null;
      const isSameRow = sourceRowId != null && sourceRowId === rowId;
      const shouldConvertActiveToHalf =
        allowSlotDropAsHalf &&
        !isSameRow &&
        !!targetRow &&
        (targetRow.items.length === 2 || targetRow.items.length === 1);

      flushSync(() => {
        // A full-width widget can become half-width when dropped into a slot.
        if (shouldConvertActiveToHalf) {
          setMeta((prev) => ({
            ...prev,
            [active]: { ...prev[active], span: "half" },
          }));
        }

        // Convert a full-width target row to half-width before placing into its slot.
        if (targetRow && !isSameRow && targetRow.items.length === 1) {
          const tgtIsFull =
            targetRow.items.length === 1 &&
            meta[targetRow.items[0]]?.span === "full";

          if (tgtIsFull) {
            const fullWidgetId = targetRow.items[0];
            if (meta[fullWidgetId]?.immutableFull) {
              setActiveWidget(null);
              setGrabbedWidget(null);
              return;
            }
            setMeta((prev) => ({
              ...prev,
              [fullWidgetId]: { ...prev[fullWidgetId], span: "half" },
            }));
          }
        }

        setRows((prev) => {
          const next = cloneRows(prev);
          const srcIdx = next.findIndex((r) => r.items.includes(active));
          if (srcIdx === -1) return prev;
          const srcRow = next[srcIdx];
          const srcPos = srcRow.items.indexOf(active);

          const tgtIdx = next.findIndex((r) => r.id === rowId);
          if (tgtIdx === -1) return prev;
          const tgtRow = next[tgtIdx];

          if (srcIdx === tgtIdx) {
            if (srcPos === pos) return prev;
            if (tgtRow.items.length === 2) {
              const tmp = tgtRow.items[pos];
              tgtRow.items[pos] = active;
              tgtRow.items[srcPos] = tmp as WidgetId;
              return finalizeRows(prev, next, meta);
            }
            return prev;
          }

          // When dropping onto the *occupied* side of a single-widget row,
          // place the dragged widget into that slot and shift the existing one
          // to the other slot so both widgets can share the row.

          srcRow.items.splice(srcPos, 1);
          const sourceEmptied = srcRow.items.length === 0;
          if (sourceEmptied) next.splice(srcIdx, 1);

          if (tgtRow.items.length === 0) {
            tgtRow.items = [active];
            return finalizeRows(prev, next, meta);
          }
          if (tgtRow.items.length === 1) {
            if (pos === 0) tgtRow.items = [active, tgtRow.items[0]];
            else tgtRow.items.push(active);
            return finalizeRows(prev, next, meta);
          }

          const displaced = tgtRow.items[pos];
          tgtRow.items[pos] = active;

          if (!sourceEmptied) {
            const newSrcIdx = next.findIndex((r) => r.id === srcRow.id);
            if (newSrcIdx !== -1 && next[newSrcIdx].items.length < 2) {
              next[newSrcIdx].items.push(displaced);
              return finalizeRows(prev, next, meta);
            }
          }
          next.splice(srcIdx, 0, { id: rid(), items: [displaced] });
          return finalizeRows(prev, next, meta);
        });

        setActiveWidget(null);
        setGrabbedWidget(null);
      });
      return;
    }

    if (isGapId(over)) {
      const gi = parseGap(over);
      if (gi === null) {
        flushSync(() => setActiveWidget(null));
        setGrabbedWidget(null);
        return;
      }

      flushSync(() => {
        // Dropping a half-width widget onto a gap is treated as "make a new row",
        // which should persist as full-width across breakpoints.
        if (meta[active]?.span !== "full" && !meta[active]?.immutableFull) {
          setMeta((prev) => ({
            ...prev,
            [active]: { ...prev[active], span: "full" },
          }));
        }
        setRows((prev) => {
          const next = cloneRows(prev);
          const srcIdx = next.findIndex((r) => r.items.includes(active));
          if (srcIdx === -1) return prev;
          const srcRow = next[srcIdx];
          const srcPos = srcRow.items.indexOf(active);
          srcRow.items.splice(srcPos, 1);
          if (srcRow.items.length === 0) next.splice(srcIdx, 1);

          const insertIndex =
            srcIdx < gi && srcRow.items.length === 0 ? gi - 1 : gi;
          next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, {
            id: rid(),
            items: [active],
          });
          return finalizeRows(prev, next, meta);
        });
        setActiveWidget(null);
        setGrabbedWidget(null);
      });
      return;
    }

    flushSync(() => setActiveWidget(null));
    setGrabbedWidget(null);
  }

  /* ---------------------------- Visibility & Span ---------------------------- */
  function toggleVisible(id: WidgetId) {
    if (
      meta[id]?.visible &&
      visibleRows.length === 1 &&
      !visibleRows[0].items[1]
    )
      return;
    setMeta((prev) => ({
      ...prev,
      [id]: { ...prev[id], visible: !prev[id]?.visible },
    }));
    setRows((prev) => {
      const next = cloneRows(prev);
      const existsIdx = next.findIndex((r) => r.items.includes(id));
      const willShow = !meta[id]?.visible;
      if (!willShow) {
        if (existsIdx !== -1) {
          const row = next[existsIdx];
          row.items = row.items.filter((w) => w !== id);
          if (row.items.length === 0) next.splice(existsIdx, 1);
        }
      } else {
        const span = meta[id]?.span;
        if (span === "full") next.push({ id: rid(), items: [id] });
        else {
          const target = next.find(
            (r) =>
              r.items.length < 2 &&
              (r.items.length === 0 || meta[r.items[0]]?.span === "half"),
          );
          if (target) target.items.push(id);
          else next.push({ id: rid(), items: [id] });
        }
      }
      return finalizeRows(prev, next, meta);
    });
  }

  function resetAll() {
    reset();
  }

  /* ---------------------------------- Render --------------------------------- */
  const activeSpan = activeWidget ? meta[activeWidget]?.span : undefined;
  const layoutActiveWidget = activeWidget ?? grabbedWidget;
  const layoutActiveSpan = layoutActiveWidget
    ? meta[layoutActiveWidget]?.span
    : undefined;
  const activeIsConvertibleFull =
    !!activeWidget &&
    activeSpan === "full" &&
    !meta[activeWidget]?.immutableFull;

  const isDraggingHalf =
    !!layoutActiveWidget &&
    isTwoColumn &&
    (layoutActiveSpan === "half" ||
      (layoutActiveSpan === "full" &&
        !!layoutActiveWidget &&
        !meta[layoutActiveWidget]?.immutableFull));

  const dragOverlayVariant: "full" | "half" | null = (() => {
    if (!activeWidget) return null;
    if (!renderWidget) return null;
    if (activeWidget === "table") return "half";

    const row = safeRows.find((r) => r.items.includes(activeWidget));
    if (!row) return "half";
    const visibleItems = row.items.filter((wid) => meta[wid]?.visible);
    if (visibleItems.length !== 1) return "half";

    const onlyId = visibleItems[0];
    const isFixedFullRow = Boolean(onlyId && meta[onlyId]?.immutableFull);
    const isFullRow = !isDraggingHalf || isFixedFullRow;
    return isFullRow ? "full" : "half";
  })();

  const handleGrabPointerDownCapture = (
    id: WidgetId,
    handleEl: HTMLElement,
  ) => {
    // Only relevant in the 2-up layout where we temporarily render everything
    // as half-width while grabbing/dragging.
    if (!isTwoColumn) return;
    if (activeWidget) return;
    grabHandleRef.current = {
      id,
      node: handleEl,
      rect: handleEl.getBoundingClientRect(),
      didScroll: false,
    };

    // Apply the grab-preview layout before the dnd-kit listeners run (capture runs
    // before bubble), so initial hit-testing uses the post-shift geometry.
    flushSync(() => setGrabbedWidget(id));

    const anchor = grabHandleRef.current;
    if (!anchor || anchor.id !== id) return;
    if (anchor.didScroll) return;
    if (typeof window === "undefined") return;

    const now = anchor.node.getBoundingClientRect();
    const dy = now.top - anchor.rect.top;
    if (Number.isFinite(dy) && Math.abs(dy) >= 1) {
      if (typeof document !== "undefined" && document.scrollingElement) {
        // Force the scroll to apply synchronously so dnd-kit sees the post-shift
        // geometry on the same pointer event (avoids intermittent hit-test offset).
        document.scrollingElement.scrollTop += dy;
      } else {
        window.scrollBy({ top: dy, left: 0, behavior: "auto" });
      }
    }
    anchor.didScroll = true;
  };

  const twoColumnRowClass =
    rowLayout === "spacious"
      ? "@min-3xl:flex-row gap-5"
      : "@min-4xl:flex-row gap-4";
  const twoColumnSentinelClass =
    rowLayout === "spacious" ? "@min-3xl:flex-row" : "@min-4xl:flex-row";
  const hideSecondSlotUntilTwoColumn =
    rowLayout === "spacious" ? "hidden @min-3xl:flex" : "hidden @min-4xl:flex";

  return (
    <div
      ref={containerRef}
      className="overflow-x-clip overflow-y-visible px-0.5"
    >
      <div
        ref={twoColumnSentinelRef}
        aria-hidden="true"
        className={cn(
          "invisible h-0 w-0 overflow-hidden flex flex-col",
          twoColumnSentinelClass,
        )}
      />
      {/* Controls */}
      <div className="border border-border/40 shadow-sm p-5 rounded-xl flex flex-col gap-2 bg-highlight-4 mt-6">
        <span className="text-sm font-medium">
          Select widgets to show. Please select at least one.
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.values(meta).map(
            (m) =>
              //  <input
              //   type="checkbox"
              //   checked={m.visible}
              //   onChange={() => toggleVisible(m.id)}
              //   className="peer h-4 w-4 appearance-none border border-border rounded-sm cursor-pointer checked:bg-muted-foreground checked:border-muted-foreground focus:outline-none focus:ring-2 focus:ring-border"
              // />
              // <Check className="absolute w-4 h-4 pointer-events-none text-white opacity-0 peer-checked:opacity-100" />
              // <span>{m.title}</span>
              //  {!m.immutableFull && (
              //   <button
              //     onClick={() => toggleSpan(m.id)}
              //     className="ml-1 rounded border px-2 py-0.5 text-xs"
              //     title="Toggle width"
              //   >
              //     {m.span === "full" ? "Full" : "Half"}
              //   </button>
              // )}
              typeof m.visible !== "undefined" && (
                <React.Fragment key={m.id}>
                  <button
                    className={cn(
                      "flex items-center justify-center gap-1 px-2 py-1 rounded-xl border border-border shadow-sm hover:border-muted-foreground text-xs",
                      m.visible ? "bg-green" : "bg-red",
                    )}
                    aria-label={`toggle ${m.title} visibility`}
                    onClick={() => toggleVisible(m.id)}
                  >
                    {m.visible ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      <X className="w-4 h-4" strokeWidth={3} />
                    )}
                    <span>{m.title}</span>
                  </button>
                </React.Fragment>
              ),
          )}
          <button
            aria-label="reset layout"
            onClick={resetAll}
            className="text-xs rounded-xl border border-border px-3 py-1 bg- hover:bg-highlight-1 flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={3} />
            Reset
          </button>
        </div>
      </div>

      {/* DnD Context */}
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        measuring={{
          // This dashboard can reflow while dragging (e.g. full-width widgets previewing as half-width),
          // which can otherwise leave droppable rects stale and make hit-testing feel offset.
          droppable: {
            strategy: MeasuringStrategy.WhileDragging,
            frequency: 16,
          },
        }}
        onDragCancel={() => {
          setActiveWidget(null);
          setGrabbedWidget(null);
        }}
        collisionDetection={closestCenter}
        autoScroll={{
          // Use the draggable rect as the activator so the dragged widget stays stable
          // against the viewport edge while the page auto-scrolls.
          activator: AutoScrollActivator.Pointer,
          // Keep the grabbed widget aligned with the pointer when the dashboard
          // layout reflows (e.g. single-row widgets temporarily become half width).
          layoutShiftCompensation: true,
          threshold: { x: 0.2, y: 0.25 },
          interval: 8,
        }}
      >
        {typeof document !== "undefined"
          ? createPortal(
              <DragOverlay
                dropAnimation={null}
                adjustScale={false}
                zIndex={1000001}
                className={isTwoColumn ? undefined : "@container"}
              >
                {activeWidget && renderWidget && dragOverlayVariant ? (
                  <DashboardDragOverlay
                    id={activeWidget}
                    variant={dragOverlayVariant}
                    renderWidget={renderWidget}
                  />
                ) : null}
              </DragOverlay>,
              containerRef.current ?? document.body,
            )
          : null}
        {/* Render rows and gaps. Nothing reflows during drag; only indicators update */}
        <div>
          {safeRows.map((row, idx) => {
            const visibleItems = row.items.filter((id) => meta[id]?.visible);
            if (visibleItems.length === 0) return null;
            const spacingClass = idx === 0 ? "pt-4" : "pt-5";
            const isFixedFullRow =
              visibleItems.length === 1 &&
              Boolean(meta[visibleItems[0]]?.immutableFull);
            return (
              <React.Fragment key={`frag-${row.id}`}>
                <Gap index={idx} className={spacingClass} />

                {visibleItems.length === 1 &&
                (!isDraggingHalf || isFixedFullRow) ? (
                  <div className="w-full relative">
                    <Slot
                      className="w-full"
                      rowId={row.id}
                      pos={0}
                      highlightEnabled={
                        isDraggingHalf &&
                        (isTwoColumn ||
                          (activeWidget != null &&
                            row.items.includes(activeWidget)))
                      }
                    >
                      <DraggableCard
                        id={visibleItems[0]}
                        meta={meta[visibleItems[0]]}
                        dashboardType={type}
                        dim={false}
                        isFull
                        renderVariant={undefined}
                        renderWidget={renderWidget}
                        onGrabPointerDownCapture={handleGrabPointerDownCapture}
                      />
                    </Slot>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-full flex flex-col relative items-stretch",
                      twoColumnRowClass,
                    )}
                    data-ww-dashboard-row
                  >
                    <Slot
                      className="w-full"
                      rowId={row.id}
                      pos={0}
                      highlightEnabled={
                        isDraggingHalf &&
                        (isTwoColumn ||
                          (activeWidget != null &&
                            row.items.includes(activeWidget)))
                      }
                      showEmptyOutline={!visibleItems[0] && isDraggingHalf}
                    >
                      {visibleItems[0] ? (
                        <DraggableCard
                          id={visibleItems[0]}
                          meta={meta[visibleItems[0]]}
                          dashboardType={type}
                          dim={
                            Boolean(activeWidget) &&
                            isDraggingHalf &&
                            activeWidget !== visibleItems[0]
                          }
                          isFull={visibleItems.length === 1 && !isDraggingHalf}
                          renderVariant={undefined}
                          renderWidget={renderWidget}
                          onGrabPointerDownCapture={
                            handleGrabPointerDownCapture
                          }
                        />
                      ) : null}
                    </Slot>

                    {(visibleItems[1] || (isDraggingHalf && isTwoColumn)) && (
                      <Slot
                        className={cn(
                          "w-full",
                          !visibleItems[1] &&
                            isDraggingHalf &&
                            hideSecondSlotUntilTwoColumn,
                        )}
                        rowId={row.id}
                        pos={1}
                        highlightEnabled={
                          isDraggingHalf &&
                          (isTwoColumn ||
                            (activeWidget != null &&
                              row.items.includes(activeWidget)))
                        }
                        showEmptyOutline={!visibleItems[1] && isDraggingHalf}
                      >
                        {visibleItems[1] ? (
                          <DraggableCard
                            id={visibleItems[1]}
                            meta={meta[visibleItems[1]]}
                            dashboardType={type}
                            dim={
                              Boolean(activeWidget) &&
                              isDraggingHalf &&
                              activeWidget !== visibleItems[1]
                            }
                            isFull={false}
                            renderVariant={undefined}
                            renderWidget={renderWidget}
                            onGrabPointerDownCapture={
                              handleGrabPointerDownCapture
                            }
                          />
                        ) : null}
                      </Slot>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* trailing gap */}
          <Gap index={safeRows.length} className="pt-5 pb-4" />
        </div>
      </DndContext>
      <style jsx global>{`
        [data-ww-dashboard-edit-card] [data-ww-widget-icon] {
          opacity: 0 !important;
        }
        [data-ww-dashboard-edit-card] [data-ww-stat-table-sticky] {
          position: static !important;
          top: auto !important;
          bottom: auto !important;
        }
        [data-ww-dashboard-edit-card] [data-ww-stat-table-sticky="header"] {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        [data-ww-dashboard-edit-card] [data-ww-stat-table] .sticky {
          position: static !important;
          top: auto !important;
          bottom: auto !important;
          left: auto !important;
        }
        [data-ww-dashboard-edit-card][data-ww-dashboard-dragging] * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
      `}</style>
    </div>
  );
}
