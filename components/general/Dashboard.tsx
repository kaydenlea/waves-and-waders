"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  TouchSensor,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  getDashboardStorageKey,
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  rid,
  type DashboardType,
  type Row,
  type Span,
  type WidgetId,
  type WidgetMeta,
} from "./dashboardLayout";

import { Check, X, RotateCcw } from "lucide-react";

interface NormalizedData {
  overview_meta?: any;
  forecast_meta?: any;
  overview_rows?: any;
  forecast_rows?: any;
}

/* ------------------------------ Widget Content ---------------------------- */

const WIDGET: Partial<Record<WidgetId, React.ReactNode>> = {
  // stats: <Highlights />,
  // tide: <TideChart />,
  // swell: <SwellChart />,
  // surf: <SurfChart />,
  // table: <StatTable numDays={1} numHours={8} />,
  stats: (
    <div className="grid grid-cols-2 gap-4 p-2">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="h-10 w-full rounded-xl bg-highlight-3" />
      ))}
    </div>
  ),
  tide: (
    <div className="flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
      [Chart]
    </div>
  ),
  swell: (
    <div className="flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
      [Chart]
    </div>
  ),
  surf: (
    <div className="flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
      [Chart]
    </div>
  ),
  energy: (
    <div className="flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
      [Chart]
    </div>
  ),
  wind: (
    <div className="flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
      [Chart]
    </div>
  ),
  table: (
    <div className="rounded-2xl border border-dashed bg-highlight-2 p-4">
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Wind", "Tide", "Swell"].map((col) => (
                <th
                  key={col}
                  className="border-b p-2 text-left text-xs font-medium text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: 3 }).map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn("p-2", rowIdx === 0 && "pt-6")}
                  >
                    <div className="h-10 w-full rounded-xl bg-highlight-3" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
  surfAndWind: (
    <div className="flex flex-col @min-2xl:flex-row gap-9 h-80 @min-2xl:h-full">
      <div className="flex-1 flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
        [Chart]
      </div>
      <div className="flex-1 flex h-full items-center justify-center rounded-xl bg-highlight-3 text-gray-400">
        [Chart]
      </div>
    </div>
  ),
};

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
  dim,
}: {
  id: WidgetId;
  meta: WidgetMeta | undefined;
  dim: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({
      id: `w:${id}`,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  if (!meta) return null;
  const spanClass = meta.span === "full" ? "md:col-span-2" : "md:col-span-1";

  return (
    <div
      style={style}
      ref={setNodeRef}
      className={cn(
        "col-span-1 h-full transition-opacity",
        spanClass,
        dim ? "opacity-100" : "opacity-100"
      )}
      aria-roledescription="card"
    >
      <article className="flex h-full min-h-[14rem] flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5">
        <header className="flex items-center justify-center gap-2">
          <h3 className="text-sm font-semibold">{meta.title}</h3>
          <button
            type="button"
            aria-label={`Drag ${meta.title}`}
            title="Drag to move"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab rounded border border-border px-2 py-1 text-sm active:bg-highlight-3 active:cursor-grabbing"
          >
            ⠿
          </button>
        </header>
        <div
          className={`mt-3 grow text-sm text-gray-700 ${
            isDragging ? "opacity-60" : ""
          }`}
        >
          {WIDGET[id]}
        </div>
      </article>
    </div>
  );
}

/* ------------------------------ Droppable Gaps & Slots -------------------- */

function Gap({
  index,
  highlight,
  activeSpan,
}: {
  index: number;
  highlight: boolean;
  activeSpan: Span | null;
}) {
  const { setNodeRef } = useDroppable({ id: gapId(index) });
  // const label =
  //   activeSpan === "full" ? "Drop full-width here" : "Drop here (new half-row)";
  const label = "Drop here (new row)";
  return (
    <div ref={setNodeRef} className="z-1 relative w-full select-none">
      <div
        className={`mx-0 my-2 h-2 rounded transition-all ${
          highlight ? "bg-indigo-500/90" : "bg-transparent"
        }`}
      />
      {highlight && (
        <div
          className="absolute -mt-8 w-full text-center text-xs font-medium text-indigo-400"
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
}: {
  type?: DashboardType;
}) {
  const layoutDefaults = useMemo(() => getDefaultLayout(type), [type]);
  const [meta, setMeta] = useState<Partial<Record<WidgetId, WidgetMeta>>>(
    () => layoutDefaults.meta
  );
  const [rows, setRows] = useState<Row[]>(() => layoutDefaults.rows);
  const [hydrated, setHydrated] = useState(false);
  const [activeWidget, setActiveWidget] = useState<WidgetId | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const storageMetaKey = useMemo(
    () => getDashboardStorageKey(type, "meta"),
    [type]
  );
  const storageRowsKey = useMemo(
    () => getDashboardStorageKey(type, "rows"),
    [type]
  );

  const supabase = useSupabaseClient();
  const { session } = useSessionContext();

  useEffect(() => {
    let cancelled = false;
    const defaults = getDefaultLayout(type);

    const applyLayout = (
      nextMeta: Partial<Record<WidgetId, WidgetMeta>>,
      nextRows: Row[]
    ) => {
      if (cancelled) return;
      setMeta(nextMeta);
      setRows(nextRows);
      setHydrated(true);
    };

    const loadFromLocalStorage = () => {
      if (typeof window === "undefined") {
        applyLayout(defaults.meta, defaults.rows);
        return;
      }

      try {
        const savedMetaRaw = window.localStorage.getItem(storageMetaKey);
        const nextMeta = savedMetaRaw
          ? normalizeMeta(type, JSON.parse(savedMetaRaw))
          : defaults.meta;

        const savedRowsRaw = window.localStorage.getItem(storageRowsKey);
        const nextRows = savedRowsRaw
          ? normalizeRows(type, JSON.parse(savedRowsRaw), nextMeta)
          : defaults.rows;

        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Failed loading dashboard layout from storage", error);
        applyLayout(defaults.meta, defaults.rows);
      }
    };

    const loadFromSupabase = async () => {
      if (!session) {
        loadFromLocalStorage();
        return;
      }
      try {
        const columnMeta =
          type === "overview" ? "overview_meta" : "forecast_meta";
        const columnRows =
          type === "overview" ? "overview_rows" : "forecast_rows";

        const { data, error } = await supabase
          .from("user_dashboard_settings")
          .select(`${columnMeta}, ${columnRows}`)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed loading dashboard layout from Supabase", error);
          loadFromLocalStorage();
          return;
        }

        if (!data) {
          applyLayout(defaults.meta, defaults.rows);
          return;
        }

        const nextMeta = normalizeMeta(
          type,
          (data as NormalizedData)[columnMeta]
        );
        const nextRows = normalizeRows(
          type,
          (data as NormalizedData)[columnRows],
          nextMeta
        );
        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Unexpected error loading layout", error);
        loadFromLocalStorage();
      }
    };

    setHydrated(false);
    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [type, storageMetaKey, storageRowsKey, session, supabase]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined" || session) return;
    try {
      window.localStorage.setItem(storageMetaKey, JSON.stringify(meta));
      window.localStorage.setItem(storageRowsKey, JSON.stringify(rows));
    } catch (error) {
      console.warn("Failed to persist dashboard layout", error);
    }
  }, [meta, rows, hydrated, storageMetaKey, storageRowsKey, session]);

  useEffect(() => {
    if (!hydrated || !session) return;

    const columnMeta = type === "overview" ? "overview_meta" : "forecast_meta";
    const columnRows = type === "overview" ? "overview_rows" : "forecast_rows";

    const persist = async () => {
      const payload = {
        user_id: session.user.id,
        [columnMeta]: meta,
        [columnRows]: rows,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_dashboard_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.warn("Failed saving dashboard layout", error);
      }
    };

    void persist();
  }, [hydrated, session, supabase, meta, rows, type]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  const activeSpan: Span | null = activeWidget
    ? meta[activeWidget]?.span ?? null
    : null;

  const visibleRows = useMemo(
    () => rows.filter((r) => r.items.some((id) => meta[id]?.visible)),
    [rows, meta]
  );

  /* ---------------------------- DnD Handlers ---------------------------- */
  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("w:")) setActiveWidget(id.slice(2) as WidgetId);
    setOverId(null);
  }

  function onDragOver(e: DragOverEvent) {
    const id = e.over?.id ? String(e.over.id) : null;
    setOverId(id);
  }

  function onDragEnd(e: DragEndEvent) {
    const over = overId ? String(overId) : null;
    const active = activeWidget;
    setOverId(null);
    setActiveWidget(null);
    if (!active || !over) return;

    const span = meta[active]?.span;
    // FULL -> only allow drops on gaps
    if (span === "full") {
      if (!isGapId(over)) return;
      const gapIndex = parseGap(over);
      if (gapIndex === null) return;

      // find source row index (the row that contains the active widget)
      const srcRowIndex = rows.findIndex((r) => r.items.includes(active));
      if (srcRowIndex === -1) return;

      const next = cloneRows(rows);
      const [movedRow] = next.splice(srcRowIndex, 1);

      // insert at gapIndex (gaps index correspond to position before row at that index)
      const insertIndex = gapIndex > srcRowIndex ? gapIndex - 1 : gapIndex;
      next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, movedRow);
      setRows(next);
      return;
    }
    // HALF -> allow slot drops and gap drops
    if (isSlotId(over)) {
      const slot = parseSlot(over);
      if (!slot) return;
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
          if (meta[fullWidgetId]?.immutableFull) return;

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
      return;
    }

    if (isGapId(over)) {
      const gi = parseGap(over);
      if (gi === null) return;

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
      return;
    }
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

  function toggleSpan(id: WidgetId) {
    setMeta((prev) => {
      const m = prev[id];
      if (m?.immutableFull) return prev;
      const to: Span = m?.span === "half" ? "full" : "half";
      const nextMeta = { ...prev, [id]: { ...m, span: to } } as Partial<
        Record<WidgetId, WidgetMeta>
      >;

      setRows((rows0) => {
        const rows1 = cloneRows(rows0);
        const idx = rows1.findIndex((r) => r.items.includes(id));
        if (idx === -1) return rows0;
        const row = rows1[idx];
        row.items = row.items.filter((x) => x !== id);
        if (row.items.length === 0) rows1.splice(idx, 1);

        if (to === "full") {
          rows1.splice(Math.min(idx, rows1.length), 0, {
            id: rid(),
            items: [id],
          });
        } else {
          const tgt = rows1.find(
            (r) =>
              r.items.length < 2 &&
              (r.items.length === 0 || nextMeta[r.items[0]]?.span === "half")
          );
          if (tgt) tgt.items.push(id);
          else
            rows1.splice(Math.min(idx, rows1.length), 0, {
              id: rid(),
              items: [id],
            });
        }
        return rows1;
      });

      return nextMeta;
    });
  }

  function resetAll() {
    const defaults = getDefaultLayout(type);
    setMeta(defaults.meta);
    setRows(defaults.rows);
  }

  /* ---------------------------------- Render --------------------------------- */
  const isDraggingHalf = activeWidget
    ? meta[activeWidget]?.span === "half"
    : false;

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
                  <Gap
                    index={idx}
                    highlight={overId === gapId(idx)}
                    activeSpan={activeSpan}
                  />
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
                        <div className={cn("h-full min-h-[14rem]")}>
                          <DraggableCard
                            id={visibleItems[0]}
                            meta={meta[visibleItems[0]]}
                            dim={isDraggingHalf && !isFixed}
                          />
                        </div>
                      </Slot>
                      {/* {isDraggingHalf && (
                        <Slot
                          className="w-full"
                          rowId={row.id}
                          pos={1}
                          highlight={
                            isDraggingHalf && overId === slotId(row.id, 1)
                          }
                        >
                          <div className="h-full min-h-[14rem] rounded-2xl border border-dashed bg-highlight-2/50" />
                        </Slot>
                      )} */}
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
                        <div className={cn("h-full min-h-[14rem]")}>
                          {visibleItems[0] ? (
                            <DraggableCard
                              id={visibleItems[0]}
                              meta={meta[visibleItems[0]]}
                              dim={
                                isDraggingHalf &&
                                activeWidget !== visibleItems[0]
                              }
                            />
                          ) : (
                            <div className="h-full min-h-[14rem] rounded-2xl border border-dashed" />
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
                          <div className="h-full min-h-[14rem]">
                            {visibleItems[1] ? (
                              <DraggableCard
                                id={visibleItems[1]}
                                meta={meta[visibleItems[1]]}
                                dim={
                                  isDraggingHalf &&
                                  activeWidget !== visibleItems[1]
                                }
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
              activeSpan={activeSpan}
            />
          </div>
        </div>
      </DndContext>
    </div>
  );
}
