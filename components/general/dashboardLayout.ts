export type DashboardType = "overview" | "forecast";

export type Span = "half" | "full";

export type WidgetId =
  | "stats"
  | "tide"
  | "surf"
  | "swell"
  | "energy"
  | "wind"
  | "table"
  | "surfAndWind";

export interface WidgetMeta {
  id: WidgetId;
  title?: string;
  visible?: boolean;
  span?: Span;
  immutableFull?: boolean;
}

export interface Row {
  id: string;
  items: WidgetId[];
}

export const ALL_WIDGET_IDS: readonly WidgetId[] = [
  "stats",
  "tide",
  "swell",
  "surf",
  "energy",
  "wind",
  "table",
] as const;

const BASE_META_OVERVIEW: Partial<Record<WidgetId, WidgetMeta>> = {
  stats: { id: "stats", title: "Stats", visible: true, span: "half" },
  tide: { id: "tide", title: "Tide", visible: true, span: "half" },
  surf: { id: "surf", title: "Surf", visible: true, span: "half" },
  swell: { id: "swell", title: "Swell", visible: true, span: "half" },
  energy: {
    id: "energy",
    title: "Energy",
    visible: true,
    span: "half",
  },
  wind: { id: "wind", title: "Wind", visible: true, span: "half" },
  table: {
    id: "table",
    title: "Daily",
    visible: true,
    span: "full",
  },
};

const BASE_META_FORECAST: Partial<Record<WidgetId, WidgetMeta>> = {
  stats: { id: "stats" },
  tide: {
    id: "tide",
    title: "Tide",
    visible: true,
    span: "half",
  },
  surf: {
    id: "surf",
    title: "Surf",
    visible: true,
    span: "half",
  },
  swell: {
    id: "swell",
    title: "Swell",
    visible: true,
    span: "half",
  },
  energy: {
    id: "energy",
    title: "Energy",
    visible: true,
    span: "half",
  },
  wind: {
    id: "wind",
    title: "Wind",
    visible: true,
    span: "half",
  },
  table: {
    id: "table",
    title: "Daily",
    visible: true,
    span: "full",
  },
};

const INITIAL_ORDER_OVERVIEW: WidgetId[] = [
  "stats",
  "tide",
  "swell",
  "surf",
  "energy",
  "wind",
  "table",
];

const INITIAL_ORDER_FORECAST: WidgetId[] = [
  "tide",
  "energy",
  "surf",
  "wind",
  "swell",
  "table",
];

const STORAGE_PREFIX = "waves-waders:dashboard";
const STORAGE_VERSION = "v2";

export const getDashboardStorageKey = (
  type: DashboardType,
  target: "meta" | "rows"
) => `${STORAGE_PREFIX}:${type}:${target}:${STORAGE_VERSION}`;

