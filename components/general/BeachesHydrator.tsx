"use client";

import { useEffect, useMemo } from "react";
import { useMapData } from "@/components/context/MapFilterContext";

type HydratorBeach = {
  id: string | number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
  features?: Record<string, boolean>;
};

type Props = {
  beaches: HydratorBeach[];
};

export default function BeachesHydrator({ beaches }: Props) {
  const { setBeaches } = useMapData();

  const normalized = useMemo(
    () =>
      (beaches ?? []).map((beach) => ({
        id: String(beach.id),
        name: beach.Name ?? "",
        county: beach.COUNTY ?? "",
        latitude: Number(beach.LATITUDE),
        longitude: Number(beach.LONGITUDE),
        features: beach.features,
      })),
    [beaches]
  );

  useEffect(() => {
    if (!normalized.length) {
      return;
    }

    setBeaches((prev) => {
      if (
        prev.length === normalized.length &&
        prev.length > 0 &&
        prev[0]?.id === normalized[0]?.id
      ) {
        return prev;
      }
      return normalized;
    });
  }, [normalized, setBeaches]);

  return null;
}
