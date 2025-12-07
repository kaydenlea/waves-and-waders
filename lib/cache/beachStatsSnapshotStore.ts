import type { BeachStatsSnapshot } from "@/lib/beachStatsShared";

type SnapshotMap = Record<string, BeachStatsSnapshot | null>;

type Options = {
  dateKey: string;
  hourKey: string | number;
};

type Entry = {
  data: SnapshotMap;
  expiresAt: number;
};

const TTL_MS = 60 * 1000;
const store = new Map<string, Entry>();

const makeKey = (ids: string[], { dateKey, hourKey }: Options) => {
  return `${ids.slice().sort().join("|")}:${dateKey}:${hourKey}`;
};

export const getCachedBatch = (
  ids: string[],
  options: Options
): SnapshotMap | null => {
  if (!ids.length) return null;
  const key = makeKey(ids, options);
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) {
    return entry.data;
  }
  store.delete(key);
  return null;
};

export const setCachedBatch = (
  ids: string[],
  options: Options,
  data: SnapshotMap
) => {
  if (!ids.length) return;
  const key = makeKey(ids, options);
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
};
