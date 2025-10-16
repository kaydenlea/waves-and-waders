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
  "surfAndWind",
  // "surf",
  "energy",
  // "wind",
  "table",
] as const;

const BASE_META_OVERVIEW: Partial<Record<WidgetId, WidgetMeta>> = {
  stats: { id: "stats", title: "Key Stats", visible: true, span: "half" },
  tide: { id: "tide", title: "Tide Chart", visible: true, span: "half" },
  surf: { id: "surf", title: "Surf Chart", visible: true, span: "half" },
  swell: { id: "swell", title: "Swell Chart", visible: true, span: "half" },
  energy: {
    id: "energy",
    title: "Wave Energy Chart",
    visible: true,
    span: "half",
  },
  wind: { id: "wind", title: "Wind Chart", visible: true, span: "half" },
  table: {
    id: "table",
    title: "Stats Table",
    visible: true,
    span: "full",
    immutableFull: true,
  },
};

const BASE_META_FORECAST: Partial<Record<WidgetId, WidgetMeta>> = {
  stats: { id: "stats" },
  tide: {
    id: "tide",
    title: "Tide Chart",
    visible: true,
    span: "full",
    immutableFull: true,
  },
  surfAndWind: {
    id: "surfAndWind",
    title: "Bar Charts",
    visible: true,
    span: "full",
    immutableFull: true,
  },
  // surf: {
  //   id: "surf",
  //   title: "Surf Chart",
  //   visible: true,
  //   span: "half",
  //   immutableFull: true,
  // },
  swell: {
    id: "swell",
    title: "Swell Chart",
    visible: true,
    span: "full",
    immutableFull: true,
  },
  energy: {
    id: "energy",
    title: "Wave Energy Chart",
    visible: true,
    span: "full",
    immutableFull: true,
  },
  // wind: {
  //   id: "wind",
  //   title: "Wind Chart",
  //   visible: true,
  //   span: "half",
  //   immutableFull: true,
  // },
  table: {
    id: "table",
    title: "Stats Table",
    visible: true,
    span: "full",
    immutableFull: true,
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
  "swell",
  "surfAndWind",
  // "surf",
  // "wind",
  "energy",
  "table",
];

const STORAGE_PREFIX = "waves-waders:dashboard";
const STORAGE_VERSION = "v1";

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
  order: WidgetId[]
): Row[] => {
  const rows: Row[] = [];
  const halfBuffer: WidgetId[] = [];
  for (const id of order) {
    const m = meta[id];
    if (!m || m.visible === false) continue;
    if (m.span === "full") {
      rows.push({ id: rid(), items: [m.id] });
    } else {
      halfBuffer.push(m.id);
      if (halfBuffer.length === 2) {
        rows.push({ id: rid(), items: [halfBuffer[0], halfBuffer[1]] });
        halfBuffer.length = 0;
      }
    }
  }
  if (halfBuffer.length) rows.push({ id: rid(), items: [halfBuffer[0]] });
  return rows;
};

export const getDefaultLayout = (type: DashboardType) => {
  const meta = getDefaultMeta(type);
  const rows = buildInitialRows(meta, getDefaultOrder(type));
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
    if (typeof candidate.title === "string") {
      meta[id].title = candidate.title;
    }
    if (typeof candidate.visible !== "undefined") {
      meta[id].visible = Boolean(candidate.visible);
    }
    if (isSpan(candidate.span)) {
      meta[id].span = candidate.span;
    }
    if (typeof candidate.immutableFull !== "undefined") {
      meta[id].immutableFull = Boolean(candidate.immutableFull);
    }
  }

  return meta;
};

export const normalizeRows = (
  type: DashboardType,
  raw: unknown,
  meta: Partial<Record<WidgetId, WidgetMeta>>
): Row[] => {
  const fallback = buildInitialRows(meta, getDefaultOrder(type));
  if (!Array.isArray(raw)) return fallback;

  const seen = new Set<WidgetId>();
  const rows: Row[] = [];

  const pushRow = (items: WidgetId[], id?: string) => {
    if (!items.length) return;
    rows.push({ id: id ?? rid(), items });
  };

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const rawItems = Array.isArray((entry as Row).items)
      ? (entry as Row).items
      : [];
    const baseId =
      typeof (entry as Row).id === "string" ? (entry as Row).id : rid();

    const filtered: WidgetId[] = [];
    for (const rawId of rawItems) {
      if (typeof rawId !== "string") continue;
      if (!meta[rawId as WidgetId]) continue;
      if (seen.has(rawId as WidgetId)) continue;
      filtered.push(rawId as WidgetId);
      seen.add(rawId as WidgetId);
    }
    if (!filtered.length) continue;

    const full = filtered.filter((id) => meta[id].span === "full");
    const halves = filtered.filter((id) => meta[id].span !== "full");

    full.forEach((id, idx) => pushRow([id], idx === 0 ? baseId : undefined));

    if (halves.length) {
      for (let i = 0; i < halves.length; i += 2) {
        const slice = halves.slice(i, i + 2);
        pushRow(slice, full.length === 0 && i === 0 ? baseId : undefined);
      }
    }
  }

  const order = getDefaultOrder(type);
  const missing = order.filter((id) => !seen.has(id));
  if (missing.length) {
    const supplemental = buildInitialRows(meta, missing);
    supplemental.forEach((row) => {
      rows.push(row);
      row.items.forEach((id) => seen.add(id));
    });
  }

  return rows.length ? rows : fallback;
};
