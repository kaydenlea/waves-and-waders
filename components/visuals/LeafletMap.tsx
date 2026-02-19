"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "@maplibre/maplibre-gl-leaflet";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { getPacificMidnightUTC } from "@/lib/utils";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";
import {
  FEATURE_CATEGORIES,
  getFeatureDisplayName,
  generateBeachSlug,
  generateBeachUrl,
  extractBeachId,
  type ForecastData,
} from "@/lib/supabase";
import type { BeachPoint } from "@/components/context/MapFilterContext";
import {
  useMapFavoriteIdsData,
  useMapFiltersData,
  useMapHoverCardData,
  useMapUI,
} from "@/components/context/MapFilterContext";
import {
  VisibleMapBounds,
  useMapViewport,
} from "@/components/context/MapViewportContext";
import { useViewportBeachesContext } from "@/components/context/ViewportBeachesContext";
import { useDateContext } from "@/components/context/DateContext";
import {
  MAP_FOCUS_EVENT,
  type MapFocusEventDetail,
} from "@/components/general/mapEvents";
import { useOptionalOverviewPageBusy } from "@/components/context/OverviewPageBusyContext";
import {
  SlidersHorizontal,
  Info,
  MapPin,
  ArrowRightFromLine,
  Minimize2,
  MapIcon,
  CalendarDays,
  Locate,
  ZoomOut,
  Construction,
} from "lucide-react";
import PageTabs from "../general/PageTabs";
import { SwellRings, WindRing } from "./DirectionRings";
import {
  useSwellDirections,
  usePrefetchAdjacentDates,
} from "@/lib/hooks/useBeachData";
import { fetchSurfIntensityAPI } from "@/lib/api";
import { useBeachStatsCache } from "@/components/context/BeachStatsCacheContext";
import {
  extractDailySurfWindStats,
  normalizeHour,
} from "@/lib/beachStatsShared";
import {
  getSurfIntensityBand,
  getSurfIntensityColorCss,
  computeRepresentativeSurfFt,
} from "@/lib/forecast/surfIntensity";
import {
  setMapInteractionCamera,
  setMapInteractionHover,
  setMapInteractionSelection,
} from "@/lib/mapInteractionStore";

type Props = {
  beachId?: string | number;
  loggedIn?: boolean;
  initialBeach?: BeachPoint | null;
  variant?: "page" | "embed";
  ui?: "full" | "preview";
};

type MarkerOptionsWithMeta = L.MarkerOptions & {
  wwIntensity?: number;
  wwBeachId?: string | number;
};

type MarkerDomGuardsState = {
  element: HTMLElement | null;
  preventDragStart: ((event: Event) => void) | null;
  pointerDownCapture: ((event: PointerEvent) => void) | null;
  mouseDownCapture: ((event: MouseEvent) => void) | null;
  touchStartCapture: ((event: TouchEvent) => void) | null;
  touchMoveCapture: ((event: TouchEvent) => void) | null;
  touchEndCapture: ((event: TouchEvent) => void) | null;
  touchCancelCapture: ((event: TouchEvent) => void) | null;
};

type MarkerWithMeta = L.Marker & {
  options: MarkerOptionsWithMeta;
  _wwDomGuardsState?: MarkerDomGuardsState;
};

type MarkerClusterGroupWithHelpers = L.MarkerClusterGroup & {
  getVisibleParent?: (marker: L.Marker) => L.Marker | null;
  _map?: L.Map | null;
};

type LeafletWindow = Window & {
  L?: typeof L;
  ResizeObserver?: typeof ResizeObserver;
};

type IdleCallbackWindow = LeafletWindow & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

type LeafletBrowser = typeof L.Browser & { any3d?: boolean };

type ClusterEvent = L.LeafletEvent & {
  layer?: L.MarkerCluster;
  originalEvent?: Event;
};

// OpenFreeMap provides vector tiles; MapLibre GL Leaflet renders them inside our existing Leaflet map.
// Style URL is the official OpenFreeMap Liberty style (per https://openfreemap.org/quick_start/).
const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
// Attribution per https://openfreemap.org/#attribution (and OSM attribution requirements).
const OPENFREEMAP_ATTRIBUTION_HTML =
  // '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
const OSM_ATTRIBUTION_HTML =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
const DEFAULT_CENTER: [number, number] = [37.8, -122.4];
const DEFAULT_ZOOM = 6;
const MAP_VIEW_STORAGE_KEY = "ww:last-map-view";
const LAST_SELECTION_KEY = "ww:last-selected-beach";
const LAST_SELECTION_CENTER_KEY = "ww:last-selected-center";
const CAMERA_MIN_INTERVAL = 120;
const COMMIT_IDLE_DELAY = 100;
const CAMERA_UPDATE_DEBOUNCE_MS = 220;
const RESIZE_SETTLE_DELAY = 180;
const BOUNDS_DELTA_THRESHOLD = 0.0005;
// Keep per-frame work small so map drag stays responsive on low-end devices.
const MARKER_BUILD_FRAME_BUDGET_MS = 6;
const MARKER_BUILD_MIN_BATCH = 60;
const MIN_OVERLAY_ZOOM = 15;
const AUTO_FOCUS_ZOOM = 17;
const OVERLAY_PANE_ID = "ww-overlay-pane";
// Web Mercator (EPSG:3857) valid latitude range.
// Using solid Leaflet bounds prevents users from panning into areas where tiles don't exist (grey/empty).
const WEB_MERCATOR_MAX_LATITUDE = 85.0511287798066;
// Horizontal panning limits (degrees longitude).
// Leaflet enforces these via `maxBounds` so the map stops naturally at the edges (no manual recentering/snapping).
const WEST_LNG_LIMIT = -250;
const EAST_LNG_LIMIT = 50;
const WEB_MERCATOR_MAX_BOUNDS = L.latLngBounds(
  [-WEB_MERCATOR_MAX_LATITUDE, WEST_LNG_LIMIT],
  [WEB_MERCATOR_MAX_LATITUDE, EAST_LNG_LIMIT],
);

const logLeafletPerf = (label: string, startTs: number | null) => {
  if (
    startTs == null ||
    typeof performance === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return;
  }
  const duration = performance.now() - startTs;
  // eslint-disable-next-line no-console
  console.log(`[LeafletPerf] ${label}: ${duration.toFixed(1)}ms`);
};

const readLeafletDebugFlag = () => {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("ww:debug-leaflet") === "1";
  } catch {
    return false;
  }
};

const canUseWebGL = () => {
  if (typeof window === "undefined" || !window.WebGLRenderingContext) {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch (error) {
    return false;
  }
};

type StoredViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const DEFAULT_VIEW: StoredViewState = {
  longitude: DEFAULT_CENTER[1],
  latitude: DEFAULT_CENTER[0],
  zoom: DEFAULT_ZOOM,
};

type MarkerEntry = {
  marker: L.Marker;
  beach: BeachPoint;
  intensity: number;
  favorite: boolean;
};

type OverlayLabels = {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
  wind: string | null;
} | null;

type LatLngLiteral = { lat: number; lng: number };

type SwellDirectionSet = {
  primary: number | null;
  secondary: number | null;
  tertiary: number | null;
};

const getIntensityColor = (value: number) => {
  return getSurfIntensityColorCss(getSurfIntensityBand(value));
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }
  return { r, g, b };
};

const mixHexColors = (colorA: string, colorB: string, weight = 0.5) => {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return colorA;
  const ratio = Math.min(Math.max(weight, 0), 1);
  const r = Math.round(rgbA.r * (1 - ratio) + rgbB.r * ratio);
  const g = Math.round(rgbA.g * (1 - ratio) + rgbB.g * ratio);
  const b = Math.round(rgbA.b * (1 - ratio) + rgbB.b * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const createMarkerIcon = ({
  intensity,
  favorite,
  selected,
  hovered = false,
}: {
  intensity: number;
  favorite: boolean;
  selected: boolean;
  hovered?: boolean;
}) => {
  // Selected marker: keep a clean circle so it works well
  // with the direction rings overlay on the overview page.
  const size = hovered ? 28 : 24;
  const hitSize = size;
  const border = favorite || hovered ? 3 : 2;
  const borderColor = favorite ? "#facc15" : "#ffffff";
  const color = getIntensityColor(intensity);
  const html = `
      <div style="width:${hitSize}px;height:${hitSize}px;display:flex;align-items:center;justify-content:center;">
        <div
          class="ww-marker-circle"
          style="
            width:${size}px;
            height:${size}px;
            border-radius:999px;
            border:${border}px solid ${borderColor};
            background:${color};
            box-shadow:${
              hovered
                ? "0 0 12px rgba(37,99,235,0.6)"
                : "0 1px 4px rgba(15,23,42,0.35)"
            };
          "
        ></div>
      </div>
    `;
  return L.divIcon({
    className: "ww-leaflet-point-icon",
    html,
    iconSize: [hitSize, hitSize],
    iconAnchor: [hitSize / 2, hitSize / 2],
  });

  // Non-selected marker: map-style pin with a slightly larger
  // interactive area, but visually centered on the location.
  // const headSize = hovered ? 22 : 20;
  // const pinWidth = 30;
  // const pinHeight = 40;
  // const border = favorite || hovered ? 3 : 2;
  // const borderColor = favorite ? "#facc15" : hovered ? "#60a5fa" : "#ffffff";
  // const color = getIntensityColor(intensity);
  // const html = `
  //   <div style="width:${pinWidth}px;height:${pinHeight}px;display:flex;align-items:flex-start;justify-content:center;">
  //     <div style="position:relative;width:${headSize}px;height:${pinHeight}px;">
  //       <div
  //         style="
  //           position:absolute;
  //           left:50%;
  //           top:0;
  //           transform:translateX(-50%);
  //           width:${headSize}px;
  //           height:${headSize}px;
  //           border-radius:999px;
  //           border:${border}px solid ${borderColor};
  //           background:${color};
  //           box-shadow:${
  //             hovered
  //               ? "0 0 10px rgba(37,99,235,0.45)"
  //               : "0 1px 4px rgba(15,23,42,0.35)"
  //           };
  //         "
  //       ></div>
  //       <div
  //         style="
  //           position:absolute;
  //           left:50%;
  //           top:${headSize - 2}px;
  //           transform:translateX(-50%);
  //           width:${headSize * 0.4}px;
  //           height:${pinHeight - headSize}px;
  //           border-radius:999px 999px 4px 4px;
  //           background:${color};
  //           filter:brightness(0.96);
  //         "
  //       ></div>
  //     </div>
  //   </div>
  // `;
  // return L.divIcon({
  //   className: "ww-leaflet-point-icon",
  //   html,
  //   iconSize: [pinWidth, pinHeight],
  //   iconAnchor: [pinWidth / 2, pinHeight / 2],
  // });
};

const createClusterIcon = (cluster: L.MarkerCluster) => {
  const safeCall = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };

  const count = safeCall<number>(() => cluster.getChildCount(), 0);
  let size = 40;
  if (count >= 100) {
    size = 52;
  } else if (count >= 50) {
    size = 46;
  }
  const coreInset = Math.max(3, Math.round(size * 0.075));

  const markers: L.Marker[] =
    typeof cluster?.getAllChildMarkers === "function"
      ? safeCall<L.Marker[]>(() => cluster.getAllChildMarkers(), [])
      : [];
  const intensities: number[] = [];
  markers.forEach((marker) => {
    const v = (marker as MarkerWithMeta).options.wwIntensity;
    if (typeof v === "number" && Number.isFinite(v)) {
      intensities.push(v);
    }
  });

  let maxIntensity = 0;
  intensities.forEach((v) => {
    if (v > maxIntensity) maxIntensity = v;
  });

  let lowCount = 0;
  let medCount = 0;
  let highCount = 0;
  intensities.forEach((value) => {
    if (value >= 6) {
      highCount++;
    } else if (value >= 3) {
      medCount++;
    } else if (value > 0.1) {
      lowCount++;
    }
  });

  const hasHigh = highCount > 0;
  const hasMed = medCount > 0;
  const hasLow = lowCount > 0;

  const buckets: Array<{ color: string; count: number }> = [];
  if (hasLow) {
    buckets.push({ color: getIntensityColor(1), count: lowCount });
  }
  if (hasMed) {
    buckets.push({ color: getIntensityColor(4), count: medCount });
  }
  if (hasHigh) {
    buckets.push({ color: getIntensityColor(7), count: highCount });
  }

  const smoothingBias = 0.06;
  const totalWeight =
    buckets.reduce((sum, entry) => sum + entry.count, 0) +
    smoothingBias * buckets.length;
  const weightedSegments: Array<{ color: string; ratio: number }> =
    totalWeight > 0
      ? buckets.map((entry) => ({
          color: entry.color,
          ratio: (entry.count + smoothingBias) / totalWeight,
        }))
      : [];

  let backgroundStyle = "#eff6ff";
  if (weightedSegments.length > 0) {
    const stops: string[] = [];
    let cursor = 0;
    weightedSegments.forEach((segment, index) => {
      const span = segment.ratio * 360;
      const start = cursor;
      const end = start + span;
      const pad = weightedSegments.length > 1 ? Math.min(10, span * 0.2) : 0;
      const fillEnd = Math.max(start, end - pad);
      stops.push(
        `${segment.color} ${start.toFixed(2)}deg ${fillEnd.toFixed(2)}deg`,
      );
      if (pad > 0) {
        const nextColor =
          weightedSegments[(index + 1) % weightedSegments.length]?.color ??
          segment.color;
        const blended = mixHexColors(segment.color, nextColor, 0.5);
        stops.push(`${blended} ${fillEnd.toFixed(2)}deg ${end.toFixed(2)}deg`);
      } else {
        stops.push(
          `${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`,
        );
      }
      cursor = end;
    });
    if (cursor < 360) {
      const lastColor =
        weightedSegments[weightedSegments.length - 1]?.color ?? "#dbeafe";
      stops.push(`${lastColor} ${cursor.toFixed(2)}deg 360deg`);
    }

    const conic = `conic-gradient(${stops.join(", ")})`;
    const radial =
      "radial-gradient(circle at center, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.82) 44%, rgba(255,255,255,0.45) 57%, rgba(255,255,255,0.12) 63%, transparent 70%)";
    const halo =
      "radial-gradient(circle at center, transparent 62%, rgba(96,165,250,0.1) 72%, rgba(37,99,235,0.04) 85%, transparent 94%)";
    backgroundStyle = `${radial}, ${halo}, ${conic}`;
  }

  const html = `
    <div
      class="ww-cluster-inner"
      style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        position:relative;
        background:${backgroundStyle};
        display:flex;
        align-items:center;
        justify-content:center;
        --ww-cluster-inset:${coreInset}px;
        box-shadow:0 14px 30px rgba(15,23,42,0.18);
      "
    >
      <div class="ww-cluster-core">
        <span class="ww-cluster-count" data-digits="${
          String(count).length
        }">${count}</span>
        <div class="ww-cluster-dots" aria-hidden="true">
          ${
            hasLow
              ? `<span class="ww-cluster-dot" style="background:${getIntensityColor(
                  1,
                )};"></span>`
              : ""
          }
          ${
            hasMed
              ? `<span class="ww-cluster-dot" style="background:${getIntensityColor(
                  4,
                )};"></span>`
              : ""
          }
          ${
            hasHigh
              ? `<span class="ww-cluster-dot" style="background:${getIntensityColor(
                  7,
                )};"></span>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
  return L.divIcon({
    className: "ww-leaflet-cluster-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const inlineFilterBeaches = (list: BeachPoint[], filters: Set<string>) => {
  const filterKeys = Array.from(filters ?? []);
  if (!filterKeys.length) {
    return list.filter((entry) => !entry.features?.INLND_AREA);
  }
  return list.filter((entry) => {
    if (entry.features?.INLND_AREA) return false;
    const feats = entry.features ?? {};
    return filterKeys.every((key) => feats[key]);
  });
};

const ensureSelectionPresent = (
  filtered: BeachPoint[],
  source: BeachPoint[],
  selection: string | number | null,
) => {
  if (!selection) return filtered;
  const normalized = String(selection);
  if (filtered.some((beach) => String(beach.id) === normalized)) {
    return filtered;
  }
  const backup =
    source.find((beach) => String(beach.id) === normalized) ?? null;
  if (!backup) {
    return filtered;
  }
  return [...filtered, backup];
};

const readBounds = (map: L.Map): VisibleMapBounds => {
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  return {
    south: bounds.getSouth(),
    north: bounds.getNorth(),
    west,
    east,
    crossesAntimeridian: west > east,
  };
};

const boundsWithinThreshold = (
  next: VisibleMapBounds | null,
  prev: VisibleMapBounds | null,
) => {
  if (!next || !prev) return false;
  return (
    Math.abs(next.north - prev.north) < BOUNDS_DELTA_THRESHOLD &&
    Math.abs(next.south - prev.south) < BOUNDS_DELTA_THRESHOLD &&
    Math.abs(next.east - prev.east) < BOUNDS_DELTA_THRESHOLD &&
    Math.abs(next.west - prev.west) < BOUNDS_DELTA_THRESHOLD
  );
};

const isLocationWithinBounds = (
  location: LatLngLiteral,
  bounds: VisibleMapBounds | null,
) => {
  if (!bounds) return false;
  const latOk = location.lat >= bounds.south && location.lat <= bounds.north;
  if (!latOk) return false;
  if (!bounds.crossesAntimeridian) {
    return location.lng >= bounds.west && location.lng <= bounds.east;
  }
  return location.lng >= bounds.west || location.lng <= bounds.east;
};

const wrapLongitude = (value: number) => {
  let lon = value;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return lon;
};

const clampLatitudeToWebMercator = (value: number) =>
  Math.max(
    -WEB_MERCATOR_MAX_LATITUDE,
    Math.min(WEB_MERCATOR_MAX_LATITUDE, value),
  );

const getNearestBeaches = (
  origin: LatLngLiteral,
  list: BeachPoint[],
  count: number,
) => {
  if (!list.length) return [];
  const originLat = origin.lat;
  const originLng = origin.lng;
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  return list
    .map((beach) => {
      const dLat = beach.latitude - originLat;
      const dLng = (beach.longitude - originLng) * cosLat;
      return { beach, dist: dLat * dLat + dLng * dLng };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((entry) => entry.beach);
};

const getBoundsForBeaches = (list: BeachPoint[]) => {
  if (!list.length) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  list.forEach((beach) => {
    if (beach.longitude < minLng) minLng = beach.longitude;
    if (beach.longitude > maxLng) maxLng = beach.longitude;
    if (beach.latitude < minLat) minLat = beach.latitude;
    if (beach.latitude > maxLat) maxLat = beach.latitude;
  });
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
    return null;
  }
  if (minLng === maxLng) {
    minLng -= 0.02;
    maxLng += 0.02;
  }
  if (minLat === maxLat) {
    minLat -= 0.02;
    maxLat += 0.02;
  }
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
};

const normalizeBoundsToWorld = (bounds: VisibleMapBounds): VisibleMapBounds => {
  if (!bounds) return bounds;
  let { west, east, south, north } = bounds;
  west = wrapLongitude(west);
  east = wrapLongitude(east);
  let crosses = bounds.crossesAntimeridian;
  if (!crosses && west > east) {
    crosses = true;
  }
  const latSpan = Math.max(0.0001, north - south);
  if (latSpan >= 180) {
    south = -WEB_MERCATOR_MAX_LATITUDE;
    north = WEB_MERCATOR_MAX_LATITUDE;
  } else {
    south = clampLatitudeToWebMercator(south);
    north = clampLatitudeToWebMercator(north);
  }
  return {
    south,
    north,
    west,
    east,
    crossesAntimeridian: crosses,
  };
};

const readStoredView = (): StoredViewState => {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW;
  }
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.longitude === "number" &&
        typeof parsed?.latitude === "number"
      ) {
        return {
          longitude: wrapLongitude(parsed.longitude),
          latitude: clampLatitudeToWebMercator(parsed.latitude),
          zoom:
            typeof parsed?.zoom === "number"
              ? Math.max(3, Math.min(17, parsed.zoom))
              : DEFAULT_ZOOM,
        };
      }
    }
  } catch {
    return DEFAULT_VIEW;
  }
  return DEFAULT_VIEW;
};

const saveStoredSelection = (beach: BeachPoint, zoom: number) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SELECTION_KEY, String(beach.id));
    window.localStorage.setItem(
      LAST_SELECTION_CENTER_KEY,
      JSON.stringify({
        id: beach.id,
        longitude: beach.longitude,
        latitude: beach.latitude,
        zoom: Math.max(3, Math.min(16, zoom)),
      }),
    );
  } catch {
    // ignore storage errors
  }
};

const readStoredSelectionId = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SELECTION_KEY);
  } catch {
    return null;
  }
};

const resolveInitialView = (
  initialBeach?: BeachPoint | null,
  options?: { allowStoredFallback?: boolean },
): StoredViewState => {
  if (
    initialBeach &&
    Number.isFinite(Number(initialBeach.latitude)) &&
    Number.isFinite(Number(initialBeach.longitude))
  ) {
    return {
      longitude: Number(initialBeach.longitude),
      latitude: clampLatitudeToWebMercator(Number(initialBeach.latitude)),
      zoom: AUTO_FOCUS_ZOOM,
    };
  }
  if (options?.allowStoredFallback === false) {
    return DEFAULT_VIEW;
  }
  const storedSelectionCenter = readStoredSelectionCenter();
  if (storedSelectionCenter) {
    return storedSelectionCenter;
  }
  return readStoredView();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

const supportsTouchInput = () => {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    return true;
  if ("ontouchstart" in window) return true;
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(any-pointer: coarse)").matches;
    } catch {
      // ignore unsupported media queries
    }
  }
  return false;
};

const isTouchInteraction = (event?: Event | null) => {
  if (!event) return supportsTouchInput();
  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
    return event.pointerType === "touch";
  }
  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    return true;
  }
  const maybe = event as Event & {
    sourceCapabilities?: { firesTouchEvents?: boolean };
  };
  if (maybe.sourceCapabilities?.firesTouchEvents === true) return true;
  if (
    typeof window !== "undefined" &&
    supportsTouchInput() &&
    typeof window.matchMedia === "function"
  ) {
    try {
      if (!window.matchMedia("(hover: hover)").matches) return true;
    } catch {
      // ignore unsupported media queries
    }
  }
  return false;
};

const formatSurfRange = (
  minValue: number | null | undefined,
  maxValue: number | null | undefined,
) => {
  const hasMin = typeof minValue === "number" && Number.isFinite(minValue);
  const hasMax = typeof maxValue === "number" && Number.isFinite(maxValue);
  if (!hasMin && !hasMax) return null;
  const minRounded = hasMin ? Math.round(minValue as number) : null;
  const maxRounded = hasMax ? Math.round(maxValue as number) : null;
  if (minRounded != null && maxRounded != null) {
    const low = Math.min(minRounded, maxRounded);
    const high = Math.max(minRounded, maxRounded);
    if (low === high && low === 1) return "0-1";
    return low === high ? String(low) : `${low}-${high}`;
  }
  const value = minRounded ?? maxRounded ?? null;
  if (value === 1) return "0-1";
  return value != null ? String(value) : null;
};

const normalizeSurfLabel = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^1(?:\.0+)?$/.test(trimmed)) return "0-1";
  if (/^1(?:\.0+)?-1(?:\.0+)?$/.test(trimmed)) return "0-1";
  return value;
};

const representativeSurfRangeLabel = (row: ForecastData | null): string | null => {
  if (!row) return null;
  const rep = computeRepresentativeSurfFt(row);
  if (rep == null || !Number.isFinite(rep)) return null;
  const low = Math.max(0, Math.floor(rep));
  const high = Math.max(low + 1, Math.ceil(rep));
  return `${low}-${high}`;
};

const parseSurfRepresentativeFt = (
  value: string | null | undefined,
): number | null => {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2] ?? match[1]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return (low + high) / 2;
};

const buildPopupHtml = (
  beach: BeachPoint,
  stats: {
    surfHeight: string | null;
    surfIntensity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
  },
) => {
  const safeName = escapeHtml(beach.name ?? "Unnamed beach");
  const safeCounty = escapeHtml(beach.county ?? "");
  const numericIntensity =
    stats.surfIntensity != null && Number.isFinite(stats.surfIntensity)
      ? stats.surfIntensity
      : null;
  const surfReady =
    typeof stats.surfHeight === "string" && stats.surfHeight.length > 0;
  const surfLabel = normalizeSurfLabel(stats.surfHeight);
  const surfText = surfReady ? escapeHtml(surfLabel as string) : "--";
  const windSpeedValue =
    stats.windSpeed != null && Number.isFinite(stats.windSpeed)
      ? Math.round(stats.windSpeed)
      : null;
  const windReady = windSpeedValue != null;
  const windText = windReady ? String(windSpeedValue) : "--";
  const windDirection =
    stats.windDirection != null && Number.isFinite(stats.windDirection)
      ? stats.windDirection
      : null;
  const windArrowRotation =
    windDirection != null ? (windDirection - 315 + 360) % 360 : null;
  const windArrow =
    windArrowRotation != null
      ? `<span class="ww-leaflet-popup__wind-arrow" style="transform:rotate(${windArrowRotation}deg);">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>
          </svg>
        </span>`
      : "";
  const windTail = windArrow;
  const color = getIntensityColor(
    numericIntensity != null ? numericIntensity : 0,
  );
  const wavesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></svg>`;
  const windSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#464646ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 17a1.7 1.7 0 1 1 1.7 1.7H2"></path><path d="M12.4 13a2.1 2.1 0 1 1 2.1 2.1H2"></path><path d="M15.1 7a2.9 2.9 0 1 0-2.9-2.9"></path><path d="M2 9h12.5"></path></svg>`;
  return `
    <div class="ww-leaflet-popup">
      <header class="ww-leaflet-popup__header">
        <span class="ww-leaflet-popup__dot" style="background:${color}"></span>
        <div class="ww-leaflet-popup__titles">
          <strong title="${safeName}">${safeName}</strong>
          <span title="${safeCounty}">${safeCounty}</span>
        </div>
      </header>
      <div class="ww-leaflet-popup__metrics">
        <div class="ww-leaflet-popup__metric">
          <div class="ww-leaflet-popup__icon">${wavesSvg}</div>
          <div class="ww-leaflet-popup__metric-text">
            <span>Surf</span>
            <strong>${
              surfReady
                ? `${surfText}<span>ft</span>`
                : `<span class="ww-leaflet-popup__placeholder ww-leaflet-popup__placeholder--wide" aria-hidden="true"></span>`
            }</strong>
          </div>
        </div>
        <div class="ww-leaflet-popup__metric">
          <div class="ww-leaflet-popup__icon" style="background:rgba(255, 255, 255, 0.95)">${windSvg}</div>
          <div class="ww-leaflet-popup__metric-text">
            <span>Wind</span>
            <strong>${
              windReady
                ? `${windText}<span>mph</span>${windTail}`
                : `<span class="ww-leaflet-popup__placeholder ww-leaflet-popup__placeholder--wide" aria-hidden="true"></span>`
            }</strong>
          </div>
        </div>
      </div>
    </div>
  `;
};

