"use client";

import { useEffect, useMemo } from "react";
import { useBeachStatsCache } from "@/components/context/BeachStatsCacheContext";
import type { BeachStatsSnapshot } from "@/lib/beachStatsShared";
import { reviveStatsMap } from "@/lib/beachStatsShared";

type Props = {
  snapshots?: Record<string, BeachStatsSnapshot | null> | null;
  dateKey: string;
  hourKey: string | number;
};

export default function BeachStatsHydrator({
  snapshots,
  dateKey,
  hourKey,
}: Props) {
  const { primeSnapshots } = useBeachStatsCache();
  const revived = useMemo(
    () => reviveStatsMap(snapshots ?? {}),
    [snapshots]
  );

  useEffect(() => {
    if (!revived || Object.keys(revived).length === 0) return;
    primeSnapshots(revived, dateKey, hourKey);
  }, [revived, dateKey, hourKey, primeSnapshots]);

  return null;
}
