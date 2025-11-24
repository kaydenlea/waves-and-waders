"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSurfIntensityAPI } from "../api";

const HOUR_MS = 60 * 60 * 1000;

const toDateKey = (value: Date | string | null | undefined) => {
  if (!value) return null;
  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0] : value;
  }
  return value.toISOString().split("T")[0]!;
};

export function useSurfIntensity(
  date: Date | string | null | undefined,
  enabled: boolean = true
) {
  const dateKey = toDateKey(date);
  return useQuery({
    queryKey: ["surf-intensity", dateKey],
    enabled: enabled && Boolean(dateKey),
    staleTime: HOUR_MS,
    queryFn: async () => {
      if (!dateKey) {
        throw new Error("Date is required");
      }
      return fetchSurfIntensityAPI(new Date(`${dateKey}T00:00:00Z`));
    },
  });
}