const readStoredSelectionCenter = (): StoredViewState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_SELECTION_CENTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.longitude === "number" &&
      typeof parsed?.latitude === "number"
    ) {
      return {
        longitude: parsed.longitude,
        latitude: clampLatitudeToWebMercator(parsed.latitude),
        zoom:
          typeof parsed?.zoom === "number"
            ? Math.max(3, Math.min(16, parsed.zoom))
            : AUTO_FOCUS_ZOOM,
      };
    }
  } catch {
    return null;
  }
  return null;
};

const useFilteredBeaches = (
  beaches: BeachPoint[],
  filters: Set<string>,
  selectedId: string | number | null,
) => {
  const workerRef = React.useRef<Worker | null>(null);
  const beachesRef = React.useRef(beaches);
  const filtersRef = React.useRef(filters);
  const selectionRef = React.useRef<string | number | null>(selectedId);
  const updateTimeoutRef = React.useRef<number | null>(null);
  const [filtered, setFiltered] = React.useState<BeachPoint[]>(() =>
    ensureSelectionPresent(
      inlineFilterBeaches(beaches, filters ?? new Set()),
      beaches,
      selectedId,
    ),
  );

  React.useEffect(() => {
    beachesRef.current = beaches;
  }, [beaches]);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    selectionRef.current = selectedId;
  }, [selectedId]);

  const filtersKey = React.useMemo(
    () => JSON.stringify(Array.from(filters ?? [])),
    [filters],
  );
  const beachesKey = React.useMemo(
    () => beaches.map((b) => String(b.id)).join("|"),
    [beaches],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      workerRef.current = null;
      return;
    }
    const worker = new Worker(
      new URL("../../lib/workers/beachFilterWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ beaches: BeachPoint[] }>) => {
      const currentBeaches = beachesRef.current;
      const selection = selectionRef.current;
      const next = ensureSelectionPresent(
        event.data?.beaches ?? [],
        currentBeaches,
        selection,
      );
      setFiltered(next);
    };
    worker.onerror = () => {
      workerRef.current = null;
      const currentBeaches = beachesRef.current;
      const currentFilters = filtersRef.current ?? new Set<string>();
      const selection = selectionRef.current;
      setFiltered(
        ensureSelectionPresent(
          inlineFilterBeaches(currentBeaches, currentFilters),
          currentBeaches,
          selection,
        ),
      );
      worker.terminate();
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const currentBeaches = beachesRef.current;
    const currentFilters = filtersRef.current ?? new Set<string>();
    const selection = selectionRef.current;
    const worker = workerRef.current;
    if (updateTimeoutRef.current != null) {
      window.clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    updateTimeoutRef.current = window.setTimeout(() => {
      if (worker) {
        worker.postMessage({
          beaches: currentBeaches,
          filters: Array.from(currentFilters),
        });
      } else {
        setFiltered(
          ensureSelectionPresent(
            inlineFilterBeaches(currentBeaches, currentFilters),
            currentBeaches,
            selection,
          ),
        );
      }
      updateTimeoutRef.current = null;
    }, 120);
  }, [beachesKey, filtersKey]);

  React.useEffect(() => {
    setFiltered((prev) =>
      ensureSelectionPresent(prev, beachesRef.current, selectedId),
    );
  }, [selectedId]);

  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current != null) {
        window.clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, []);

  return filtered;
};

