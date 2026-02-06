"use client";

import React from "react";
import type { Map } from "maplibre-gl";

export type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  grid_id?: number | null;
  features?: Record<string, boolean>;
};

type PanelKey = "filters" | "legend" | "date";

type MapUIContextValue = {
  openPanel: PanelKey | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<PanelKey | null>>;
  togglePanel: (panel: PanelKey) => void;
  legendOpen: boolean;
  setLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showMap: boolean;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
};

type MapDataContextValue = {
  popupId: React.RefObject<string | null>;
  popupRef: React.RefObject<{
    id: number;
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>;
  popupData: string | null;
  setPopupData: React.Dispatch<React.SetStateAction<string | null>>;
  map: Map | undefined;
  setMap: React.Dispatch<React.SetStateAction<Map | undefined>>;
  mapRef: React.RefObject<Map | null>;
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  surfIntensityForDate: number | null;
  setSurfIntensityForDate: React.Dispatch<React.SetStateAction<number | null>>;
  beaches: BeachPoint[];
  setBeaches: React.Dispatch<React.SetStateAction<BeachPoint[]>>;
  favoriteIds: Set<string>;
  setFavoriteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoverCardId: string | null;
  setHoverCardId: React.Dispatch<React.SetStateAction<string | null>>;
};

const MapUIContext = React.createContext<MapUIContextValue | null>(null);
const MapPopupContext = React.createContext<
  Pick<
    MapDataContextValue,
    "popupId" | "popupRef" | "popupData" | "setPopupData"
  > | null
>(null);
const MaplibreMapContext = React.createContext<
  Pick<MapDataContextValue, "map" | "setMap" | "mapRef"> | null
>(null);
const MapFiltersContext = React.createContext<
  Pick<MapDataContextValue, "filters" | "setFilters"> | null
>(null);
const MapSurfIntensityContext = React.createContext<
  Pick<MapDataContextValue, "surfIntensityForDate" | "setSurfIntensityForDate"> | null
>(null);
const MapBeachesContext = React.createContext<
  Pick<MapDataContextValue, "beaches" | "setBeaches"> | null
>(null);
const MapFavoritesContext = React.createContext<
  Pick<MapDataContextValue, "favoriteIds" | "setFavoriteIds"> | null
>(null);
const MapHoverCardContext = React.createContext<
  Pick<MapDataContextValue, "hoverCardId" | "setHoverCardId"> | null
>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = React.useState<PanelKey | null>(null);
  const [legendOpen, setLegendOpen] = React.useState(false);
  const togglePanel = React.useCallback((panel: PanelKey) => {
    if (panel === "legend") {
      setLegendOpen((prev) => !prev);
      return;
    }
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);
  const [showMap, setShowMap] = React.useState(true);
  const popupId = React.useRef<string | null>(null);
  const popupRef = React.useRef<{
    id: number;
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>(null);
  const [popupData, setPopupData] = React.useState<string | null>(null);
  const [map, setMap] = React.useState<Map | undefined>(undefined);
  const mapRef = React.useRef<Map | null>(null);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  const [surfIntensityForDate, setSurfIntensityForDate] = React.useState<
    number | null
  >(null);
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [hoverCardId, setHoverCardId] = React.useState<string | null>(null);
  const uiValue = React.useMemo(
    () => ({
      openPanel,
      setOpenPanel,
      togglePanel,
      legendOpen,
      setLegendOpen,
      showMap,
      setShowMap,
    }),
    [openPanel, togglePanel, legendOpen, showMap]
  );

  const popupValue = React.useMemo(
    () => ({ popupId, popupRef, popupData, setPopupData }),
    [popupData]
  );
  const mapValue = React.useMemo(() => ({ map, setMap, mapRef }), [map]);
  const filtersValue = React.useMemo(
    () => ({ filters, setFilters }),
    [filters]
  );
  const surfIntensityValue = React.useMemo(
    () => ({ surfIntensityForDate, setSurfIntensityForDate }),
    [surfIntensityForDate]
  );
  const beachesValue = React.useMemo(
    () => ({ beaches, setBeaches }),
    [beaches]
  );
  const favoritesValue = React.useMemo(
    () => ({ favoriteIds, setFavoriteIds }),
    [favoriteIds]
  );
  const hoverCardValue = React.useMemo(
    () => ({ hoverCardId, setHoverCardId }),
    [hoverCardId]
  );
  return (
    <MapUIContext.Provider value={uiValue}>
      <MapPopupContext.Provider value={popupValue}>
        <MaplibreMapContext.Provider value={mapValue}>
          <MapFiltersContext.Provider value={filtersValue}>
            <MapSurfIntensityContext.Provider value={surfIntensityValue}>
              <MapBeachesContext.Provider value={beachesValue}>
                <MapFavoritesContext.Provider value={favoritesValue}>
                  <MapHoverCardContext.Provider value={hoverCardValue}>
                    {children}
                  </MapHoverCardContext.Provider>
                </MapFavoritesContext.Provider>
              </MapBeachesContext.Provider>
            </MapSurfIntensityContext.Provider>
          </MapFiltersContext.Provider>
        </MaplibreMapContext.Provider>
      </MapPopupContext.Provider>
    </MapUIContext.Provider>
  );
}

export function useMapUI(): MapUIContextValue {
  const ctx = React.useContext(MapUIContext);
  if (!ctx) throw new Error("useMapUI must be used within MapFilterProvider");
  return ctx;
}

export function useMapData(): MapDataContextValue {
  const popup = React.useContext(MapPopupContext);
  const map = React.useContext(MaplibreMapContext);
  const filters = React.useContext(MapFiltersContext);
  const surf = React.useContext(MapSurfIntensityContext);
  const beaches = React.useContext(MapBeachesContext);
  const favorites = React.useContext(MapFavoritesContext);
  const hover = React.useContext(MapHoverCardContext);
  if (
    !popup ||
    !map ||
    !filters ||
    !surf ||
    !beaches ||
    !favorites ||
    !hover
  ) {
    throw new Error("useMapData must be used within MapFilterProvider");
  }
  return React.useMemo(
    () => ({
      ...popup,
      ...map,
      ...filters,
      ...surf,
      ...beaches,
      ...favorites,
      ...hover,
    }),
    [popup, map, filters, surf, beaches, favorites, hover]
  );
}

export function useMapFilters(): MapUIContextValue & MapDataContextValue {
  const ui = useMapUI();
  const data = useMapData();
  return React.useMemo(() => ({ ...ui, ...data }), [ui, data]);
}

export function useMapFiltersData(): Pick<
  MapDataContextValue,
  "filters" | "setFilters"
> {
  const ctx = React.useContext(MapFiltersContext);
  if (!ctx) {
    throw new Error(
      "useMapFiltersData must be used within MapFilterProvider"
    );
  }
  return ctx;
}

export function useMapFavoriteIdsData(): Pick<
  MapDataContextValue,
  "favoriteIds" | "setFavoriteIds"
> {
  const ctx = React.useContext(MapFavoritesContext);
  if (!ctx) {
    throw new Error(
      "useMapFavoriteIdsData must be used within MapFilterProvider"
    );
  }
  return ctx;
}

export function useMapHoverCardData(): Pick<
  MapDataContextValue,
  "hoverCardId" | "setHoverCardId"
> {
  const ctx = React.useContext(MapHoverCardContext);
  if (!ctx) {
    throw new Error(
      "useMapHoverCardData must be used within MapFilterProvider"
    );
  }
  return ctx;
}
