"use client";

import { useEffect, useMemo } from "react";
import { useMapFilters } from "@/components/context/MapFilterContext";

type Props = {
  favoriteIds: string[];
};

const FavoriteIdsHydrator = ({ favoriteIds }: Props) => {
  const { setFavoriteIds } = useMapFilters();
  const setValue = useMemo(() => new Set((favoriteIds ?? []).map(String)), [favoriteIds]);

  useEffect(() => {
    setFavoriteIds(setValue);
  }, [setFavoriteIds, setValue]);

  return null;
};

export default FavoriteIdsHydrator;

