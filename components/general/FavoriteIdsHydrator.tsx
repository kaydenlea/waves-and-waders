"use client";

import { useEffect, useMemo } from "react";
import { useMapData } from "@/components/context/MapFilterContext";

type Props = {
  favoriteIds: string[];
};

const FavoriteIdsHydrator = ({ favoriteIds }: Props) => {
  const { setFavoriteIds } = useMapData();
  const setValue = useMemo(() => new Set((favoriteIds ?? []).map(String)), [favoriteIds]);

  useEffect(() => {
    setFavoriteIds(setValue);
  }, [setFavoriteIds, setValue]);

  return null;
};

export default FavoriteIdsHydrator;
