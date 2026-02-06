"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  AttributionControl,
  Map,
  Popup,
  Source,
  Layer,
  Marker,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapGeoJSONFeature, MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Geometry, Position } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  FEATURE_CATEGORIES,
  getFeatureDisplayName,
  generateBeachSlug,
  generateBeachUrl,
  extractBeachId,
} from "@/lib/supabase";
import {
  useSwellDirections,
  usePrefetchAdjacentDates,
} from "@/lib/hooks/useBeachData";
const DEFAULT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE;
const MAP_POINT_LAYER_IDS = [
  "clusters",
  "cluster-count",
  "clusters-hover",
  "unclustered-point",
  "unclustered-point-label",
];
const DETAIL_LAYER_KEYWORDS = [
  "building",
  "structure",
  "street",
  "highway",
  "rail",
  "transit",
  "poi",
  "landuse",
  "landcover",
  "park",
  "aeroway",
];
const DETAIL_LAYER_ALWAYS_VISIBLE = [
  "background",
  "road",
  "label",
  "place",
  "water",
  "ocean",
  "sea",
  "lake",
  "river",
  "coast",
  "shore",
];
import { cn } from "@/lib/utils";
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  X,
  ChevronUp,
  ChevronDown,
  Waves,
  Wind,
  SlidersHorizontal,
  Info,
  Map as MapIcon,
  MapPin,
  Minimize2,
  MapPinned,
  Compass,
} from "lucide-react";
import { SwellRings, WindRing } from "./DirectionRings";
import { useMapData, useMapUI } from "../context/MapFilterContext";
import { useMapViewport } from "../context/MapViewportContext";
import { useViewportBeachesContext } from "../context/ViewportBeachesContext";
import { useDateContext } from "../context/DateContext";
import {
  MAP_FOCUS_EVENT,
  type MapFocusEventDetail,
} from "../general/mapEvents";
import { motion, AnimatePresence } from "framer-motion";
import { useOptionalSearchContext } from "../context/SearchContext";
import { useClientPath } from "../context/PathContext";
import PageTabs from "../general/PageTabs";

// Prefetch map style once to shave a network round-trip off the first paint.
let mapStylePrefetch: Promise<void> | null = null;
const prefetchMapStyle = () => {
  if (mapStylePrefetch || typeof window === "undefined") return;
  mapStylePrefetch = fetch(MAP_STYLE_URL, { cache: "force-cache" })
    .then(() => {})
    .catch(() => {});
};

type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  grid_id?: number | null;
  features?: Record<string, boolean>;
  surfIntensity?: number;
};

type VisibleMapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
  crossesAntimeridian: boolean;
};

type SwellDirectionSet = {
  primary: number | null;
  secondary: number | null;
  tertiary: number | null;
};

type OverlayLabels = {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
  wind: string | null;
} | null;

type MapInstance = ReturnType<MapRef["getMap"]>;

type MapWithHoverState = MapInstance & {
  __lastClusterHoverId?: number | null;
};

type PopupProperties = {
  id: string | number;
  name: string;
  county: string;
  surfIntensity: number;
  conditions?: { windDirection?: number };
} & Record<string, unknown>;

type BeachGeoJsonCollection = FeatureCollection<Geometry, PopupProperties>;

type GeoJsonSourceLike = {
  setData?: (data: BeachGeoJsonCollection) => void;
  getClusterExpansionZoom?: (
    clusterId: number,
    callback: (error: Error | null, zoom: number) => void
  ) => void;
};

type MapStyleLayer = {
  id?: string;
  source?: string;
  type?: string;
  layout?: { visibility?: string };
};

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

type PopupEntry = {
  id: number;
  longitude: number;
  latitude: number;
  properties: PopupProperties;
};

const normalizeLon = (lon: number) => {
  let value = lon;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return value;
};

const BOUNDS_DELTA_THRESHOLD = 0.0005;
const MIN_BOUNDS_INTERVAL_MS = 120;
const logPerf = (label: string, startTs: number | null) => {
  if (
    startTs == null ||
    typeof performance === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return;
  }
  const duration = performance.now() - startTs;

  console.log(`[MapPerf] ${label}: ${duration.toFixed(1)}ms`);
};

type Props = {
  beachId?: string | number;
  loggedIn?: boolean;
  initialBeach?: BeachPoint | null;
};

