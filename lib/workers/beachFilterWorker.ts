/// <reference lib="webworker" />

import type { BeachPoint } from "@/components/context/MapFilterContext";

type IncomingMessage = {
  beaches: BeachPoint[];
  filters: string[];
};

type OutgoingMessage = {
  beaches: BeachPoint[];
};

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

const passesFilters = (beach: BeachPoint, filters: string[]): boolean => {
  if (!beach || beach.features?.INLND_AREA) {
    return false;
  }
  if (!filters.length) {
    return true;
  }
  const feat = beach.features || {};
  for (const key of filters) {
    if (!feat[key]) {
      return false;
    }
  }
  return true;
};

ctx.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const { beaches, filters } = event.data || { beaches: [], filters: [] };
  const filterList = Array.isArray(filters) ? filters : [];
  const filtered = Array.isArray(beaches)
    ? beaches.filter((beach) => passesFilters(beach, filterList))
    : [];
  const response: OutgoingMessage = { beaches: filtered };
  ctx.postMessage(response);
};

export {};