export const rid = () =>
  `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const cloneMeta = (
  meta: Partial<Record<WidgetId, WidgetMeta>>
): Partial<Record<WidgetId, WidgetMeta>> => {
  const next: Partial<Record<WidgetId, WidgetMeta>> = {} as Partial<
    Record<WidgetId, WidgetMeta>
  >;
  for (const id of ALL_WIDGET_IDS) {
    const entry = meta[id];
    next[id] = { ...entry, id };
  }
  return next;
};

export const getDefaultMeta = (type: DashboardType) =>
  cloneMeta(type === "overview" ? BASE_META_OVERVIEW : BASE_META_FORECAST);

export const getDefaultOrder = (type: DashboardType) =>
  [
    ...(type === "overview" ? INITIAL_ORDER_OVERVIEW : INITIAL_ORDER_FORECAST),
  ] as WidgetId[];

export const buildInitialRows = (
  meta: Partial<Record<WidgetId, WidgetMeta>>,
  order: WidgetId[],
  type: DashboardType
): Row[] => {
  const rows: Row[] = [];
  const halfBuffer: WidgetId[] = [];

  const nextAutoId = (items: WidgetId[]) =>
    `auto:${type}:${rows.length}:${items.join("-")}`;

  for (const id of order) {
    const m = meta[id];
    if (!m || m.visible === false) continue;
    if (m.span === "full") {
      rows.push({ id: nextAutoId([m.id]), items: [m.id] });
    } else {
      halfBuffer.push(m.id);
      if (halfBuffer.length === 2) {
        const items: WidgetId[] = [halfBuffer[0], halfBuffer[1]];
        rows.push({ id: nextAutoId(items), items });
        halfBuffer.length = 0;
      }
    }
  }
  if (halfBuffer.length) {
    rows.push({ id: nextAutoId([halfBuffer[0]]), items: [halfBuffer[0]] });
  }
  return rows;
};

export const getDefaultLayout = (type: DashboardType) => {
  const meta = getDefaultMeta(type);
  const rows = buildInitialRows(meta, getDefaultOrder(type), type);
  return { meta, rows };
};

const isSpan = (value: unknown): value is Span =>
  value === "half" || value === "full";

export const normalizeMeta = (
  type: DashboardType,
  raw: unknown
): Partial<Record<WidgetId, WidgetMeta>> => {
  const meta = getDefaultMeta(type);
  if (!raw || typeof raw !== "object") return meta;

  for (const id of ALL_WIDGET_IDS) {
    const incoming = (raw as Record<string, unknown>)[id];
    if (!incoming || typeof incoming !== "object") continue;

    const candidate = incoming as Partial<WidgetMeta>;
    if (typeof candidate.visible !== "undefined" && meta[id]) {
      meta[id].visible = Boolean(candidate.visible);
    }
    if (isSpan(candidate.span) && meta[id]) {
      meta[id].span = candidate.span;
    }
    // title should NEVER be copied from saved data - always use defaults
    // immutableFull should NEVER be copied from saved data - always use defaults
    // This ensures that schema changes (like removing immutableFull from widgets) take effect
  }

  return meta;
};

export const normalizeRows = (
  type: DashboardType,
  raw: unknown,
  meta: Partial<Record<WidgetId, WidgetMeta>>
): Row[] => {
  const fallback = buildInitialRows(meta, getDefaultOrder(type), type);
  if (!Array.isArray(raw)) return fallback;

  const seen = new Set<WidgetId>();
  const rows: Row[] = [];

  const pushRow = (items: WidgetId[], id?: string) => {
    if (!items.length) return;
    rows.push({ id: id ?? rid(), items });
  };

  for (let entryIndex = 0; entryIndex < raw.length; entryIndex++) {
    const entry = raw[entryIndex];
    if (!entry || typeof entry !== "object") continue;

    const rawItems: unknown[] = Array.isArray((entry as any).items)
      ? (entry as any).items
      : [];
    const baseId = (() => {
      if (typeof (entry as Row).id === "string") return (entry as Row).id;
      const itemSig = rawItems
        .filter((id): id is string => typeof id === "string")
        .join("-");
      // Deterministic ID when persisted rows omit an id (prevents remount/flicker on reload).
      return `norm:${type}:${entryIndex}:${itemSig}`;
    })();
    let derivedRowIndex = 0;
    const nextDerivedId = () =>
      derivedRowIndex++ === 0 ? baseId : `${baseId}:${derivedRowIndex - 1}`;

    const filtered: WidgetId[] = [];
    for (const rawId of rawItems) {
      if (typeof rawId !== "string") continue;
      if (!meta[rawId as WidgetId]) continue;
      if (seen.has(rawId as WidgetId)) continue;
      filtered.push(rawId as WidgetId);
      seen.add(rawId as WidgetId);
    }
    if (!filtered.length) continue;

    const full = filtered.filter((id) => meta[id]?.span === "full");
    const halves = filtered.filter((id) => meta[id]?.span !== "full");

    full.forEach((id) => pushRow([id], nextDerivedId()));

    if (halves.length) {
      for (let i = 0; i < halves.length; i += 2) {
        const slice = halves.slice(i, i + 2);
        pushRow(slice, nextDerivedId());
      }
    }
  }

  const order = getDefaultOrder(type);
  const missing = order.filter((id) => !seen.has(id));
  if (missing.length) {
    const supplemental = buildInitialRows(meta, missing, type);
    supplemental.forEach((row) => {
      rows.push(row);
      row.items.forEach((id) => seen.add(id));
    });
  }

  return rows.length ? rows : fallback;
};