const InteractiveMap = ({ beachId, loggedIn, initialBeach }: Props) => {
  const { favoriteIds, hoverCardId } = useMapData();
  const {
    beaches: viewportBeaches,
    status: viewportStatus,
    onCameraChange,
    camera,
  } = useViewportBeachesContext();
  const [mapIsMoving, setMapIsMoving] = React.useState(false);
  const [renderBeaches, setRenderBeaches] =
    React.useState<BeachPoint[]>(viewportBeaches);
  React.useEffect(() => {
    if (viewportBeaches === renderBeaches) {
      return;
    }
    setRenderBeaches(viewportBeaches);
  }, [viewportBeaches, renderBeaches]);
  const beaches = React.useMemo(() => {
    if (!initialBeach) {
      return renderBeaches;
    }
    const latitude = Number(initialBeach.latitude);
    const longitude = Number(initialBeach.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return renderBeaches;
    }
    const hasPinned = renderBeaches.some(
      (beach) => String(beach.id) === String(initialBeach.id)
    );
    if (hasPinned) {
      return renderBeaches;
    }
    return [
      ...renderBeaches,
      {
        ...initialBeach,
        latitude,
        longitude,
      },
    ];
  }, [renderBeaches, initialBeach]);

  // Debug: Log beaches count whenever it changes
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Beaches from context: ${beaches.length} beaches`);
    }
  }, [beaches]);
  const { selectedTab } = useClientPath();
  const [selected, setSelected] = React.useState<BeachPoint | null>(null);
  const selectedRef = React.useRef<BeachPoint | null>(null);
  const [storedSelectionId, setStoredSelectionId] = React.useState<
    string | null
  >(null);
  const {
    openPanel,
    setOpenPanel,
    togglePanel,
    showMap,
    setShowMap,
    legendOpen,
    setLegendOpen,
  } =
    useMapUI();
  const {
    popupData,
    setPopupData,
    popupId,
    popupRef,
    map,
    setMap,
    filters,
    setFilters,
  } = useMapData();
  const deferredFilters = React.useDeferredValue(filters);
  const { setVisibleBounds, setViewportRequestId, setAllowViewportCommit } =
    useMapViewport();
  const { selected: selectedDate, hour } = useDateContext();
  const selectedHour = Number.isFinite(hour) ? hour : null;
  const [located, setLocated] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [surfIntensity, setSurfIntensity] = React.useState<
    Record<string | number, number>
  >({});
  const filterBeachesSync = React.useCallback(() => {
    if (!renderBeaches.length) return [];
    const filterList = Array.from(deferredFilters ?? []);
    return renderBeaches.filter((beach) => {
      if (beach.features?.INLND_AREA) return false;
      if (!filterList.length) return true;
      const feats = beach.features ?? {};
      return filterList.every((key) => feats[key]);
    });
  }, [deferredFilters, renderBeaches]);

  const [workerFilteredBeaches, setWorkerFilteredBeaches] = React.useState<
    BeachPoint[]
  >(filterBeachesSync());
  // Cache surf intensity data for multiple dates
  const surfIntensityCacheRef = React.useRef<
    Record<string, Record<string | number, number>>
  >({});
  const [swellDirections, setSwellDirections] =
    React.useState<SwellDirectionSet | null>(null);
  const [windDirection, setWindDirection] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState<number>(6);
  const lastHoverInternalIdRef = React.useRef<number | null>(null);
  // Map ref must be declared before helpers that depend on it
  const mapRef = React.useRef<MapRef>(null);
  const getMapInstance = React.useCallback((): MapInstance | null => {
    const ref = mapRef.current;
    if (!ref) return null;
    return typeof ref.getMap === "function"
      ? ref.getMap()
      : (ref as unknown as MapInstance);
  }, []);
  const persistViewTimeoutRef = React.useRef<number | null>(null);
  const lastPublishedBoundsRef = React.useRef<VisibleMapBounds | null>(null);
  const lastPublishTsRef = React.useRef<number>(0);
  // Manage a single smooth camera transition once the map/container are ready
  const centerRafRef = React.useRef<number | null>(null);
  const readinessRafRef = React.useRef<number | null>(null);
  const detailLayerStoreRef = React.useRef<Map<string, string>>(
    new globalThis.Map<string, string>()
  );
  const filterWorkerRef = React.useRef<Worker | null>(null);
  const filterUpdateTimeoutRef = React.useRef<number | null>(null);
  const overlayLayerIds = React.useMemo(
    () => new Set<string>(MAP_POINT_LAYER_IDS),
    []
  );
  const shouldTrackDetailLayer = React.useCallback(
    (layer: MapStyleLayer) => {
      if (!layer || typeof layer.id !== "string") return false;
      if (overlayLayerIds.has(layer.id)) return false;
      if (layer.source === "beaches") return false;
      const layerId = layer.id.toLowerCase();
      if (
        DETAIL_LAYER_ALWAYS_VISIBLE.some((keyword) => layerId.includes(keyword))
      ) {
        return false;
      }
      if (layer.type === "symbol") {
        return true;
      }
      return DETAIL_LAYER_KEYWORDS.some((keyword) => layerId.includes(keyword));
    },
    [overlayLayerIds]
  );
  const captureDetailLayers = React.useCallback(
    (mapInstance: MapInstance | null | undefined) => {
      if (!mapInstance || typeof mapInstance.getStyle !== "function") return;
      try {
        const style = mapInstance.getStyle();
        const layers = style?.layers;
        if (!Array.isArray(layers)) return;
        const next = new globalThis.Map<string, string>();
        layers.forEach((layer: MapStyleLayer) => {
          if (!shouldTrackDetailLayer(layer)) return;
          const layerId = layer.id;
          if (typeof layerId !== "string") return;
          const visibility =
            typeof layer?.layout?.visibility === "string"
              ? (layer.layout.visibility as string)
              : "visible";
          next.set(layerId, visibility);
        });
        detailLayerStoreRef.current = next;
      } catch {}
    },
    [shouldTrackDetailLayer]
  );
  const hideDetailLayers = React.useCallback(
    (mapInstance: MapInstance | null | undefined) => {
      if (!mapInstance || typeof mapInstance.setLayoutProperty !== "function") {
        return;
      }
      detailLayerStoreRef.current.forEach((_, layerId) => {
        try {
          mapInstance.setLayoutProperty(layerId, "visibility", "none");
        } catch {}
      });
    },
    []
  );
  // Removed static offset; compute exact center using symmetric pixel bounds

  React.useEffect(() => {
    return () => {
      if (persistViewTimeoutRef.current != null) {
        const anyWindow = window as IdleCallbackWindow;
        if (typeof anyWindow.cancelIdleCallback === "function") {
          anyWindow.cancelIdleCallback(persistViewTimeoutRef.current);
        } else {
          window.clearTimeout(persistViewTimeoutRef.current);
        }
      }
    };
  }, []);

  const easeToWhenReady = React.useCallback(
    (
      target: { longitude: number; latitude: number },
      zoomLevel: number = 16,
      duration: number = 500
    ) => {
      const cancelPending = () => {
        if (centerRafRef.current != null) {
          cancelAnimationFrame(centerRafRef.current);
          centerRafRef.current = null;
        }
        if (readinessRafRef.current != null) {
          cancelAnimationFrame(readinessRafRef.current);
          readinessRafRef.current = null;
        }
      };
      cancelPending();

      const attempt = () => {
        const mapInstance = getMapInstance();
        const canvas: HTMLCanvasElement | null =
          mapInstance?.getCanvas?.() ?? null;
        const width = canvas?.clientWidth ?? 0;
        const height = canvas?.clientHeight ?? 0;
        const styleLoaded =
          typeof mapInstance?.isStyleLoaded === "function"
            ? mapInstance.isStyleLoaded()
            : true;
        if (!mapInstance || width === 0 || height === 0 || !styleLoaded) {
          readinessRafRef.current = requestAnimationFrame(attempt);
          return;
        }
        centerRafRef.current = requestAnimationFrame(() => {
          try {
            // Always use easeTo for smooth, direct transitions
            // This pans and zooms smoothly from current position to target
            // without any intermediate zoom-out effects
            mapInstance.easeTo({
              center: [target.longitude, target.latitude],
              zoom: zoomLevel,
              duration,
            });
            setZoom(zoomLevel);
          } catch {}
          centerRafRef.current = null;
        });
      };

      attempt();
      return cancelPending;
    },
    [getMapInstance]
  );
  const hoverRafRef = React.useRef<number | null>(null);
  const scheduleMapViewPersistence = React.useCallback(
    (payload: { longitude: number; latitude: number; zoom: number }) => {
      if (typeof window === "undefined") return;
      if (persistViewTimeoutRef.current != null) {
        const idleWindow = window as IdleCallbackWindow;
        if (typeof idleWindow.cancelIdleCallback === "function") {
          idleWindow.cancelIdleCallback(persistViewTimeoutRef.current);
        } else {
          window.clearTimeout(persistViewTimeoutRef.current);
        }
      }
      const run = () => {
        try {
          window.localStorage.setItem(
            "ww:last-map-view",
            JSON.stringify(payload)
          );
        } catch {}
        persistViewTimeoutRef.current = null;
      };
      const idleWindow = window as IdleCallbackWindow;
      if (typeof idleWindow.requestIdleCallback === "function") {
        persistViewTimeoutRef.current = idleWindow.requestIdleCallback(run, {
          timeout: 1000,
        });
      } else {
        persistViewTimeoutRef.current = window.setTimeout(run, 250);
      }
    },
    []
  );
  const readCurrentBounds = React.useCallback((): VisibleMapBounds | null => {
    try {
      const mapInstance = getMapInstance();
      if (!mapInstance || typeof mapInstance.getBounds !== "function") {
        return null;
      }
      const bounds = mapInstance.getBounds?.();
      if (!bounds) return null;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return {
        south: sw.lat,
        north: ne.lat,
        west: sw.lng,
        east: ne.lng,
        crossesAntimeridian: sw.lng > ne.lng,
      };
    } catch {
      return null;
    }
  }, [getMapInstance]);
  const emitCameraUpdate = React.useCallback(() => {
    const bounds = readCurrentBounds();
    if (!bounds) return;
    const start = typeof performance !== "undefined" ? performance.now() : null;
    const mapInstance = getMapInstance();
    const center = mapInstance?.getCenter?.();
    const zoomValue = mapInstance?.getZoom?.();
    onCameraChange({
      bounds,
      zoom: typeof zoomValue === "number" ? zoomValue : camera.zoom,
      center: center
        ? { longitude: center.lng, latitude: center.lat }
        : camera.center,
    });
    setVisibleBounds(bounds);
    setViewportRequestId((id) => id + 1);
    logPerf("setVisibleBounds", start);
  }, [
    camera.center,
    camera.zoom,
    getMapInstance,
    onCameraChange,
    readCurrentBounds,
    setVisibleBounds,
    setViewportRequestId,
  ]);
  const lastHoverFeatureIdRef = React.useRef<string | number | null>(null);
  const suppressCountsRef = React.useRef(0);
  const mapLastHoverInternalIdRef = React.useRef<number | null>(null);
  const [hoverClusterId, setHoverClusterId] = React.useState<number | null>(
    null
  );
  const userMovedRef = React.useRef(false);
  const suppressMoveRef = React.useRef(false);
  const initialFocusDoneRef = React.useRef(false);
  const prevEffectiveIdRef = React.useRef<string | null>(null);
  const prevFilterSignatureRef = React.useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [popupInfo, setPopupInfo] = React.useState<{
    id: number;
    longitude: number;
    latitude: number;
    properties: PopupProperties;
  } | null>(null);
  const searchCtx = useOptionalSearchContext();
  const isOverlay = searchCtx?.isOverlay ?? false;
  const setIsOverlay = searchCtx?.setIsOverlay;
  // Ensure we bind cluster layer click handlers once style/layers are ready
  const clusterHandlersBoundRef = React.useRef(false);
  // const [openPanel, setOpenPanel] = React.useState<"filters" | "legend" | null>(
  //   null
  // );
  // const togglePanel = (panel: "filters" | "legend") => {
  //   setOpenPanel((prev) => (prev === panel ? null : panel));
  // };

  const mapToIdRef = React.useRef<Record<string, PopupEntry>>({});
  const mapToId = mapToIdRef.current;
  const beachGeoJSONRef = React.useRef<BeachGeoJsonCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const applyBeachDataToSource = React.useCallback(
    (geojson: BeachGeoJsonCollection) => {
      const start =
        typeof performance !== "undefined" ? performance.now() : null;
      const mapInstance = getMapInstance();
      const source = mapInstance?.getSource?.("beaches") as
        | GeoJsonSourceLike
        | undefined;
      if (source && typeof source.setData === "function") {
        source.setData(geojson);
        logPerf("beachSource:setData", start);
      }
    },
    [getMapInstance]
  );
  const resumeCommitTimeoutRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    return () => {
      if (resumeCommitTimeoutRef.current != null) {
        window.clearTimeout(resumeCommitTimeoutRef.current);
        resumeCommitTimeoutRef.current = null;
      }
    };
  }, []);
  const cancelCommitResume = React.useCallback(() => {
    if (resumeCommitTimeoutRef.current != null) {
      window.clearTimeout(resumeCommitTimeoutRef.current);
      resumeCommitTimeoutRef.current = null;
    }
  }, []);
  const scheduleCommitResume = React.useCallback(() => {
    cancelCommitResume();
    resumeCommitTimeoutRef.current = window.setTimeout(() => {
      setAllowViewportCommit(true);
      resumeCommitTimeoutRef.current = null;
    }, 150);
  }, [cancelCommitResume, setAllowViewportCommit]);

  // Queue refocus requests if the map isn't ready yet
  const pendingRefocusRef = React.useRef<MapFocusEventDetail | null>(null);

  const findBeachMatch = React.useCallback(
    (identifier: string | null | undefined): BeachPoint | null => {
      if (!identifier) return null;
      const normalized = identifier.toLowerCase();
      return (
        beaches.find((b) => {
          const idMatch = String(b.id).toLowerCase() === normalized;
          const nameMatch = String(b.name).toLowerCase() === normalized;
          const slugMatch =
            generateBeachSlug(String(b.name)).toLowerCase() === normalized;
          return idMatch || nameMatch || slugMatch;
        }) ?? null
      );
    },
    [beaches]
  );

  // Clear selection when navigating to beaches page
  React.useEffect(() => {
    if (pathname === "/beaches") {
      setSelected(null);
      setSwellDirections(null);
      setWindDirection(null);
    }
  }, [pathname]);

  const resizeMapViewport = React.useCallback(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const mapInstance = typeof ref.resize === "function" ? ref : ref.getMap?.();
    if (mapInstance && typeof mapInstance.resize === "function") {
      mapInstance.resize();
    }
  }, []);

  // const [showMap, setShowMap] = React.useState(true);
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);
  const [selectedPointVisible, setSelectedPointVisible] = React.useState(true);
  const pathName = usePathname() ?? "";
  const fullMapPage = !pathName.endsWith("/beaches");
  const editPage = pathName.includes("edit");
  const forecastPage = pathName.includes("forecast");
  const isDesktop = smallScreen === false;
  const mobileMapHeight = "calc(100dvh - 6.25rem)";

  // Warm map style fetch as early as possible
  React.useEffect(() => {
    prefetchMapStyle();
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("ww:last-selected-beach");
    if (stored) {
      setStoredSelectionId(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (selected?.id == null) {
      return;
    }
    const idString = String(selected.id);
    window.localStorage.setItem("ww:last-selected-beach", idString);
    if (storedSelectionId !== idString) {
      setStoredSelectionId(idString);
    }
  }, [selected, storedSelectionId]);

  React.useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selected) return;
    try {
      window.localStorage.setItem(
        "ww:last-selected-center",
        JSON.stringify({
          id: selected.id,
          longitude: selected.longitude,
          latitude: selected.latitude,
          zoom: Math.max(12, Math.min(16, zoom)),
        })
      );
    } catch {}
  }, [selected, zoom]);

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#main-content");
      const width = container ? container.clientWidth : 0;
      if (width < 896) {
        setSmallScreen(true);
      } else {
        setSmallScreen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Highlight marker or cluster when hovering a beach card (without opening popup)
  React.useEffect(() => {
    const ref = mapRef.current;
    const mapInstance = ref?.getMap?.() ?? ref;
    if (!mapInstance) return;

    // Clear previous hover state first
    if (lastHoverInternalIdRef.current != null) {
      try {
        if (mapInstance.getSource("beaches")) {
          mapInstance.setFeatureState(
            { source: "beaches", id: lastHoverInternalIdRef.current },
            { hover: false }
          );
        }
      } catch {}
      lastHoverInternalIdRef.current = null;
    }
    const mapWithHover = mapInstance as MapWithHoverState;
    if (mapWithHover.__lastClusterHoverId != null) {
      try {
        if (mapInstance.getSource("beaches")) {
          mapInstance.setFeatureState(
            {
              source: "beaches",
              id: mapWithHover.__lastClusterHoverId,
            },
            { hover: false }
          );
        }
      } catch {}
      mapWithHover.__lastClusterHoverId = null;
    }

    if (!hoverCardId) {
      // No card hovered -> ensure popup closed and highlights cleared (done above)
      setPopupInfo(null);
      popupId.current = null;
      popupRef.current = null;
      setHoverClusterId(null);
      return;
    }

    // Default: close any previous popup. We'll reopen below if unclustered.
    setPopupInfo(null);
    popupId.current = null;
    popupRef.current = null;

    // Detect whether the hovered beach is currently unclustered by inspecting rendered features
    try {
      const entry = mapToId[hoverCardId];
      if (!entry) return;
      const px = mapInstance.project([entry.longitude, entry.latitude]);
      const pad = 12;
      const queryBox: [[number, number], [number, number]] = [
        [px.x - pad, px.y - pad],
        [px.x + pad, px.y + pad],
      ];
      const unclustered = mapInstance
        .queryRenderedFeatures(queryBox, { layers: ["unclustered-point"] })
        .some((f) => String(f?.properties?.id) === String(entry.properties.id));

      if (unclustered) {
        // Highlight the specific unclustered circle for visual feedback
        try {
          if (mapInstance.getSource("beaches")) {
            mapInstance.setFeatureState(
              { source: "beaches", id: entry.id },
              { hover: true }
            );
            lastHoverInternalIdRef.current = entry.id;
          }
        } catch {}
        // Clear any cluster highlight and drive the popup lifecycle based on card hover
        setHoverClusterId(null);
        setPopupInfo({
          id: entry.id,
          longitude: entry.longitude,
          latitude: entry.latitude,
          properties: entry.properties,
        });
        popupId.current = String(entry.properties.id);
        popupRef.current = {
          id: entry.id,
          longitude: entry.longitude,
          latitude: entry.latitude,
          properties: entry.properties,
        };
        return;
      }

      // Otherwise, highlight the nearest cluster bubble around that point (centroid may be offset)
      {
        try {
          const radius = 150; // px search window
          const clusterBox: [[number, number], [number, number]] = [
            [px.x - radius, px.y - radius],
            [px.x + radius, px.y + radius],
          ];
          const clusters = mapInstance.queryRenderedFeatures(clusterBox, {
            layers: ["clusters"],
          });

          if (Array.isArray(clusters) && clusters.length > 0) {
            let best: MapGeoJSONFeature | null = null;
            let bestDist = Number.POSITIVE_INFINITY;
            for (const c of clusters) {
              const coords = (c.geometry as { coordinates?: Position })
                ?.coordinates;
              if (!coords || coords.length < 2) continue;
              const p = mapInstance.project([coords[0], coords[1]]);
              const dx = p.x - px.x;
              const dy = p.y - px.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < bestDist) {
                bestDist = d2;
                best = c;
              }
            }
            const clusterId: number | undefined = best?.properties?.cluster_id;
            if (typeof clusterId === "number") {
              setHoverClusterId(clusterId);
              // Ensure no popup is visible while clustered
              setPopupInfo(null);
              popupId.current = null;
              popupRef.current = null;
            }
          }
        } catch {}
      }
    } catch {}
  }, [hoverCardId]);

  // Determine if selected point is visible based on zoom level
  // Points get clustered when zoom < clusterMaxZoom (12)
  React.useEffect(() => {
    if (!selected) {
      setSelectedPointVisible(false);
      return;
    }

    // Points are unclustered (visible) when zoom > clusterMaxZoom (12)
    // Add small buffer to account for zoom transitions
    const CLUSTER_MAX_ZOOM = 12;
    const isVisible = zoom > CLUSTER_MAX_ZOOM;
    setSelectedPointVisible(isVisible);
  }, [zoom, selected]);

  // Fetch surf intensity when date changes - with preloading and caching
  React.useEffect(() => {
    if (!selectedDate) {
      setSurfIntensity({});
      return;
    }

    let cancelled = false;
    const isDev = process.env.NODE_ENV !== "production";

    // Helper to fetch and cache surf intensity for a specific date
    const fetchSurfIntensityForDate = async (
      date: Date
    ): Promise<Record<string | number, number>> => {
      const dateStr = date.toISOString().split("T")[0];

      // Check cache first
      if (surfIntensityCacheRef.current[dateStr]) {
        if (isDev) {
          console.log(`Using cached surf intensity for ${dateStr}`);
        }
        return surfIntensityCacheRef.current[dateStr];
      }

      try {
        if (isDev) {
          console.log(`Fetching surf intensity for date: ${dateStr}`);
        }
        const res = await fetch(`/api/surf-intensity?date=${dateStr}`);

        if (!res.ok) {
          if (isDev) {
            console.warn("Failed to fetch surf intensity:", res.status);
          }
          return {};
        }

        const json = await res.json();

        if (json?.success && json.data) {
          // Cache the result
          surfIntensityCacheRef.current[dateStr] = json.data;
          if (isDev) {
            console.log(
              `Loaded and cached surf intensity for ${dateStr} (${
                Object.keys(json.data).length
              } beaches)`
            );
          }
          return json.data;
        }

        return {};
      } catch (e) {
        if (isDev) {
          console.warn(`Failed to load surf intensity for ${dateStr}`, e);
        }
        return {};
      }
    };

    const loadSurfIntensity = async () => {
      // Load current date first
      const currentData = await fetchSurfIntensityForDate(selectedDate);

      if (!cancelled) {
        setSurfIntensity(currentData);
      }

      // Preload adjacent dates in the background (-3..+3 days)
      const preloadDates: Date[] = [];
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue; // Skip current date (already loaded)
        const adjacentDate = new Date(selectedDate);
        adjacentDate.setDate(adjacentDate.getDate() + i);
        preloadDates.push(adjacentDate);
      }

      // Preload in background without blocking
      Promise.all(preloadDates.map((date) => fetchSurfIntensityForDate(date)))
        .then(() => {
          if (!cancelled && isDev) {
            console.log(
              `Preloaded surf intensity for ${preloadDates.length} adjacent dates`
            );
          }
        })
        .catch((err) => {
          if (!isDev) return;

          console.warn("Preload error:", err);
        });
    };

    loadSurfIntensity();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Use React Query hook for swell directions
  const {
    swellDirections: fetchedSwellDirections,
    windDirection: fetchedWindDirection,
    overlayLabels,
  } = useSwellDirections(
    selected ? String(selected.id) : null,
    selectedDate,
    selectedHour
  );
  const resolvedOverlayLabels: OverlayLabels = overlayLabels ?? null;

  // Prefetch swell directions for adjacent dates (for faster date switching)
  usePrefetchAdjacentDates(selected ? String(selected.id) : null, selectedDate);

  // Sync the fetched data to local state (for compatibility with existing code)
  React.useEffect(() => {
    setSwellDirections(fetchedSwellDirections);
    setWindDirection(fetchedWindDirection);
  }, [fetchedSwellDirections, fetchedWindDirection]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleWindowResize = () => {
      resizeMapViewport();
    };
    handleWindowResize();
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [resizeMapViewport]);

  React.useEffect(() => {
    resizeMapViewport();
  }, [resizeMapViewport, showMap, smallScreen, fullMapPage]);

  // Use uncontrolled map; control camera via imperative mapRef to avoid update loops
  const initialView = React.useMemo(() => {
    if (typeof window === "undefined") {
      return { longitude: -122.4, latitude: 37.8, zoom: 6 };
    }
    const stored = window.localStorage.getItem("ww:last-map-view");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed?.longitude === "number" &&
          typeof parsed?.latitude === "number" &&
          typeof parsed?.zoom === "number"
        ) {
          return {
            longitude: parsed.longitude,
            latitude: parsed.latitude,
            zoom: parsed.zoom,
          };
        }
      } catch {}
    }
    const storedSel = window.localStorage.getItem("ww:last-selected-center");
    if (storedSel) {
      try {
        const parsed = JSON.parse(storedSel);
        if (
          typeof parsed?.longitude === "number" &&
          typeof parsed?.latitude === "number"
        ) {
          return {
            longitude: parsed.longitude,
            latitude: parsed.latitude,
            zoom:
              typeof parsed?.zoom === "number"
                ? Math.max(3, Math.min(16, parsed.zoom))
                : 12,
          };
        }
      } catch {}
    }
    return { longitude: -122.4, latitude: 37.8, zoom: 6 };
  }, []);

  // Effect to zoom to user's location when they open the map
  React.useEffect(() => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      return;
    }

    // Check if user has manually interacted with the map
    const hasStoredView = window.localStorage.getItem("ww:last-map-view");
    const hasStoredCenter = window.localStorage.getItem(
      "ww:last-selected-center"
    );

    // If user has manually positioned the map, respect that
    if (hasStoredView || hasStoredCenter) {
      return;
    }

    // Request user location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Check if location has changed significantly from last time
        const lastLocation = window.localStorage.getItem(
          "ww:last-user-location"
        );
        let shouldUpdate = true;

        if (lastLocation) {
          try {
            const parsed = JSON.parse(lastLocation);
            const latDiff = Math.abs(parsed.lat - userLat);
            const lonDiff = Math.abs(parsed.lon - userLon);

            // Only update if moved more than ~5km (roughly 0.05 degrees)
            if (latDiff < 0.05 && lonDiff < 0.05) {
              shouldUpdate = false;
            }
          } catch {}
        }

        if (!shouldUpdate) {
          return;
        }

        // Get map instance
        const mapInstance = getMapInstance();
        if (!mapInstance) {
          // Retry after a short delay
          setTimeout(() => {
            const retryMap = getMapInstance();
            if (retryMap) {
              retryMap.flyTo({
                center: [userLon, userLat],
                zoom: 10,
                duration: 2000,
              });
              window.localStorage.setItem(
                "ww:last-user-location",
                JSON.stringify({ lat: userLat, lon: userLon })
              );
            }
          }, 500);
          return;
        }

        // Smoothly fly to user location
        mapInstance.flyTo({
          center: [userLon, userLat],
          zoom: 10,
          duration: 2000,
        });

        // Store the current location
        window.localStorage.setItem(
          "ww:last-user-location",
          JSON.stringify({ lat: userLat, lon: userLon })
        );
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [getMapInstance]);
  const FILTER_KEYS = React.useMemo(
    () => [
      "RESTROOMS",
      "PARKING",
      "DOG_FRIEND",
      "LIFEGUARD",
      "SNDY_BEACH",
      "FISHING",
    ],
    []
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      filterWorkerRef.current = null;
      setWorkerFilteredBeaches(filterBeachesSync());
      return;
    }
    try {
      const worker = new Worker(
        new URL("../../lib/workers/beachFilterWorker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (event: MessageEvent<{ beaches: BeachPoint[] }>) => {
        setWorkerFilteredBeaches(event.data?.beaches ?? []);
      };
      worker.onerror = () => {
        filterWorkerRef.current = null;
        setWorkerFilteredBeaches(filterBeachesSync());
        worker.terminate();
      };
      filterWorkerRef.current = worker;
      worker.postMessage({
        beaches: renderBeaches,
        filters: Array.from(filters ?? []),
      });
      return () => {
        worker.terminate();
        filterWorkerRef.current = null;
      };
    } catch {
      filterWorkerRef.current = null;
      setWorkerFilteredBeaches(filterBeachesSync());
    }
  }, []); // initialize once

  React.useEffect(() => {
    if (filterUpdateTimeoutRef.current != null) {
      window.clearTimeout(filterUpdateTimeoutRef.current);
      filterUpdateTimeoutRef.current = null;
    }
    filterUpdateTimeoutRef.current = window.setTimeout(() => {
      const worker = filterWorkerRef.current;
      if (worker) {
        worker.postMessage({
          beaches: renderBeaches,
          filters: Array.from(deferredFilters ?? []),
        });
      } else {
        setWorkerFilteredBeaches(filterBeachesSync());
      }
      filterUpdateTimeoutRef.current = null;
    }, 120);
  }, [renderBeaches, deferredFilters, filterBeachesSync]);

  React.useEffect(() => {
    return () => {
      if (filterUpdateTimeoutRef.current != null) {
        window.clearTimeout(filterUpdateTimeoutRef.current);
        filterUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  const filteredBeaches = React.useMemo(() => {
    if (!workerFilteredBeaches.length) {
      return [];
    }
    if (
      selected &&
      !workerFilteredBeaches.some((b) => String(b.id) === String(selected.id))
    ) {
      return [...workerFilteredBeaches, selected];
    }
    return workerFilteredBeaches;
  }, [workerFilteredBeaches, selected]);

  React.useEffect(() => {
    const buildStart =
      typeof performance !== "undefined" ? performance.now() : null;
    const registry = mapToIdRef.current;
    Object.keys(registry).forEach((key) => delete registry[key]);
    const features: BeachGeoJsonCollection["features"] = filteredBeaches.map(
      (b, idx) => {
        const intensity = surfIntensity[b.id] || 0;
        registry[b.id] = {
          id: idx,
          longitude: b.longitude,
          latitude: b.latitude,
          properties: {
            id: b.id,
            name: b.name,
            county: b.county,
            surfIntensity: intensity,
          },
        };
        return {
          type: "Feature",
          id: idx,
          geometry: {
            type: "Point",
            coordinates: [b.longitude, b.latitude],
          },
          properties: {
            id: b.id,
            name: b.name,
            county: b.county,
            surfIntensity: intensity,
          },
        };
      }
    );
    const geojson: BeachGeoJsonCollection = {
      type: "FeatureCollection",
      features,
    };
    beachGeoJSONRef.current = geojson;
    applyBeachDataToSource(geojson);
    logPerf("build-beach-geojson", buildStart);
  }, [filteredBeaches, surfIntensity, applyBeachDataToSource]);

  // After beaches load, align map to page context (selected beach if provided, otherwise fit to all)
  React.useEffect(() => {
    if (!beaches.length) return;
    setMap(getMapInstance() ?? undefined);
    if (!map) return;

    const beachFromPath = (() => {
      const parts = (pathname || "").split("/").filter(Boolean);
      // Extract beach ID from the first URL segment (which could be "beach-name--id" or just "id")
      if (parts.length > 0) {
        const extracted = extractBeachId(parts[0]);
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "InteractiveMap: Extracted beach ID from URL:",
            parts[0],
            "->",
            extracted
          );
        }
        return extracted;
      }
      return null;
    })();
    const allowStoredFallback = pathname !== "/beaches";
    const storedFallback =
      allowStoredFallback && storedSelectionId
        ? String(storedSelectionId)
        : null;
    const effectiveId =
      beachId != null
        ? String(beachId)
        : beachFromPath
        ? String(beachFromPath)
        : storedFallback;

    const effectiveKey = effectiveId ?? null;
    const effectiveIdChanged = prevEffectiveIdRef.current !== effectiveKey;

    const filterSignature = filteredBeaches
      .map((b) => String(b.id))
      .sort()
      .join("|");
    if (prevFilterSignatureRef.current !== filterSignature) {
      if (prevFilterSignatureRef.current !== null && !effectiveIdChanged) {
        userMovedRef.current = true;
      }
      prevFilterSignatureRef.current = filterSignature;
    }

    if (effectiveIdChanged) {
      userMovedRef.current = false;
    }

    const allowAutoCenter = !userMovedRef.current || effectiveIdChanged;

    if (!allowAutoCenter) {
      prevEffectiveIdRef.current = effectiveKey;
      return;
    }

    // If we already have a selected beach and nothing changed, don't re-center
    const hasSelection = selected != null;
    const selectionMatches = selected && String(selected.id) === effectiveKey;
    if (hasSelection && selectionMatches && !effectiveIdChanged) {
      prevEffectiveIdRef.current = effectiveKey;
      return;
    }

    // If page context identifies a beach, center and zoom to it
    if (effectiveId != null) {
      // console.log("InteractiveMap: Looking for beach with ID:", effectiveId);
      const match = findBeachMatch(effectiveId);
      if (match) {
        // console.log(
        //   "InteractiveMap: Found beach match, zooming to:",
        //   match,
        //   match.name
        // );
        suppressMoveRef.current = true;
        easeToWhenReady(
          { longitude: match.longitude, latitude: match.latitude },
          16,
          initialFocusDoneRef.current ? 500 : 0
        );
        const currentSelectedId = selectedRef.current?.id;
        if (String(currentSelectedId ?? "") !== String(match.id)) {
          setSelected(match);
        }
        initialFocusDoneRef.current = true;
        prevEffectiveIdRef.current = effectiveKey;
        return;
      } else {
        // console.log(
        //   "InteractiveMap: No beach match found for ID:",
        //   effectiveId
        // );
      }
    }

    // Otherwise, optionally use user's location once
    if (!located && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocated(true);
          suppressMoveRef.current = true;
          const duration = initialFocusDoneRef.current ? 600 : 0;
          map.easeTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 10,
            duration,
          });
          setZoom(10);
          initialFocusDoneRef.current = true;
        },
        () => setLocated(true),
        { enableHighAccuracy: true, timeout: 7000 }
      );
      prevEffectiveIdRef.current = effectiveKey;
      return;
    }

    // Else center to all beaches (simple bbox center)
    const list = filteredBeaches.length ? filteredBeaches : beaches;
    const lons = list.map((b) => b.longitude);
    const lats = list.map((b) => b.latitude);
    if (lons.length && lats.length) {
      const minLon = Math.min(...lons),
        maxLon = Math.max(...lons);
      const minLat = Math.min(...lats),
        maxLat = Math.max(...lats);
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      suppressMoveRef.current = true;
      map.easeTo({ center: [centerLon, centerLat], zoom: 6, duration: 500 });
      setZoom(6);
    }
    prevEffectiveIdRef.current = effectiveKey;
  }, [
    beaches,
    filteredBeaches,
    beachId,
    pathname,
    located,
    findBeachMatch,
    map,
    getMapInstance,
    setMap,
    storedSelectionId,
  ]);

  React.useEffect(() => {
    const handleRefocus = (event: Event) => {
      const custom = event as CustomEvent<MapFocusEventDetail>;
      const detail = custom.detail;
      if (!detail) return;

      const target = detail.beachId;
      if (target == null) return;

      const match = findBeachMatch(String(target));
      if (!match) return;

      const mapInstance = getMapInstance();
      // ensure the map is visible when focusing
      if (fullMapPage) {
        setShowMap(true);
      }
      // map not ready yet: queue and exit; onLoad will handle it
      if (!mapInstance || typeof mapInstance.easeTo !== "function") {
        pendingRefocusRef.current = detail;
        return;
      }

      if (detail.scroll) {
        const mapContainer = document.getElementById("map-container");
        if (mapContainer) {
          const headerOffset = 100;
          const rect = mapContainer.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;
          const targetTop = Math.max(absoluteTop - headerOffset, 0);
          try {
            window.scrollTo({ top: targetTop, behavior: "smooth" });
          } catch {
            mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollBy({ top: -headerOffset, behavior: "smooth" });
          }
        }
      }

      suppressMoveRef.current = true;
      userMovedRef.current = false;
      easeToWhenReady(
        { longitude: match.longitude, latitude: match.latitude },
        16,
        500
      );
      setSelected(match);
      prevEffectiveIdRef.current = String(match.id);
    };

    window.addEventListener(MAP_FOCUS_EVENT, handleRefocus as EventListener);
    return () =>
      window.removeEventListener(
        MAP_FOCUS_EVENT,
        handleRefocus as EventListener
      );
  }, [
    findBeachMatch,
    fullMapPage,
    setShowMap,
    easeToWhenReady,
    getMapInstance,
  ]);

  // if (editPage || (forecastPage && !smallScreen)) {
  //   return <></>;
  // }

  // if (editPage) {
  //   return <></>;
  // }

  React.useEffect(() => {
    // console.log(
    //   "FIXING BUG: CLICK CARD",
    //   popupData,
    //   popupId.current,
    //   popupRef,
    //   popupInfo,
    //   popupId.current ? mapToId[popupId.current].id : null,
    //   popupRef?.current?.id
    // );
    if (popupData) {
      // if (
      //   popupId.current &&
      //   mapToId[popupId.current].id !== popupRef.current?.id
      // ) {
      //   console.log("ENTER SAME");
      //   if (map)
      //     map.setFeatureState(
      //       // TO-DO: debug (sometimes causes error)
      //       { source: "beaches", id: mapToId[popupId.current].id },
      //       { hover: false }
      //     );
      //   setPopupInfo(null);
      //   popupId.current = null;
      //   popupRef.current = null;
      // }
      const beach = mapToId[popupData];
      if (!beach) return;
      popupId.current = popupData;
      setPopupInfo({
        id: beach.id,
        longitude: beach.longitude,
        latitude: beach.latitude,
        properties: beach.properties,
      });
      popupRef.current = {
        id: beach.id,
        longitude: beach.longitude,
        latitude: beach.latitude,
        properties: beach.properties,
      };
    }
    setPopupData(null);
  }, [popupData]);

  // Handle recentering when expanding (forecast/overview)
  React.useEffect(() => {
    if (!showMap || !selected) return;
    const mapInstance = getMapInstance();
    if (!mapInstance || typeof mapInstance.easeTo !== "function") {
      pendingRefocusRef.current = {
        beachId: String(selected.id),
        scroll: false,
      };
      return;
    }
    easeToWhenReady(
      { longitude: selected.longitude, latitude: selected.latitude },
      16,
      500
    );
  }, [showMap, selected, easeToWhenReady, getMapInstance]);

  const filterCount = filters?.size ?? 0;
  const overlaysHidden = mapIsMoving;
  const showUpdateBanner =
    mapIsMoving || viewportStatus === "dirty" || viewportStatus === "loading";
  const hasPointCountFilter: ["has", "point_count"] = ["has", "point_count"];
  const noPointCountFilter: ["!has", "point_count"] = ["!has", "point_count"];
  const hoverClusterFilter: [
    "all",
    ["has", "point_count"],
    ["==", ["get", "cluster_id"], number]
  ] = [
    "all",
    ["has", "point_count"],
    ["==", ["get", "cluster_id"], hoverClusterId ?? -1],
  ];

  // Show legend by default on non-/beaches pages (overview/forecast)
  React.useEffect(() => {
    try {
      if (fullMapPage && !legendOpen) {
        setLegendOpen(true);
      }
    } catch {}
    // only react to route context changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullMapPage]);

  if (editPage || (isDesktop && fullMapPage && !showMap)) {
    return <></>;
  }

  return (
    <aside
      id="map-container"
      className={cn(
        "fixed w-full mx-auto max-w-screen transition-all duration-300",
        "@min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(100vh-8rem)] flex"
        // !isDesktop && "min-h-[calc(100dvh-6.25rem)]"
        // isDesktop && fullMapPage && showMap && "@min-4xl:max-w-200",
        // isDesktop &&
        //   fullMapPage &&
        //   !showMap &&
        //   "@min-4xl:max-w-20 @min-4xl:overflow-hidden"
      )}
      style={
        isDesktop
          ? undefined
          : {
              minHeight: "calc(100dvh)",
              height: "calc(100dvh)",
            }
      }
    >
      <Map
        ref={mapRef}
        reuseMaps
        initialViewState={initialView}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: isDesktop ? "18px" : "0px",
          boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
        }}
        mapStyle={MAP_STYLE_URL}
        fadeDuration={0}
        maxZoom={16}
        minZoom={3}
        dragRotate={false}
        attributionControl={false}
        interactiveLayerIds={MAP_POINT_LAYER_IDS}
        onMouseEnter={(e) => {
          const map = e.target;
          if (e.features?.length) {
            const f = e.features[0];
            if (
              f.layer.id === "clusters" ||
              f.layer.id === "clusters-hover" ||
              f.layer.id === "unclustered-point"
            ) {
              map.getCanvas().style.cursor = "pointer";
            }
          }
        }}
        onMouseLeave={(e) => {
          const map = e.target;
          map.getCanvas().style.cursor = "";
        }}
        onLoad={async (e) => {
          const map = e.target;
          // keep context map in sync on every mount
          try {
            setMap(map);
          } catch {}
          resizeMapViewport();
          emitCameraUpdate();
          captureDetailLayers(map);
          hideDetailLayers(map);
          try {
            const source = map.getSource("beaches") as
              | GeoJsonSourceLike
              | undefined;
            if (source && typeof source.setData === "function") {
              source.setData(beachGeoJSONRef.current);
            }
          } catch {}

          // Load the default marker image
          if (!map.hasImage("marker-icon")) {
            const imageResponse = await map.loadImage("/marker.png");
            map.addImage("marker-icon", imageResponse.data);
          }

          // Hide cluster counts while zooming/panning
          const hideCounts = () => {
            if (map.getLayer("cluster-count")) {
              map.setLayoutProperty("cluster-count", "visibility", "none");
            }
          };
          const showCounts = () => {
            if (map.getLayer("cluster-count")) {
              map.setLayoutProperty("cluster-count", "visibility", "visible");
            }
          };

          map.on("movestart", () => {
            hideCounts();
            setMapIsMoving(true);
            if (!suppressMoveRef.current) {
              setAllowViewportCommit(false);
              cancelCommitResume();
            }
          });

          map.on("moveend", () => {
            setMapIsMoving(false);
            scheduleCommitResume();
            if ((suppressCountsRef.current ?? 0) === 0) {
              showCounts();
            }
            try {
              const c = map.getCenter();
              const z = map.getZoom();
              scheduleMapViewPersistence({
                longitude: c.lng,
                latitude: c.lat,
                zoom: z,
              });
            } catch {}
            emitCameraUpdate();
          });

          // Track zoom level for ring scaling, but only after zoom settles
          map.on("zoomend", () => {
            setMapIsMoving(false);
            scheduleCommitResume();
            try {
              const z = map.getZoom();
              setZoom(z);
            } catch {}
            emitCameraUpdate();
          });

          map.on("movestart", () => {
            if (suppressMoveRef.current) {
              suppressMoveRef.current = false;
              return;
            }
            userMovedRef.current = true;
          });

          // Bind cluster click handlers at the layer level for reliability
          const bindClusterHandlers = () => {
            if (clusterHandlersBoundRef.current) return;
            const hasClusters = !!map.getLayer("clusters");
            const hasCount = !!map.getLayer("cluster-count");
            if (!hasClusters || !hasCount) return;

            const onClusterClick = (ev: MapLayerMouseEvent) => {
              const feat = ev?.features && ev.features[0];
              const coords = (feat?.geometry as { coordinates?: Position })
                ?.coordinates;
              const center: [number, number] | undefined =
                Array.isArray(coords) && coords.length >= 2
                  ? [coords[0], coords[1]]
                  : undefined;
              const current = map.getZoom?.() ?? 5;
              const target = Math.min(current + 2, 16);
              try {
                suppressCountsRef.current =
                  (suppressCountsRef.current ?? 0) + 1;
                if (map.getLayer("cluster-count")) {
                  map.setLayoutProperty("cluster-count", "visibility", "none");
                }
              } catch {}
              try {
                map.easeTo({
                  center: center ?? [ev.lngLat.lng, ev.lngLat.lat],
                  zoom: target,
                  duration: 300,
                });
              } catch {}
              try {
                setZoom(target);
              } catch {}
              try {
                map.once("idle", () => {
                  try {
                    suppressCountsRef.current = Math.max(
                      (suppressCountsRef.current ?? 1) - 1,
                      0
                    );
                    if (
                      (suppressCountsRef.current ?? 0) === 0 &&
                      map.getLayer("cluster-count")
                    ) {
                      map.setLayoutProperty(
                        "cluster-count",
                        "visibility",
                        "visible"
                      );
                    }
                  } catch {}
                });
              } catch {}
            };

            map.on("click", "clusters", onClusterClick);
            map.on("click", "cluster-count", onClusterClick);
            if (map.getLayer("clusters-hover")) {
              map.on("click", "clusters-hover", onClusterClick);
            }
            clusterHandlersBoundRef.current = true;
          };

          const handleStyleData = () => {
            bindClusterHandlers();
            captureDetailLayers(map);
            hideDetailLayers(map);
          };
          // Attempt immediate bind; also re-attempt on style/sources ready
          bindClusterHandlers();
          captureDetailLayers(map);
          hideDetailLayers(map);
          map.on("styledata", handleStyleData);
          map.on("sourcedata", bindClusterHandlers);
          map.on("idle", bindClusterHandlers);

          // Hover for individual points (not clusters)
          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
            // console.log(
            //   "FIXING BUG: mouse leave",
            //   popupId.current,
            //   popupRef.current
            // );
            // Always clear hover state for the last hovered feature, regardless of popup state
            try {
              if (map.getSource("beaches")) {
                if (mapLastHoverInternalIdRef.current != null) {
                  map.setFeatureState(
                    {
                      source: "beaches",
                      id: mapLastHoverInternalIdRef.current,
                    },
                    { hover: false }
                  );
                  mapLastHoverInternalIdRef.current = null;
                } else if (popupId.current) {
                  const beach = mapToId[popupId.current];
                  if (beach) {
                    map.setFeatureState(
                      { source: "beaches", id: beach.id },
                      { hover: false }
                    );
                  }
                }
              }
            } catch {}
            setPopupInfo(null);
            popupId.current = null;
            popupRef.current = null;
            // Reset refs so the same feature can be re-hovered immediately
            lastHoverFeatureIdRef.current = null;
            lastHoverInternalIdRef.current = null;
          });

          map.on("click", (ev: MapMouseEvent) => {
            // If clicking a cluster or point layer, let dedicated handlers manage it
            try {
              const p = ev.point ?? map.project(ev.lngLat);
              const queryBox: [[number, number], [number, number]] = [
                [p.x - 20, p.y - 20],
                [p.x + 20, p.y + 20],
              ];
              const layers = [
                "clusters",
                "cluster-count",
                "clusters-hover",
                "unclustered-point",
              ];
              const hits = map.queryRenderedFeatures(queryBox, { layers });
              if (Array.isArray(hits) && hits.length > 0) return;
            } catch {}
            // Otherwise clear popup
            if (popupId.current && popupRef.current) {
              try {
                const beach = mapToId[popupId.current];
                if (map.getSource("beaches") && beach) {
                  map.setFeatureState(
                    { source: "beaches", id: beach.id },
                    { hover: false }
                  );
                }
              } catch {}
              setPopupInfo(null);
              popupId.current = null;
              popupRef.current = null;
            }
          });

          map.on(
            "mousemove",
            "unclustered-point",
            (event: MapLayerMouseEvent) => {
              const feature = event.features?.[0];
              if (!feature) return;
              const fid = feature.properties?.id;
              if (lastHoverFeatureIdRef.current === fid) return;
              lastHoverFeatureIdRef.current = fid;
              if (hoverRafRef.current != null) {
                cancelAnimationFrame(hoverRafRef.current);
              }
              hoverRafRef.current = requestAnimationFrame(() => {
                const beach = mapToId[fid];
                if (!beach) return;
                if (!map.getSource("beaches")) return;
                try {
                  const prevInternal = mapLastHoverInternalIdRef.current;
                  if (prevInternal != null && prevInternal !== beach.id) {
                    map.setFeatureState(
                      { source: "beaches", id: prevInternal },
                      { hover: false }
                    );
                  }
                } catch {}
                map.setFeatureState(
                  { source: "beaches", id: beach.id },
                  { hover: true }
                );
                mapLastHoverInternalIdRef.current = beach.id;
                setPopupInfo({
                  id: beach.id,
                  longitude: beach.longitude,
                  latitude: beach.latitude,
                  properties: beach.properties,
                });
                popupId.current = String(fid);
                popupRef.current = {
                  id: beach.id,
                  longitude: beach.longitude,
                  latitude: beach.latitude,
                  properties: beach.properties,
                };
                hoverRafRef.current = null;
              });
            }
          );
          // Provide clear hover indication for clusters to communicate interactivity
          const setHoverClusterFromEvent = (ev: MapLayerMouseEvent) => {
            const f = ev?.features?.[0];
            const cid = f?.properties?.cluster_id;
            if (typeof cid === "number") setHoverClusterId(cid);
          };
          map.on("mousemove", "clusters", setHoverClusterFromEvent);
          map.on("mousemove", "cluster-count", setHoverClusterFromEvent);
          // Reset cluster hover highlight when leaving cluster layers
          const clearClusterHover = () => setHoverClusterId(null);
          map.on("mouseleave", "clusters", clearClusterHover);
          map.on("mouseleave", "cluster-count", clearClusterHover);
          setZoom(map.getZoom());

          // If a refocus request was queued before the map was ready, perform it now
          try {
            const pending = pendingRefocusRef.current;
            if (pending?.beachId != null) {
              const match = findBeachMatch(String(pending.beachId));
              if (match) {
                suppressMoveRef.current = true;
                easeToWhenReady(
                  { longitude: match.longitude, latitude: match.latitude },
                  16,
                  500
                );
                setSelected(match);
                prevEffectiveIdRef.current = String(match.id);
              }
              pendingRefocusRef.current = null;
            }
          } catch {}
        }}
        onClick={(e) => {
          const mapInstance = getMapInstance();
          const feature = e.features && e.features[0];
          if (!mapInstance || !feature) return;

          // Handle cluster clicks robustly
          const isCluster = Boolean(
            (feature.properties as { cluster?: boolean } | undefined)?.cluster
          );
          const isClusterCount =
            feature && feature.layer?.id === "cluster-count";

          if (isCluster || isClusterCount) {
            const clusterId =
              typeof feature.properties?.cluster_id === "number"
                ? feature.properties.cluster_id
                : null;
            const source = mapInstance.getSource("beaches") as
              | GeoJsonSourceLike
              | undefined;
            if (source && clusterId != null) {
              const coords = (feature.geometry as { coordinates?: Position })
                ?.coordinates;
              const fallbackCenter = mapInstance.getCenter?.();
              const center: [number, number] | undefined =
                Array.isArray(coords) && coords.length >= 2
                  ? [coords[0], coords[1]]
                  : fallbackCenter
                  ? [fallbackCenter.lng, fallbackCenter.lat]
                  : undefined;
              if (!center) return;
              try {
                const current = mapInstance.getZoom?.() ?? 5;
                mapInstance.easeTo({
                  center,
                  zoom: Math.min(current + 2, 16),
                  duration: 200,
                });
              } catch {}
              // try {
              //   console.info("cluster click ->", { clusterId, coords });
              // } catch {}
              source.getClusterExpansionZoom?.(
                clusterId,
                (err: Error | null, expansionZoom: number) => {
                  if (err || !center) return;
                  const targetZoom = Math.max(expansionZoom, 12.5);
                  try {
                    mapInstance.easeTo({
                      center,
                      zoom: targetZoom,
                      duration: 500,
                    });
                  } catch {}
                  setZoom(targetZoom);
                }
              );
            }
            return;
          }

          // Unclustered point: open popup and allow navigation
          const props = (feature.properties ?? {}) as PopupProperties;
          const coords = (feature.geometry as { coordinates?: Position })
            ?.coordinates;
          if (!coords || coords.length < 2) return;
          const point: BeachPoint = {
            id: props.id,
            name: props.name,
            county: props.county,
            longitude: coords[0],
            latitude: coords[1],
          };

          // console.log("ENTER CLICK SELECTED BEACH 1");
          setSelected(point);

          // Always navigate to the clicked beach
          const destination = `${generateBeachUrl(
            point.name,
            point.id
          )}/overview#content`;
          router.push(destination);
        }}
      >
        {!showMap && fullMapPage && !smallScreen && (
          <div className="absolute z-70 bg-black/70 backdrop-blur-md h-full w-full" />
        )}
        <AttributionControl compact={true} />
        <NavigationControl
          key={
            (fullMapPage && !smallScreen) || !smallScreen
              ? "nav-bottom"
              : "nav-top"
          }
          position={
            (fullMapPage && !smallScreen) || !smallScreen
              ? "bottom-left"
              : "top-left"
          }
          showCompass={false}
          visualizePitch={false}
          style={{
            background: "var(--highlight-7)",
            opacity: "0.8",
            borderRadius: "30px",
            padding: "7px",
            marginTop: !fullMapPage ? "70px" : smallScreen ? "260px" : "0px",
            marginBottom: !fullMapPage
              ? smallScreen
                ? "0px"
                : "12px"
              : smallScreen
              ? "80px"
              : "70px",
            marginLeft: "0.8rem",
            boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.2)",
          }}
        />

        {showUpdateBanner && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[70] -translate-x-1/2">
            <div className="rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
              {viewportStatus === "loading"
                ? "Updating map…"
                : "Refreshing area…"}
            </div>
          </div>
        )}
        {/* Clustered beach points */}
        <Source
          id="beaches"
          type="geojson"
          data={beachGeoJSONRef.current}
          cluster={true}
          clusterMaxZoom={12}
          clusterRadius={40}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={hasPointCountFilter}
            layout={{ visibility: overlaysHidden ? "none" : "visible" }}
            paint={{
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#176cff",
                [
                  "step",
                  ["get", "point_count"],
                  "#9ed5ff",
                  50,
                  "#69b7ff",
                  100,
                  "#3f9bff",
                ],
              ],
              "circle-radius": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                ["+", ["step", ["get", "point_count"], 12, 50, 16, 100, 20], 2],
                ["step", ["get", "point_count"], 12, 50, 16, 100, 20],
              ],
              "circle-stroke-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                3,
                1,
              ],
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="clusters-hover"
            type="circle"
            filter={hoverClusterFilter}
            layout={{ visibility: overlaysHidden ? "none" : "visible" }}
            paint={{
              "circle-color": "#176cff",
              "circle-radius": [
                "+",
                ["step", ["get", "point_count"], 12, 50, 16, 100, 20],
                4,
              ],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={hasPointCountFilter}
            layout={{
              // use the raw point_count (exact) and convert to string to avoid layout/abbrev races
              "text-field": ["to-string", ["get", "point_count"]],
              "text-size": 12,
              // critical GÇö allow overlap & ignore placement so the label renders immediately
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              // optionally specify a bold system font or style available in your style
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              visibility: overlaysHidden ? "none" : "visible",
            }}
            paint={{
              "text-color": "#1f2937",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1,
            }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={noPointCountFilter}
            layout={{ visibility: overlaysHidden ? "none" : "visible" }}
            paint={{
              "circle-radius": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                9,
                8,
              ],
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#176cffff",
                [
                  "step",
                  ["get", "surfIntensity"],
                  "#e5e7eb",
                  0.1,
                  "#4ade80",
                  3,
                  "#fb923c",
                  6,
                  "#f87171",
                ],
              ],
              "circle-stroke-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                3,
                2,
              ],
              "circle-stroke-color": "#ffffffff",
            }}
          />
          <Layer
            id="unclustered-point-label"
            type="symbol"
            filter={noPointCountFilter}
            layout={{
              "text-field": ["get", "name"],
              "text-offset": [0, 1.8],
              "text-size": 10,
              "text-anchor": "top",
              visibility: overlaysHidden ? "none" : "visible",
            }}
            paint={{
              "text-color": "#1f2937",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1,
              "text-opacity": selected
                ? ["case", ["==", ["get", "name"], selected.name], 0, 1]
                : 1,
            }}
          />
        </Source>

        <SelectedBeachMarker
          selected={selected}
          swellDirections={swellDirections}
          windDirection={windDirection}
          selectedPointVisible={selectedPointVisible}
          zoom={zoom}
          overlayLabels={resolvedOverlayLabels}
          legendOpen={legendOpen}
          overlaysHidden={overlaysHidden}
        />

        {!fullMapPage && (
          <PageTabs
            buttons={false}
            tabs={["nearby", "saved"]}
            defaultPage="nearby"
            beachPage
            loggedIn={loggedIn}
          />
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setSelected(null)}
            closeButton={false}
            closeOnClick={true}
            className="w-50"
          >
            <div className="flex flex-col gap-1">
              {/* <div className="relative w-full mx-auto aspect-auto">
                <div className="rounded-xl h-30 w-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                  <Image
                    src={`/beach_pictures/${popupInfo.properties.id}.png`}
                    alt={`Map view of ${popupInfo.properties.name}`}
                    fill
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized // Skip optimization to reduce 404 errors
                    onError={(e) => {
                      // Fallback if image doesn't exist - hide silently
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <SwellRings
                    directions={{
                      primary: popupInfo.properties.swell.primary.direction,
                      secondary: popupInfo.properties.swell.secondary.direction,
                      tertiary: popupInfo.properties.swell.tertiary.direction,
                    }}
                    scale={0.55}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <WindRing
                    direction={popupInfo.properties.conditions.windDirection}
                    scale={0.55}
                  />
                </div>
              </div> */}
              <header className="p-1 flex gap-1">
                <div
                  className={cn(
                    "p-1 w-2 rounded-full",
                    !popupInfo.properties.surfIntensity ||
                      (popupInfo.properties.surfIntensity < 0.1 &&
                        "bg-highlight-3"),
                    popupInfo.properties.surfIntensity >= 0.1 &&
                      popupInfo.properties.surfIntensity < 3 &&
                      "bg-green-400",
                    popupInfo.properties.surfIntensity >= 3 &&
                      popupInfo.properties.surfIntensity < 6 &&
                      "bg-orange-400",
                    popupInfo.properties.surfIntensity >= 6 && "bg-red-400"
                  )}
                />
                <div className="flex flex-col">
                  <strong className="text-sm text-foreground w-40 truncate">
                    {popupInfo.properties.name}
                  </strong>
                  <span className="text-xs text-muted-foreground w-40 truncate">
                    {popupInfo.properties.county}
                  </span>
                </div>
              </header>
              <div className="pl-1 pt-2 flex gap-2 items-center">
                <div className="p-1 rounded-full bg-blue-100">
                  <Waves className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-semibold text-[15px]">
                  {popupInfo.properties.surfIntensity.toFixed(1)}
                  <span className="font-normal ml-1 text-[14px]">ft</span>
                </span>
              </div>
            </div>
          </Popup>
        )}

        {/* Filter controls (collapsible) */}
        {/* {(showMap || smallScreen) && (
          <div className="absolute left-3 top-28 sm:left-4 @min-4xl:top-2 @min-4xl:left-2 z-[1]">
            <div className="bg-background/90 backdrop-blur rounded-xl border border-border shadow min-w-[200px] max-w-[calc(100vw-3rem)] max-[360px]:min-w-[180px] max-[320px]:min-w-[160px] sm:min-w-[220px]">
              <button
                className="hover:bg-highlight-5 rounded-xl w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium max-[360px]:px-2 max-[320px]:px-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters((s) => !s);
                }}
              >
                <span className="text-sm font-semibold tracking-wide">
                  Filters {filters.size ? `(${filters.size})` : ""}
                </span>
                <span className="text-muted-foreground">
                  {showFilters ? (
                    <ChevronUp className="w-6 h-6" />
                  ) : (
                    <ChevronDown className="w-6 h-6" />
                  )}
                </span>
              </button>
              {showFilters && (
                <div className="max-h-72 overflow-auto px-2 pb-2">
                  {Object.entries(FEATURE_CATEGORIES).map(([catKey, cat]) => (
                    <div key={catKey} className="mb-2">
                      <div className="px-1 py-1 text-[11px] uppercase text-muted-foreground font-semibold">
                        {(cat as any).label}
                      </div>
                      <div className="grid grid-cols-1 gap-1 px-1">
                        {(cat as any).features.map((key: string) => {
                          const checked = filters.has(key);
                          const label = getFeatureDisplayName(key) || key;
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2 text-[12px]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const che = e.currentTarget.checked;
                                    React.startTransition(() => {
                                      setFilters((prev) => {
                                        const next = new Set(prev);
                                        if (che) next.add(key);
                                        else next.delete(key);
                                        return next;
                                      });
                                    });
                                  }}
                                />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showFilters && (
                <div className="flex justify-center gap-2 px-1 py-2 rounded-b-xl">
                  {filters.size > 0 && (
                    <button
                      className="text-[11px] font-semibold px-2 py-1 rounded-xl border bg-highlight-3 dark:bg-background border border-border/90 hover:bg-highlight-5 dark:hover:bg-highlight-2"
                      onClick={(e) => {
                        e.stopPropagation();
                          React.startTransition(() => {
                            setFilters(new Set());
                          });
                        }}
                      >
                      Clear
                    </button>
                  )}
                  <button
                    className="text-[11px] font-semibold px-2 py-1 rounded-xl border border-border/90 bg-background dark:bg-highlight-5 border-border text-foreground hover:bg-highlight-3 dark:hover:bg-highlight-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilters(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )} */}
        {(showMap || smallScreen) && (
          <div
            className={cn(
              "absolute left-3 @min-4xl:top-3 flex flex-col gap-3 z-40",
              fullMapPage ? "top-21" : "top-3"
            )}
          >
            {fullMapPage && (
              <button
                type="button"
                aria-label="Refocus map on beach"
                title="Refocus map on beach"
                onClick={() => {
                  const mapInstance = getMapInstance();
                  if (fullMapPage) {
                    setShowMap(true);
                  }
                  if (
                    selected &&
                    mapInstance &&
                    typeof mapInstance.easeTo === "function"
                  ) {
                    easeToWhenReady(
                      {
                        longitude: selected.longitude,
                        latitude: selected.latitude,
                      },
                      16,
                      500
                    );
                  } else if (selected) {
                    pendingRefocusRef.current = {
                      beachId: String(selected.id),
                      scroll: false,
                    };
                  }
                }}
                className="bg-highlight-7/80 backdrop-blur hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition"
              >
                <MapPin className="w-5 h-5 mx-auto" />
              </button>
            )}
            <button
              type="button"
              aria-label="toggle filters"
              title="Toggle filters"
              onClick={() => {
                togglePanel("filters");
                setShowFilters(true);
              }}
              className={cn(
                "relative bg-highlight-7/80 backdrop-blur hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                openPanel === "filters" && "bg-blue-300",
                !fullMapPage && "block @min-4xl:hidden"
              )}
            >
              <SlidersHorizontal className="w-5 h-5 mx-auto" />
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background dark:ring-highlight-5">
                  {filterCount}
                </span>
              )}
            </button>
            {fullMapPage && (
              <button
                type="button"
                aria-label="toggle legend"
                title="Toggle legend"
                onClick={() => togglePanel("legend")}
                className={cn(
                  "bg-highlight-7/80 backdrop-blur hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                  legendOpen && "bg-blue-300",
                  !fullMapPage && "hidden @min-4xl:block"
                )}
              >
                <Info className="w-5 h-5 mx-auto" />
              </button>
            )}
            {fullMapPage && !smallScreen && (
              <button
                type="button"
                aria-label="open map"
                title="Open map"
                className="bg-highlight-7/80 backdrop-blur icon-button p-3 hover:bg-blue-200 dark:hover:bg-blue-400"
                onClick={() => {
                  setIsOverlay?.(false);
                  router.push("/beaches");
                }}
              >
                <MapIcon className="w-5 h-5 mx-auto" />
              </button>
            )}
          </div>
        )}
        {fullMapPage && !smallScreen && (
          <button
            aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
            title={`${showMap ? "Minimize" : "Maximize"} map`}
            className={cn(
              "z-80 bg-highlight-7/80 backdrop-blur rounded-full p-3 shadow-lg border border-border hover:bg-blue-200 dark:hover:bg-blue-400 absolute left-3 bottom-3"
              // showMap ? "top-4" : "top-[50%] transform -translate-y-1/2"
            )}
            onClick={() => {
              if (openPanel) setOpenPanel(null);
              if (legendOpen) setLegendOpen(false);
              setShowMap(!showMap);
            }}
          >
            {showMap ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <ArrowRightFromLine className="w-5 h-5" />
            )}
          </button>
        )}

        {/* LEGEND PANEL (small, upper overlay) */}
        <AnimatePresence>
          {fullMapPage && legendOpen && (
            <motion.div
              key="legend"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) setLegendOpen(false); // swipe right to close
              }}
              className="absolute top-0 right-0 h-fit max-h-[60vh] w-[75vw] max-w-sm z-60 flex flex-col"
              style={{ touchAction: "pan-y" }} // keeps map touch panning working
            >
              {(showMap || smallScreen) && (
                <div
                  className={cn(
                    "absolute top-21 right-3 max-w-[200px] @min-4xl:top-3"
                  )}
                >
                  <div className="rounded-lg border border-border/60 bg-highlight-7/80 backdrop-blur px-3 py-2 shadow">
                    <span className="text-[11px] font-semibold uppercase text-foreground">
                      Direction Rings
                    </span>
                    <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground/90">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
                        <span>Primary swell</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
                        <span>Secondary swell</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22d3ee]" />
                        <span>Tertiary swell</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                        <span>Wind direction</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* <AnimatePresence>
          {openPanel === "filters" && (
            <motion.div
              key="filters"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) setOpenPanel(null); // swipe right to close
              }}
              className="absolute top-0 right-0 h-fit max-h-[60vh] w-[75vw] max-w-sm z-60 flex flex-col"
              style={{ touchAction: "pan-y" }} // keeps map touch panning working
            >
              <div className={cn("absolute right-3 top-32 @min-4xl:top-3")}>
                <div className="bg-background/90 backdrop-blur rounded-xl border border-border shadow min-w-[200px] max-w-[calc(100vw-3rem)] max-[360px]:min-w-[180px] max-[320px]:min-w-[160px] sm:min-w-[220px]">
                  <button
                    className="hover:bg-highlight-5 rounded-xl w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium max-[360px]:px-2 max-[320px]:px-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilters((s) => !s);
                    }}
                  >
                    <span className="text-sm font-semibold tracking-wide">
                      Filters {filters.size ? `(${filters.size})` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {showFilters ? (
                        <ChevronUp className="w-6 h-6" />
                      ) : (
                        <ChevronDown className="w-6 h-6" />
                      )}
                    </span>
                  </button>
                  {showFilters && (
                    <div
                      className="max-h-72 overflow-auto px-2 pb-2"
                      style={{ touchAction: "pan-y" }}
                    >
                      {Object.entries(FEATURE_CATEGORIES).map(
                        ([catKey, cat]) => (
                          <div key={catKey} className="mb-2">
                            <div className="px-1 py-1 text-[11px] uppercase text-muted-foreground font-semibold">
                              {(cat as any).label}
                            </div>
                            <div className="grid grid-cols-1 gap-1 px-1">
                              {(cat as any).features.map((key: string) => {
                                const checked = filters.has(key);
                                const label = getFeatureDisplayName(key) || key;
                                return (
                                  <label
                                    key={key}
                                    className="flex items-center gap-2 text-[12px]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const che = e.currentTarget.checked;
                                        React.startTransition(() => {
                                          setFilters((prev) => {
                                            const next = new Set(prev);
                                            if (che) next.add(key);
                                            else next.delete(key);
                                            return next;
                                          });
                                        });
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {showFilters && (
                    <div className="flex justify-center gap-2 px-1 py-2 rounded-b-xl">
                      {filters.size > 0 && (
                        <button
                          className="text-[11px] font-semibold px-2 py-1 rounded-xl border bg-highlight-3 dark:bg-background border border-border/90 hover:bg-highlight-5 dark:hover:bg-highlight-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            React.startTransition(() => {
                              setFilters(new Set());
                            });
                          }}
                        >
                          Clear
                        </button>
                      )}
                      <button
                        className="text-[11px] font-semibold px-2 py-1 rounded-xl border border-border/90 bg-background dark:bg-highlight-5 border-border text-foreground hover:bg-highlight-3 dark:hover:bg-highlight-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFilters(false);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence> */}
        {/* FILTER PANEL GÇö slides from bottom */}

        {/* {(showMap || smallScreen) &&
          selected &&
          swellDirections &&
          [
            swellDirections.primary,
            swellDirections.secondary,
            swellDirections.tertiary,
          ].some((d) => typeof d === "number") && (
            <div className="absolute top-28 @min-4xl:top-auto right-3 @min-4xl:right-auto @min-4xl:bottom-3 @min-4xl:left-3 z-[1] max-w-[200px]">
              <div className="rounded-lg border border-border/60 bg-background/90 backdrop-blur px-3 py-2 shadow">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Direction Rings
                </span>
                <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                    <span>Primary swell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                    <span>Secondary swell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                    <span>Tertiary swell</span>
                  </div>
                  {typeof windDirection === "number" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                      <span>Wind direction</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )} */}

        <style jsx global>{`
          .maplibregl-popup.plain-popup .maplibregl-popup-content {
            background: transparent;
            box-shadow: none;
            padding: 0;
            border-radius: 0;
          }
          .maplibregl-popup.plain-popup .maplibregl-popup-tip {
            display: none;
          }
          .maplibregl-popup.plain-popup .maplibregl-popup-content > div {
            outline: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
          .maplibregl-popup.plain-popup .maplibregl-popup-content > div:focus,
          .maplibregl-popup.plain-popup .maplibregl-popup-content > div:active {
            outline: none;
            background: transparent;
          }

          @media (max-width: 910px) {
            .maplibregl-ctrl-attrib {
              bottom: 68px;
            }

            .maplibregl-ctrl.maplibregl-ctrl-group {
              margin-bottom: 60px;
            }
          }

          .maplibregl-ctrl.maplibregl-ctrl-group {
            backdrop-filter: blur(10px);
          }

          .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon {
            background-image: none !important;
            font-size: 28px;
            font-weight: 200;
            color: var(--foreground);
            display: flex !important;
            justify-content: center;
            align-items: center;
            margin-top: -2px;
          }

          .maplibregl-ctrl-zoom-in,
          .maplibregl-ctrl-zoom-out {
            background: none !important;
          }

          .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon::before {
            content: "+";
          }

          .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon {
            background-image: none !important;
            font-size: 39px;
            font-weight: 100;
            color: var(--foreground);
            display: flex !important;
            justify-content: center;
            margin-top: 2px;
          }

          .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon::before {
            content: "-";
          }

          .maplibregl-ctrl-icon:hover {
            color: var(--muted-foreground);
            font-weight: 500;
            outline: none !important;
          }

          .maplibregl-popup-content {
            border-radius: 20px;
          }

          .maplibregl-ctrl-attrib {
            right: 3px;
          }
        `}</style>
      </Map>

      {/* Mobile scroll button - only show on mobile */}
      {/* <button
        onClick={() => {
          const content = document.getElementById("content");
          if (content) {
            const headerOffset = 100;
            const rect = content.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            try {
              window.scrollTo({
                top: Math.max(absoluteTop - headerOffset, 0),
                behavior: "smooth",
              });
            } catch {
              content.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-10",
          "bottom-[calc(env(safe-area-inset-bottom,0)+3rem)]",
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-background/95 backdrop-blur border border-border shadow-lg",
          "text-sm font-medium text-foreground touch-pan-y",
          "hover:bg-highlight-5 transition-colors",
          "@min-4xl:hidden" // Hide on desktop
        )}
        aria-label="Scroll to content"
      >
        <ChevronDown size={16} />
        <span>
          View{" "}
          {fullMapPage ? (forecastPage ? "Forecast" : "Overview") : "Beaches"}
        </span>
      </button> */}
    </aside>
  );
};

export default InteractiveMap;

type SelectedBeachMarkerProps = {
  selected: BeachPoint | null;
  swellDirections: SwellDirectionSet | null;
  windDirection: number | null;
  selectedPointVisible: boolean;
  zoom: number;
  overlayLabels: OverlayLabels;
  legendOpen: boolean;
  overlaysHidden: boolean;
};

const SelectedBeachMarker = React.memo(
  ({
    selected,
    swellDirections,
    windDirection,
    selectedPointVisible,
    zoom,
    overlayLabels,
    legendOpen,
    overlaysHidden,
  }: SelectedBeachMarkerProps) => {
    if (
      !selected ||
      !swellDirections ||
      [
        swellDirections.primary,
        swellDirections.secondary,
        swellDirections.tertiary,
      ].every((direction) => typeof direction !== "number")
    ) {
      return null;
    }
    if (!selectedPointVisible || zoom < 9 || overlaysHidden) {
      return null;
    }

    const baseScale = zoom >= 14 ? 1 : zoom / 14;
    const viewportMin =
      typeof window !== "undefined"
        ? Math.min(window.innerWidth, window.innerHeight)
        : null;
    const maxSize = viewportMin ? viewportMin * 0.72 : null;
    const scale = maxSize ? Math.min(baseScale, maxSize / 160) : baseScale;
    const ringSize = 160 * scale;
    const outerRadius = 110 * scale;
    const labelDistance = 140 * scale;
    const centerOffset = ringSize / 2;
    const haloPadding = Math.max(outerRadius - ringSize / 2, 0);
    const cardinalLabels = [
      {
        id: "N" as const,
        style: {
          top: `${centerOffset - labelDistance}px`,
          left: `${centerOffset}px`,
          transform: "translate(-50%, -50%)",
        },
      },
      {
        id: "S" as const,
        style: {
          top: `${centerOffset + labelDistance}px`,
          left: `${centerOffset}px`,
          transform: "translate(-50%, -50%)",
        },
      },
      {
        id: "E" as const,
        style: {
          top: `${centerOffset}px`,
          left: `${centerOffset + labelDistance}px`,
          transform: "translate(-50%, -50%)",
        },
      },
      {
        id: "W" as const,
        style: {
          top: `${centerOffset}px`,
          left: `${centerOffset - labelDistance}px`,
          transform: "translate(-50%, -50%)",
        },
      },
    ];

    return (
      <Marker
        longitude={selected.longitude}
        latitude={selected.latitude}
        anchor="center"
      >
        <div className="pointer-events-none relative flex flex-col items-center justify-center overflow-visible">
          <div
            className={cn(
              "absolute bg-background rounded-lg border border-border px-3 py-1.5 shadow-lg whitespace-nowrap z-10",
              legendOpen ? "-top-26" : "-top-19"
            )}
          >
            <span className="text-sm font-semibold text-foreground antialiased">
              {selected.name}
            </span>
          </div>
          <div
            className="relative flex items-center justify-center"
            style={{ width: ringSize, height: ringSize }}
          >
            <div
              className="pointer-events-none absolute rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.10)] border border-border/35"
              aria-hidden="true"
              style={{
                top: -haloPadding,
                left: -haloPadding,
                right: -haloPadding,
                bottom: -haloPadding,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-full border border-border/45"
              aria-hidden="true"
              style={{
                top: -haloPadding * 0.6,
                left: -haloPadding * 0.6,
                right: -haloPadding * 0.6,
                bottom: -haloPadding * 0.6,
              }}
            />
            {legendOpen && (
              <div className="pointer-events-none absolute inset-0">
                {cardinalLabels.map(({ id, style }) => (
                  <span
                    key={id}
                    className="absolute text-[12px] font-black uppercase leading-none text-slate-900/80 dark:text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] select-none"
                    style={style}
                  >
                    {id}
                  </span>
                ))}
              </div>
            )}
            <SwellRings
              directions={{
                primary: swellDirections.primary,
                secondary: swellDirections.secondary,
                tertiary: swellDirections.tertiary,
              }}
              labels={{
                primary: overlayLabels?.primary ?? null,
                secondary: overlayLabels?.secondary ?? null,
                tertiary: overlayLabels?.tertiary ?? null,
              }}
              showLegend={legendOpen}
              scale={scale}
              className="absolute inset-0"
            />
            <WindRing
              direction={windDirection}
              label={overlayLabels?.wind ?? null}
              showLegend={legendOpen}
              scale={scale}
              className="absolute inset-0"
            />
          </div>
        </div>
      </Marker>
    );
  }
);
SelectedBeachMarker.displayName = "SelectedBeachMarker";