const useSurfIntensityData = (selectedDate: Date | null) => {
  const cacheRef = React.useRef<
    Record<string, Record<string | number, number>>
  >({});
  const [data, setData] = React.useState<Record<string | number, number>>({});

  React.useEffect(() => {
    if (!selectedDate) {
      setData({});
      return;
    }
    let cancelled = false;
    const fetchForDate = async (date: Date) => {
      const key = date.toISOString().split("T")[0];
      if (cacheRef.current[key]) {
        return cacheRef.current[key];
      }
      try {
        const record = await fetchSurfIntensityAPI(date);
        const normalized = record ?? {};
        cacheRef.current[key] = normalized;
        return normalized;
      } catch {
        return {};
      }
    };
    const run = async () => {
      const current = await fetchForDate(selectedDate);
      if (!cancelled) {
        setData(current);
      }
      const preload: Promise<unknown>[] = [];
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        const copy = new Date(selectedDate);
        copy.setDate(copy.getDate() + i);
        preload.push(fetchForDate(copy));
      }
      Promise.all(preload).catch(() => {});
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  return data;
};

const SelectedBeachOverlay = React.memo(
  ({
    mapRef,
    anchor,
    selected,
    swellDirections,
    windDirection,
    overlayLabels,
    legendOpen,
    compact,
    mapReady,
    overlayPane,
    layoutVersion,
  }: {
    mapRef: React.MutableRefObject<L.Map | null>;
    anchor: { latitude: number; longitude: number } | null;
    selected: BeachPoint | null;
    swellDirections: SwellDirectionSet | null;
    windDirection: number | null;
    overlayLabels: OverlayLabels;
    legendOpen: boolean;
    compact: boolean;
    mapReady: boolean;
    overlayPane: string;
    layoutVersion: number;
  }) => {
    const markerRef = React.useRef<L.Marker | null>(null);
    const portalRef = React.useRef<HTMLDivElement | null>(null);
    const [portalTargetEl, setPortalTargetEl] =
      React.useState<HTMLDivElement | null>(null);
    const [overlayZoom, setOverlayZoom] = React.useState(() => {
      const map = mapRef.current;
      return map ? map.getZoom() : DEFAULT_ZOOM;
    });

    React.useEffect(() => {
      return () => {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
          portalRef.current = null;
        }
        setPortalTargetEl(null);
      };
    }, []);

    React.useEffect(() => {
      if (!mapReady) return;
      const map = mapRef.current;
      if (!map) return;
      const handleZoom = () => {
        const currentZoom = map.getZoom();
        setOverlayZoom((prev) => (prev === currentZoom ? prev : currentZoom));
      };
      handleZoom();
      map.on("zoomend", handleZoom);
      return () => {
        map.off("zoomend", handleZoom);
      };
    }, [mapReady, mapRef]);

    React.useLayoutEffect(() => {
      if (!mapReady) return;
      const map = mapRef.current;
      if (!map) return;
      if (!selected || !anchor) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
          portalRef.current = null;
        }
        setPortalTargetEl(null);
        return;
      }
      let marker = markerRef.current;
      if (!marker) {
        const element = document.createElement("div");
        element.className = "ww-selected-overlay-anchor";
        portalRef.current = element;
        setPortalTargetEl(element);
        marker = L.marker([anchor.latitude, anchor.longitude], {
          icon: L.divIcon({
            className: "ww-selected-overlay-marker",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
            html: element,
          }),
          keyboard: false,
          interactive: false,
          bubblingMouseEvents: false,
          pane: overlayPane,
        });
        marker.addTo(map);
        markerRef.current = marker;
      } else {
        marker.setLatLng([anchor.latitude, anchor.longitude]);
      }
    }, [mapReady, mapRef, anchor, selected, overlayPane, layoutVersion]);

    if (
      !anchor ||
      !selected ||
      !swellDirections ||
      [
        swellDirections.primary,
        swellDirections.secondary,
        swellDirections.tertiary,
      ].every((value) => typeof value !== "number")
    ) {
      return null;
    }
    const portalTarget = portalTargetEl ?? portalRef.current;
    if (!portalTarget) {
      return null;
    }
    if (overlayZoom < MIN_OVERLAY_ZOOM) {
      return null;
    }
    const baseScale = overlayZoom >= 14 ? 1 : overlayZoom / 14;
    const container = mapRef.current?.getContainer?.();
    const containerRect =
      container && typeof container.getBoundingClientRect === "function"
        ? container.getBoundingClientRect()
        : null;
    const maxSize = containerRect
      ? Math.min(containerRect.width, containerRect.height) *
        (compact ? 0.82 : 0.72)
      : null;
    const compactMaxScale = (() => {
      if (!containerRect) return 0.9;
      const minDim = Math.min(containerRect.width, containerRect.height);
      if (minDim < 360) return 0.9;
      if (minDim < 420) return 0.93;
      if (minDim < 500) return 0.96;
      return 0.98;
    })();
    const maxScale = compact ? compactMaxScale : 1;
    const scale = maxSize
      ? Math.min(baseScale, maxScale, maxSize / 160)
      : Math.min(baseScale, maxScale);
    const ringSize = 160 * scale;
    const outerRadius = 110 * scale;
    const labelDistance = 148 * scale;
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

    return createPortal(
      <div
        className="ww-selected-overlay pointer-events-none absolute z-[1200]"
        style={{
          left: 0,
          top: 0,
          transform: "translate(-50%, -50%)",
          width: ringSize,
          height: ringSize,
          transition: "opacity 120ms ease",
        }}
      >
        <div className="pointer-events-auto">
          <div className="pointer-events-none relative flex flex-col items-center justify-center overflow-visible">
            <div
              className={cn(
                "absolute bg-background rounded-lg border border-border px-3 py-1.5 shadow-lg whitespace-nowrap z-10 text-sm font-semibold text-foreground",
                compact && "hidden",
                legendOpen ? "-top-30" : "-top-24",
              )}
            >
              {selected.name}
            </div>
            <div
              className="relative flex items-center justify-center"
              style={{ width: ringSize, height: ringSize }}
            >
              {/* <div
                className="pointer-events-none absolute rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.10)] border border-border/35"
                aria-hidden="true"
                style={{
                  top: -haloPadding,
                  left: -haloPadding,
                  right: -haloPadding,
                  bottom: -haloPadding,
                }}
              /> */}
              {/* <div
                className="pointer-events-none absolute rounded-full border border-border/45"
                aria-hidden="true"
                style={{
                  top: -haloPadding * 0.6,
                  left: -haloPadding * 0.6,
                  right: -haloPadding * 0.6,
                  bottom: -haloPadding * 0.6,
                }}
              /> */}
              {legendOpen && (
                <div className="pointer-events-none absolute inset-0">
                  {cardinalLabels.map(({ id, style }) => (
                    <span
                      key={id}
                      className="w-5 text-center bg-background dark:bg-highlight-5 p-1 rounded-sm font-black absolute text-[11px] uppercase leading-none text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] select-none"
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
        </div>
      </div>,
      portalTarget,
    );
  },
);
SelectedBeachOverlay.displayName = "SelectedBeachOverlay";
const FilterPanel: React.FC<{
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClose: () => void;
  disableBlur: boolean;
}> = ({ filters, setFilters, onClose, disableBlur }) => {
  const filterCount = filters.size;
  const categoryEntries = Object.entries(FEATURE_CATEGORIES) as Array<
    [
      keyof typeof FEATURE_CATEGORIES,
      (typeof FEATURE_CATEGORIES)[keyof typeof FEATURE_CATEGORIES],
    ]
  >;
  return (
    <div
      className="absolute right-3 top-24 z-[1010] w-[calc(100%-1.5rem)] max-w-sm"
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={cn(
          "bg-background/95 rounded-xl border border-border shadow-lg max-h-[60vh] overflow-hidden",
          disableBlur ? "" : "backdrop-blur",
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/70">
          <span className="text-sm font-semibold tracking-wide">
            Filters {filterCount ? `(${filterCount})` : ""}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close filters"
          >
            Close
          </button>
        </div>
        <div className="max-h-[45vh] overflow-auto px-3 py-2 space-y-3">
          {categoryEntries.map(([catKey, cat]) => (
            <div key={catKey}>
              <div className="px-1 py-1 text-[11px] uppercase text-muted-foreground font-semibold">
                {cat.label}
              </div>
              <div className="grid grid-cols-1 gap-1 px-1">
                {cat.features.map((key) => {
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
                        onChange={(event) => {
                          const nextChecked = event.currentTarget.checked;
                          React.startTransition(() => {
                            setFilters((prev) => {
                              const next = new Set(prev ?? new Set());
                              if (nextChecked) next.add(key);
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
        <div className="flex justify-between px-3 py-2 border-t border-border/70">
          {filterCount > 0 && (
            <button
              type="button"
              className="text-[11px] font-semibold px-2 py-1 rounded-xl border bg-highlight-3 dark:bg-background border border-border/90 hover:bg-highlight-5 dark:hover:bg-highlight-2"
              onClick={() => {
                React.startTransition(() => {
                  setFilters(new Set());
                });
              }}
              title="Clear all selected filters"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="ml-auto text-[11px] font-semibold px-2 py-1 rounded-xl border border-border/90 bg-background dark:bg-highlight-5 text-foreground hover:bg-highlight-3 dark:hover:bg-highlight-2"
            onClick={onClose}
            title="Apply filters and close"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const LegendPanel: React.FC<{ onClose: () => void; disableBlur: boolean }> = ({
  onClose,
  disableBlur,
}) => (
  <div className="absolute right-3 top-21 @min-4xl:top-3 z-[1010] max-w-xs pointer-events-none">
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-highlight-7/80 px-3 py-2 shadow pointer-events-auto",
        disableBlur ? "" : "backdrop-blur",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase text-foreground">
          Direction Rings
        </span>
        {/* <button
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button> */}
      </div>
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
);
const MapDateOverlay: React.FC<{
  onClose: () => void;
  disableBlur: boolean;
  selectedDate: Date | null;
  onSelectDate: (next: Date) => void;
}> = ({ onClose, disableBlur, selectedDate, onSelectDate }) => {
  const dateOptions = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 8 }, (_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      return date;
    });
  }, []);
  const normalize = (date: Date | null) => {
    if (!date) return null;
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };
  const selectedKey = normalize(selectedDate);
  return (
    <div className="absolute right-3 @min-4xl:left-18 top-3 @min-4xl:top-auto @min-4xl:bottom-3 z-[1010] w-50 @min-4xl:w-90 pointer-events-none">
      <div
        className={cn(
          "rounded-2xl border border-border/70 bg-highlight-7/85 shadow-lg pointer-events-auto px-2.5 py-2.5",
          disableBlur ? "" : "backdrop-blur",
        )}
      >
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            Pick map date
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            title="Close date picker"
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-2 @min-4xl:grid-cols-4 gap-1.5">
          {dateOptions.map((date, i) => {
            const key = normalize(date);
            const isSelected = key === selectedKey;
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button
                key={key ?? String(date.getTime())}
                type="button"
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border border-border/60 bg-background/85 px-2.5 py-1.5 text-left transition-colors shadow-sm",
                  "hover:bg-highlight-5/80 hover:border-border/80 disabled:opacity-40 disabled:pointer-events-none",
                  isSelected &&
                    "border-border bg-highlight-3 dark:bg-highlight-5 text-blue-900 dark:text-blue-100",
                )}
                onClick={() => onSelectDate(date)}
                disabled={i === dateOptions.length - 1}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {i === dateOptions.length - 1 ? (
                    <Construction aria-hidden="true" className="h-4 w-4" />
                  ) : isToday ? (
                    "Today"
                  ) : (
                    date.toLocaleDateString("en-US", {
                      weekday: "short",
                      timeZone: "America/Los_Angeles",
                    })
                  )}
                </span>
                <span className="text-[14px] font-semibold">
                  {i === dateOptions.length - 1
                    ? "Soon!"
                    : date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "America/Los_Angeles",
                      })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
const LeafletMap: React.FC<Props> = ({
  beachId,
  loggedIn,
  initialBeach,
  variant = "page",
  ui = "full",
}) => {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const embedded = variant === "embed";
  const previewUi = ui === "preview";
  const showChrome = !previewUi && !embedded;
  const debugLeaflet = React.useMemo(() => readLeafletDebugFlag(), []);
  const debugLog = React.useCallback(
    (...args: unknown[]) => {
      if (!debugLeaflet) return;
      // eslint-disable-next-line no-console
      console.log(...args);
    },
    [debugLeaflet],
  );
  const { filters, setFilters } = useMapFiltersData();
  const { favoriteIds } = useMapFavoriteIdsData();
  const { hoverCardId } = useMapHoverCardData();
  const deferredFilters = React.useDeferredValue(filters);
  const {
    showMap,
    setShowMap,
    openPanel,
    setOpenPanel,
    togglePanel,
    legendOpen,
    setLegendOpen,
  } =
    useMapUI();

  // Beaches page should always render with the map visible, even if another page hid it.
  React.useEffect(() => {
    if (pathname.endsWith("/beaches") && !showMap) {
      setShowMap(true);
    }
  }, [pathname, showMap, setShowMap]);
  const {
    visibleBounds,
    setVisibleBounds,
    setViewportRequestId,
    setAllowViewportCommit,
    viewportStatus: mapViewportStatus,
  } = useMapViewport();
  const {
    selected: selectedDate,
    setSelected: setSelectedDate,
    hour,
  } = useDateContext();
  const selectedHour = Number.isFinite(hour) ? hour : null;
  const {
    beaches: viewportBeaches,
    status: viewportStatus,
    onCameraChange,
  } = useViewportBeachesContext();
  const {
    getSnapshot: getStatsSnapshot,
    prefetchSnapshots,
    version: statsVersion,
  } = useBeachStatsCache();
  const [smallScreen, setSmallScreen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 911;
  });
  const [navigationPending, setNavigationPending] = React.useState(false);
  const [previewEngaged, setPreviewEngaged] = React.useState(
    () => !(embedded && previewUi),
  );
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const clusterLayerRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const basemapLayerRef = React.useRef<L.Layer | null>(null);
  const zoomControlRef = React.useRef<L.Control.Zoom | null>(null);
  const markerRegistryRef = React.useRef<Record<string, MarkerEntry>>({});
  const statsFallbackIdsRef = React.useRef<Set<string>>(new Set());
  const beachLookupRef = React.useRef<Record<string, BeachPoint>>({});
  const rebuildMarkersRef = React.useRef(true);
  const hoverStateRef = React.useRef<{
    card: string | null;
    marker: string | null;
  }>({ card: null, marker: null });
  const appliedHoverIdRef = React.useRef<string | null>(null);
  const clearHoverStateRef = React.useRef<(() => void) | null>(null);
  const hoveredClusterRef = React.useRef<L.Marker | null>(null);
  const updateClusterHighlight = React.useCallback(
    (cluster: L.Marker | null) => {
      const prev = hoveredClusterRef.current;
      if (prev && prev !== cluster) {
        const prevElement = prev.getElement?.();
        if (prevElement) {
          prevElement.classList.remove("ww-cluster-hovered");
        }
      }
      hoveredClusterRef.current = cluster ?? null;
      if (cluster) {
        const element = cluster.getElement?.();
        if (element) {
          element.classList.add("ww-cluster-hovered");
        }
      }
    },
    [],
  );
  const persistViewTimeoutRef = React.useRef<number | null>(null);
  const resumeCommitTimeoutRef = React.useRef<number | null>(null);
  const cameraUpdateTimeoutRef = React.useRef<number | null>(null);
  const cameraUpdateVersionRef = React.useRef(0);
  const prefetchStatsTimeoutRef = React.useRef<number | null>(null);
  const resizeTimeoutRef = React.useRef<number | null>(null);
  const resizeRafRef = React.useRef<number | null>(null);
  const containerResizeObserverRef = React.useRef<ResizeObserver | null>(null);
  const interactionLockReleaseRef = React.useRef<(() => void) | null>(null);
  const interactionLockOptionsRef = React.useRef<{ lockScroll: boolean } | null>(
    null,
  );
  const interactionsReadyRef = React.useRef(false);
  const pendingAutoCenterRef = React.useRef<string | null>(null);
  const pendingFocusRef = React.useRef<MapFocusEventDetail | null>(null);
  const suppressUserMoveRef = React.useRef(false);
  const lastTouchGestureRef = React.useRef<{ moved: boolean; ts: number }>({
    moved: false,
    ts: 0,
  });
  const cameraThrottleRef = React.useRef<{
    bounds: VisibleMapBounds | null;
    ts: number;
  }>({ bounds: null, ts: 0 });
  const callbacksRef = React.useRef({
    onCameraChange,
    setVisibleBounds,
    setViewportRequestId,
  });
  const focusContextRef = React.useRef<{
    findBeachMatch: (
      value: string | number | null | undefined,
    ) => BeachPoint | null;
    fullMapPage: boolean;
    setShowMap: (value: boolean) => void;
  }>({
    findBeachMatch: () => null,
    fullMapPage: !embedded && !pathname.endsWith("/beaches"),
    setShowMap,
  });
  const [mapReady, setMapReady] = React.useState(false);
  const initRetryCountRef = React.useRef(0);
  const [initAttemptNonce, setInitAttemptNonce] = React.useState(0);
  const [markersLoading, setMarkersLoading] = React.useState(false);
  const [refocusDisabled, setRefocusDisabled] = React.useState(true);
  const markerBuildTokenRef = React.useRef(0);
  const isMapInteractingRef = React.useRef(false);
  const pendingMarkerRebuildRef = React.useRef(false);
  const deferredMarkerRebuildTimeoutRef = React.useRef<number | null>(null);
  const resumeMarkerRebuildTimeoutRef = React.useRef<number | null>(null);
  const performMarkerRebuildRef = React.useRef<(() => void) | null>(null);
  type MarkerBuildJob = {
    token: number;
    raf: number | null;
    index: number;
    startTs: number | null;
    removedCount: number;
    addedCount: number;
    updatedCount: number;
    nextStatsFallbackIds: Set<string>;
  };
  const markerBuildJobRef = React.useRef<MarkerBuildJob | null>(null);
  const cancelMarkerBuild = React.useCallback(() => {
    const job = markerBuildJobRef.current;
    if (!job) return;
    // If we cancel mid-build (common when the user starts panning on mobile),
    // the diff may have removed old markers but not added new ones yet.
    // Mark a rebuild as pending so we don't get stuck with an empty map until
    // the next zoom gesture.
    pendingMarkerRebuildRef.current = true;
    if (job.raf != null) {
      window.cancelAnimationFrame(job.raf);
    }
    markerBuildJobRef.current = null;
    React.startTransition(() => setMarkersLoading(false));

    if (typeof window !== "undefined") {
      if (resumeMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(resumeMarkerRebuildTimeoutRef.current);
      }
      // Defer so we don't fight the pointer event that triggered the cancel.
      resumeMarkerRebuildTimeoutRef.current = window.setTimeout(() => {
        resumeMarkerRebuildTimeoutRef.current = null;
        if (isMapInteractingRef.current) return;
        if (!pendingMarkerRebuildRef.current) return;
        pendingMarkerRebuildRef.current = false;
        performMarkerRebuildRef.current?.();
      }, 0);
    }
  }, [setMarkersLoading]);
  const [selectedBeachId, setSelectedBeachId] = React.useState<
    string | number | null
  >(() => {
    if (beachId != null) return String(beachId);
    if (initialBeach?.id != null) return String(initialBeach.id);
    return null;
  });
  React.useEffect(() => {
    setMapInteractionSelection({ beachId: selectedBeachId ?? null });
  }, [selectedBeachId]);
  const [markerRevision, forceMarkerRevision] = React.useReducer(
    (value) => value + 1,
    0,
  );
  const [userLocation, setUserLocation] = React.useState<LatLngLiteral | null>(
    null,
  );
  const [nearbyBeachesFromApi, setNearbyBeachesFromApi] = React.useState<BeachPoint[] | null>(null);
  const [nearbyBoundsFromApi, setNearbyBoundsFromApi] = React.useState<{
    south: number;
    north: number;
    west: number;
    east: number;
  } | null>(null);
  const geoFocusDoneRef = React.useRef(false);
  const geoCenteredOnUserRef = React.useRef(false);
  const geoAwaitingFreshBeachesRef = React.useRef(false);
  const geoRequestedRef = React.useRef(false);
  const geoRequestInFlightRef =
    React.useRef<Promise<LatLngLiteral | null> | null>(null);
  const pendingZoomToNearbyRef = React.useRef(false);

  // Fetch nearby beaches from DB when user location changes
  React.useEffect(() => {
    if (!userLocation) return;
    const controller = new AbortController();

    const fetchNearby = async () => {
      try {
        debugLog("[LeafletGeo] Fetching nearby beaches from API", userLocation);
        const res = await fetch(
          `/api/beaches/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&limit=30`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.beaches) {
          debugLog("[LeafletGeo] Received nearby beaches from API", data.beaches.length);
          setNearbyBeachesFromApi(data.beaches);
          setNearbyBoundsFromApi(data.bounds);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          debugLog("[LeafletGeo] Failed to fetch nearby beaches", err);
        }
      }
    };

    void fetchNearby();
    return () => controller.abort();
  }, [userLocation, debugLog]);

  const requestUserLocation = React.useCallback(
    (source: "auto" | "button") => {
      if (typeof window === "undefined" || !navigator?.geolocation) {
        debugLog("[LeafletGeo] Navigator not available", source);
        return Promise.resolve(null);
      }
      if (geoRequestInFlightRef.current) {
        debugLog("[LeafletGeo] Request already in flight", source);
        return geoRequestInFlightRef.current;
      }
      geoRequestedRef.current = true;
      debugLog("[LeafletGeo] Requesting user position", source);

      // Use watchPosition to get progressively more accurate fixes, then stop
      // when accuracy is good enough or timeout is reached
      const watchForAccuratePosition = (
        accuracyThresholdM: number,
        timeoutMs: number,
      ) =>
        new Promise<GeolocationPosition | null>((resolve) => {
          let bestPosition: GeolocationPosition | null = null;
          let watchId: number | null = null;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;

          const cleanup = () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (timeoutId !== null) clearTimeout(timeoutId);
          };

          const finish = (position: GeolocationPosition | null) => {
            cleanup();
            resolve(position);
          };

          timeoutId = setTimeout(() => {
            debugLog("[LeafletGeo] Watch timeout, using best position", {
              source,
              accuracyM: bestPosition?.coords.accuracy,
            });
            finish(bestPosition);
          }, timeoutMs);

          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const accuracy = position.coords.accuracy;
              debugLog("[LeafletGeo] Watch position update", {
                source,
                accuracyM: accuracy,
              });

              // Keep track of best position (lowest accuracy value = most accurate)
              if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                bestPosition = position;
              }

              // If accuracy is good enough, stop watching
              if (accuracy <= accuracyThresholdM) {
                debugLog("[LeafletGeo] Accuracy threshold met", { accuracyM: accuracy });
                finish(position);
              }
            },
            (error) => {
              debugLog("[LeafletGeo] Watch position error", {
                source,
                message: error.message,
              });
              // On error, resolve with best position we have (or null)
              finish(bestPosition);
            },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
          );
        });

      geoRequestInFlightRef.current = (async () => {
        // Watch for position with accuracy within 500m, timeout after 10 seconds
        const position = await watchForAccuratePosition(500, 10000);

        if (!position) {
          geoRequestedRef.current = false;
          return null;
        }

        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        debugLog("[LeafletGeo] Position received", {
          source,
          accuracyM: position.coords.accuracy,
          ...next,
        });
        geoCenteredOnUserRef.current = false;
        geoFocusDoneRef.current = false;
        geoAwaitingFreshBeachesRef.current = false;
        setUserLocation(next);
        // Force component update to ensure nearby controls update immediately.
        forceMarkerRevision();
        return next;
      })().finally(() => {
        geoRequestInFlightRef.current = null;
      });
      return geoRequestInFlightRef.current;
    },
    [debugLog],
  );

  React.useEffect(() => {
    if (!pathname.endsWith("/beaches")) return;
    if (geoRequestedRef.current) {
      debugLog("[LeafletGeo] Request already in flight");
      return;
    }
    void requestUserLocation("auto");
  }, [pathname, debugLog, requestUserLocation]);

  const beachesPage = pathname.endsWith("/beaches");
  const fullMapPage = !beachesPage && !embedded;
  const editPage = pathname.includes("edit");
  const isDesktop = smallScreen === false;
  const layoutVersion = smallScreen ? 1 : 2;
  const overviewPageBusy = useOptionalOverviewPageBusy();
  const effectiveShowMap = embedded || showMap || smallScreen === true;
  const canRequestLocation =
    typeof window !== "undefined" && !!navigator?.geolocation;

  const combinedBeaches = React.useMemo(() => {
    if (!initialBeach) {
      return viewportBeaches;
    }
    const latitude = Number(initialBeach.latitude);
    const longitude = Number(initialBeach.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return viewportBeaches;
    }
    const exists = viewportBeaches.some(
      (beach) => String(beach.id) === String(initialBeach.id),
    );
    if (exists) {
      return viewportBeaches;
    }
    return [
      ...viewportBeaches,
      {
        ...initialBeach,
        latitude,
        longitude,
      },
    ];
  }, [viewportBeaches, initialBeach]);

  const filteredBeaches = useFilteredBeaches(
    combinedBeaches,
    deferredFilters ?? new Set(),
    selectedBeachId,
  );

  const selectedBeach = React.useMemo(() => {
    if (!selectedBeachId) return null;
    const normalized = String(selectedBeachId);
    return (
      filteredBeaches.find((beach) => String(beach.id) === normalized) ??
      combinedBeaches.find((beach) => String(beach.id) === normalized) ??
      null
    );
  }, [filteredBeaches, combinedBeaches, selectedBeachId]);
  const selectedBeachLatLngRef = React.useRef<LatLngLiteral | null>(null);
  React.useEffect(() => {
    if (!selectedBeach) {
      selectedBeachLatLngRef.current = null;
      return;
    }
    selectedBeachLatLngRef.current = {
      lat: Number(selectedBeach.latitude),
      lng: Number(selectedBeach.longitude),
    };
  }, [selectedBeach]);

  React.useEffect(() => {
    debugLog("[LeafletGeo] Focus check", {
      beachesPage,
      mapReady,
      hasLocation: !!userLocation,
      hasNearbyFromApi: !!nearbyBeachesFromApi,
      selectedBeachId,
      geoFocusDone: geoFocusDoneRef.current,
    });
    if (!beachesPage || !mapReady || !userLocation) {
      debugLog("[LeafletGeo] Early exit - conditions not met");
      return;
    }
    if (selectedBeachId) {
      debugLog("[LeafletGeo] Early exit - beach selected");
      return;
    }
    const map = mapRef.current;
    if (!map) {
      debugLog("[LeafletGeo] Map not ready for focus");
      return;
    }

    if (geoFocusDoneRef.current) {
      debugLog("[LeafletGeo] Early exit - nearby focus already completed");
      return;
    }

    // Use nearby beaches from API if available (fastest path)
    if (nearbyBeachesFromApi && nearbyBeachesFromApi.length > 0 && nearbyBoundsFromApi) {
      debugLog("[LeafletGeo] Using nearby beaches from API", nearbyBeachesFromApi.length);
      suppressUserMoveRef.current = true;
      map.fitBounds(
        [
          [nearbyBoundsFromApi.south, nearbyBoundsFromApi.west],
          [nearbyBoundsFromApi.north, nearbyBoundsFromApi.east],
        ],
        {
          padding: [80, 80],
          maxZoom: 12,
          animate: true,
          duration: 0.6,
        }
      );
      geoFocusDoneRef.current = true;
      debugLog("[LeafletGeo] Zoom complete using API beaches");
      return;
    }

    // Fallback: wait for viewport beaches if API didn't return results
    if (!nearbyBeachesFromApi) {
      debugLog("[LeafletGeo] Waiting for nearby beaches from API");
      return;
    }

    // If API returned empty, center on user location as fallback
    debugLog("[LeafletGeo] No nearby beaches from API, centering on user");
    suppressUserMoveRef.current = true;
    map.flyTo([userLocation.lat, userLocation.lng], 10, { duration: 0.6 });
    geoFocusDoneRef.current = true;
  }, [
    beachesPage,
    mapReady,
    userLocation,
    nearbyBeachesFromApi,
    nearbyBoundsFromApi,
    selectedBeachId,
    debugLog,
  ]);

  const zoomToNearby = React.useCallback(
    (location: LatLngLiteral) => {
      const map = mapRef.current;
      if (!map) {
        debugLog("[LeafletGeo] zoomToNearby - no map");
        return;
      }

      // Use API bounds if available
      if (nearbyBoundsFromApi) {
        debugLog("[LeafletGeo] zoomToNearby - using API bounds");
        map.fitBounds(
          [
            [nearbyBoundsFromApi.south, nearbyBoundsFromApi.west],
            [nearbyBoundsFromApi.north, nearbyBoundsFromApi.east],
          ],
          {
            padding: [80, 80],
            maxZoom: 12,
            animate: true,
            duration: 0.6,
          }
        );
        return;
      }

      // Fallback to viewport beaches
      const list = filteredBeaches.length ? filteredBeaches : combinedBeaches;
      if (!list.length) {
        debugLog("[LeafletGeo] zoomToNearby - no beaches available");
        map.flyTo([location.lat, location.lng], 10, { duration: 0.6 });
        return;
      }
      debugLog("[LeafletGeo] zoomToNearby - using viewport beaches");
      const nearest = getNearestBeaches(location, list, 20);
      const bounds = getBoundsForBeaches(nearest);

      if (bounds) {
        map.fitBounds(bounds, {
          padding: [80, 80],
          maxZoom: 12,
          animate: true,
          duration: 0.6,
        });
      } else {
        map.flyTo([location.lat, location.lng], 10, { duration: 0.6 });
      }
    },
    [filteredBeaches, combinedBeaches, nearbyBoundsFromApi, debugLog],
  );

  const handleZoomToNearby = React.useCallback(() => {
    debugLog("[LeafletGeo] handleZoomToNearby called", {
      hasMap: !!mapRef.current,
      hasLocation: !!userLocation,
      userLocation,
    });
    const map = mapRef.current;
    if (!map) {
      debugLog("[LeafletGeo] handleZoomToNearby - early exit, no map");
      return;
    }
    const list = filteredBeaches.length ? filteredBeaches : combinedBeaches;
    if (!userLocation) {
      debugLog("[LeafletGeo] handleZoomToNearby - requesting location");
      pendingZoomToNearbyRef.current = true;
      void requestUserLocation("button").then((location) => {
        if (!location) {
          pendingZoomToNearbyRef.current = false;
          return;
        }
        zoomToNearby(location);
        pendingZoomToNearbyRef.current = false;
      });
      return;
    }
    if (!list.length) {
      pendingZoomToNearbyRef.current = true;
      return;
    }
    zoomToNearby(userLocation);
  }, [
    userLocation,
    filteredBeaches,
    combinedBeaches,
    debugLog,
    requestUserLocation,
    zoomToNearby,
  ]);

  React.useEffect(() => {
    if (!pendingZoomToNearbyRef.current) return;
    if (!mapReady || !userLocation) return;
    const list = filteredBeaches.length ? filteredBeaches : combinedBeaches;
    if (!list.length) return;
    pendingZoomToNearbyRef.current = false;
    zoomToNearby(userLocation);
  }, [mapReady, userLocation, filteredBeaches, combinedBeaches, zoomToNearby]);

  const handleZoomToCaliforniaView = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
      animate: true,
      duration: 0.8,
    });
  }, []);

  const effectiveStatsDate = React.useMemo(
    () =>
      selectedDate instanceof Date ? getPacificMidnightUTC(selectedDate) : null,
    [selectedDate],
  );
  const surfIntensity = useSurfIntensityData(effectiveStatsDate);
  const statsDateKey = React.useMemo(() => {
    if (effectiveStatsDate instanceof Date)
      return effectiveStatsDate.toISOString().split("T")[0];
    return "today";
  }, [effectiveStatsDate]);
  const statsHourKey = React.useMemo(() => {
    if (typeof selectedHour === "number") {
      return normalizeHour(selectedHour);
    }
    if (effectiveStatsDate instanceof Date) {
      return "midday";
    }
    return "now";
  }, [effectiveStatsDate, selectedHour]);

  const statsContextRef = React.useRef<{
    getStatsSnapshot: typeof getStatsSnapshot;
    prefetchSnapshots: typeof prefetchSnapshots;
    effectiveStatsDate: Date | null;
    selectedHour: number | null;
    statsDateKey: string;
    statsHourKey: string | number;
    surfIntensity: Record<string | number, number>;
  }>({
    getStatsSnapshot,
    prefetchSnapshots,
    effectiveStatsDate,
    selectedHour,
    statsDateKey,
    statsHourKey,
    surfIntensity,
  });

  React.useEffect(() => {
    statsContextRef.current = {
      getStatsSnapshot,
      prefetchSnapshots,
      effectiveStatsDate,
      selectedHour,
      statsDateKey,
      statsHourKey,
      surfIntensity,
    };
  }, [
    getStatsSnapshot,
    prefetchSnapshots,
    effectiveStatsDate,
    selectedHour,
    statsDateKey,
    statsHourKey,
    surfIntensity,
  ]);
  const handleMapDateSelect = React.useCallback(
    (next: Date) => {
      if (!(next instanceof Date) || Number.isNaN(next.getTime())) return;
      setSelectedDate(next);
    },
    [setSelectedDate],
  );
  const favoriteSet = React.useMemo(
    () => new Set(Array.from(favoriteIds ?? []).map(String)),
    [favoriteIds],
  );
  const selectedBeachKey = selectedBeach ? String(selectedBeach.id) : null;
  const { swellDirections, windDirection, overlayLabels } = useSwellDirections(
    selectedBeachKey,
    selectedDate,
    selectedHour,
  );
  const overlayAnchor = React.useMemo(() => {
    if (!selectedBeach) return null;
    const fallback = {
      latitude: Number(selectedBeach.latitude),
      longitude: Number(selectedBeach.longitude),
    };
    const entry = markerRegistryRef.current[String(selectedBeach.id)];
    if (entry?.marker) {
      const latLng = entry.marker.getLatLng();
      return { latitude: latLng.lat, longitude: latLng.lng };
    }
    return fallback;
  }, [selectedBeach, markerRevision]);
  usePrefetchAdjacentDates(selectedBeachKey, selectedDate);

  const performMarkerRebuild = React.useCallback(() => {
    rebuildMarkersRef.current = true;
    markerBuildTokenRef.current += 1;
    setMarkersLoading(true);
    forceMarkerRevision();
  }, []);

  React.useEffect(() => {
    performMarkerRebuildRef.current = performMarkerRebuild;
  }, [performMarkerRebuild]);

  const scheduleMarkerRebuildAfterInteraction = React.useCallback(() => {
    if (!pendingMarkerRebuildRef.current) return;
    if (typeof window === "undefined") return;
    if (deferredMarkerRebuildTimeoutRef.current != null) {
      window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
    }
    deferredMarkerRebuildTimeoutRef.current = window.setTimeout(() => {
      deferredMarkerRebuildTimeoutRef.current = null;
      if (isMapInteractingRef.current) {
        return;
      }
      if (!pendingMarkerRebuildRef.current) {
        return;
      }
      pendingMarkerRebuildRef.current = false;
      performMarkerRebuild();
    }, 80);
  }, [performMarkerRebuild]);

  const requestMarkerRebuild = React.useCallback(() => {
    pendingMarkerRebuildRef.current = true;
    if (isMapInteractingRef.current) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      deferredMarkerRebuildTimeoutRef.current != null
    ) {
      window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
      deferredMarkerRebuildTimeoutRef.current = null;
    }
    pendingMarkerRebuildRef.current = false;
    performMarkerRebuild();
  }, [performMarkerRebuild]);

  React.useEffect(() => {
    requestMarkerRebuild();
  }, [filteredBeaches, surfIntensity, favoriteSet, requestMarkerRebuild]);

  React.useEffect(() => {
    if (!mapReady) return;
    if (markersLoading) return;
    if (isMapInteractingRef.current) return;
    if (filteredBeaches.length === 0) return;
    // Watchdog: if we ever end up with an empty marker registry while we have
    // beaches to display (e.g. a build was canceled mid-diff), trigger a rebuild.
    const registryCount = Object.keys(markerRegistryRef.current).length;
    let renderedLayerCount = 0;
    const group = clusterLayerRef.current;
    if (group) {
      try {
        renderedLayerCount = group.getLayers().length;
      } catch {
        renderedLayerCount = 0;
      }
    }
    if (registryCount !== 0 && renderedLayerCount !== 0) return;
    requestMarkerRebuild();
  }, [filteredBeaches.length, mapReady, markersLoading, requestMarkerRebuild]);

  const interactionsReady = mapReady && filteredBeaches.length > 0;
  React.useEffect(() => {
    interactionsReadyRef.current = interactionsReady;
  }, [interactionsReady]);

  const showUpdateBanner =
    viewportStatus === "dirty" || viewportStatus === "loading";
  const showLoadingPill =
    mapReady &&
    mapViewportStatus !== "error" &&
    (markersLoading || mapViewportStatus === "loading" || overviewPageBusy);
  const [showLoadingPillStable, setShowLoadingPillStable] =
    React.useState(false);
  const loadingPillHideTimeoutRef = React.useRef<number | null>(null);
  const [loadingPillKind, setLoadingPillKind] = React.useState<
    "markers" | "content"
  >("markers");
  // Prefer "Loading" when any content/viewport work is happening; only show "Updating markers"
  // when it's purely a marker refresh. This prevents the pill from rapidly flipping labels.
  const desiredLoadingPillKind: "markers" | "content" =
    overviewPageBusy || mapViewportStatus === "loading"
      ? "content"
      : markersLoading
        ? "markers"
        : "markers";
  const prevShowLoadingPillStableRef = React.useRef<boolean>(false);
  React.useEffect(() => {
    const wasShowing = prevShowLoadingPillStableRef.current;
    prevShowLoadingPillStableRef.current = showLoadingPillStable;

    if (!showLoadingPillStable) return;

    // Set the label when the pill first appears.
    if (!wasShowing) {
      setLoadingPillKind(desiredLoadingPillKind);
      return;
    }

    // While visible, allow escalation to "Loading" but never downgrade back to markers,
    // avoiding disruptive rapid switches.
    if (loadingPillKind === "markers" && desiredLoadingPillKind === "content") {
      setLoadingPillKind("content");
    }
  }, [desiredLoadingPillKind, loadingPillKind, showLoadingPillStable]);

  const loadingPillLabel =
    loadingPillKind === "markers" ? "Updating markers" : "Loading";

  const mapLoadingOverlayActive = !embedded && !previewUi && overviewPageBusy;
  const mapLoadingInteractionsDisabledRef = React.useRef(false);

  React.useEffect(() => {
    if (!mapReady) return;
    if (
      !(mapLoadingOverlayActive && !isTouchDevice()) &&
      !mapLoadingInteractionsDisabledRef.current
    ) {
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const shouldDisableInteractions =
      mapLoadingOverlayActive && !isTouchDevice();
    const touchInput = supportsTouchInput();

    const disableInteractions = () => {
      try {
        map.dragging.disable();
      } catch {}
      try {
        map.scrollWheelZoom.disable();
      } catch {}
      try {
        map.doubleClickZoom.disable();
      } catch {}
      try {
        map.boxZoom.disable();
      } catch {}
      try {
        map.keyboard.disable();
      } catch {}
      try {
        map.touchZoom.disable();
      } catch {}
      try {
        (map as any).tap?.disable();
      } catch {}
    };

    const enableInteractions = () => {
      try {
        map.dragging.enable();
      } catch {}
      try {
        map.scrollWheelZoom.enable();
      } catch {}
      try {
        if (touchInput) {
          map.doubleClickZoom.disable();
        } else {
          map.doubleClickZoom.enable();
        }
      } catch {}
      try {
        map.boxZoom.enable();
      } catch {}
      try {
        map.keyboard.enable();
      } catch {}
      try {
        map.touchZoom.enable();
      } catch {}
      try {
        if (touchInput) {
          (map as any).tap?.disable();
        } else {
          (map as any).tap?.enable();
        }
      } catch {}
    };

    if (shouldDisableInteractions) {
      if (!mapLoadingInteractionsDisabledRef.current) {
        disableInteractions();
        mapLoadingInteractionsDisabledRef.current = true;
      }
      try {
        map.closePopup();
      } catch {}

      const handlePopupOpen = () => {
        try {
          map.closePopup();
        } catch {}
      };

      map.on("popupopen", handlePopupOpen);
      return () => {
        map.off("popupopen", handlePopupOpen);
      };
    }

    if (mapLoadingInteractionsDisabledRef.current) {
      enableInteractions();
      mapLoadingInteractionsDisabledRef.current = false;
    }
  }, [mapLoadingOverlayActive, mapReady]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (showLoadingPill) {
      if (loadingPillHideTimeoutRef.current != null) {
        window.clearTimeout(loadingPillHideTimeoutRef.current);
        loadingPillHideTimeoutRef.current = null;
      }
      setShowLoadingPillStable(true);
      return;
    }

    if (!showLoadingPillStable) {
      return;
    }

    if (loadingPillHideTimeoutRef.current != null) {
      window.clearTimeout(loadingPillHideTimeoutRef.current);
    }
    loadingPillHideTimeoutRef.current = window.setTimeout(() => {
      loadingPillHideTimeoutRef.current = null;
      setShowLoadingPillStable(false);
    }, 250);

    return () => {
      if (loadingPillHideTimeoutRef.current != null) {
        window.clearTimeout(loadingPillHideTimeoutRef.current);
        loadingPillHideTimeoutRef.current = null;
      }
    };
  }, [showLoadingPill, showLoadingPillStable]);

  const findBeachMatch = React.useCallback(
    (identifier: string | number | null | undefined): BeachPoint | null => {
      if (!identifier) return null;
      const normalized = String(identifier).toLowerCase();
      return (
        combinedBeaches.find((beach) => {
          const idMatch = String(beach.id).toLowerCase() === normalized;
          const nameMatch = String(beach.name).toLowerCase() === normalized;
          const slugMatch =
            generateBeachSlug(String(beach.name)).toLowerCase() === normalized;
          return idMatch || nameMatch || slugMatch;
        }) ?? null
      );
    },
    [combinedBeaches],
  );

  React.useEffect(() => {
    callbacksRef.current = {
      onCameraChange,
      setVisibleBounds,
      setViewportRequestId,
    };
  }, [onCameraChange, setVisibleBounds, setViewportRequestId]);

  React.useEffect(() => {
    const lookup: Record<string, BeachPoint> = {};
    combinedBeaches.forEach((beach) => {
      lookup[String(beach.id)] = beach;
    });
    beachLookupRef.current = lookup;
  }, [combinedBeaches]);

  React.useEffect(() => {
    focusContextRef.current = {
      findBeachMatch,
      fullMapPage,
      setShowMap,
    };
  }, [findBeachMatch, fullMapPage, setShowMap]);
  const publishCameraSnapshot = React.useCallback(
    (snapshot: {
      bounds: VisibleMapBounds;
      zoom: number;
      center: { longitude: number; latitude: number };
    }) => {
      if (!snapshot?.bounds) return;
      const supportsPerformance = typeof performance !== "undefined";
      const now = supportsPerformance ? performance.now() : Date.now();
      const startTs = supportsPerformance ? (now as number) : null;
      const previous = cameraThrottleRef.current;
      if (
        previous.bounds &&
        now - previous.ts < CAMERA_MIN_INTERVAL &&
        boundsWithinThreshold(snapshot.bounds, previous.bounds)
      ) {
        return;
      }
      cameraThrottleRef.current = { bounds: snapshot.bounds, ts: now };
      const {
        onCameraChange: latestOnChange,
        setVisibleBounds: latestSetBounds,
        setViewportRequestId: latestSetRequest,
      } = callbacksRef.current;
      latestOnChange({
        bounds: snapshot.bounds,
        zoom: snapshot.zoom,
        center: snapshot.center,
      });
      latestSetBounds(snapshot.bounds);
      latestSetRequest((id) => id + 1);
      setMapInteractionCamera({
        zoom: snapshot.zoom,
        center: snapshot.center,
        bounds: snapshot.bounds,
      });
      logLeafletPerf(`camera-update zoom=${snapshot.zoom.toFixed(1)}`, startTs);
    },
    [],
  );

  const emitCameraUpdate = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = normalizeBoundsToWorld(readBounds(map));
    const center = map.getCenter();
    if (!center) return;
    const zoom = map.getZoom();
    publishCameraSnapshot({
      bounds,
      zoom,
      center: { longitude: wrapLongitude(center.lng), latitude: center.lat },
    });
  }, [publishCameraSnapshot]);

  const cancelScheduledCameraUpdate = React.useCallback(() => {
    if (cameraUpdateTimeoutRef.current != null) {
      window.clearTimeout(cameraUpdateTimeoutRef.current);
      cameraUpdateTimeoutRef.current = null;
    }
    cameraUpdateVersionRef.current += 1;
  }, []);

  const scheduleCameraUpdate = React.useCallback(
    (delayMs: number = CAMERA_UPDATE_DEBOUNCE_MS) => {
      if (typeof window === "undefined") return;
      if (!mapRef.current) return;
      cancelScheduledCameraUpdate();
      const version = cameraUpdateVersionRef.current;
      cameraUpdateTimeoutRef.current = window.setTimeout(() => {
        if (cameraUpdateVersionRef.current !== version) return;
        cameraUpdateTimeoutRef.current = null;
        if (isMapInteractingRef.current) return;
        emitCameraUpdate();
      }, delayMs);
    },
    [cancelScheduledCameraUpdate, emitCameraUpdate],
  );

  const cancelCommitResume = React.useCallback(() => {
    if (resumeCommitTimeoutRef.current != null) {
      window.clearTimeout(resumeCommitTimeoutRef.current);
      resumeCommitTimeoutRef.current = null;
    }
  }, []);

  const scheduleCommitResume = React.useCallback(() => {
    cancelCommitResume();
    resumeCommitTimeoutRef.current = window.setTimeout(() => {
      if (isMapInteractingRef.current) {
        resumeCommitTimeoutRef.current = null;
        return;
      }
      setAllowViewportCommit(true);
      resumeCommitTimeoutRef.current = null;
    }, COMMIT_IDLE_DELAY);
  }, [cancelCommitResume, setAllowViewportCommit]);

  const normalizeMapCenter = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const maxBounds = map.options.maxBounds;
    if (!maxBounds) return;
    // Keep the view strictly inside Leaflet's maxBounds without "world copy" recentering.
    const latLngBounds =
      maxBounds instanceof L.LatLngBounds
        ? maxBounds
        : L.latLngBounds(maxBounds as L.LatLngExpression[]);
    if (latLngBounds.contains(map.getBounds())) {
      return;
    }
    suppressUserMoveRef.current = true;
    map.panInsideBounds(latLngBounds, { animate: false });
  }, []);

  const scheduleResizeRecompute = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (resizeTimeoutRef.current != null) {
      window.clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
    if (resizeRafRef.current != null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    resizeTimeoutRef.current = window.setTimeout(() => {
      resizeTimeoutRef.current = null;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const activeMap = mapRef.current;
        if (!activeMap) {
          return;
        }
        try {
          activeMap.invalidateSize();
        } catch {
          // ignore invalidation errors
        }
        // Fix occasional "grey tiles" after resizes by forcing the basemap layer to redraw/resize.
        try {
          const layer = basemapLayerRef.current as any;
          layer?.redraw?.();
          const gl =
            layer?._maplibreMap ?? layer?._glMap ?? layer?._mapboxMap ?? null;
          gl?.resize?.();
          gl?.triggerRepaint?.();
        } catch {
          // ignore transient basemap refresh errors
        }
        try {
          clusterLayerRef.current?.refreshClusters();
        } catch {
          // ignore transient refresh errors
        }
        normalizeMapCenter();
        requestMarkerRebuild();
        clearHoverStateRef.current?.();
        scheduleCameraUpdate(0);
      });
    }, RESIZE_SETTLE_DELAY);
  }, [normalizeMapCenter, requestMarkerRebuild, scheduleCameraUpdate]);

  const scheduleMapViewPersistence = React.useCallback(
    (payload: StoredViewState) => {
      if (typeof window === "undefined") return;
      if (persistViewTimeoutRef.current != null) {
        const globalWindow = window as IdleCallbackWindow;
        if (typeof globalWindow.cancelIdleCallback === "function") {
          globalWindow.cancelIdleCallback(persistViewTimeoutRef.current);
        } else {
          window.clearTimeout(persistViewTimeoutRef.current);
        }
      }
      const persist = () => {
        try {
          const normalized: StoredViewState = {
            longitude: wrapLongitude(payload.longitude),
            latitude: clampLatitudeToWebMercator(
              payload.latitude ?? DEFAULT_VIEW.latitude,
            ),
            zoom: payload.zoom,
          };
          window.localStorage.setItem(
            MAP_VIEW_STORAGE_KEY,
            JSON.stringify(normalized),
          );
        } catch {
          // ignore persistence failures
        }
        persistViewTimeoutRef.current = null;
      };
      const globalWindow = window as IdleCallbackWindow;
      if (typeof globalWindow.requestIdleCallback === "function") {
        persistViewTimeoutRef.current = globalWindow.requestIdleCallback(
          persist,
          { timeout: 1000 },
        );
      } else {
        persistViewTimeoutRef.current = window.setTimeout(persist, 250);
      }
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      if (persistViewTimeoutRef.current != null) {
        const globalWindow = window as IdleCallbackWindow;
        if (typeof globalWindow.cancelIdleCallback === "function") {
          globalWindow.cancelIdleCallback(persistViewTimeoutRef.current);
        } else {
          window.clearTimeout(persistViewTimeoutRef.current);
        }
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (cameraUpdateTimeoutRef.current != null) {
        window.clearTimeout(cameraUpdateTimeoutRef.current);
        cameraUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (resumeMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(resumeMarkerRebuildTimeoutRef.current);
        resumeMarkerRebuildTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      setSmallScreen(window.innerWidth < 911);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const ResizeObserverCtor = (window as LeafletWindow).ResizeObserver;
    const target = containerRef.current;
    if (!ResizeObserverCtor || !target) return;
    const observer = new ResizeObserverCtor(() => {
      scheduleResizeRecompute();
    });
    observer.observe(target);
    containerResizeObserverRef.current = observer;
    return () => {
      observer.disconnect();
      containerResizeObserverRef.current = null;
    };
  }, [scheduleResizeRecompute]);

  React.useEffect(() => {
    if (!effectiveShowMap || !mapReady) return;
    const map = mapRef.current;
    if (map) {
      try {
        map.invalidateSize();
      } catch {
        // ignore transient invalidate errors
      }
    }
    scheduleResizeRecompute();
    requestMarkerRebuild();
  }, [
    effectiveShowMap,
    mapReady,
    scheduleResizeRecompute,
    requestMarkerRebuild,
  ]);

  React.useEffect(() => {
    if (!embedded || !previewUi || !mapReady) return;
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;
    const touchInput = supportsTouchInput();

    const setLocked = (locked: boolean) => {
      try {
        map.scrollWheelZoom.disable();
      } catch {
        // ignore
      }

      if (locked) {
        map.dragging.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        // Keep pinch-zoom enabled on touch devices even while "locked".
        map.touchZoom.enable();
        return;
      }
      map.dragging.enable();
      map.touchZoom.enable();
      if (touchInput) {
        map.doubleClickZoom.disable();
      } else {
        map.doubleClickZoom.enable();
      }
      map.boxZoom.enable();
      map.keyboard.enable();
    };

    setLocked(!previewEngaged);

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      setPreviewEngaged(true);
      const direction = Math.sign(event.deltaY);
      if (direction < 0) {
        map.zoomIn(1);
      } else if (direction > 0) {
        map.zoomOut(1);
      }
    };

    const engage = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(".leaflet-control-zoom")) {
        setPreviewEngaged(true);
        return;
      }
      if (event instanceof PointerEvent && event.pointerType === "touch")
        return;
      if (event.type === "pointerdown") setPreviewEngaged(true);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("pointerdown", engage, { passive: true });
    container.addEventListener("click", engage, true);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("pointerdown", engage);
      container.removeEventListener("click", engage, true);
    };
  }, [embedded, mapReady, previewEngaged, previewUi]);

  React.useEffect(() => {
    if (!selectedBeach || embedded || previewUi) return;
    const map = mapRef.current;
    const zoom = map?.getZoom() ?? DEFAULT_ZOOM;
    saveStoredSelection(selectedBeach, zoom);
  }, [embedded, previewUi, selectedBeach]);

  React.useEffect(() => {
    const pathParts = (pathname || "").split("/").filter(Boolean);
    const fromPath =
      beachesPage || embedded || !pathParts.length
        ? null
        : extractBeachId(pathParts[0]);
    const stored =
      beachesPage || embedded || selectedBeachId
        ? null
        : readStoredSelectionId();
    const candidate =
      beachId != null
        ? String(beachId)
        : fromPath
          ? String(fromPath)
          : initialBeach?.id != null
            ? String(initialBeach.id)
            : stored;
    if (!candidate) return;
    if (selectedBeachId && String(selectedBeachId) === candidate) {
      return;
    }
    setSelectedBeachId((prev) => {
      if (prev && String(prev) === candidate) {
        return prev;
      }
      return candidate;
    });
    pendingAutoCenterRef.current = candidate;
  }, [beachId, initialBeach, pathname, selectedBeachId]);

  const cancelPendingAutoFocus = React.useCallback(() => {
    if (suppressUserMoveRef.current) return;
    pendingAutoCenterRef.current = null;
    pendingFocusRef.current = null;
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleUserIntent = () => {
      cancelPendingAutoFocus();
      // If we're currently rebuilding markers, yield immediately to keep interactions smooth.
      cancelMarkerBuild();
      if (deferredMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
        deferredMarkerRebuildTimeoutRef.current = null;
      }
    };
    container.addEventListener(
      "pointerdown",
      handleUserIntent as EventListener,
      {
        passive: true,
      },
    );
    container.addEventListener("wheel", handleUserIntent as EventListener, {
      passive: true,
    });
    return () => {
      container.removeEventListener(
        "pointerdown",
        handleUserIntent as EventListener,
      );
      container.removeEventListener("wheel", handleUserIntent as EventListener);
    };
  }, [cancelPendingAutoFocus, cancelMarkerBuild]);

  React.useEffect(() => {
    if (!mapReady) return;
    scheduleCameraUpdate(0);
    requestMarkerRebuild();
  }, [mapReady, scheduleCameraUpdate, requestMarkerRebuild]);

  React.useEffect(() => {
    if (!mapReady) return;
    scheduleResizeRecompute();
  }, [mapReady, smallScreen, scheduleResizeRecompute]);

  React.useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current != null) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, []);
  const updateZoomButtonState = React.useCallback(() => {
    const map = mapRef.current;
    const zoom = map?.getZoom?.();
    const min = map?.getMinZoom?.();
    const max = map?.getMaxZoom?.();
    const container = zoomControlRef.current?.getContainer?.();
    if (!map || zoom == null || min == null || max == null || !container) {
      return;
    }
    const zoomInButton = container.querySelector<HTMLAnchorElement>(
      ".leaflet-control-zoom-in",
    );
    const zoomOutButton = container.querySelector<HTMLAnchorElement>(
      ".leaflet-control-zoom-out",
    );
    const disableZoomIn = zoom >= max - 1e-6;
    const disableZoomOut = zoom <= min + 1e-6;
    if (zoomInButton) {
      zoomInButton.classList.toggle("is-disabled", disableZoomIn);
      zoomInButton.setAttribute(
        "aria-disabled",
        disableZoomIn ? "true" : "false",
      );
    }
    if (zoomOutButton) {
      zoomOutButton.classList.toggle("is-disabled", disableZoomOut);
      zoomOutButton.setAttribute(
        "aria-disabled",
        disableZoomOut ? "true" : "false",
      );
    }
  }, []);

  const updateRefocusDisabled = React.useCallback(() => {
    const map = mapRef.current;
    const target = selectedBeachLatLngRef.current;
    if (!map || !target) {
      setRefocusDisabled(true);
      return;
    }
    try {
      const centerPt = map.latLngToContainerPoint(map.getCenter());
      const targetPt = map.latLngToContainerPoint(target as L.LatLngExpression);
      const pxDist = Math.hypot(
        centerPt.x - targetPt.x,
        centerPt.y - targetPt.y,
      );
      // Pixel-space threshold keeps behavior stable across zoom levels and basemaps.
      setRefocusDisabled(pxDist < 8);
    } catch {
      setRefocusDisabled(false);
    }
  }, []);

  React.useEffect(() => {
    if (!mapReady) {
      setRefocusDisabled(true);
      return;
    }
    updateRefocusDisabled();
  }, [mapReady, selectedBeachId, updateRefocusDisabled]);

  const refreshZoomControl = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (zoomControlRef.current) {
      zoomControlRef.current.remove();
      zoomControlRef.current = null;
    }
    const embeddedPreview = embedded && previewUi;
    zoomControlRef.current = L.control
      .zoom({
        position: embeddedPreview
          ? "bottomleft"
          : isDesktop
            ? "bottomleft"
            : "topleft",
      })
      .addTo(map);
    const zoomContainer = zoomControlRef.current.getContainer();
    if (!zoomContainer) return;
    Object.assign(zoomContainer.style, {
      background: "color-mix(in oklch, var(--highlight-4) 60%, transparent)",
      border: "1px solid color-mix(in oklch, var(--border) 55%, transparent)",
      borderRadius: "30px",
      padding: "0px 6px",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      marginTop: embeddedPreview
        ? "0px"
        : !fullMapPage
          ? "240px"
          : smallScreen
            ? "260px"
            : "0px",
      marginBottom: embeddedPreview
        ? "12px"
        : !fullMapPage
          ? smallScreen
            ? "0px"
            : "12px"
          : smallScreen
            ? "80px"
            : "70px",
      marginLeft: "0.8rem",
      boxShadow: embeddedPreview
        ? "0px 0px 10px rgba(0, 0, 0, 0.16)"
        : "0px 0px 15px rgba(0, 0, 0, 0.2)",
    });
    const zoomButtons = zoomContainer.querySelectorAll("a");
    zoomButtons.forEach((button) => {
      button.style.setProperty("background", "transparent", "important");
      button.style.setProperty("background-color", "transparent", "important");
      button.style.setProperty("border", "0", "important");
      button.style.setProperty("border-bottom", "0", "important");
      button.style.setProperty("box-shadow", "none", "important");
      button.style.setProperty("text-decoration", "none", "important");
      button.removeAttribute("href");
      button.setAttribute("role", "button");
    });
    updateZoomButtonState();
  }, [embedded, fullMapPage, previewUi, smallScreen, updateZoomButtonState]);

  React.useEffect(() => {
    refreshZoomControl();
  }, [refreshZoomControl]);

  const ensureMarkerDomGuards = React.useCallback((marker: L.Marker) => {
    const markerWithState = marker as MarkerWithMeta;
    const state: MarkerDomGuardsState = markerWithState._wwDomGuardsState ?? {
      element: null,
      preventDragStart: null,
      pointerDownCapture: null,
      mouseDownCapture: null,
      touchStartCapture: null,
      touchMoveCapture: null,
      touchEndCapture: null,
      touchCancelCapture: null,
    };

    const nextElement = marker.getElement?.() as HTMLElement | null;
    if (!nextElement || nextElement === state.element) {
      markerWithState._wwDomGuardsState = state;
      return;
    }

    if (state.element && state.preventDragStart) {
      state.element.removeEventListener(
        "dragstart",
        state.preventDragStart,
        true,
      );
    }
    if (state.element && state.pointerDownCapture) {
      state.element.removeEventListener(
        "pointerdown",
        state.pointerDownCapture,
        true,
      );
    }
    if (state.element && state.mouseDownCapture) {
      state.element.removeEventListener(
        "mousedown",
        state.mouseDownCapture,
        true,
      );
    }
    if (state.element && state.touchStartCapture) {
      state.element.removeEventListener(
        "touchstart",
        state.touchStartCapture,
        true,
      );
    }
    if (state.element && state.touchMoveCapture) {
      state.element.removeEventListener(
        "touchmove",
        state.touchMoveCapture,
        true,
      );
    }
    if (state.element && state.touchEndCapture) {
      state.element.removeEventListener(
        "touchend",
        state.touchEndCapture,
        true,
      );
    }
    if (state.element && state.touchCancelCapture) {
      state.element.removeEventListener(
        "touchcancel",
        state.touchCancelCapture,
        true,
      );
    }
    state.touchStartCapture = null;
    state.touchMoveCapture = null;
    state.touchEndCapture = null;
    state.touchCancelCapture = null;
    state.pointerDownCapture = null;
    state.mouseDownCapture = null;

    const preventDragStart = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const pointerDownCapture = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      event.stopPropagation();
    };
    const mouseDownCapture = (event: MouseEvent) => {
      if (!isTouchDevice()) return;
      event.stopPropagation();
    };

    nextElement.setAttribute("draggable", "false");
    nextElement.draggable = false;
    nextElement.style.userSelect = "none";
    nextElement.style.touchAction = "none";
    const style = nextElement.style as CSSStyleDeclaration & {
      WebkitUserSelect?: string;
      WebkitUserDrag?: string;
    };
    style.WebkitUserSelect = "none";
    // Prevent native "drag" ghost image (esp. Safari) when pointer moves slightly during click.
    style.WebkitUserDrag = "none";

    // Only guard against native element dragging; don't stop pointer/mouse/touch
    // propagation or Leaflet may not receive the events it needs to dispatch clicks.
    nextElement.addEventListener("dragstart", preventDragStart, true);

    // Prevent map-dragging from starting on marker elements. Without this, some
    // touch browsers can end up with a stale Leaflet drag origin after marker taps,
    // causing the map to "snap" the marker to the user's next pan gesture.
    nextElement.addEventListener("pointerdown", pointerDownCapture, {
      passive: true,
      capture: true,
    });
    nextElement.addEventListener("mousedown", mouseDownCapture, {
      passive: true,
      capture: true,
    });
    state.pointerDownCapture = pointerDownCapture;
    state.mouseDownCapture = mouseDownCapture;

    if (supportsTouchInput()) {
      let touchStart: { x: number; y: number } | null = null;
      let touchMoved = false;
      const MOVE_THRESHOLD_SQ = 24 * 24;

      const touchStartCapture = (event: TouchEvent) => {
        event.stopPropagation();
        if (event.touches.length !== 1) {
          touchStart = null;
          touchMoved = false;
          return;
        }
        const t = event.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
        touchMoved = false;
      };

      const touchMoveCapture = (event: TouchEvent) => {
        if (!touchStart) return;
        if (event.touches.length !== 1) return;
        const t = event.touches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        if (dx * dx + dy * dy > MOVE_THRESHOLD_SQ) {
          touchMoved = true;
        }
      };

      const touchCancelCapture = () => {
        touchStart = null;
        touchMoved = false;
      };

      const touchEndCapture = (event: TouchEvent) => {
        if (!touchStart) return;
        if (touchMoved) {
          touchStart = null;
          touchMoved = false;
          return;
        }
        touchStart = null;
        touchMoved = false;
        if (event.cancelable) {
          event.preventDefault();
        }
        const fireClick = () => {
          (marker as unknown as L.Evented).fire("click", {
            originalEvent: event,
          });
        };
        if (typeof queueMicrotask === "function") {
          queueMicrotask(fireClick);
        } else {
          window.setTimeout(fireClick, 0);
        }
      };

      nextElement.addEventListener("touchstart", touchStartCapture, {
        passive: true,
        capture: true,
      });
      nextElement.addEventListener("touchmove", touchMoveCapture, {
        passive: true,
        capture: true,
      });
      nextElement.addEventListener("touchend", touchEndCapture, {
        passive: false,
        capture: true,
      });
      nextElement.addEventListener("touchcancel", touchCancelCapture, {
        passive: true,
        capture: true,
      });

      state.touchStartCapture = touchStartCapture;
      state.touchMoveCapture = touchMoveCapture;
      state.touchEndCapture = touchEndCapture;
      state.touchCancelCapture = touchCancelCapture;
    }

    // Avoid `L.DomEvent.disableClickPropagation` for marker icons:
    // it sets `_leaflet_disable_click` and Leaflet stops dispatching click/tap events
    // from those elements, breaking mobile marker popups.

    state.element = nextElement;
    state.preventDragStart = preventDragStart;
    markerWithState._wwDomGuardsState = state;
  }, []);

  const refreshMarkerIcon = React.useCallback(
    (entry: MarkerEntry, hovered: boolean = false) => {
      entry.marker.setIcon(
        createMarkerIcon({
          intensity: entry.intensity,
          favorite: entry.favorite,
          selected:
            selectedBeachId != null &&
            String(entry.beach.id) === String(selectedBeachId),
          hovered,
        }),
      );
      // Leaflet can start map-dragging from marker elements if the pointerdown bubbles up.
      // Add DOM-level guards on the current icon element so clicking a marker never "grabs" it.
      ensureMarkerDomGuards(entry.marker);
    },
    [selectedBeachId, ensureMarkerDomGuards],
  );

  const enableInteractionLock = React.useCallback(() => {
    // Default: do NOT lock scroll during map interaction. We mainly need the lock
    // to disable competing UI interactions (e.g., chart hover) while dragging.
    // Scroll locking removes the page scrollbar, which causes layout shifts.
    const desiredLockScroll = false;
    const current = interactionLockReleaseRef.current;
    const currentLockScroll = interactionLockOptionsRef.current?.lockScroll;
    if (current && currentLockScroll === desiredLockScroll) return;
    current?.();
    interactionLockReleaseRef.current = acquireInteractionLock({
      lockScroll: desiredLockScroll,
    });
    interactionLockOptionsRef.current = { lockScroll: desiredLockScroll };
  }, []);

  const disableInteractionLock = React.useCallback(() => {
    interactionLockReleaseRef.current?.();
    interactionLockReleaseRef.current = null;
    interactionLockOptionsRef.current = null;
  }, []);

  const navigationPendingLockRef = React.useRef(false);
  const syncNavigationPendingBody = React.useCallback((pending: boolean) => {
    try {
      if (typeof document === "undefined") return;
      if (pending) {
        document.body.dataset.wwNavigationPending = "1";
        document.documentElement.dataset.wwNavigationPending = "1";
      } else {
        delete document.body.dataset.wwNavigationPending;
        delete document.documentElement.dataset.wwNavigationPending;
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    syncNavigationPendingBody(navigationPending);
    if (navigationPending) {
      if (!interactionLockReleaseRef.current) {
        navigationPendingLockRef.current = true;
      }
      enableInteractionLock();
      return;
    }
    if (navigationPendingLockRef.current) {
      navigationPendingLockRef.current = false;
      disableInteractionLock();
    }
  }, [
    navigationPending,
    syncNavigationPendingBody,
    enableInteractionLock,
    disableInteractionLock,
  ]);

  const shouldIgnoreTouchActivation = React.useCallback(
    (event?: Event | null) => {
      if (!event || !isTouchInteraction(event)) return false;
      if (isMapInteractingRef.current) return true;
      const last = lastTouchGestureRef.current;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      // Suppress ghost clicks that are actually the tail end of a drag/pinch gesture.
      // Leaflet tap/click tolerance can be large on coarse pointers.
      return last.moved && now - last.ts < 250;
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      disableInteractionLock();
    };
  }, [disableInteractionLock]);

  const resetMarkerRegistry = React.useCallback(() => {
    cancelMarkerBuild();
    const registry = markerRegistryRef.current;
    Object.values(registry).forEach((entry) => {
      if (!entry?.marker) return;
      try {
        entry.marker.off();
      } catch {
        // ignore listener cleanup errors
      }
      try {
        entry.marker.remove();
      } catch {
        // ignore marker removal errors
      }
    });
    markerRegistryRef.current = {};
    statsFallbackIdsRef.current = new Set();
  }, [cancelMarkerBuild]);

  const clearHoverState = React.useCallback(() => {
    const registry = markerRegistryRef.current;
    const prevId = appliedHoverIdRef.current;
    hoverStateRef.current = { card: null, marker: null };
    appliedHoverIdRef.current = null;
    setMapInteractionHover({ cardId: null, markerId: null });
    try {
      mapRef.current?.closePopup?.();
    } catch {
      // ignore popup close errors
    }
    if (prevId) {
      const prevEntry = registry[prevId];
      if (prevEntry) {
        refreshMarkerIcon(prevEntry, false);
        prevEntry.marker.closePopup();
      }
    }
    updateClusterHighlight(null);
  }, [refreshMarkerIcon, updateClusterHighlight]);

  React.useEffect(() => {
    clearHoverStateRef.current = clearHoverState;
  }, [clearHoverState]);

  React.useEffect(() => {
    if (!mapReady) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!interactionsReadyRef.current) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // If the user is about to drag the map, stop any in-flight background work immediately.
      // Leaflet's `movestart` fires after the pointerdown threshold, which is too late to
      // prevent an initial hitch when marker rebuilds/stats prefetch are running.
      if (containerRef.current && containerRef.current.contains(target)) {
        cancelMarkerBuild();
        if (prefetchStatsTimeoutRef.current != null) {
          const globalWindow = window as IdleCallbackWindow;
          if (typeof globalWindow.cancelIdleCallback === "function") {
            globalWindow.cancelIdleCallback(prefetchStatsTimeoutRef.current);
          } else {
            window.clearTimeout(prefetchStatsTimeoutRef.current);
          }
          prefetchStatsTimeoutRef.current = null;
        }
        cancelCommitResume();
        cancelScheduledCameraUpdate();
      }
      if (
        target.closest(".ww-leaflet-point-icon") ||
        target.closest(".ww-cluster-inner") ||
        target.closest(".leaflet-popup")
      ) {
        return;
      }
      if (
        appliedHoverIdRef.current ||
        hoverStateRef.current.card ||
        hoverStateRef.current.marker
      ) {
        clearHoverState();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [
    mapReady,
    clearHoverState,
    cancelMarkerBuild,
    cancelCommitResume,
    cancelScheduledCameraUpdate,
  ]);

  React.useEffect(() => {
    if (!navigationPending) return;
    const timer = window.setTimeout(() => {
      setNavigationPending(false);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [navigationPending]);

  React.useEffect(() => {
    if (!navigationPending) return;
    cancelMarkerBuild();
  }, [navigationPending, cancelMarkerBuild]);

  React.useEffect(() => {
    if (navigationPending) return;
    clearHoverState();
  }, [navigationPending, clearHoverState]);

  const highlightClusterForBeach = React.useCallback(
    (beachId: string | null): boolean => {
      if (!beachId) return false;
      const group =
        clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
      if (!group || typeof group.getVisibleParent !== "function") return false;
      const entry = markerRegistryRef.current[beachId];
      if (!entry) return false;
      const clusterParent = group.getVisibleParent(entry.marker);
      if (clusterParent && clusterParent !== entry.marker) {
        updateClusterHighlight(clusterParent);
        return true;
      }
      return false;
    },
    [updateClusterHighlight],
  );

  const buildPopupHtmlForBeach = React.useCallback((beach: BeachPoint) => {
    const ctx = statsContextRef.current;
    const snapshot =
      ctx.getStatsSnapshot(
        String(beach.id),
        ctx.statsDateKey,
        ctx.statsHourKey,
      ) ?? null;
    const dailyStats = extractDailySurfWindStats(snapshot);
    const current = snapshot?.current ?? null;
    const currentSurfLabel = representativeSurfRangeLabel(current);
    const currentWindSpeed =
      typeof current?.conditions?.windSpeed === "number" &&
      Number.isFinite(current.conditions.windSpeed)
        ? current.conditions.windSpeed
        : null;
    const currentWindDirection =
      typeof current?.conditions?.windDirection === "number" &&
      Number.isFinite(current.conditions.windDirection)
        ? current.conditions.windDirection
        : null;
    const resolvedSurfLabel = normalizeSurfLabel(dailyStats.surfHeight ?? currentSurfLabel);
    const statsIntensity = parseSurfRepresentativeFt(resolvedSurfLabel);
    return buildPopupHtml(beach, {
      surfHeight: resolvedSurfLabel,
      surfIntensity: statsIntensity,
      windSpeed: currentWindSpeed ?? dailyStats.windSpeed,
      windDirection: currentWindDirection ?? dailyStats.windDirection,
    });
  }, []);

  const getDesktopPopupContent = buildPopupHtmlForBeach;

  const getTouchPopupContent = React.useCallback(
    (beach: BeachPoint) => {
      const destination = `${generateBeachUrl(beach.name, beach.id)}/overview`;
      const base = getDesktopPopupContent(beach);
      return `${base}
        <div class="ww-touch-popup__actions">
          <a class="ww-touch-popup__open" href="${escapeHtml(
            destination,
          )}" data-ww-touch-open="true">View beach</a>
        </div>`;
    },
    [getDesktopPopupContent],
  );

  const ensureMarkerPopup = React.useCallback(
    (entry: MarkerEntry, forceTouchPopup?: boolean) => {
      const touch = forceTouchPopup ?? supportsTouchInput();
      const popupHtml = touch
        ? getTouchPopupContent(entry.beach)
        : getDesktopPopupContent(entry.beach);
      const popup = entry.marker.getPopup();
      if (popup) {
        const className = popup.options?.className ?? "";
        const touchClassApplied = className.includes("ww-touch-popup");
        const popupOptions = popup.options as unknown as {
          autoPanOnFocus?: unknown;
        };
        const hasAutoPanOnFocus =
          typeof popupOptions.autoPanOnFocus === "boolean";
        const optionMismatch =
          (popup.options?.autoPan ?? false) !== false ||
          (popup.options?.keepInView ?? false) !== false ||
          (touch && (popup.options?.closeOnClick ?? undefined) !== false) ||
          (touch && hasAutoPanOnFocus && popupOptions.autoPanOnFocus !== false);

        if ((touch && !touchClassApplied) || optionMismatch) {
          entry.marker.unbindPopup();
        } else if (!touch && touchClassApplied) {
          entry.marker.unbindPopup();
        } else {
          popup.setContent(popupHtml);
          return;
        }
      }
      entry.marker.bindPopup(
        popupHtml,
        touch
          ? ({
              closeButton: false,
              // On touch devices, Leaflet's auto-pan/keep-in-view behavior is disruptive:
              // it can jump the map and "snap back" while users try to pan away.
              autoPan: false,
              keepInView: false,
              autoPanOnFocus: false,
              closeOnClick: false,
              className: "ww-touch-popup",
              interactive: true,
            } as unknown as L.PopupOptions)
          : { closeButton: false, autoPan: false },
      );
    },
    [getDesktopPopupContent, getTouchPopupContent],
  );

  const openMarkerPopup = React.useCallback((marker: L.Marker) => {
    try {
      marker.openPopup();
      return;
    } catch {
      // fall through to map-level open, which is more resilient during cluster/map transitions
    }
    const map = mapRef.current;
    if (!map) return;
    const popup = marker.getPopup?.();
    if (!popup) return;
    const latLng = (() => {
      try {
        return marker.getLatLng?.() ?? null;
      } catch {
        return null;
      }
    })();
    try {
      if (latLng) {
        popup.setLatLng(latLng);
      }
      map.openPopup(popup);
    } catch {
      // ignore popup open errors
    }
  }, []);

  const ensureStatsForBeachId = React.useCallback(
    (beachId: string | number | null | undefined) => {
      if (beachId == null) return null;
      const ctx = statsContextRef.current;
      const snapshot = ctx.getStatsSnapshot(
        String(beachId),
        ctx.statsDateKey,
        ctx.statsHourKey,
      );
      if (snapshot !== undefined) return null;
      return ctx
        .prefetchSnapshots([beachId], {
          date: ctx.effectiveStatsDate ?? undefined,
          hour:
            typeof ctx.selectedHour === "number" ? ctx.selectedHour : undefined,
        })
        .catch(() => {
          // ignore fetch errors; popups will show "--" until data available
        });
    },
    [],
  );

  const prefetchVisibleMarkerStats = React.useCallback(() => {
    if (isMapInteractingRef.current) return;
    const map = mapRef.current;
    const group =
      clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
    if (!map || !group || typeof map.getBounds !== "function") {
      return;
    }
    const bounds = map.getBounds();
    if (!bounds) return;
    const ctx = statsContextRef.current;
    const pending: Array<string | number> = [];
    // Keep background stats prefetch bounded to avoid overloading the API on large viewports.
    const MAX_PREFETCH = 200;
    for (const entry of Object.values(markerRegistryRef.current)) {
      if (pending.length >= MAX_PREFETCH) break;
      if (!entry?.marker) continue;
      const latLng = entry.marker.getLatLng?.();
      if (!latLng || !bounds.contains(latLng)) {
        continue;
      }
      const parent =
        typeof group.getVisibleParent === "function"
          ? group.getVisibleParent(entry.marker)
          : null;
      if (parent && parent !== entry.marker) {
        continue;
      }
      const beachId = entry.beach?.id;
      if (beachId == null) continue;
      const snapshot = ctx.getStatsSnapshot(
        String(beachId),
        ctx.statsDateKey,
        ctx.statsHourKey,
      );
      if (snapshot === undefined) {
        pending.push(beachId);
      }
    }
    if (!pending.length) return;
    ctx
      .prefetchSnapshots(pending, {
        date: ctx.effectiveStatsDate ?? undefined,
        hour:
          typeof ctx.selectedHour === "number" ? ctx.selectedHour : undefined,
      })
      .catch(() => {
        // ignore background errors
      });
  }, []);

  const cancelPrefetchVisibleMarkerStats = React.useCallback(() => {
    if (prefetchStatsTimeoutRef.current == null) return;
    const globalWindow = window as IdleCallbackWindow;
    if (typeof globalWindow.cancelIdleCallback === "function") {
      globalWindow.cancelIdleCallback(prefetchStatsTimeoutRef.current);
    } else {
      window.clearTimeout(prefetchStatsTimeoutRef.current);
    }
    prefetchStatsTimeoutRef.current = null;
  }, []);

  const schedulePrefetchVisibleMarkerStats = React.useCallback(() => {
    if (typeof window === "undefined") return;
    cancelPrefetchVisibleMarkerStats();
    const run = () => {
      prefetchStatsTimeoutRef.current = null;
      prefetchVisibleMarkerStats();
    };
    const globalWindow = window as IdleCallbackWindow;
    if (typeof globalWindow.requestIdleCallback === "function") {
      prefetchStatsTimeoutRef.current = globalWindow.requestIdleCallback(run, {
        timeout: 350,
      });
    } else {
      prefetchStatsTimeoutRef.current = window.setTimeout(run, 120);
    }
  }, [cancelPrefetchVisibleMarkerStats, prefetchVisibleMarkerStats]);

  React.useEffect(() => {
    return () => {
      cancelPrefetchVisibleMarkerStats();
    };
  }, [cancelPrefetchVisibleMarkerStats]);

  const hoverOpsRef = React.useRef({
    refreshMarkerIcon,
    updateClusterHighlight,
    highlightClusterForBeach,
    ensureStatsForBeachId,
    ensureMarkerPopup,
    openMarkerPopup,
  });

  React.useEffect(() => {
    hoverOpsRef.current = {
      refreshMarkerIcon,
      updateClusterHighlight,
      highlightClusterForBeach,
      ensureStatsForBeachId,
      ensureMarkerPopup,
      openMarkerPopup,
    };
  }, [
    refreshMarkerIcon,
    updateClusterHighlight,
    highlightClusterForBeach,
    ensureStatsForBeachId,
    ensureMarkerPopup,
    openMarkerPopup,
  ]);

  const setHoveredMarkerSource = React.useCallback(
    (source: "marker" | "card", nextId: string | null) => {
      if (!interactionsReadyRef.current) return;
      const hoverOps = hoverOpsRef.current;
      hoverStateRef.current[source] = nextId;
      setMapInteractionHover({
        cardId: hoverStateRef.current.card,
        markerId: hoverStateRef.current.marker,
      });
      const nextHoverId =
        hoverStateRef.current.card ?? hoverStateRef.current.marker;
      const previousId = appliedHoverIdRef.current;
      if (nextHoverId) {
        hoverOps.ensureStatsForBeachId(nextHoverId);
      }
      if (previousId === nextHoverId) {
        if (nextHoverId) {
          const entry = markerRegistryRef.current[nextHoverId];
          if (entry) {
            const group =
              clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
            hoverOps.updateClusterHighlight(
              group?.getVisibleParent?.(entry.marker) ?? null,
            );
          } else if (
            source === "card" &&
            hoverOps.highlightClusterForBeach(nextHoverId)
          ) {
            // cluster highlight handled
          } else {
            hoverOps.updateClusterHighlight(null);
          }
        } else {
          hoverOps.updateClusterHighlight(null);
        }
        return;
      }
      if (previousId) {
        const prevEntry = markerRegistryRef.current[previousId];
        if (prevEntry) {
          hoverOps.refreshMarkerIcon(prevEntry, false);
          prevEntry.marker.closePopup();
        }
      }
      appliedHoverIdRef.current = nextHoverId;
      if (nextHoverId) {
        const entry = markerRegistryRef.current[nextHoverId];
        if (entry) {
          hoverOps.refreshMarkerIcon(entry, true);
          const group =
            clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
          const visibleParent =
            group && typeof group.getVisibleParent === "function" && group._map
              ? (() => {
                  try {
                    return group.getVisibleParent(entry.marker);
                  } catch {
                    return null;
                  }
                })()
              : null;
          const markerVisible =
            !visibleParent || visibleParent === entry.marker;
          if (markerVisible) {
            hoverOps.ensureMarkerPopup(entry);
            hoverOps.openMarkerPopup(entry.marker);
          }
          if (visibleParent && visibleParent !== entry.marker) {
            hoverOps.updateClusterHighlight(visibleParent);
          } else {
            hoverOps.updateClusterHighlight(null);
          }
        } else {
          const handled =
            source === "card" && hoverOps.highlightClusterForBeach(nextHoverId);
          if (!handled) {
            hoverOps.updateClusterHighlight(null);
          }
        }
      } else {
        hoverOps.updateClusterHighlight(null);
      }
    },
    [],
  );

  type MapLifecycleCallbacks = {
    refreshZoomControl: () => void;
    emitCameraUpdate: () => void;
    scheduleCameraUpdate: (delayMs?: number) => void;
    cancelScheduledCameraUpdate: () => void;
    scheduleMapViewPersistence: (payload: StoredViewState) => void;
    clearHoverState: () => void;
    cancelMarkerBuild: () => void;
    scheduleMarkerRebuildAfterInteraction: () => void;
    scheduleCommitResume: () => void;
    scheduleResizeRecompute: () => void;
    normalizeMapCenter: () => void;
    setAllowViewportCommit: (value: boolean) => void;
    cancelCommitResume: () => void;
    setHoveredMarkerSource: (
      source: "marker" | "card",
      nextId: string | null,
    ) => void;
    primeVisibleMarkerStats: () => void;
    updateZoomButtons: () => void;
    updateRefocusDisabled: () => void;
  };

  const mapLifecycleCallbacksRef = React.useRef<MapLifecycleCallbacks | null>(
    null,
  );

  // NOTE: This must be `useLayoutEffect` so the callbacks ref is populated before
  // the map initialization `useLayoutEffect` runs. In production builds, `useEffect`
  // runs too late (and does not trigger a re-render), which can leave the map uninitialized.
  React.useLayoutEffect(() => {
    mapLifecycleCallbacksRef.current = {
      refreshZoomControl,
      emitCameraUpdate,
      scheduleCameraUpdate,
      cancelScheduledCameraUpdate,
      scheduleMapViewPersistence,
      clearHoverState,
      cancelMarkerBuild,
      scheduleMarkerRebuildAfterInteraction,
      scheduleCommitResume,
      scheduleResizeRecompute,
      normalizeMapCenter,
      setAllowViewportCommit,
      cancelCommitResume,
      setHoveredMarkerSource,
      primeVisibleMarkerStats: schedulePrefetchVisibleMarkerStats,
      updateZoomButtons: updateZoomButtonState,
      updateRefocusDisabled,
    };
  }, [
    refreshZoomControl,
    emitCameraUpdate,
    scheduleCameraUpdate,
    cancelScheduledCameraUpdate,
    scheduleMapViewPersistence,
    clearHoverState,
    cancelMarkerBuild,
    scheduleMarkerRebuildAfterInteraction,
    scheduleCommitResume,
    scheduleResizeRecompute,
    normalizeMapCenter,
    setAllowViewportCommit,
    cancelCommitResume,
    setHoveredMarkerSource,
    schedulePrefetchVisibleMarkerStats,
    updateZoomButtonState,
    updateRefocusDisabled,
  ]);

  React.useLayoutEffect(() => {
    if (!effectiveShowMap) {
      return;
    }
    if (!containerRef.current || mapRef.current) {
      return;
    }
    const lifecycle = mapLifecycleCallbacksRef.current;
    if (!lifecycle) {
      return;
    }
    const {
      refreshZoomControl: latestRefreshZoomControl,
      emitCameraUpdate: latestEmitCameraUpdate,
      scheduleCameraUpdate: latestScheduleCameraUpdate,
      cancelScheduledCameraUpdate: latestCancelScheduledCameraUpdate,
      scheduleMapViewPersistence: latestScheduleMapViewPersistence,
      clearHoverState: latestClearHoverState,
      cancelMarkerBuild: latestCancelMarkerBuild,
      scheduleMarkerRebuildAfterInteraction:
        latestScheduleMarkerRebuildAfterInteraction,
      scheduleCommitResume: latestScheduleCommitResume,
      scheduleResizeRecompute: latestScheduleResizeRecompute,
      normalizeMapCenter: latestNormalizeMapCenter,
      setAllowViewportCommit: latestSetAllowViewportCommit,
      cancelCommitResume: latestCancelCommitResume,
      updateZoomButtons: latestUpdateZoomButtons = () => {},
      updateRefocusDisabled: latestUpdateRefocusDisabled = () => {},
      primeVisibleMarkerStats: latestPrimeVisibleMarkerStats = () => {},
    } = lifecycle;
    const initialView = resolveInitialView(initialBeach, {
      allowStoredFallback: !embedded && !pathname.endsWith("/beaches"),
    });
    // Ensure the initial view starts within our configured `maxBounds` so Leaflet doesn't need to correct it.
    const clampedInitialLatitude = Math.min(
      WEB_MERCATOR_MAX_LATITUDE,
      Math.max(-WEB_MERCATOR_MAX_LATITUDE, initialView.latitude),
    );
    const clampedInitialLongitude = Math.min(
      EAST_LNG_LIMIT,
      Math.max(WEST_LNG_LIMIT, initialView.longitude),
    );
    const embeddedPreview = embedded && previewUi;
    const browser = L.Browser as LeafletBrowser;
    const coarsePointer = isTouchDevice();
    const touchInput = supportsTouchInput();
    // Leaflet considers zoom animations available only when `Browser.any3d` is
    // true. We disable 3D transforms for non-touch to avoid rendering edge-cases
    // with GL basemap layers, but keep them on for touch so pinch zoom can track
    // the user's gesture smoothly (fractional zoom + animated scaling).
    if (typeof window !== "undefined" && browser.any3d && !touchInput) {
      browser.any3d = false;
    }
    const map = L.map(containerRef.current, {
      center: [clampedInitialLatitude, clampedInitialLongitude],
      zoom: initialView.zoom,
      zoomControl: false,
      // Keep Leaflet attribution control enabled/visible.
      attributionControl: true,
      preferCanvas: false,
      minZoom: 3,
      maxZoom: 18,
      // Leaflet pinch-zoom snaps to discrete levels by default (`zoomSnap: 1`),
      // which feels "thresholded"/segmented on touch devices. Disable snapping so
      // pinch zoom tracks the user's gesture smoothly (fractional zoom levels).
      // https://leafletjs.com/reference.html#map-zoomsnap
      // https://leafletjs.com/reference.html#map-zoomdelta
      zoomSnap: touchInput ? 0 : 1,
      zoomDelta: 1,
      // On touch devices, Leaflet's double-tap-to-zoom can be mistakenly triggered when users
      // intend to drag, which looks like a disruptive "snap/jump" (selected marker shifts to
      // the finger). Disable it on touch; desktop still has double-click zoom.
      doubleClickZoom: touchInput ? false : undefined,
      // Leaflet's legacy tap polyfill can interfere with touch dragging and cause
      // disruptive initial jumps on some mobile browsers; use native touch/pointer events.
      ...(touchInput ? ({ tap: false } as any) : null),
      // IMPORTANT: `worldCopyJump` intentionally "jumps" back to the original world copy when crossing the antimeridian.
      // We want continuous, uninterrupted horizontal panning instead.
      worldCopyJump: false,
      // Constrain panning via Leaflet's official bounds API:
      // - latitude: Web Mercator extent (prevents grey/empty areas beyond valid world)
      // - longitude: WEST_LNG_LIMIT..EAST_LNG_LIMIT (restrict horizontal panning only)
      maxBounds: WEB_MERCATOR_MAX_BOUNDS,
      // `1.0` = hard boundary (no overscroll/spring-back); keeps edge behavior feeling like a natural limit.
      maxBoundsViscosity: 1.0,
      // inertia: true,
      // inertiaDeceleration: 2500,
      // MapLibre GL Leaflet expects Leaflet's animation proxy to exist when zoomAnimation is on.
      // Keep zoom animation off for non-touch (avoids proxy edge-cases with GL basemap layers),
      // but enable it on touch so pinch zoom feels continuous instead of step-wise.
      zoomAnimation: touchInput,
      // Avoid animating lots of DOM markers during pinch zoom; keeps touch zoom smooth.
      markerZoomAnimation: touchInput ? false : undefined,
      // Avoid missed taps on touch devices when the finger shifts slightly.
      tapTolerance: coarsePointer ? 35 : undefined,
    });
    // Assign immediately so any init errors still allow cleanup/retry logic to remove the map.
    mapRef.current = map;
    // Keep the selected beach marker centered on mobile.

    const mapContainer = map.getContainer();
    if (!embeddedPreview) {
      mapContainer.classList.add("touch-none", "overscroll-contain");
      mapContainer.style.touchAction = "none";
      (
        mapContainer.style as CSSStyleDeclaration & {
          overscrollBehavior?: string;
          overscrollBehaviorX?: string;
          overscrollBehaviorY?: string;
        }
      ).overscrollBehavior = "contain";
      (
        mapContainer.style as CSSStyleDeclaration & {
          overscrollBehavior?: string;
          overscrollBehaviorX?: string;
          overscrollBehaviorY?: string;
        }
      ).overscrollBehaviorX = "contain";
      (
        mapContainer.style as CSSStyleDeclaration & {
          overscrollBehavior?: string;
          overscrollBehaviorX?: string;
          overscrollBehaviorY?: string;
        }
      ).overscrollBehaviorY = "contain";
    }

    const mapOuterContainer =
      mapContainer.closest<HTMLElement>("#map-container");
    if (mapOuterContainer) {
      if (!embeddedPreview) {
        mapOuterContainer.style.touchAction = "none";
        (
          mapOuterContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehavior = "contain";
        (
          mapOuterContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehaviorX = "contain";
        (
          mapOuterContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehaviorY = "contain";
      }
    }

    let touchStartedOnMap = false;
    let touchStartedOnInteractiveElement = false;
    let touchStartedOnTouchPopupOpenLink = false;
    let touchStartPoint: { x: number; y: number } | null = null;
    let touchGestureMoved = false;
    const touchOriginTarget = mapOuterContainer ?? mapContainer;
    const handleTouchStartCapture = (event: TouchEvent) => {
      if (event.touches.length === 0) return;
      touchStartedOnMap = true;
      touchGestureMoved = false;
      touchStartPoint = {
        x: event.touches[0]?.clientX ?? 0,
        y: event.touches[0]?.clientY ?? 0,
      };
      const target = event.target as HTMLElement | null;
      touchStartedOnTouchPopupOpenLink = Boolean(
        target?.closest?.('[data-ww-touch-open="true"]'),
      );
      touchStartedOnInteractiveElement = Boolean(
        target?.closest?.(".ww-leaflet-point-icon") ||
        target?.closest?.(".ww-cluster-inner") ||
        target?.closest?.(".leaflet-popup") ||
        target?.closest?.(".leaflet-control"),
      );
    };
    const handleTouchEndOrCancelCapture = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        lastTouchGestureRef.current = { moved: touchGestureMoved, ts: now };
        touchStartedOnMap = false;
        touchStartedOnInteractiveElement = false;
        touchStartedOnTouchPopupOpenLink = false;
        touchStartPoint = null;
        touchGestureMoved = false;
      }
    };
    const handleDocumentTouchMoveCapture = (event: TouchEvent) => {
      if (!touchStartedOnMap) return;
      if (event.touches.length > 1) {
        touchGestureMoved = true;
        return;
      }
      if (!event.cancelable) return;
      if (touchStartPoint) {
        const touch = event.touches[0];
        const dx = (touch?.clientX ?? 0) - touchStartPoint.x;
        const dy = (touch?.clientY ?? 0) - touchStartPoint.y;
        const MOVE_THRESHOLD_SQ = touchStartedOnInteractiveElement
          ? 24 * 24
          : 18 * 18;
        if (dx * dx + dy * dy > MOVE_THRESHOLD_SQ) {
          touchGestureMoved = true;
        }
      }
      if (touchStartedOnInteractiveElement && touchStartPoint) {
        const touch = event.touches[0];
        const dx = (touch?.clientX ?? 0) - touchStartPoint.x;
        const dy = (touch?.clientY ?? 0) - touchStartPoint.y;
        // Allow minor finger jitter on marker taps without canceling the click.
        const thresholdSq = touchStartedOnTouchPopupOpenLink ? 256 : 16;
        if (dx * dx + dy * dy < thresholdSq) return;
      }
      event.preventDefault();
    };

    let activeTouchPointerId: number | null = null;
    let pointerStartPoint: { x: number; y: number } | null = null;
    let pointerStartedOnInteractiveElement = false;
    let pointerMoved = false;
    const POINTER_MOVE_THRESHOLD_MAP_SQ = 18 * 18;
    const POINTER_MOVE_THRESHOLD_INTERACTIVE_SQ = 24 * 24;

    const handlePointerDownCapture = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      activeTouchPointerId = event.pointerId;
      pointerStartPoint = { x: event.clientX, y: event.clientY };
      const target = event.target as HTMLElement | null;
      pointerStartedOnInteractiveElement = Boolean(
        target?.closest?.(".ww-leaflet-point-icon") ||
        target?.closest?.(".ww-cluster-inner") ||
        target?.closest?.(".leaflet-popup") ||
        target?.closest?.(".leaflet-control"),
      );
      pointerMoved = false;
    };
    const handlePointerMoveCapture = (event: PointerEvent) => {
      if (activeTouchPointerId == null) return;
      if (event.pointerId !== activeTouchPointerId) return;
      if (!pointerStartPoint) return;
      const dx = event.clientX - pointerStartPoint.x;
      const dy = event.clientY - pointerStartPoint.y;
      const thresholdSq = pointerStartedOnInteractiveElement
        ? POINTER_MOVE_THRESHOLD_INTERACTIVE_SQ
        : POINTER_MOVE_THRESHOLD_MAP_SQ;
      if (dx * dx + dy * dy > thresholdSq) {
        pointerMoved = true;
      }
    };
    const finalizePointerGesture = (event: PointerEvent) => {
      if (activeTouchPointerId == null) return;
      if (event.pointerId !== activeTouchPointerId) return;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      lastTouchGestureRef.current = {
        moved: pointerMoved || touchGestureMoved,
        ts: now,
      };
      activeTouchPointerId = null;
      pointerStartPoint = null;
      pointerStartedOnInteractiveElement = false;
      pointerMoved = false;
    };

    if (touchInput && !embeddedPreview) {
      touchOriginTarget.addEventListener(
        "pointerdown",
        handlePointerDownCapture,
        {
          passive: true,
          capture: true,
        },
      );
      document.addEventListener("pointermove", handlePointerMoveCapture, {
        passive: true,
        capture: true,
      });
      document.addEventListener("pointerup", finalizePointerGesture, {
        passive: true,
        capture: true,
      });
      document.addEventListener("pointercancel", finalizePointerGesture, {
        passive: true,
        capture: true,
      });
      touchOriginTarget.addEventListener(
        "touchstart",
        handleTouchStartCapture,
        {
          passive: true,
          capture: true,
        },
      );
      touchOriginTarget.addEventListener(
        "touchend",
        handleTouchEndOrCancelCapture,
        { passive: true, capture: true },
      );
      touchOriginTarget.addEventListener(
        "touchcancel",
        handleTouchEndOrCancelCapture,
        { passive: true, capture: true },
      );
      document.addEventListener("touchmove", handleDocumentTouchMoveCapture, {
        passive: false,
        capture: true,
      });
      document.addEventListener("touchend", handleTouchEndOrCancelCapture, {
        passive: true,
        capture: true,
      });
      document.addEventListener("touchcancel", handleTouchEndOrCancelCapture, {
        passive: true,
        capture: true,
      });
    }
    const useVectorBasemap = canUseWebGL();
    const addRasterBasemap = () => {
      debugLog("[LeafletMap] Using raster OSM tiles");
      const basemapLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: OSM_ATTRIBUTION_HTML,
        },
      );
      basemapLayer.addTo(map);
      basemapLayerRef.current = basemapLayer;
    };

    if (useVectorBasemap) {
      try {
        const maplibreFactory = (L as unknown as { maplibreGL?: unknown })
          .maplibreGL;
        if (typeof maplibreFactory !== "function") {
          // In production builds, bundlers can occasionally tree-shake side-effect-only
          // imports. If MapLibre GL Leaflet isn't registered, fall back to raster.
          // eslint-disable-next-line no-console
          console.warn(
            "[LeafletMap] MapLibre GL Leaflet not available; falling back to raster tiles",
          );
          addRasterBasemap();
        } else {
          const basemapLayer = (maplibreFactory as (opts: unknown) => any)({
            // Official OpenFreeMap vector basemap style.
            style: OPENFREEMAP_STYLE_URL,
            // Basemap only: Leaflet owns interactions.
            interactive: false,
            // We provide a single, complete attribution string via Leaflet to avoid duplicates.
            attributionControl: false,
            // Ensure tiles repeat seamlessly as users pan horizontally across world copies.
            renderWorldCopies: true,
          });
          basemapLayer.addTo(map);
          basemapLayerRef.current = basemapLayer;
          map.attributionControl?.addAttribution(OPENFREEMAP_ATTRIBUTION_HTML);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          "[LeafletMap] Failed to initialize vector basemap; falling back to raster tiles",
          error,
        );
        addRasterBasemap();
      }
    } else {
      debugLog("[LeafletMap] WebGL unavailable; using raster OSM tiles");
      addRasterBasemap();
    }
    if (!map.getPane(OVERLAY_PANE_ID)) {
      const pane = map.createPane(OVERLAY_PANE_ID);
      pane.style.zIndex = "750";
      pane.style.pointerEvents = "none";
    }
    latestRefreshZoomControl();
    const clusterGroup = L.markerClusterGroup({
      disableClusteringAtZoom: 18,
      maxClusterRadius: 30,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: false,
      animateAddingMarkers: false,
      chunkedLoading: false,
      iconCreateFunction: (cluster: L.MarkerCluster) =>
        createClusterIcon(cluster),
    });
    clusterLayerRef.current = clusterGroup;
    clusterGroup.addTo(map);
    setMapReady(true);
    initRetryCountRef.current = 0;
    latestScheduleCameraUpdate(0);
    latestPrimeVisibleMarkerStats();
    latestUpdateZoomButtons();
    latestUpdateRefocusDisabled();

    const handleResizeEvent = () => {
      latestScheduleResizeRecompute();
    };

    const handleInteractionEnd = () => {
      clearInteractionEndFallback();
      latestClearHoverState();
      disableInteractionLock();
      isMapInteractingRef.current = false;
      try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        latestScheduleMapViewPersistence({
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        });
      } catch {
        // ignore persistence failures
      }
      latestScheduleCameraUpdate(0);
      latestScheduleCommitResume();
      latestPrimeVisibleMarkerStats();
      latestUpdateZoomButtons();
      latestUpdateRefocusDisabled();
      latestScheduleMarkerRebuildAfterInteraction();
    };

    function motionTimestamp() {
      return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    let lastMotionTs = motionTimestamp();
    let interactionEndFallbackTimeout: number | null = null;

    function markMotion() {
      lastMotionTs = motionTimestamp();
    }

    function clearInteractionEndFallback() {
      if (interactionEndFallbackTimeout != null) {
        window.clearTimeout(interactionEndFallbackTimeout);
        interactionEndFallbackTimeout = null;
      }
    }

    function scheduleInteractionEndFallback() {
      if (typeof window === "undefined") return;
      clearInteractionEndFallback();

      const tick = () => {
        if (!isMapInteractingRef.current) {
          interactionEndFallbackTimeout = null;
          return;
        }

        const now = motionTimestamp();
        const idleFor = now - lastMotionTs;
        if (idleFor > 220) {
          interactionEndFallbackTimeout = null;
          handleInteractionEnd();
          return;
        }

        interactionEndFallbackTimeout = window.setTimeout(tick, 120);
      };

      interactionEndFallbackTimeout = window.setTimeout(tick, 360);
    }

    const handleMoveStart = () => {
      if (suppressUserMoveRef.current) {
        suppressUserMoveRef.current = false;
        return;
      }
      isMapInteractingRef.current = true;
      markMotion();
      scheduleInteractionEndFallback();
      if (deferredMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
        deferredMarkerRebuildTimeoutRef.current = null;
      }
      if (markerBuildJobRef.current) {
        pendingMarkerRebuildRef.current = true;
      }
      latestCancelMarkerBuild();
      if (!touchInput) {
        enableInteractionLock();
      }
      pendingAutoCenterRef.current = null;
      pendingFocusRef.current = null;
      latestCancelCommitResume();
      latestCancelScheduledCameraUpdate();
      React.startTransition(() => latestSetAllowViewportCommit(false));
      // Clear hover/popup state when the user starts panning/zooming, including on touch,
      // so a marker can't look "grabbed" after the gesture ends.
      latestClearHoverState();
      cancelPrefetchVisibleMarkerStats();
    };

    const handleZoomStart = () => {
      isMapInteractingRef.current = true;
      markMotion();
      scheduleInteractionEndFallback();
      if (deferredMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
        deferredMarkerRebuildTimeoutRef.current = null;
      }
      if (markerBuildJobRef.current) {
        pendingMarkerRebuildRef.current = true;
      }
      latestCancelMarkerBuild();
      if (!touchInput) {
        enableInteractionLock();
      }
      latestCancelCommitResume();
      latestCancelScheduledCameraUpdate();
      React.startTransition(() => latestSetAllowViewportCommit(false));
      latestClearHoverState();
      cancelPrefetchVisibleMarkerStats();
    };

    map.on("movestart", handleMoveStart);
    map.on("zoomstart", handleZoomStart);
    map.on("moveend", handleInteractionEnd);
    map.on("dragend", scheduleInteractionEndFallback);
    map.on("zoomend", scheduleInteractionEndFallback);
    map.on("move", markMotion);
    map.on("zoom", markMotion);
    map.on("resize", handleResizeEvent);

    return () => {
      if (touchInput && !embeddedPreview) {
        touchOriginTarget.removeEventListener(
          "pointerdown",
          handlePointerDownCapture,
          true,
        );
        document.removeEventListener(
          "pointermove",
          handlePointerMoveCapture,
          true,
        );
        document.removeEventListener("pointerup", finalizePointerGesture, true);
        document.removeEventListener(
          "pointercancel",
          finalizePointerGesture,
          true,
        );
        touchOriginTarget.removeEventListener(
          "touchstart",
          handleTouchStartCapture,
          true,
        );
        touchOriginTarget.removeEventListener(
          "touchend",
          handleTouchEndOrCancelCapture,
          true,
        );
        touchOriginTarget.removeEventListener(
          "touchcancel",
          handleTouchEndOrCancelCapture,
          true,
        );
        document.removeEventListener(
          "touchmove",
          handleDocumentTouchMoveCapture,
          true,
        );
        document.removeEventListener(
          "touchend",
          handleTouchEndOrCancelCapture,
          true,
        );
        document.removeEventListener(
          "touchcancel",
          handleTouchEndOrCancelCapture,
          true,
        );
      }
      if (!embeddedPreview) {
        mapContainer.style.touchAction = "";
        (
          mapContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehavior = "";
        (
          mapContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehaviorX = "";
        (
          mapContainer.style as CSSStyleDeclaration & {
            overscrollBehavior?: string;
            overscrollBehaviorX?: string;
            overscrollBehaviorY?: string;
          }
        ).overscrollBehaviorY = "";
      }
      if (mapOuterContainer) {
        if (!embeddedPreview) {
          mapOuterContainer.style.touchAction = "";
          (
            mapOuterContainer.style as CSSStyleDeclaration & {
              overscrollBehavior?: string;
              overscrollBehaviorX?: string;
              overscrollBehaviorY?: string;
            }
          ).overscrollBehavior = "";
          (
            mapOuterContainer.style as CSSStyleDeclaration & {
              overscrollBehavior?: string;
              overscrollBehaviorX?: string;
              overscrollBehaviorY?: string;
            }
          ).overscrollBehaviorX = "";
          (
            mapOuterContainer.style as CSSStyleDeclaration & {
              overscrollBehavior?: string;
              overscrollBehaviorX?: string;
              overscrollBehaviorY?: string;
            }
          ).overscrollBehaviorY = "";
        }
      }
      map.off("resize", handleResizeEvent);
      map.off("movestart", handleMoveStart);
      map.off("zoomstart", handleZoomStart);
      map.off("moveend", handleInteractionEnd);
      map.off("dragend", scheduleInteractionEndFallback);
      map.off("zoomend", scheduleInteractionEndFallback);
      map.off("move", markMotion);
      map.off("zoom", markMotion);
      clearInteractionEndFallback();
      disableInteractionLock();
      isMapInteractingRef.current = false;
      if (deferredMarkerRebuildTimeoutRef.current != null) {
        window.clearTimeout(deferredMarkerRebuildTimeoutRef.current);
        deferredMarkerRebuildTimeoutRef.current = null;
      }
      latestCancelCommitResume();
      latestCancelScheduledCameraUpdate();
      cancelPrefetchVisibleMarkerStats();
      resetMarkerRegistry();
      setMarkersLoading(false);
      zoomControlRef.current?.remove();
      zoomControlRef.current = null;
      if (clusterLayerRef.current) {
        clusterLayerRef.current.remove();
        clusterLayerRef.current = null;
      }
      if (basemapLayerRef.current) {
        basemapLayerRef.current.remove();
        basemapLayerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      latestClearHoverState();
    };
  }, [effectiveShowMap, resetMarkerRegistry, initAttemptNonce]);

  React.useEffect(() => {
    if (!effectiveShowMap) return;
    if (mapReady) return;
    if (typeof window === "undefined") return;
    if (initRetryCountRef.current >= 2) return;

    const timeoutId = window.setTimeout(() => {
      if (!effectiveShowMap) return;
      if (mapReady) return;
      if (initRetryCountRef.current >= 2) return;

      initRetryCountRef.current += 1;
      try {
        zoomControlRef.current?.remove();
      } catch {}
      zoomControlRef.current = null;
      try {
        clusterLayerRef.current?.remove();
      } catch {}
      clusterLayerRef.current = null;
      try {
        basemapLayerRef.current?.remove();
      } catch {}
      basemapLayerRef.current = null;
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      resetMarkerRegistry();
      setMarkersLoading(false);
      setMapReady(false);
      setInitAttemptNonce((value) => value + 1);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [effectiveShowMap, mapReady, initAttemptNonce, resetMarkerRegistry]);

  const focusMapToLatLng = React.useCallback(
    (
      latLng: L.LatLngExpression,
      zoom: number,
      options: { animate: boolean; duration?: number },
    ) => {
      const map = mapRef.current;
      if (!map) return;
      const z = Number.isFinite(zoom) ? zoom : (map.getZoom() ?? DEFAULT_ZOOM);
      const anchor = L.latLng(latLng as any);

      const targetCenter: L.LatLngExpression = anchor;

      if (options.animate) {
        map.flyTo(targetCenter, z, { duration: options.duration ?? 0.6 });
      } else {
        map.setView(targetCenter, z, { animate: false });
      }
    },
    [embedded, pathname, smallScreen],
  );

  React.useEffect(() => {
    if (!mapReady || !selectedBeachId || !selectedBeach) return;
    const targetId = pendingAutoCenterRef.current;
    if (!targetId || targetId !== String(selectedBeachId)) return;
    const map = mapRef.current;
    if (!map) return;
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(
      typeof currentZoom === "number" ? currentZoom : AUTO_FOCUS_ZOOM,
      AUTO_FOCUS_ZOOM,
    );
    const center = map.getCenter();
    const targetLatLng = L.latLng(
      Number(selectedBeach.latitude),
      Number(selectedBeach.longitude),
    );
    // If the map already starts on this beach, avoid a redundant recenter pass
    // that can look like the marker "jumps" while overview widgets finish loading.
    const alreadyCentered = center.distanceTo(targetLatLng) < 3;
    const alreadyAtTargetZoom =
      typeof currentZoom === "number" && currentZoom >= targetZoom;
    if (alreadyCentered && alreadyAtTargetZoom) {
      pendingAutoCenterRef.current = null;
      return;
    }
    suppressUserMoveRef.current = true;
    focusMapToLatLng(
      [selectedBeach.latitude, selectedBeach.longitude],
      targetZoom,
      {
        animate: false,
      },
    );
    pendingAutoCenterRef.current = null;
    // ensure corresponding card is visible/selected
    const normalizedId = String(selectedBeach.id);
    document
      .querySelector(`[data-beach-card-id="${normalizedId}"]`)
      ?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [focusMapToLatLng, mapReady, selectedBeach, selectedBeachId]);
  const tryFocusDetail = React.useCallback(
    (detail: MapFocusEventDetail | null): boolean => {
      if (!detail?.beachId) return false;
      const {
        findBeachMatch: latestFind,
        fullMapPage: latestFullPage,
        setShowMap: latestSetShow,
      } = focusContextRef.current;
      const match = latestFind(detail.beachId);
      const map = mapRef.current;
      if (!match || !map) {
        return false;
      }
      if (latestFullPage) {
        latestSetShow(true);
      }
      suppressUserMoveRef.current = true;
      const zoom = Math.max(map.getZoom() ?? AUTO_FOCUS_ZOOM, AUTO_FOCUS_ZOOM);
      focusMapToLatLng([match.latitude, match.longitude], zoom, {
        animate: true,
        duration: 0.6,
      });
      setSelectedBeachId(match.id);
      pendingAutoCenterRef.current = null;
      if (detail.scroll) {
        const container = document.getElementById("map-container");
        if (container) {
          const headerOffset = 100;
          const rect = container.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;
          window.scrollTo({
            top: Math.max(absoluteTop - headerOffset, 0),
            behavior: "smooth",
          });
        }
      }
      return true;
    },
    [focusMapToLatLng],
  );

  React.useEffect(() => {
    const handleFocus = (event: Event) => {
      const detail = (event as CustomEvent<MapFocusEventDetail>).detail ?? null;
      if (!detail) return;
      const handled = tryFocusDetail(detail);
      if (!handled) {
        pendingFocusRef.current = detail;
      }
    };
    window.addEventListener(MAP_FOCUS_EVENT, handleFocus as EventListener);
    return () =>
      window.removeEventListener(MAP_FOCUS_EVENT, handleFocus as EventListener);
  }, [tryFocusDetail]);

  React.useEffect(() => {
    if (!mapReady || !pendingFocusRef.current) return;
    const handled = tryFocusDetail(pendingFocusRef.current);
    if (handled) {
      pendingFocusRef.current = null;
    }
  }, [mapReady, tryFocusDetail]);
  React.useEffect(() => {
    if (!interactionsReady) {
      clearHoverState();
      return;
    }
    if (!hoverCardId) {
      setHoveredMarkerSource("card", null);
      return;
    }
    setHoveredMarkerSource("card", String(hoverCardId));
  }, [hoverCardId, interactionsReady, clearHoverState, setHoveredMarkerSource]);
  React.useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const handlePointerMove = (event: L.LeafletMouseEvent) => {
      const target = event.originalEvent?.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(".ww-leaflet-point-icon") ||
        target.closest(".ww-cluster-inner") ||
        target.closest(".leaflet-popup")
      ) {
        return;
      }
      if (hoverStateRef.current.marker || appliedHoverIdRef.current) {
        clearHoverState();
      }
    };
    map.on("mousemove", handlePointerMove);
    return () => {
      map.off("mousemove", handlePointerMove);
    };
  }, [mapReady, clearHoverState]);
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleLeave = () => {
      clearHoverState();
    };
    container.addEventListener("mouseleave", handleLeave);
    return () => {
      container.removeEventListener("mouseleave", handleLeave);
    };
  }, [clearHoverState, smallScreen]);

  const applyMarkerDiff = React.useCallback(
    (
      group: L.MarkerClusterGroup,
      startTs: number | null,
      buildToken: number,
    ) => {
      cancelMarkerBuild();
      setMarkersLoading(true);

      const groupWithBatch = group as MarkerClusterGroupWithHelpers & {
        addLayers?: (layers: L.Layer[]) => void;
        removeLayers?: (layers: L.Layer[]) => void;
        hasLayer?: (layer: L.Layer) => boolean;
      };

      const registry = markerRegistryRef.current;
      const incomingIds = new Set(
        filteredBeaches.map((beach) => String(beach.id)),
      );

      let removedCount = 0;
      const removedEntries: MarkerEntry[] = [];
      Object.entries(registry).forEach(([id, entry]) => {
        if (incomingIds.has(id)) {
          return;
        }
        removedEntries.push(entry);
        delete registry[id];
        removedCount += 1;
      });

      if (removedEntries.length) {
        const hoveredId = appliedHoverIdRef.current;
        const shouldClearHover =
          hoveredId != null && !incomingIds.has(String(hoveredId));
        const markersToRemove = removedEntries
          .map((entry) => entry.marker)
          .filter(Boolean);
        try {
          if (typeof groupWithBatch.removeLayers === "function") {
            groupWithBatch.removeLayers(markersToRemove);
          } else {
            markersToRemove.forEach((marker: L.Marker) => {
              group.removeLayer(marker);
            });
          }
        } catch {
          markersToRemove.forEach((marker: L.Marker) => {
            try {
              if (
                typeof groupWithBatch.hasLayer !== "function" ||
                groupWithBatch.hasLayer(marker)
              ) {
                group.removeLayer(marker);
              }
            } catch {
              // ignore removal errors; marker will be detached during map teardown
            }
          });
        }

        removedEntries.forEach((entry) => {
          try {
            entry.marker.off();
          } catch {
            // ignore listener cleanup errors
          }
          try {
            entry.marker.remove();
          } catch {
            // ignore removal errors
          }
        });

        if (shouldClearHover) {
          clearHoverState();
        }
      }

      const job: MarkerBuildJob = {
        token: buildToken,
        raf: null,
        index: 0,
        startTs,
        removedCount,
        addedCount: 0,
        updatedCount: 0,
        nextStatsFallbackIds: new Set<string>(),
      };

      markerBuildJobRef.current = job;

      const addMarkers = (markers: L.Marker[]) => {
        if (!markers.length) return;
        try {
          if (typeof groupWithBatch.addLayers === "function") {
            groupWithBatch.addLayers(markers);
          } else {
            markers.forEach((marker) => group.addLayer(marker));
          }
        } catch {
          markers.forEach((marker) => {
            try {
              group.addLayer(marker);
            } catch {
              // ignore transient add errors; next rebuild will reconcile
            }
          });
        }
      };

      const step = () => {
        const active = markerBuildJobRef.current;
        if (!active || active.token !== buildToken) return;
        if (markerBuildTokenRef.current !== buildToken) {
          markerBuildJobRef.current = null;
          setMarkersLoading(false);
          return;
        }

        active.raf = null;

        const supportsPerformance = typeof performance !== "undefined";
        const frameStart = supportsPerformance ? performance.now() : Date.now();
        const markersToAdd: L.Marker[] = [];
        const frameStartIndex = active.index;

        while (active.index < filteredBeaches.length) {
          const beach = filteredBeaches[active.index];
          active.index += 1;

          const id = String(beach.id);
          const ctx = statsContextRef.current;
          const snapshot =
            ctx.getStatsSnapshot(
              String(beach.id),
              ctx.statsDateKey,
              ctx.statsHourKey,
            ) ?? null;
          const dailyStats = extractDailySurfWindStats(snapshot);
          const surfRepFt = parseSurfRepresentativeFt(
            dailyStats.surfHeight ?? representativeSurfRangeLabel(snapshot?.current ?? null),
          );

          const favorite = favoriteSet.has(id);
          const existing = registry[id];
          if (existing) {
            const iconIntensity =
              surfRepFt != null ? surfRepFt : existing.intensity;
            if (surfRepFt == null) {
              active.nextStatsFallbackIds.add(id);
            }
            let changed = false;
            if (existing.intensity !== iconIntensity) {
              existing.intensity = iconIntensity;
              changed = true;
            }
            if (existing.favorite !== favorite) {
              existing.favorite = favorite;
              changed = true;
            }
            if (changed) {
              const markerWithMeta = existing.marker as MarkerWithMeta;
              markerWithMeta.options.wwIntensity = iconIntensity;
              const hoveredId = appliedHoverIdRef.current;
              refreshMarkerIcon(existing, hoveredId === id);
              active.updatedCount += 1;
            }
            try {
              if (
                typeof groupWithBatch.hasLayer !== "function" ||
                !groupWithBatch.hasLayer(existing.marker)
              ) {
                markersToAdd.push(existing.marker);
              }
            } catch {
              markersToAdd.push(existing.marker);
            }
          } else {
            const iconIntensity = surfRepFt != null ? surfRepFt : 0;
            if (surfRepFt == null) {
              active.nextStatsFallbackIds.add(id);
            }
            const marker = L.marker(
              [Number(beach.latitude), Number(beach.longitude)],
              {
                icon: createMarkerIcon({
                  intensity: iconIntensity,
                  favorite,
                  selected:
                    selectedBeachId != null &&
                    String(selectedBeachId) === String(beach.id),
                }),
                keyboard: false,
                bubblingMouseEvents: false,
                wwIntensity: iconIntensity,
                wwBeachId: id,
              } as MarkerOptionsWithMeta,
            );

            const entry: MarkerEntry = {
              marker,
              beach,
              intensity: iconIntensity,
              favorite,
            };
            registry[id] = entry;
            ensureMarkerPopup(entry, supportsTouchInput());

            const handleClick = (e: L.LeafletMouseEvent) => {
              if (!interactionsReadyRef.current) return;
              const fromCluster = Boolean((e as any)?.wwFromCluster);
              if (
                !fromCluster &&
                shouldIgnoreTouchActivation(e.originalEvent ?? null)
              ) {
                return;
              }
              const treatAsTouch = supportsTouchInput()
                ? true
                : e.originalEvent
                  ? isTouchInteraction(e.originalEvent)
                  : false;
              if (treatAsTouch) {
                if (e.originalEvent) {
                  e.originalEvent.preventDefault?.();
                  L.DomEvent.stopPropagation(e.originalEvent);
                }
                clearHoverState();
                const prefetch = ensureStatsForBeachId(beach.id);
                ensureMarkerPopup(entry, true);
                openMarkerPopup(marker);
                setHoveredMarkerSource("marker", String(beach.id));
                prefetch?.then?.(() => ensureMarkerPopup(entry, true));
                const map = mapRef.current;
                if (map?.dragging) {
                  window.requestAnimationFrame(() => {
                    map.dragging.disable();
                    map.dragging.enable();
                  });
                }
                return;
              }
              const normalizedId = String(beach.id);
              setSelectedBeachId(beach.id);
              pendingAutoCenterRef.current = normalizedId;
              ensureMarkerPopup(entry, false);
              openMarkerPopup(marker);
              const destination = `${generateBeachUrl(
                beach.name,
                beach.id,
              )}/overview`;

              // Check if Ctrl/Cmd+Click to open in new tab
              if (
                e.originalEvent &&
                (e.originalEvent.ctrlKey || e.originalEvent.metaKey)
              ) {
                window.open(destination, "_blank", "noopener,noreferrer");
                return;
              }

              if (router) {
                setNavigationPending(true);
                syncNavigationPendingBody(true);
                if (!interactionLockReleaseRef.current) {
                  navigationPendingLockRef.current = true;
                }
                enableInteractionLock();
                router.push(destination);
              }
            };
            const handleMouseOver = (event?: { originalEvent?: Event }) => {
              if (isTouchInteraction(event?.originalEvent)) return;
              setHoveredMarkerSource("marker", String(beach.id));
            };
            marker.on("click", handleClick);
            marker.on("mouseover", handleMouseOver);
            marker.on("add", () => ensureMarkerDomGuards(marker));
            marker.on("remove", () => {
              const markerWithState = marker as MarkerWithMeta;
              const state = markerWithState._wwDomGuardsState;
              if (!state?.element || !state.preventDragStart) {
                return;
              }
              state.element.removeEventListener(
                "dragstart",
                state.preventDragStart,
                true,
              );
              state.element = null;
              state.preventDragStart = null;
              markerWithState._wwDomGuardsState = state;
            });

            markersToAdd.push(marker);
            active.addedCount += 1;
          }

          const elapsed =
            (supportsPerformance ? performance.now() : Date.now()) - frameStart;
          const processed = active.index - frameStartIndex;
          if (
            (elapsed >= MARKER_BUILD_FRAME_BUDGET_MS && processed > 0) ||
            markersToAdd.length >= MARKER_BUILD_MIN_BATCH
          ) {
            break;
          }
        }

        addMarkers(markersToAdd);

        if (active.index < filteredBeaches.length) {
          active.raf = window.requestAnimationFrame(step);
          return;
        }

        statsFallbackIdsRef.current = active.nextStatsFallbackIds;
        if (active.updatedCount > 0) {
          try {
            group.refreshClusters();
          } catch {
            // ignore refresh errors
          }
        }
        logLeafletPerf(
          `marker-rebuild add=${active.addedCount} update=${
            active.updatedCount
          } remove=${active.removedCount} total=${
            Object.keys(markerRegistryRef.current).length
          }`,
          active.startTs,
        );

        markerBuildJobRef.current = null;
        if (markerBuildTokenRef.current === buildToken) {
          setMarkersLoading(false);
        }
      };

      step();
    },
    [
      cancelMarkerBuild,
      ensureMarkerDomGuards,
      favoriteSet,
      filteredBeaches,
      refreshMarkerIcon,
      router,
      smallScreen,
      selectedBeachId,
      setMarkersLoading,
      setHoveredMarkerSource,
      setSelectedBeachId,
      surfIntensity,
      clearHoverState,
      ensureMarkerPopup,
      ensureStatsForBeachId,
      getDesktopPopupContent,
      getTouchPopupContent,
      openMarkerPopup,
    ],
  );

  React.useEffect(() => {
    const group = clusterLayerRef.current;
    if (!group || !mapReady) return;
    if (!rebuildMarkersRef.current) return;
    rebuildMarkersRef.current = false;
    const buildToken = markerBuildTokenRef.current;
    const startTs =
      typeof performance !== "undefined" ? performance.now() : null;
    applyMarkerDiff(group, startTs, buildToken);
  }, [mapReady, applyMarkerDiff, markerRevision]);
  React.useEffect(() => {
    if (!mapReady) return;
    schedulePrefetchVisibleMarkerStats();
  }, [mapReady, markerRevision, schedulePrefetchVisibleMarkerStats]);

  React.useEffect(() => {
    if (!mapReady) return;
    requestMarkerRebuild();
    schedulePrefetchVisibleMarkerStats();
  }, [
    mapReady,
    statsDateKey,
    statsHourKey,
    requestMarkerRebuild,
    schedulePrefetchVisibleMarkerStats,
  ]);

  React.useEffect(() => {
    if (!mapReady) return;
    const hoveredId = appliedHoverIdRef.current;
    if (!hoveredId) return;
    const entry = markerRegistryRef.current[hoveredId];
    if (!entry) return;
    ensureMarkerPopup(entry);
  }, [
    mapReady,
    statsVersion,
    statsDateKey,
    statsHourKey,
    surfIntensity,
    ensureMarkerPopup,
  ]);

  React.useEffect(() => {
    if (!mapReady) return;
    const fallbackIds = statsFallbackIdsRef.current;
    if (!fallbackIds.size) return;
    const group = clusterLayerRef.current;
    const ctx = statsContextRef.current;
    const hoveredId = appliedHoverIdRef.current;
    let didUpdate = false;
    fallbackIds.forEach((id) => {
      const entry = markerRegistryRef.current[id];
      if (!entry) return;
      const snapshot =
        ctx.getStatsSnapshot(
          String(entry.beach.id),
          ctx.statsDateKey,
          ctx.statsHourKey,
        ) ?? null;
      const dailyStats = extractDailySurfWindStats(snapshot);
      const surfRepFt = parseSurfRepresentativeFt(
        dailyStats.surfHeight ?? representativeSurfRangeLabel(snapshot?.current ?? null),
      );
      const iconIntensity = surfRepFt != null ? surfRepFt : entry.intensity;
      if (entry.intensity === iconIntensity) {
        if (hoveredId === id) {
          ensureMarkerPopup(entry);
        }
        return;
      }
      entry.intensity = iconIntensity;
      const markerWithMeta = entry.marker as MarkerWithMeta;
      markerWithMeta.options.wwIntensity = iconIntensity;
      refreshMarkerIcon(entry, hoveredId === id);
      didUpdate = true;
      if (hoveredId === id) {
        ensureMarkerPopup(entry);
      }
    });
    if (didUpdate && group) {
      try {
        group.refreshClusters();
      } catch {
        // ignore refresh errors
      }
    }
  }, [
    mapReady,
    statsVersion,
    statsDateKey,
    statsHourKey,
    refreshMarkerIcon,
    ensureMarkerPopup,
  ]);
  React.useEffect(() => {
    const hoveredId = appliedHoverIdRef.current;
    Object.values(markerRegistryRef.current).forEach((entry) => {
      refreshMarkerIcon(entry, hoveredId === String(entry.beach.id));
    });
  }, [selectedBeachId, refreshMarkerIcon]);
  React.useEffect(() => {
    const group =
      clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
    if (!group || !mapReady) return;
    const handleClusterOver = (event: ClusterEvent) => {
      if (!interactionsReadyRef.current) return;
      if (isTouchInteraction(event.originalEvent)) return;
      updateClusterHighlight(event.layer ?? null);
    };
    const handleClusterOut = () => {
      if (!interactionsReadyRef.current) return;
      updateClusterHighlight(null);
    };
    const handleClusterClick = (event: ClusterEvent) => {
      event?.originalEvent?.preventDefault?.();
      event?.originalEvent?.stopPropagation?.();
      if (shouldIgnoreTouchActivation(event.originalEvent ?? null)) return;
      const map = mapRef.current;
      if (!map) return;
      const layer = event.layer;
      if (!layer) return;
      if (!group?._map) return;

      const markers: L.Marker[] =
        typeof layer.getAllChildMarkers === "function"
          ? (() => {
              try {
                return layer.getAllChildMarkers() as L.Marker[];
              } catch {
                return [];
              }
            })()
          : [];
      if (markers.length === 1) {
        suppressUserMoveRef.current = true;
        const target = markers[0];
        let latLng: L.LatLng;
        try {
          latLng = target.getLatLng();
        } catch {
          return;
        }
        map.flyTo(
          latLng,
          Math.min(map.getMaxZoom(), Math.max(map.getZoom(), 13)),
          {
            duration: 0.35,
          },
        );
        const fireWhenVisible = (attempt: number) => {
          const activeGroup =
            clusterLayerRef.current as MarkerClusterGroupWithHelpers | null;
          if (!activeGroup || !activeGroup._map) return;
          const visible =
            typeof activeGroup.getVisibleParent !== "function"
              ? true
              : (() => {
                  try {
                    return activeGroup.getVisibleParent(target) === target;
                  } catch {
                    return false;
                  }
                })();
          if (!visible) {
            if (attempt < 4) {
              window.setTimeout(() => fireWhenVisible(attempt + 1), 120);
            }
            return;
          }
          (target as unknown as L.Evented).fire("click", {
            originalEvent: event.originalEvent,
            wwFromCluster: true,
          });
        };
        window.setTimeout(() => fireWhenVisible(0), 360);
        return;
      }
      const bounds = (() => {
        try {
          return layer.getBounds?.();
        } catch {
          return null;
        }
      })();
      if (bounds) {
        suppressUserMoveRef.current = true;
        try {
          map.flyToBounds(bounds, {
            padding: [60, 60],
            maxZoom: Math.min(map.getMaxZoom(), map.getZoom() + 2),
            duration: 0.35,
          });
        } catch {
          // ignore cluster plugin race conditions
        }
      }
    };
    group.on("clustermouseover", handleClusterOver);
    group.on("clustermouseout", handleClusterOut);
    group.on("clusterclick", handleClusterClick);
    return () => {
      group.off("clustermouseover", handleClusterOver);
      group.off("clustermouseout", handleClusterOut);
      group.off("clusterclick", handleClusterClick);
    };
  }, [mapReady, updateClusterHighlight, smallScreen]);

  const legendInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (legendInitializedRef.current) return;
    if (fullMapPage && !previewUi) {
      legendInitializedRef.current = true;
      setLegendOpen(true);
    }
  }, [fullMapPage, previewUi, setLegendOpen]);
  const filterCount = filters.size;

  const overlayButtonBase = cn(
    "inline-flex items-center justify-center rounded-full border p-3",
    "border-border/55 bg-background/70 text-foreground backdrop-blur-md",
    "dark:border-border/35 dark:bg-highlight-4/60",
    "transition-colors duration-200 motion-reduce:transition-none",
    "hover:border-border/70 hover:bg-sky-200/80",
    "dark:hover:border-border/45 dark:hover:bg-sky-300/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0",
    "active:scale-[0.98] motion-reduce:transform-none",
  );

  const overlayButtonActive = cn(
    "bg-sky-200/80 border-sky-300/70 text-sky-950",
    "dark:bg-sky-600/40 dark:border-sky-300/35 dark:text-sky-50",
  );
  const mobileViewportHeight =
    "calc(var(--ww-100vh, 100dvh) + env(safe-area-inset-top, 0px) - 4.25rem - max(env(safe-area-inset-bottom, 0px), var(--ww-bottom-ui, 0px)))";
  const desktopViewportHeight =
    "calc(var(--ww-100vh, 100dvh) - 8rem - max(env(safe-area-inset-bottom, 0px), var(--ww-bottom-ui, 0px)))";
  const wrapperHeight = embedded
    ? null
    : smallScreen
      ? {
          minHeight: mobileViewportHeight,
          height: mobileViewportHeight,
        }
      : {
          minHeight: `min(28rem, ${desktopViewportHeight})`,
          height: desktopViewportHeight,
          maxHeight: desktopViewportHeight,
        };
  if (navigationPending) {
    return (
      <aside
        id="map-container"
        className={
          embedded
            ? previewUi
              ? "touch-pan-y relative flex h-full w-full"
              : "touch-none relative flex h-full w-full"
              : cn(
                  "touch-none overscroll-none fixed z-0 w-full mx-auto max-w-screen max-[911px]:pr-[var(--ww-scroll-lock-pad-right)] transition-[transform,opacity] duration-300",
                  "@min-4xl:box-border @min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(var(--ww-100vh,100dvh)-8rem-max(env(safe-area-inset-bottom,0px),var(--ww-bottom-ui,0px)))] flex",
                )
          }
        data-ww-embed-preview={embedded && previewUi ? "true" : undefined}
        style={
          !embedded ? (wrapperHeight ?? undefined) : undefined
        }
      >
        <div
          className="flex w-full h-full items-center justify-center text-sm text-muted-foreground"
          style={{
            borderRadius: embedded ? "0px" : isDesktop ? "18px" : "0px",
            boxShadow: embedded ? "none" : "0px 0px 5px rgba(0, 0, 0, 0.2)",
            background: "var(--highlight-5)",
            overflow: "hidden",
          }}
        >
          Preparing map…
        </div>
      </aside>
    );
  }

  if (!embedded && (editPage || (isDesktop && fullMapPage && !showMap))) {
    return null;
  }

  return (
    <aside
      id="map-container"
      className={
        embedded
          ? previewUi
            ? "touch-pan-y relative flex h-full w-full"
            : "touch-none overscroll-contain relative flex h-full w-full"
              : cn(
                  "touch-none overscroll-contain fixed z-0 w-full mx-auto max-w-screen max-[911px]:pr-[var(--ww-scroll-lock-pad-right)] transition-[transform,opacity] duration-300",
                  "@min-4xl:box-border @min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(var(--ww-100vh,100dvh)-8rem-max(env(safe-area-inset-bottom,0px),var(--ww-bottom-ui,0px)))] flex",
                )
      }
      data-ww-embed-preview={embedded && previewUi ? "true" : undefined}
      style={
        !embedded ? (wrapperHeight ?? undefined) : undefined
      }
    >
      <div
        className={cn(
          "relative w-full h-full",
          !embedded && "@min-4xl:rounded-[18px]",
        )}
        style={{
          boxShadow: embedded ? "none" : "0px 0px 5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          className={
            embedded && previewUi
              ? "touch-pan-y"
              : "touch-none overscroll-contain"
          }
          style={{
            width: "100%",
            height: "100%",
          }}
        />
        {!embedded && !showMap && fullMapPage && isDesktop && (
          <div className="absolute inset-0 z-[600] bg-black/70 backdrop-blur-md" />
        )}
        {mapLoadingOverlayActive && (
          <div
            className="pointer-events-none absolute inset-0 z-[900] bg-background/35 supports-[backdrop-filter]:bg-background/20 supports-[backdrop-filter]:backdrop-blur-xs"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/15 to-background/40" />
          </div>
        )}
        {/* {showUpdateBanner && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[650] -translate-x-1/2">
            <div className="rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
              {viewportStatus === "loading"
                ? "Updating map."
                : "Refreshing area."}
            </div>
          </div>
        )} */}
        {!previewUi && showLoadingPillStable && (
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 z-[1200] -translate-x-1/2",
              fullMapPage ? "top-21 @min-4xl:top-3" : "top-3",
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-border/60 border-t-sky-500 motion-reduce:animate-none" />
              {loadingPillLabel}
            </div>
          </div>
        )}
        {!previewUi && (showMap || smallScreen) && (
          <div
            className={cn(
              "absolute left-3 z-[1000] flex flex-col gap-3 transition-opacity duration-200",
              fullMapPage ? "top-21" : "top-3",
              "@min-4xl:top-3",
            )}
            style={{
              opacity: mapReady ? 1 : 0,
              pointerEvents: mapReady ? "auto" : "none",
            }}
          >
            {fullMapPage && (
              <button
                type="button"
                aria-label="Refocus map on selected beach"
                title="Refocus map on selected beach"
                disabled={!selectedBeachId || refocusDisabled}
                className={cn(
                  overlayButtonBase,
                  "text-sm font-medium",
                  (!selectedBeachId || refocusDisabled) &&
                    "opacity-50 cursor-not-allowed",
                )}
                onClick={() => {
                  if (!selectedBeachId) return;
                  const handled = tryFocusDetail({
                    beachId: selectedBeachId,
                    scroll: false,
                  });
                  if (!handled) {
                    pendingFocusRef.current = {
                      beachId: selectedBeachId,
                      scroll: false,
                    };
                  }
                }}
              >
                <MapPin className="w-5 h-5 mx-auto" />
              </button>
            )}
            <button
              type="button"
              aria-label="toggle filters"
              title="Toggle filters"
              onClick={() => togglePanel("filters")}
              className={cn(
                overlayButtonBase,
                "relative text-sm font-medium",
                openPanel === "filters" && overlayButtonActive,
                !fullMapPage && "block @min-4xl:hidden",
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
                  overlayButtonBase,
                  "text-sm font-medium",
                  legendOpen && overlayButtonActive,
                )}
              >
                <Info className="w-5 h-5 mx-auto" />
              </button>
            )}
            {fullMapPage && isDesktop && (
              <button
                type="button"
                aria-label="open map"
                title="Open map"
                className={cn(overlayButtonBase, "text-sm font-medium")}
                onClick={() => {
                  if (openPanel) setOpenPanel(null);
                  if (legendOpen) setLegendOpen(false);
                  let target = "/beaches";
                  try {
                    if (typeof window !== "undefined") {
                      const tab = window.localStorage.getItem("tab:/beaches");
                      if (tab === "saved") target = "/beaches?tab=saved";
                    }
                  } catch {}
                  router.push(target);
                }}
              >
                <MapIcon className="w-5 h-5 mx-auto" />
              </button>
            )}
          </div>
        )}
        {showChrome && !fullMapPage && (
          <button
            type="button"
            aria-label="select date"
            title="Select date"
            onClick={() => togglePanel("date")}
            className={cn(
              "z-[1000] absolute left-3 top-17 @min-4xl:top-auto @min-4xl:bottom-25",
              overlayButtonBase,
              "text-sm font-medium",
              openPanel === "date" && overlayButtonActive,
            )}
          >
            <CalendarDays className="w-5 h-5 mx-auto" />
          </button>
        )}
        {showChrome && !fullMapPage && (
          <button
            type="button"
            aria-label="Zoom to California view"
            title="Zoom to California view"
            onClick={handleZoomToCaliforniaView}
            className={cn(
              "z-[1000] absolute left-3 top-[7.8rem] @min-4xl:top-auto @min-4xl:bottom-[13.75rem]",
              overlayButtonBase,
              "text-sm font-medium",
            )}
          >
            <ZoomOut className="w-5 h-5 mx-auto" />
          </button>
        )}
        {showChrome && !fullMapPage && (
          <button
            type="button"
            aria-label="Zoom to nearby beaches"
            title="Zoom to nearby beaches"
            onClick={handleZoomToNearby}
            disabled={!canRequestLocation}
            className={cn(
              "z-[1000] absolute left-3 top-[11.4rem] @min-4xl:top-auto @min-4xl:bottom-[10rem]",
              overlayButtonBase,
              "text-sm font-medium",
              !canRequestLocation && "opacity-50 cursor-not-allowed",
            )}
          >
            <Locate className="w-5 h-5 mx-auto" />
          </button>
        )}
        {showChrome && fullMapPage && isDesktop && (
          <button
            type="button"
            aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
            title={`${showMap ? "Minimize" : "Maximize"} map`}
            className={cn(
              "z-[1000] absolute left-3 bottom-3",
              overlayButtonBase,
              "text-sm font-medium",
            )}
            onClick={() => {
              if (openPanel && openPanel !== "legend") setOpenPanel(null);
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
        {!previewUi && !fullMapPage && openPanel === "date" && (
          <MapDateOverlay
            selectedDate={effectiveStatsDate}
            onSelectDate={handleMapDateSelect}
            onClose={() => setOpenPanel(null)}
            disableBlur={false}
          />
        )}
        {!previewUi && fullMapPage && legendOpen && (
          <LegendPanel onClose={() => setLegendOpen(false)} disableBlur={false} />
        )}
        {!previewUi &&
          mapReady &&
          selectedBeach &&
          overlayAnchor &&
          swellDirections && (
            <SelectedBeachOverlay
              key={layoutVersion}
              mapRef={mapRef}
              anchor={overlayAnchor}
              selected={selectedBeach}
              swellDirections={swellDirections}
              windDirection={windDirection}
              overlayLabels={overlayLabels}
              legendOpen={legendOpen}
              compact={smallScreen === true}
              mapReady={mapReady}
              overlayPane={OVERLAY_PANE_ID}
              layoutVersion={layoutVersion}
            />
          )}
        {!previewUi && !fullMapPage && (
          <PageTabs
            buttons={false}
            tabs={["nearby", "saved"]}
            defaultPage="nearby"
            beachPage
            loggedIn={loggedIn}
          />
        )}
        <style jsx global>{`
          .ww-leaflet-point-icon {
            cursor: pointer;
            touch-action: none;
          }
          .ww-leaflet-cluster-icon {
            cursor: pointer;
            transition:
              transform 140ms ease,
              filter 140ms ease;
            touch-action: none;
          }
          .ww-cluster-inner {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.9);
            box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
            isolation: isolate;
          }
          .ww-cluster-core {
            position: absolute;
            inset: var(--ww-cluster-inset, 3px);
            border-radius: 999px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: var(--highlight-7);
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 12px 22px rgba(15, 23, 42, 0.12);
            color: var(--foreground);
          }
          .ww-cluster-count {
            font-size: 12px;
            font-weight: 600;
            line-height: 1;
            letter-spacing: -0.02em;
            transform: translateY(0.5px);
            font-family:
              var(--font-poppins),
              ui-sans-serif,
              system-ui,
              -apple-system,
              "Segoe UI",
              Roboto,
              Helvetica,
              Arial;
          }
          .ww-cluster-count[data-digits="3"] {
            font-size: 12px;
          }
          .ww-cluster-count[data-digits="4"] {
            font-size: 12px;
          }
          .ww-cluster-dots {
            display: flex;
            gap: 3px;
            align-items: center;
            justify-content: center;
          }
          .ww-cluster-dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.85);
          }
          .ww-leaflet-cluster-icon.ww-cluster-hovered {
            transform: translateZ(0) scale(1.12);
            filter: saturate(1.05) brightness(1.02);
            border: none;
            border-radius: 999px;
          }
          .ww-leaflet-cluster-icon.ww-cluster-hovered .ww-cluster-inner {
            border: 1px solid rgba(191, 219, 254, 0.95);
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
          }
          .ww-leaflet-cluster-icon.ww-cluster-hovered .ww-cluster-inner::after {
            content: "";
            position: absolute;
            inset: -10px;
            border-radius: 999px;
            background: rgba(37, 99, 235, 0.2);
            z-index: -1;
            animation: ww-cluster-pulse 1.6s ease-out infinite;
          }
          @keyframes ww-cluster-pulse {
            0% {
              opacity: 0.65;
              transform: scale(0.7);
            }
            70% {
              opacity: 0;
              transform: scale(1.2);
            }
            100% {
              opacity: 0;
              transform: scale(1.2);
            }
          }
          .ww-leaflet-popup {
            min-width: 210px;
            max-width: 210px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-family:
              var(--font-poppins),
              ui-sans-serif,
              system-ui,
              -apple-system,
              "Segoe UI",
              Roboto,
              Helvetica,
              Arial;
          }
          .ww-leaflet-popup__metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .ww-leaflet-popup__header {
            display: flex;
            gap: 6px;
            align-items: center;
          }
          .ww-leaflet-popup__dot {
            min-width: 7px;
            height: 30px;
            border-radius: 999px;
            display: inline-block;
          }
          .ww-leaflet-popup__titles {
            overflow: hidden;
            white-space: nowrap;
          }
          .ww-leaflet-popup__titles strong {
            font-size: 0.9rem;
            color: var(--foreground);
            line-height: 1.2;
            display: block;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          .ww-leaflet-popup__titles span {
            font-size: 0.75rem;
            color: var(--muted-foreground);
            display: block;
          }
          .ww-leaflet-popup__metric {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 6px 7px;
            border-radius: 14px;
            background: var(--highlight-5);
            min-width: 0;
          }
          .ww-leaflet-popup__icon {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            background: rgba(223, 236, 255, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2563eb;
            border: 1px solid rgba(148, 163, 184, 0.5);
          }
          .ww-leaflet-popup__metric-text {
            display: flex;
            flex-direction: column;
            line-height: 1.4;
          }
          .ww-leaflet-popup__metric-text strong {
            font-size: 0.8rem;
            color: var(--foreground);
            font-weight: 600;
          }
          .ww-leaflet-popup__metric-text strong span {
            font-size: 0.65rem;
            font-weight: 400;
            margin-left: 4px;
            color: var(--muted-foreground);
          }
          .ww-leaflet-popup__wind-arrow {
            display: inline-block;
            transform-origin: center;
          }
          .ww-leaflet-popup__metric-text span {
            font-size: 0.75rem;
            color: var(--muted-foreground);
          }
          .ww-leaflet-popup__placeholder {
            display: inline-block;
            height: 1em;
            border-radius: 999px;
            background: linear-gradient(
              120deg,
              rgba(148, 163, 184, 0.25) 0%,
              rgba(148, 163, 184, 0.6) 45%,
              rgba(148, 163, 184, 0.25) 100%
            );
            background-size: 180% 100%;
            animation: ww-leaflet-popup-shimmer 1.2s ease-in-out infinite;
            vertical-align: middle;
          }
          .ww-leaflet-popup__placeholder--wide {
            width: 4.2ch;
          }
          .ww-leaflet-popup__placeholder--medium {
            width: 3.2ch;
          }
          @keyframes ww-leaflet-popup-shimmer {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: -180% 50%;
            }
          }
          .ww-leaflet-popup__wind-arrow {
            display: inline-flex;
            margin-left: 2px;
            width: 0.8rem;
            height: 0.8rem;
            align-items: center;
            justify-content: center;
            transform-origin: center;
            color: var(--foreground);
            vertical-align: -2px;
          }
          .ww-leaflet-popup__wind-arrow svg {
            width: 100%;
            height: 100%;
            transform-origin: center;
            transform-box: fill-box;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 10px;
            background: var(--background);
          }
          .leaflet-popup .leaflet-popup-tip {
            background: var(--background);
          }
          .leaflet-pane.leaflet-marker-pane {
            z-index: 720 !important;
          }
          .leaflet-pane.leaflet-popup-pane {
            /* Keep popups above overlay UI (tabs/buttons/loading). */
            z-index: 2500 !important;
          }
          .leaflet-popup {
            transform: translate3d(0, -14px, 0);
            pointer-events: none;
          }
          #map-container:not([data-ww-embed-preview="true"]) .leaflet-container,
          #map-container:not([data-ww-embed-preview="true"])
            .leaflet-container
            * {
            touch-action: none;
            overscroll-behavior: contain;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip {
            pointer-events: none;
          }
          .leaflet-popup.ww-touch-popup {
            pointer-events: none;
            font-family:
              var(--font-poppins),
              ui-sans-serif,
              system-ui,
              -apple-system,
              "Segoe UI",
              Roboto,
              Helvetica,
              Arial;
          }
          .leaflet-popup.ww-touch-popup .leaflet-popup-content-wrapper,
          .leaflet-popup.ww-touch-popup .leaflet-popup-tip {
            pointer-events: none;
          }
          .leaflet-popup.ww-touch-popup .ww-touch-popup__actions,
          .leaflet-popup .ww-touch-popup__actions {
            display: flex;
            margin-top: 8px;
          }
          .leaflet-popup.ww-touch-popup .ww-touch-popup__open,
          .leaflet-popup .ww-touch-popup__open,
          .leaflet-popup [data-ww-touch-open="true"] {
            pointer-events: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
            padding: 8px 12px;
            border-radius: 14px;
            background: var(--highlight-4);
            border: 1px solid rgba(148, 163, 184, 0.5);
            color: var(--foreground);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
          }
          .leaflet-popup.ww-touch-popup .ww-touch-popup__open:focus,
          .leaflet-popup .ww-touch-popup__open:focus,
          .leaflet-popup [data-ww-touch-open="true"]:focus {
            outline: none;
          }
          .leaflet-popup.ww-touch-popup .ww-touch-popup__open:focus-visible,
          .leaflet-popup .ww-touch-popup__open:focus-visible,
          .leaflet-popup [data-ww-touch-open="true"]:focus-visible {
            box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.35);
          }
          @media (prefers-reduced-motion: reduce) {
            .ww-leaflet-cluster-icon,
            .ww-leaflet-cluster-icon.ww-cluster-hovered {
              transition: none !important;
            }
            .ww-leaflet-cluster-icon.ww-cluster-hovered
              .ww-cluster-inner::after {
              animation: none !important;
            }
            .leaflet-popup {
              transform: none !important;
            }
          }
          .leaflet-control-zoom {
            border: none;
            background: transparent;
          }
          .leaflet-control-zoom a {
            width: 34px;
            height: 34px;
            margin: 4px 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 1rem;
            color: var(--foreground);
            background: transparent !important;
            border: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            transition:
              color 140ms ease,
              box-shadow 140ms ease,
              opacity 140ms ease;
            text-decoration: none !important;
            cursor: pointer;
            position: relative;
            outline: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
          .leaflet-control-zoom a:focus {
            outline: none;
          }
          .leaflet-control-zoom a:focus:not(:focus-visible) {
            box-shadow: none;
          }
          .leaflet-control-zoom a:not(.is-disabled):hover {
            color: var(--muted-foreground);
            outline: none;
          }
          @media (hover: none) {
            .leaflet-control-zoom a:not(.is-disabled):hover {
              color: var(--foreground);
            }
          }
          .leaflet-control-zoom a:not(.is-disabled):focus-visible {
            color: var(--foreground);
            box-shadow: 0 0 0 2px
              color-mix(in oklch, var(--foreground) 20%, transparent) !important;
          }
          .leaflet-control-zoom a + a::before {
            content: "";
            position: absolute;
            top: -1px;
            left: 10%;
            right: 10%;
            height: 1px;
            background: rgba(148, 163, 184, 0.6);
            opacity: 0.85;
          }
          .leaflet-control-zoom a.is-disabled,
          .leaflet-control-zoom a.leaflet-disabled {
            opacity: 0.45;
            cursor: not-allowed;
            pointer-events: none;
            box-shadow: none;
          }
        `}</style>
      </div>
    </aside>
  );
};

export default React.memo(LeafletMap);
const resolveSurfIntensity = (
  source: Record<string | number, number>,
  beach: BeachPoint,
) => {
  const normalizeKeys: Array<string | number | null> = [
    beach.id,
    beach.id != null ? String(beach.id) : null,
    beach.id != null ? Number(beach.id) : null,
    beach.grid_id ?? null,
    beach.grid_id != null ? String(beach.grid_id) : null,
    beach.grid_id != null ? Number(beach.grid_id) : null,
  ];
  for (const key of normalizeKeys) {
    if (key == null || key === "") continue;
    const value = source[key as keyof typeof source];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};
