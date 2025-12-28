"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSessionContext } from "@supabase/auth-helpers-react";
import {
  DndContext,
  type DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type Modifier,
  closestCenter,
  TouchSensor,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  rid,
  type DashboardType,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "./dashboardLayout";
import {
  DashboardWidgetMiniature,
  DashboardWidgetHeaderMiniature,
  getDashboardWidgetIcon,
} from "./dashboardMiniatures";

import { Check, X, RotateCcw, GripVertical } from "lucide-react";

/* ------------------------------ Widget Miniatures ---------------------------- */

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
  const [, rowId, p] = id.split(":");
  const pos = Number(p);
  if ((pos !== 0 && pos !== 1) || !rowId) return null;
  return { rowId, pos: pos as 0 | 1 };
};

/* ------------------------------ Draggable Card ---------------------------- */

function DraggableCard({
  id,
  meta,
  dashboardType,
  dim,
  isFull,
}: {
  id: WidgetId;
  meta: WidgetMeta | undefined;
  dashboardType: DashboardType;
  dim: boolean;
  isFull: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: `w:${id}`,
    });

  if (!meta) return null;

  const isShortStats =
    id === "stats" && dashboardType === "overview" && isFull === true;
  const cardHeight = isShortStats ? "h-[13rem]" : "h-[13rem]";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full h-full transition-opacity",
        dim ? "opacity-60" : "opacity-100",
        isDragging && "opacity-0"
      )}
      aria-roledescription="card"
    >
      <article
        className={cn(
          "flex flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5",
          cardHeight
        )}
      >
        <header className="relative flex items-center gap-2">
          {getDashboardWidgetIcon(id)}
          <h3 className="text-sm font-semibold min-w-0 flex-1 truncate">
            {meta.title}
          </h3>
          {(id === "table" || id === "stats") && (
            <div className="ml-auto flex items-center gap-2">
              <DashboardWidgetHeaderMiniature widgetId={id} />
            </div>
          )}
          <button
            type="button"
            aria-label={`Drag ${meta.title}`}
            title="Drag to move"
            {...attributes}
            {...listeners}
            ref={setActivatorNodeRef}
            className={cn(
              "touch-none cursor-grab rounded-full border border-border/40",
              "bg-highlight-7/70 p-2 shadow-even",
              "supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md",
              "hover:bg-highlight-6/60 active:cursor-grabbing",
              "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            )}
          >
            <GripVertical className="h-5 w-5 text-foreground/70" />
          </button>
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
}

/* ------------------------------ Droppable Gaps & Slots -------------------- */

function Gap({ index, highlight }: { index: number; highlight: boolean }) {
  const { setNodeRef } = useDroppable({ id: gapId(index) });
  const label = "Drop here (new row)";
  return (
    <div ref={setNodeRef} className="relative w-full select-none z-50">
      <div
        className={`mx-0 my-2 h-2 rounded transition-all ${
          highlight ? "bg-indigo-500/90" : "bg-transparent"
        }`}
      />
      {highlight && (
        <div
          className="pointer-events-none absolute -mt-8 w-full text-center text-xs font-medium text-indigo-400"
          aria-hidden
        >
          {label}
        </div>
      )}
    </div>
  );
}

function Slot({
  rowId,
  pos,
  highlight,
  children,
  className,
}: {
  rowId: string;
  pos: 0 | 1;
  highlight: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id: slotId(rowId, pos) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full",
        highlight && "rounded-xl ring-2 ring-indigo-400",
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Helpers -------------------------------- */

function cloneRows(rows: Row[]): Row[] {
  return rows.map((r) => ({ id: r.id, items: [...r.items] }));
}

/* -------------------------------- Dashboard -------------------------------- */

export default function Dashboard({
  type = "overview",
  meta,
  rows,
  setMeta,
  setRows,
  reset,
}: {
  type?: DashboardType;
  meta: Partial<Record<WidgetId, WidgetMeta>>;
  rows: Row[];
  setMeta: (
    next:
      | Partial<Record<WidgetId, WidgetMeta>>
      | ((
          prev: Partial<Record<WidgetId, WidgetMeta>>
        ) => Partial<Record<WidgetId, WidgetMeta>>)
  ) => void;
  setRows: (next: Row[] | ((prev: Row[]) => Row[])) => void;
  reset: () => void;
}) {
  const { session } = useSessionContext();
  const [activeWidget, setActiveWidget] = useState<WidgetId | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);

  const keepGrabOffsetOnWidthChange = React.useCallback<Modifier>(
    ({ draggingNodeRect, overlayNodeRect, transform }) => {
      if (!draggingNodeRect || !overlayNodeRect) return transform;

      const draggingWidth = draggingNodeRect.width;
      const overlayRectWidth = overlayNodeRect.width;
      if (!draggingWidth || !overlayRectWidth) return transform;

      const delta = (draggingWidth - overlayRectWidth) / 2;
      if (Math.abs(delta) < 0.5) return transform;

      return { ...transform, x: transform.x + delta };
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => r.items.some((id) => meta[id]?.visible)),
    [rows, meta]
  );
  if (!session) {
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
    if (id.startsWith("w:")) setActiveWidget(id.slice(2) as WidgetId);
    setOverId(null);
    setOverlayWidth(null);
    const r = e.active.rect.current.initial;
    if (r) {
      setActiveWidth(r.width);
      setOverlayWidth(r.width);
    }
  }

  function onDragOver(e: DragOverEvent) {
    const id = e.over?.id ? String(e.over.id) : null;
    setOverId(id);
    if (!id) {
      if (activeWidth != null) setOverlayWidth(activeWidth);
      return;
    }

    if (isSlotId(id)) {
      setOverlayWidth(e.over?.rect?.width ?? null);
      return;
    }

    if (activeWidth != null) {
      setOverlayWidth(activeWidth);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const over = e.over?.id ? String(e.over.id) : null;
    const active = activeWidget;
    setOverId(null);

    const cleanup = () => {
      setActiveWidget(null);
      setActiveWidth(null);
      setOverlayWidth(null);
    };

    const finish = () => {
      if (typeof window !== "undefined") window.requestAnimationFrame(cleanup);
      else cleanup();
    };

    if (!active || !over) {
      finish();
      return;
    }

    const span = meta[active]?.span;
    const allowSlotDropAsHalf =
      span === "full" && isSlotId(over) && !meta[active]?.immutableFull;

    // FULL -> only allow drops on gaps
    if (span === "full" && !allowSlotDropAsHalf) {
      if (!isGapId(over)) {
        finish();
        return;
      }
      const gapIndex = parseGap(over);
      if (gapIndex === null) {
        finish();
        return;
      }

      // find source row index (the row that contains the active widget)
      const srcRowIndex = rows.findIndex((r) => r.items.includes(active));
      if (srcRowIndex === -1) {
        finish();
        return;
      }

      const next = cloneRows(rows);
      const [movedRow] = next.splice(srcRowIndex, 1);

      // insert at gapIndex (gaps index correspond to position before row at that index)
      const insertIndex = gapIndex > srcRowIndex ? gapIndex - 1 : gapIndex;
      next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, movedRow);
      setRows(next);
      finish();
      return;
    }

    // A full-width widget can become half-width when dropped into a slot.
    if (allowSlotDropAsHalf) {
      setMeta((prev) => ({
        ...prev,
        [active]: { ...prev[active], span: "half" },
      }));
    }

    // HALF -> allow slot drops and gap drops
    if (isSlotId(over)) {
      const slot = parseSlot(over);
      if (!slot) {
        finish();
        return;
      }
      const { rowId, pos } = slot;

      // First check if we need to convert a full-width widget to half-width
      // We need to do this BEFORE updating rows to avoid race conditions
      const targetRow = rows.find((r) => r.id === rowId);
      if (targetRow) {
        const tgtIsFull =
          targetRow.items.length === 1 &&
          meta[targetRow.items[0]]?.span === "full";

        if (tgtIsFull) {
          const fullWidgetId = targetRow.items[0];
          // Don't allow drops on immutableFull widgets (like table)
          if (meta[fullWidgetId]?.immutableFull) {
            finish();
            return;
          }

          // Convert the full-width widget to half-width
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

        // if same row, do swap logic

        if (srcIdx === tgtIdx) {
          if (srcPos === pos) return prev; // no-op
          if (tgtRow.items.length === 2) {
            const tmp = tgtRow.items[pos];
            tgtRow.items[pos] = active;
            tgtRow.items[srcPos] = tmp as WidgetId;
            return next;
          }
          return prev; // single item row -> no change
        }

        // remove from source
        srcRow.items.splice(srcPos, 1);
        const sourceEmptied = srcRow.items.length === 0;
        if (sourceEmptied) next.splice(srcIdx, 1);

        // place into target
        if (tgtRow.items.length === 0) {
          tgtRow.items = [active];
          return next;
        }
        if (tgtRow.items.length === 1) {
          if (pos === 0) tgtRow.items = [active, tgtRow.items[0]];
          else tgtRow.items.push(active);
          return next;
        }

        // target has 2 items -> swap with occupant
        const displaced = tgtRow.items[pos];
        tgtRow.items[pos] = active;

        // try to rehome displaced into source row if it still exists and has space
        if (!sourceEmptied) {
          const newSrcIdx = next.findIndex((r) => r.id === srcRow.id);
          if (newSrcIdx !== -1 && next[newSrcIdx].items.length < 2) {
            next[newSrcIdx].items.push(displaced);
            return next;
          }
        }
        // otherwise create new single-row under target
        next.splice(srcIdx, 0, { id: rid(), items: [displaced] });
        return next;
      });
      finish();
      return;
    }

    if (isGapId(over)) {
      const gi = parseGap(over);
      if (gi === null) {
        finish();
        return;
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
        return next;
      });
      finish();
      return;
    }

    finish();
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
              (r.items.length === 0 || meta[r.items[0]]?.span === "half")
          );
          if (target) target.items.push(id);
          else next.push({ id: rid(), items: [id] });
        }
      }
      return next;
    });
  }

  function resetAll() {
    reset();
  }

  /* ---------------------------------- Render --------------------------------- */
  const isDraggingHalf =
    !!activeWidget &&
    (meta[activeWidget]?.span === "half" ||
      (meta[activeWidget]?.span === "full" &&
        !meta[activeWidget]?.immutableFull &&
        !!overId &&
        isSlotId(overId)));

  const activeIsFullForPreview = (() => {
    if (!activeWidget) return false;

    // Use the real dragged/overlay width as the source of truth so "half widgets
    // alone in a row" preview as full-width, and shrink to half only when the UI
    // actually splits into 2 slots during drag.
    if (activeWidth != null && overlayWidth != null && activeWidth > 0) {
      return overlayWidth / activeWidth >= 0.75;
    }

    return meta[activeWidget]?.span === "full" && !isDraggingHalf;
  })();

  return (
    <div className="mt-3 overflow-hidden @container">
      {/* Controls */}
      <div className="border border-border/40 shadow-sm p-5 rounded-xl flex flex-col gap-2 bg-highlight-4 mx-1">
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
                <button
                  key={m.id}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2 py-1 rounded-xl border border-border shadow-sm hover:border-muted-foreground text-xs",
                    m.visible ? "bg-green" : "bg-red"
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
              )
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
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetection={closestCenter}
      >
        {/* Render rows and gaps. Nothing reflows during drag; only indicators update */}
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const visibleItems = row.items.filter((id) => meta[id]?.visible);
            if (visibleItems.length === 0) return null;
            // A row is full-width only if it has exactly one item AND that item's span is "full"
            // Don't treat single half-width items as full-width
            const isFull =
              visibleItems.length === 1 &&
              meta[visibleItems[0]]?.span === "full";
            const isFixed =
              visibleItems.length === 1 && meta[visibleItems[0]]?.immutableFull;
            return (
              <React.Fragment key={`frag-${row.id}`}>
                <div className="w-full">
                  <Gap index={idx} highlight={overId === gapId(idx)} />
                </div>

                <section className="grid grid-cols-1 @min-3xl:grid-cols-2 gap-4 items-stretch">
                  {isFull ? (
                    <div className="rounded-2xl border border-dashed p-2 flex flex-col @min-3xl:flex-row w-full @min-3xl:col-span-2 gap-2">
                      <Slot
                        className="w-full"
                        rowId={row.id}
                        pos={0}
                        highlight={
                          isDraggingHalf && overId === slotId(row.id, 0)
                        }
                      >
                        <div
                          className={cn(
                            "h-full",
                            visibleItems[0] === "stats" &&
                              type === "overview" &&
                              !isDraggingHalf
                              ? "min-h-[13rem]"
                              : "min-h-[13rem]"
                          )}
                        >
                          <DraggableCard
                            id={visibleItems[0]}
                            meta={meta[visibleItems[0]]}
                            dashboardType={type}
                            dim={isDraggingHalf && !isFixed}
                            isFull={!isDraggingHalf || isFixed}
                          />
                        </div>
                      </Slot>
                      {isDraggingHalf && !isFixed ? (
                        <Slot
                          className="w-full"
                          rowId={row.id}
                          pos={1}
                          highlight={overId === slotId(row.id, 1)}
                        >
                          <div className="h-full min-h-[13rem] rounded-2xl border border-dashed bg-highlight-2/50" />
                        </Slot>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-2 flex flex-col @min-3xl:flex-row w-full @min-3xl:col-span-2 gap-2">
                      <Slot
                        className="w-full"
                        rowId={row.id}
                        pos={0}
                        highlight={
                          isDraggingHalf && overId === slotId(row.id, 0)
                        }
                      >
                        <div
                          className={cn(
                            "h-full",
                            visibleItems.length === 1 &&
                              visibleItems[0] === "stats" &&
                              type === "overview" &&
                              !isDraggingHalf
                              ? "min-h-[13rem]"
                              : "min-h-[13rem]"
                          )}
                        >
                          {visibleItems[0] ? (
                            <DraggableCard
                              id={visibleItems[0]}
                              meta={meta[visibleItems[0]]}
                              dashboardType={type}
                              dim={
                                isDraggingHalf &&
                                activeWidget !== visibleItems[0]
                              }
                              isFull={
                                visibleItems.length === 1 && !isDraggingHalf
                              }
                            />
                          ) : (
                            <div className="h-full min-h-[13rem] rounded-2xl border border-dashed" />
                          )}
                        </div>
                      </Slot>

                      {(visibleItems[1] || isDraggingHalf) && (
                        <Slot
                          className="w-full"
                          rowId={row.id}
                          pos={1}
                          highlight={
                            isDraggingHalf && overId === slotId(row.id, 1)
                          }
                        >
                          <div className="h-full min-h-[13rem]">
                            {visibleItems[1] ? (
                              <DraggableCard
                                id={visibleItems[1]}
                                meta={meta[visibleItems[1]]}
                                dashboardType={type}
                                dim={
                                  isDraggingHalf &&
                                  activeWidget !== visibleItems[1]
                                }
                                isFull={false}
                              />
                            ) : (
                              <div className="h-full rounded-2xl border border-dashed bg-highlight-2/50" />
                            )}
                          </div>
                        </Slot>
                      )}
                    </div>
                  )}
                </section>
              </React.Fragment>
            );
          })}

          {/* trailing gap */}
          <div className="w-full">
            <Gap
              index={rows.length}
              highlight={overId === gapId(rows.length)}
            />
          </div>
        </div>
        <DragOverlay
          adjustScale={false}
          zIndex={40}
          dropAnimation={null}
          modifiers={[keepGrabOffsetOnWidthChange]}
        >
          {activeWidget && meta[activeWidget] ? (
            <div
              className="pointer-events-none"
              style={{ width: overlayWidth ?? activeWidth ?? undefined }}
            >
              <article
                className={cn(
                  "flex flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5",
                  activeWidget === "stats" &&
                    type === "overview" &&
                    activeIsFullForPreview
                    ? "h-[13rem]"
                    : "h-[13rem]"
                )}
              >
                <header className="relative flex items-center gap-2">
                  {getDashboardWidgetIcon(activeWidget)}
                  <h3 className="text-sm font-semibold min-w-0 flex-1 truncate">
                    {meta[activeWidget].title}
                  </h3>
                  {(activeWidget === "table" || activeWidget === "stats") && (
                    <div className="ml-auto flex items-center gap-2">
                      <DashboardWidgetHeaderMiniature widgetId={activeWidget} />
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className={cn(
                      "rounded-full border border-border/40",
                      "bg-highlight-7/70 p-2 shadow-even",
                      "supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md",
                      "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                    )}
                  >
                    <GripVertical className="h-5 w-5 text-foreground/70" />
                  </div>
                </header>
                <div className="mt-3 flex-1 overflow-hidden text-sm text-gray-700">
                  <div className="h-full w-full pointer-events-none select-none">
                    <DashboardWidgetMiniature
                      dashboardType={type}
                      widgetId={activeWidget}
                      isFull={activeIsFullForPreview}
                    />
                  </div>
                </div>
              </article>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
