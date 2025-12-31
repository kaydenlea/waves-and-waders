"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";
import {
  FEATURE_CATEGORIES,
  getFeatureDisplayName,
  generateBeachSlug,
  generateBeachUrl,
  extractBeachId,
} from "@/lib/supabase";
import type { BeachPoint } from "@/components/context/MapFilterContext";
import { useMapFilters } from "@/components/context/MapFilterContext";
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
import {
  SlidersHorizontal,
  Info,
  MapPin,
  ArrowRightFromLine,
  Minimize2,
  MapIcon,
  CalendarDays,
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
  setMapInteractionCamera,
  setMapInteractionHover,
  setMapInteractionSelection,
} from "@/lib/mapInteractionStore";

type Props = {
  beachId?: string | number;
  loggedIn?: boolean;
  initialBeach?: BeachPoint | null;
};

const DEFAULT_TILE_URL =
  process.env.NEXT_PUBLIC_BASEMAP_TILE_URL ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  process.env.NEXT_PUBLIC_BASEMAP_ATTRIBUTION ??
  "\u00A9 OpenStreetMap contributors";
const DEFAULT_CENTER: [number, number] = [37.8, -122.4];
const DEFAULT_ZOOM = 6;
const MAP_VIEW_STORAGE_KEY = "ww:last-map-view";
const LAST_SELECTION_KEY = "ww:last-selected-beach";
const LAST_SELECTION_CENTER_KEY = "ww:last-selected-center";
const CAMERA_MIN_INTERVAL = 120;
const COMMIT_IDLE_DELAY = 180;
const RESIZE_SETTLE_DELAY = 180;
const BOUNDS_DELTA_THRESHOLD = 0.0005;
const MARKER_BUILD_FRAME_BUDGET_MS = 10;
const MARKER_BUILD_MIN_BATCH = 60;
const MIN_OVERLAY_ZOOM = 15;
const AUTO_FOCUS_ZOOM = 16;
const OVERLAY_PANE_ID = "ww-overlay-pane";

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
  if (value >= 6) return "#f87171";
  if (value >= 3) return "#fb923c";
  if (value >= 0.1) return "#4ade80";
  return "#e5e7eb";
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
  const border = favorite || hovered ? 3 : 2;
  const borderColor = favorite ? "#facc15" : "#ffffff";
  const color = getIntensityColor(intensity);
  const html = `
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
    `;
  return L.divIcon({
    className: "ww-leaflet-point-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

const createClusterIcon = (cluster: any) => {
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

  const markers: any[] =
    typeof cluster?.getAllChildMarkers === "function"
      ? safeCall<any[]>(() => cluster.getAllChildMarkers(), [])
      : [];
  const intensities: number[] = [];
  markers.forEach((marker) => {
    const v = (marker.options as any)?.wwIntensity;
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
        `${segment.color} ${start.toFixed(2)}deg ${fillEnd.toFixed(2)}deg`
      );
      if (pad > 0) {
        const nextColor =
          weightedSegments[(index + 1) % weightedSegments.length]?.color ??
          segment.color;
        const blended = mixHexColors(segment.color, nextColor, 0.5);
        stops.push(`${blended} ${fillEnd.toFixed(2)}deg ${end.toFixed(2)}deg`);
      } else {
        stops.push(
          `${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`
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
                  1
                )};"></span>`
              : ""
          }
          ${
            hasMed
              ? `<span class="ww-cluster-dot" style="background:${getIntensityColor(
                  4
                )};"></span>`
              : ""
          }
          ${
            hasHigh
              ? `<span class="ww-cluster-dot" style="background:${getIntensityColor(
                  7
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
  selection: string | number | null
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
  next: VisibleMapBounds,
  prev: VisibleMapBounds
) =>
  Math.abs(next.north - prev.north) < BOUNDS_DELTA_THRESHOLD &&
  Math.abs(next.south - prev.south) < BOUNDS_DELTA_THRESHOLD &&
  Math.abs(next.east - prev.east) < BOUNDS_DELTA_THRESHOLD &&
  Math.abs(next.west - prev.west) < BOUNDS_DELTA_THRESHOLD;

const wrapLongitude = (value: number) => {
  let lon = value;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return lon;
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
    south = -89.999;
    north = 89.999;
  } else {
    south = Math.max(-89.999, Math.min(89.999, south));
    north = Math.max(-89.999, Math.min(89.999, north));
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
          latitude: parsed.latitude,
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
      })
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
  options?: { allowStoredFallback?: boolean }
): StoredViewState => {
  if (
    initialBeach &&
    Number.isFinite(Number(initialBeach.latitude)) &&
    Number.isFinite(Number(initialBeach.longitude))
  ) {
    return {
      longitude: Number(initialBeach.longitude),
      latitude: Number(initialBeach.latitude),
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

const buildPopupHtml = (
  beach: BeachPoint,
  stats: {
    surfHeight: string | null;
    surfIntensity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
  }
) => {
  const safeName = escapeHtml(beach.name ?? "Unnamed beach");
  const safeCounty = escapeHtml(beach.county ?? "");
  const numericIntensity =
    stats.surfIntensity != null && Number.isFinite(stats.surfIntensity)
      ? stats.surfIntensity
      : null;
  const surfReady =
    typeof stats.surfHeight === "string" && stats.surfHeight.length > 0;
  const surfText = surfReady ? escapeHtml(stats.surfHeight as string) : "--";
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
  const color = getIntensityColor(
    numericIntensity != null ? numericIntensity : 0
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
                ? `${windText}<span>mph</span>${windArrow}`
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
        latitude: parsed.latitude,
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
  selectedId: string | number | null
) => {
  const workerRef = React.useRef<Worker | null>(null);
  const beachesRef = React.useRef(beaches);
  const filtersRef = React.useRef(filters);
  const selectionRef = React.useRef<string | number | null>(selectedId);
  const [filtered, setFiltered] = React.useState<BeachPoint[]>(() =>
    ensureSelectionPresent(
      inlineFilterBeaches(beaches, filters ?? new Set()),
      beaches,
      selectedId
    )
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
    [filters]
  );
  const beachesKey = React.useMemo(
    () => beaches.map((b) => String(b.id)).join("|"),
    [beaches]
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      workerRef.current = null;
      return;
    }
    const worker = new Worker(
      new URL("../../lib/workers/beachFilterWorker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ beaches: BeachPoint[] }>) => {
      const currentBeaches = beachesRef.current;
      const selection = selectionRef.current;
      const next = ensureSelectionPresent(
        event.data?.beaches ?? [],
        currentBeaches,
        selection
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
          selection
        )
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
    if (worker) {
      worker.postMessage({
        beaches: currentBeaches,
        filters: Array.from(currentFilters),
      });
      return;
    }
    setFiltered(
      ensureSelectionPresent(
        inlineFilterBeaches(currentBeaches, currentFilters),
        currentBeaches,
        selection
      )
    );
  }, [beachesKey, filtersKey]);

  React.useEffect(() => {
    setFiltered((prev) =>
      ensureSelectionPresent(prev, beachesRef.current, selectedId)
    );
  }, [selectedId]);

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
      const preload: Promise<any>[] = [];
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
    const scale = overlayZoom >= 14 ? 1 : overlayZoom / 14;
    const ringSize = 160 * scale;
    const outerRadius = (typeof windDirection === "number" ? 110 : 76) * scale;
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
                legendOpen ? "-top-30" : "-top-22"
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
              {typeof windDirection === "number" && (
                <WindRing
                  direction={windDirection}
                  label={overlayLabels?.wind ?? null}
                  showLegend={legendOpen}
                  scale={scale}
                  className="absolute inset-0"
                />
              )}
            </div>
          </div>
        </div>
      </div>,
      portalTarget
    );
  }
);
SelectedBeachOverlay.displayName = "SelectedBeachOverlay";
const FilterPanel: React.FC<{
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClose: () => void;
  disableBlur: boolean;
}> = ({ filters, setFilters, onClose, disableBlur }) => {
  const filterCount = filters.size;
  return (
    <div
      className="absolute right-3 top-24 z-[1010] w-[calc(100%-1.5rem)] max-w-sm"
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={cn(
          "bg-background/95 rounded-xl border border-border shadow-lg max-h-[60vh] overflow-hidden",
          disableBlur ? "" : "backdrop-blur"
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/70">
          <span className="text-sm font-semibold tracking-wide">
            Filters {filterCount ? `(${filterCount})` : ""}
          </span>
          <button
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-[45vh] overflow-auto px-3 py-2 space-y-3">
          {Object.entries(FEATURE_CATEGORIES).map(([catKey, cat]) => (
            <div key={catKey}>
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
                        onChange={(event) => {
                          const nextChecked = event.currentTarget.checked;
                          setFilters((prev) => {
                            const next = new Set(prev ?? new Set());
                            if (nextChecked) next.add(key);
                            else next.delete(key);
                            return next;
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
              className="text-[11px] font-semibold px-2 py-1 rounded-xl border bg-highlight-3 dark:bg-background border border-border/90 hover:bg-highlight-5 dark:hover:bg-highlight-2"
              onClick={() => setFilters(new Set())}
            >
              Clear
            </button>
          )}
          <button
            className="ml-auto text-[11px] font-semibold px-2 py-1 rounded-xl border border-border/90 bg-background dark:bg-highlight-5 text-foreground hover:bg-highlight-3 dark:hover:bg-highlight-2"
            onClick={onClose}
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
        disableBlur ? "" : "backdrop-blur"
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
    return Array.from({ length: 7 }, (_, idx) => {
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
          disableBlur ? "" : "backdrop-blur"
        )}
      >
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            Pick map date
          </span>
          <button
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-2 @min-4xl:grid-cols-4 gap-1.5">
          {dateOptions.map((date) => {
            const key = normalize(date);
            const isSelected = key === selectedKey;
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button
                key={key ?? String(date.getTime())}
                type="button"
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border border-border/60 bg-background/85 px-2.5 py-1.5 text-left transition-colors shadow-sm",
                  "hover:bg-highlight-5/80 hover:border-border/80",
                  isSelected &&
                    "border-border bg-highlight-3 dark:bg-highlight-5 text-blue-900 dark:text-blue-100"
                )}
                onClick={() => onSelectDate(date)}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {isToday
                    ? "Today"
                    : date.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                </span>
                <span className="text-base font-semibold">
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
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
const LeafletMap: React.FC<Props> = ({ beachId, loggedIn, initialBeach }) => {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const {
    showMap,
    setShowMap,
    filters,
    setFilters,
    openPanel,
    setOpenPanel,
    togglePanel,
    favoriteIds,
    hoverCardId,
  } = useMapFilters();

  // Beaches page should always render with the map visible, even if another page hid it.
  React.useEffect(() => {
    if (pathname.endsWith("/beaches") && !showMap) {
      setShowMap(true);
    }
  }, [pathname, showMap, setShowMap]);
  const {
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
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);
  const [navigationPending, setNavigationPending] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const clusterLayerRef = React.useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = React.useRef<L.TileLayer | null>(null);
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
  const hoveredClusterRef = React.useRef<any>(null);
  const updateClusterHighlight = React.useCallback((cluster: any | null) => {
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
  }, []);
  const persistViewTimeoutRef = React.useRef<number | null>(null);
  const resumeCommitTimeoutRef = React.useRef<number | null>(null);
  const prefetchStatsTimeoutRef = React.useRef<number | null>(null);
  const resizeTimeoutRef = React.useRef<number | null>(null);
  const resizeRafRef = React.useRef<number | null>(null);
  const containerResizeObserverRef = React.useRef<ResizeObserver | null>(null);
  const interactionLockReleaseRef = React.useRef<(() => void) | null>(null);
  const interactionsReadyRef = React.useRef(false);
  const pendingAutoCenterRef = React.useRef<string | null>(null);
  const pendingFocusRef = React.useRef<MapFocusEventDetail | null>(null);
  const suppressUserMoveRef = React.useRef(false);
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
      value: string | number | null | undefined
    ) => BeachPoint | null;
    fullMapPage: boolean;
    setShowMap: (value: boolean) => void;
  }>({
    findBeachMatch: () => null,
    fullMapPage: !pathname.endsWith("/beaches"),
    setShowMap,
  });
  const [mapReady, setMapReady] = React.useState(false);
  const [markersLoading, setMarkersLoading] = React.useState(false);
  const [refocusDisabled, setRefocusDisabled] = React.useState(true);
  const markerBuildTokenRef = React.useRef(0);
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
  const [selectedBeachId, setSelectedBeachId] = React.useState<
    string | number | null
  >(null);
  React.useEffect(() => {
    setMapInteractionSelection({ beachId: selectedBeachId ?? null });
  }, [selectedBeachId]);
  const [markerRevision, forceMarkerRevision] = React.useReducer(
    (value) => value + 1,
    0
  );

  const beachesPage = pathname.endsWith("/beaches");
  const fullMapPage = !beachesPage;
  const editPage = pathname.includes("edit");
  const isDesktop = smallScreen === false;
  const layoutVersion = smallScreen === null ? 0 : smallScreen ? 1 : 2;
  const effectiveShowMap = showMap || smallScreen === true;

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
      (beach) => String(beach.id) === String(initialBeach.id)
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
    filters ?? new Set(),
    selectedBeachId
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

  const surfIntensity = useSurfIntensityData(selectedDate);
  const effectiveStatsDate = React.useMemo(
    () => (selectedDate instanceof Date ? selectedDate : null),
    [selectedDate]
  );
  const statsDateKey = React.useMemo(() => {
    if (effectiveStatsDate instanceof Date) {
      const day = new Date(
        effectiveStatsDate.getFullYear(),
        effectiveStatsDate.getMonth(),
        effectiveStatsDate.getDate()
      );
      return day.toISOString().split("T")[0];
    }
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
    [setSelectedDate]
  );
  const favoriteSet = React.useMemo(
    () => new Set(Array.from(favoriteIds ?? []).map(String)),
    [favoriteIds]
  );
  const selectedBeachKey = selectedBeach ? String(selectedBeach.id) : null;
  const { swellDirections, windDirection, overlayLabels } = useSwellDirections(
    selectedBeachKey,
    selectedDate,
    selectedHour
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
  const requestMarkerRebuild = React.useCallback(() => {
    rebuildMarkersRef.current = true;
    markerBuildTokenRef.current += 1;
    setMarkersLoading(true);
    forceMarkerRevision();
  }, []);

  React.useEffect(() => {
    requestMarkerRebuild();
  }, [filteredBeaches, surfIntensity, favoriteSet, requestMarkerRebuild]);

  const interactionsReady = mapReady && filteredBeaches.length > 0;
  React.useEffect(() => {
    interactionsReadyRef.current = interactionsReady;
  }, [interactionsReady]);

  const showUpdateBanner =
    viewportStatus === "dirty" || viewportStatus === "loading";
  const showLoadingPill =
    mapReady &&
    mapViewportStatus !== "error" &&
    (markersLoading || mapViewportStatus === "loading");

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
    [combinedBeaches]
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
    []
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
      center: { longitude: center.lng, latitude: center.lat },
    });
  }, [publishCameraSnapshot]);

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
    }, COMMIT_IDLE_DELAY);
  }, [cancelCommitResume, setAllowViewportCommit]);

  const normalizeMapCenter = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const wrapped = map.wrapLatLng(center);
    if (Math.abs(center.lng - wrapped.lng) < 1e-6) {
      return;
    }
    suppressUserMoveRef.current = true;
    map.setView(wrapped, map.getZoom(), { animate: false });
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
        try {
          clusterLayerRef.current?.refreshClusters();
        } catch {
          // ignore transient refresh errors
        }
        normalizeMapCenter();
        requestMarkerRebuild();
        clearHoverStateRef.current?.();
        emitCameraUpdate();
      });
    }, RESIZE_SETTLE_DELAY);
  }, [emitCameraUpdate, normalizeMapCenter, requestMarkerRebuild]);

  const scheduleMapViewPersistence = React.useCallback(
    (payload: StoredViewState) => {
      if (typeof window === "undefined") return;
      if (persistViewTimeoutRef.current != null) {
        const globalWindow = window as any;
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
            latitude: Math.max(
              -89.999,
              Math.min(89.999, payload.latitude ?? DEFAULT_VIEW.latitude)
            ),
            zoom: payload.zoom,
          };
          window.localStorage.setItem(
            MAP_VIEW_STORAGE_KEY,
            JSON.stringify(normalized)
          );
        } catch {
          // ignore persistence failures
        }
        persistViewTimeoutRef.current = null;
      };
      const globalWindow = window as any;
      if (typeof globalWindow.requestIdleCallback === "function") {
        persistViewTimeoutRef.current = globalWindow.requestIdleCallback(
          persist,
          { timeout: 1000 }
        );
      } else {
        persistViewTimeoutRef.current = window.setTimeout(persist, 250);
      }
    },
    []
  );

  React.useEffect(() => {
    return () => {
      if (persistViewTimeoutRef.current != null) {
        const globalWindow = window as any;
        if (typeof globalWindow.cancelIdleCallback === "function") {
          globalWindow.cancelIdleCallback(persistViewTimeoutRef.current);
        } else {
          window.clearTimeout(persistViewTimeoutRef.current);
        }
      }
    };
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#main-content") as
        | HTMLElement
        | null;
      const measured = container?.clientWidth ?? 0;
      const width = measured > 0 ? measured : window.innerWidth;
      setSmallScreen(width < 896);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const ResizeObserverCtor = (window as any).ResizeObserver;
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
    if (!selectedBeach) return;
    const map = mapRef.current;
    const zoom = map?.getZoom() ?? DEFAULT_ZOOM;
    saveStoredSelection(selectedBeach, zoom);
  }, [selectedBeach]);

  React.useEffect(() => {
    const pathParts = (pathname || "").split("/").filter(Boolean);
    const fromPath = pathParts.length ? extractBeachId(pathParts[0]) : null;
    const stored =
      beachesPage || selectedBeachId ? null : readStoredSelectionId();
    const candidate =
      beachId != null
        ? String(beachId)
        : fromPath
        ? String(fromPath)
        : initialBeach?.id != null
        ? String(initialBeach.id)
        : stored;
    if (!candidate) return;
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
    };
    container.addEventListener("pointerdown", handleUserIntent, {
      passive: true,
    });
    container.addEventListener("wheel", handleUserIntent, { passive: true });
    return () => {
      container.removeEventListener("pointerdown", handleUserIntent as any);
      container.removeEventListener("wheel", handleUserIntent as any);
    };
  }, [cancelPendingAutoFocus]);

  React.useEffect(() => {
    if (!mapReady) return;
    emitCameraUpdate();
    requestMarkerRebuild();
  }, [mapReady, emitCameraUpdate, requestMarkerRebuild]);

  React.useEffect(() => {
    if (!mapReady) return;
    if (smallScreen === null) return;
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
      ".leaflet-control-zoom-in"
    );
    const zoomOutButton = container.querySelector<HTMLAnchorElement>(
      ".leaflet-control-zoom-out"
    );
    const disableZoomIn = zoom >= max - 1e-6;
    const disableZoomOut = zoom <= min + 1e-6;
    if (zoomInButton) {
      zoomInButton.classList.toggle("is-disabled", disableZoomIn);
      zoomInButton.setAttribute(
        "aria-disabled",
        disableZoomIn ? "true" : "false"
      );
    }
    if (zoomOutButton) {
      zoomOutButton.classList.toggle("is-disabled", disableZoomOut);
      zoomOutButton.setAttribute(
        "aria-disabled",
        disableZoomOut ? "true" : "false"
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
      const targetPt = map.latLngToContainerPoint(target as any);
      const pxDist = Math.hypot(centerPt.x - targetPt.x, centerPt.y - targetPt.y);
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
    zoomControlRef.current = L.control
      .zoom({
        position:
          (fullMapPage && !smallScreen) || !smallScreen
            ? "bottomleft"
            : "topleft",
      })
      .addTo(map);
    const zoomContainer = zoomControlRef.current.getContainer();
    Object.assign(zoomContainer.style, {
      background: "color-mix(in oklch, var(--highlight-4) 60%, transparent)",
      border: "1px solid color-mix(in oklch, var(--border) 55%, transparent)",
      borderRadius: "30px",
      padding: "0px 6px",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      marginTop: !fullMapPage ? "125px" : smallScreen ? "260px" : "0px",
      marginBottom: !fullMapPage
        ? smallScreen
          ? "0px"
          : "12px"
        : smallScreen
        ? "80px"
        : "70px",
      marginLeft: "0.8rem",
      boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.2)",
    });
    const zoomButtons = zoomContainer.querySelectorAll("a");
    zoomButtons.forEach((button) => {
      Object.assign(button.style, {
        background: "transparent",
        border: "none",
        textDecoration: "none",
      });
      button.removeAttribute("href");
      button.setAttribute("role", "button");
    });
    updateZoomButtonState();
  }, [fullMapPage, smallScreen, updateZoomButtonState]);

  React.useEffect(() => {
    refreshZoomControl();
  }, [refreshZoomControl]);

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
        })
      );
    },
    [selectedBeachId]
  );

  const cancelMarkerBuild = React.useCallback(() => {
    const job = markerBuildJobRef.current;
    if (!job) return;
    if (job.raf != null) {
      window.cancelAnimationFrame(job.raf);
    }
    markerBuildJobRef.current = null;
    setMarkersLoading(false);
  }, [setMarkersLoading]);

  const enableInteractionLock = React.useCallback(() => {
    if (interactionLockReleaseRef.current) return;
    interactionLockReleaseRef.current = acquireInteractionLock();
  }, []);

  const disableInteractionLock = React.useCallback(() => {
    interactionLockReleaseRef.current?.();
    interactionLockReleaseRef.current = null;
  }, []);

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
  }, [mapReady, clearHoverState]);

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
    disableInteractionLock();
  }, [navigationPending, cancelMarkerBuild, disableInteractionLock]);

  React.useEffect(() => {
    if (navigationPending) return;
    clearHoverState();
  }, [navigationPending, clearHoverState]);

  const highlightClusterForBeach = React.useCallback(
    (beachId: string | null): boolean => {
      if (!beachId) return false;
      const group: any = clusterLayerRef.current;
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
    [updateClusterHighlight]
  );

  const buildPopupHtmlForBeach = React.useCallback((beach: BeachPoint) => {
    const ctx = statsContextRef.current;
    const snapshot =
      ctx.getStatsSnapshot(
        String(beach.id),
        ctx.statsDateKey,
        ctx.statsHourKey
      ) ?? null;
    const dailyStats = extractDailySurfWindStats(snapshot);
    const statsIntensity =
      typeof dailyStats.surfIntensity === "number"
        ? dailyStats.surfIntensity
        : null;
    const gridIntensity = resolveSurfIntensity(ctx.surfIntensity, beach);
    const intensity = gridIntensity != null ? gridIntensity : statsIntensity;
    return buildPopupHtml(beach, {
      surfHeight: dailyStats.surfHeight,
      surfIntensity: intensity,
      windSpeed: dailyStats.windSpeed,
      windDirection: dailyStats.windDirection,
    });
  }, []);

  const ensureMarkerPopup = React.useCallback(
    (entry: MarkerEntry) => {
      const popupHtml = buildPopupHtmlForBeach(entry.beach);
      const popup = entry.marker.getPopup();
      if (popup) {
        popup.setContent(popupHtml);
        return;
      }
      entry.marker.bindPopup(popupHtml, { closeButton: false, autoPan: false });
    },
    [buildPopupHtmlForBeach]
  );

  const ensureStatsForBeachId = React.useCallback(
    (beachId: string | number | null | undefined) => {
      if (beachId == null) return;
      const ctx = statsContextRef.current;
      const snapshot = ctx.getStatsSnapshot(
        String(beachId),
        ctx.statsDateKey,
        ctx.statsHourKey
      );
      if (snapshot !== undefined) return;
      ctx
        .prefetchSnapshots([beachId], {
          date: ctx.effectiveStatsDate ?? undefined,
          hour:
            typeof ctx.selectedHour === "number" ? ctx.selectedHour : undefined,
        })
        .catch(() => {
          // ignore fetch errors; popups will show "--" until data available
        });
    },
    []
  );

  const prefetchVisibleMarkerStats = React.useCallback(() => {
    const map = mapRef.current;
    const group: any = clusterLayerRef.current;
    if (!map || !group || typeof map.getBounds !== "function") {
      return;
    }
    const bounds = map.getBounds();
    if (!bounds) return;
    const ctx = statsContextRef.current;
    const pending: Array<string | number> = [];
    Object.values(markerRegistryRef.current).forEach((entry) => {
      if (!entry?.marker) return;
      const latLng = entry.marker.getLatLng?.();
      if (!latLng || !bounds.contains(latLng)) {
        return;
      }
      const parent =
        typeof group.getVisibleParent === "function"
          ? group.getVisibleParent(entry.marker)
          : null;
      if (parent && parent !== entry.marker) {
        return;
      }
      const beachId = entry.beach?.id;
      if (beachId == null) return;
      const snapshot = ctx.getStatsSnapshot(
        String(beachId),
        ctx.statsDateKey,
        ctx.statsHourKey
      );
      if (snapshot === undefined) {
        pending.push(beachId);
      }
    });
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
    const globalWindow = window as any;
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
    const globalWindow = window as any;
    if (typeof globalWindow.requestIdleCallback === "function") {
      prefetchStatsTimeoutRef.current = globalWindow.requestIdleCallback(run, {
        timeout: 800,
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
  });

  React.useEffect(() => {
    hoverOpsRef.current = {
      refreshMarkerIcon,
      updateClusterHighlight,
      highlightClusterForBeach,
      ensureStatsForBeachId,
      ensureMarkerPopup,
    };
  }, [
    refreshMarkerIcon,
    updateClusterHighlight,
    highlightClusterForBeach,
    ensureStatsForBeachId,
    ensureMarkerPopup,
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
            hoverOps.updateClusterHighlight(
              (clusterLayerRef.current as any)?.getVisibleParent?.(
                entry.marker
              ) ?? null
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
          hoverOps.ensureMarkerPopup(entry);
          entry.marker.openPopup();
          const group = clusterLayerRef.current;
          if (
            group &&
            typeof (group as any).getVisibleParent === "function" &&
            (group as any)._map
          ) {
            const parent = (group as any).getVisibleParent(entry.marker);
            if (parent && parent !== entry.marker) {
              hoverOps.updateClusterHighlight(parent);
            } else {
              hoverOps.updateClusterHighlight(null);
            }
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
    []
  );

  type MapLifecycleCallbacks = {
    refreshZoomControl: () => void;
    emitCameraUpdate: () => void;
    scheduleMapViewPersistence: (payload: StoredViewState) => void;
    clearHoverState: () => void;
    scheduleCommitResume: () => void;
    scheduleResizeRecompute: () => void;
    normalizeMapCenter: () => void;
    setAllowViewportCommit: (value: boolean) => void;
    cancelCommitResume: () => void;
    setHoveredMarkerSource: (
      source: "marker" | "card",
      nextId: string | null
    ) => void;
    primeVisibleMarkerStats: () => void;
    updateZoomButtons: () => void;
    updateRefocusDisabled: () => void;
  };

  const mapLifecycleCallbacksRef = React.useRef<MapLifecycleCallbacks | null>(
    null
  );

  React.useEffect(() => {
    mapLifecycleCallbacksRef.current = {
      refreshZoomControl,
      emitCameraUpdate,
      scheduleMapViewPersistence,
      clearHoverState,
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
    scheduleMapViewPersistence,
    clearHoverState,
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

  React.useEffect(() => {
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
        scheduleMapViewPersistence: latestScheduleMapViewPersistence,
        clearHoverState: latestClearHoverState,
        scheduleCommitResume: latestScheduleCommitResume,
        scheduleResizeRecompute: latestScheduleResizeRecompute,
        normalizeMapCenter: latestNormalizeMapCenter,
        setAllowViewportCommit: latestSetAllowViewportCommit,
        cancelCommitResume: latestCancelCommitResume,
        updateZoomButtons: latestUpdateZoomButtons = () => {},
        updateRefocusDisabled: latestUpdateRefocusDisabled = () => {},
        primeVisibleMarkerStats: latestPrimeVisibleMarkerStats = () => {},
      } = lifecycle;
    if (typeof window !== "undefined" && L?.Browser?.any3d) {
      (L.Browser as any).any3d = false;
    }
    const initialView = resolveInitialView(initialBeach, {
      allowStoredFallback: !pathname.endsWith("/beaches"),
    });
    const map = L.map(containerRef.current, {
      center: [initialView.latitude, initialView.longitude],
      zoom: initialView.zoom,
      zoomControl: false,
      preferCanvas: false,
      minZoom: 3,
      maxZoom: 18,
      worldCopyJump: true,
      inertia: true,
      inertiaDeceleration: 2500,
      zoomAnimation: true,
    });
    const tileLayer = L.tileLayer(DEFAULT_TILE_URL, {
      attribution: DEFAULT_ATTRIBUTION,
      detectRetina: true,
      reuseTiles: true,
      // Keep a small buffer of tiles around the viewport so
      // quick zooms/pans re-use already-loaded imagery.
      keepBuffer: 2,
      updateWhenIdle: false,
    }).addTo(map);
    tileLayerRef.current = tileLayer;
    mapRef.current = map;
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
      iconCreateFunction: (cluster: any) => createClusterIcon(cluster),
    });
    clusterLayerRef.current = clusterGroup;
    clusterGroup.addTo(map);
    setMapReady(true);
    latestNormalizeMapCenter();
    latestEmitCameraUpdate();
    latestPrimeVisibleMarkerStats();
    latestUpdateZoomButtons();
    latestUpdateRefocusDisabled();

    const handleMoveStart = () => {
      if (suppressUserMoveRef.current) {
        suppressUserMoveRef.current = false;
        return;
      }
      enableInteractionLock();
      pendingAutoCenterRef.current = null;
      pendingFocusRef.current = null;
      latestCancelCommitResume();
      latestSetAllowViewportCommit(false);
      latestClearHoverState();
      cancelPrefetchVisibleMarkerStats();
    };
    const handleResizeEvent = () => {
      latestScheduleResizeRecompute();
    };

      const handleInteractionEnd = () => {
        latestClearHoverState();
        disableInteractionLock();
        try {
          const center = map.getCenter();
        const zoom = map.getZoom();
        latestScheduleMapViewPersistence({
          longitude: center.lng,
          latitude: center.lat,
          zoom,
        });
        latestNormalizeMapCenter();
      } catch {
        // ignore persistence failures
      }
      latestEmitCameraUpdate();
      latestScheduleCommitResume();
      latestPrimeVisibleMarkerStats();
      latestUpdateZoomButtons();
      latestUpdateRefocusDisabled();
    };

    const handleZoomStart = () => {
      enableInteractionLock();
      latestClearHoverState();
      cancelPrefetchVisibleMarkerStats();
    };

    map.on("movestart", handleMoveStart);
    map.on("zoomstart", handleZoomStart);
    map.on("moveend", handleInteractionEnd);
    map.on("zoomend", handleInteractionEnd);
    map.on("resize", handleResizeEvent);

    return () => {
      map.off("resize", handleResizeEvent);
      map.off("movestart", handleMoveStart);
      map.off("zoomstart", handleZoomStart);
      map.off("moveend", handleInteractionEnd);
      map.off("zoomend", handleInteractionEnd);
      disableInteractionLock();
      latestCancelCommitResume();
      cancelPrefetchVisibleMarkerStats();
      resetMarkerRegistry();
      setMarkersLoading(false);
      zoomControlRef.current?.remove();
      zoomControlRef.current = null;
      if (clusterLayerRef.current) {
        clusterLayerRef.current.remove();
        clusterLayerRef.current = null;
      }
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      latestClearHoverState();
    };
  }, [effectiveShowMap, resetMarkerRegistry]);
  React.useEffect(() => {
    if (!mapReady || !selectedBeachId || !selectedBeach) return;
    const targetId = pendingAutoCenterRef.current;
    if (!targetId || targetId !== String(selectedBeachId)) return;
    const map = mapRef.current;
    if (!map) return;
    suppressUserMoveRef.current = true;
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(
      typeof currentZoom === "number" ? currentZoom : AUTO_FOCUS_ZOOM,
      AUTO_FOCUS_ZOOM
    );
    map.flyTo([selectedBeach.latitude, selectedBeach.longitude], targetZoom, {
      duration: 0.1,
    });
    pendingAutoCenterRef.current = null;
    // ensure corresponding card is visible/selected
    const normalizedId = String(selectedBeach.id);
    document
      .querySelector(`[data-beach-card-id="${normalizedId}"]`)
      ?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [mapReady, selectedBeach, selectedBeachId]);
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
      map.flyTo([match.latitude, match.longitude], zoom, { duration: 0.6 });
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
    []
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
      buildToken: number
    ) => {
      cancelMarkerBuild();
      setMarkersLoading(true);

      const registry = markerRegistryRef.current;
      const incomingIds = new Set(
        filteredBeaches.map((beach) => String(beach.id))
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
        const markersToRemove = removedEntries
          .map((entry) => entry.marker)
          .filter(Boolean);
        try {
          if (typeof (group as any).removeLayers === "function") {
            (group as any).removeLayers(markersToRemove);
          } else {
            markersToRemove.forEach((marker: L.Marker) => {
              group.removeLayer(marker);
            });
          }
        } catch {
          markersToRemove.forEach((marker: L.Marker) => {
            try {
              if (
                typeof (group as any).hasLayer !== "function" ||
                (group as any).hasLayer(marker)
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

        clearHoverState();
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
          if (typeof (group as any).addLayers === "function") {
            (group as any).addLayers(markers);
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

        while (active.index < filteredBeaches.length) {
          const beach = filteredBeaches[active.index];
          active.index += 1;

          const id = String(beach.id);
          const gridIntensity = resolveSurfIntensity(surfIntensity, beach);
          const iconIntensity = (() => {
            if (gridIntensity != null) {
              return Number.isFinite(gridIntensity as number)
                ? (gridIntensity as number)
                : 0;
            }
            active.nextStatsFallbackIds.add(id);
            const ctx = statsContextRef.current;
            const snapshot =
              ctx.getStatsSnapshot(
                String(beach.id),
                ctx.statsDateKey,
                ctx.statsHourKey
              ) ?? null;
            const dailyStats = extractDailySurfWindStats(snapshot);
            return typeof dailyStats.surfIntensity === "number" &&
              Number.isFinite(dailyStats.surfIntensity)
              ? dailyStats.surfIntensity
              : 0;
          })();

          const favorite = favoriteSet.has(id);
          const existing = registry[id];
          if (existing) {
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
              (existing.marker.options as any).wwIntensity = iconIntensity;
              const hoveredId = appliedHoverIdRef.current;
              refreshMarkerIcon(existing, hoveredId === id);
              active.updatedCount += 1;
            }
            try {
              if (
                typeof (group as any).hasLayer !== "function" ||
                !(group as any).hasLayer(existing.marker)
              ) {
                markersToAdd.push(existing.marker);
              }
            } catch {
              markersToAdd.push(existing.marker);
            }
          } else {
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
              } as any
            );

            const entry: MarkerEntry = {
              marker,
              beach,
              intensity: iconIntensity,
              favorite,
            };
            registry[id] = entry;

            const handleClick = () => {
              if (!interactionsReadyRef.current) return;
              const normalizedId = String(beach.id);
              setSelectedBeachId(beach.id);
              pendingAutoCenterRef.current = normalizedId;
              ensureMarkerPopup(entry);
              marker.openPopup();
              const destination = `${generateBeachUrl(
                beach.name,
                beach.id
              )}/overview#content`;
              if (router) {
                setNavigationPending(true);
                router.push(destination);
              }
            };
            const handleMouseOver = () => {
              setHoveredMarkerSource("marker", String(beach.id));
            };
            marker.on("click", handleClick);
            marker.on("mouseover", handleMouseOver);

            markersToAdd.push(marker);
            active.addedCount += 1;
          }

          const elapsed =
            (supportsPerformance ? performance.now() : Date.now()) - frameStart;
          if (
            markersToAdd.length >= MARKER_BUILD_MIN_BATCH &&
            elapsed >= MARKER_BUILD_FRAME_BUDGET_MS
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
          active.startTs
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
      favoriteSet,
      filteredBeaches,
      refreshMarkerIcon,
      router,
      selectedBeachId,
      setMarkersLoading,
      setHoveredMarkerSource,
      setSelectedBeachId,
      surfIntensity,
      clearHoverState,
      ensureMarkerPopup,
    ]
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
      const gridIntensity = resolveSurfIntensity(
        ctx.surfIntensity,
        entry.beach
      );
      if (gridIntensity != null) {
        return;
      }
      const snapshot =
        ctx.getStatsSnapshot(
          String(entry.beach.id),
          ctx.statsDateKey,
          ctx.statsHourKey
        ) ?? null;
      const dailyStats = extractDailySurfWindStats(snapshot);
      const iconIntensity =
        typeof dailyStats.surfIntensity === "number" &&
        Number.isFinite(dailyStats.surfIntensity)
          ? dailyStats.surfIntensity
          : 0;
      if (entry.intensity === iconIntensity) {
        if (hoveredId === id) {
          ensureMarkerPopup(entry);
        }
        return;
      }
      entry.intensity = iconIntensity;
      (entry.marker.options as any).wwIntensity = iconIntensity;
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
    const group = clusterLayerRef.current;
    if (!group || !mapReady) return;
    const handleClusterOver = (event: any) => {
      if (!interactionsReadyRef.current) return;
      updateClusterHighlight(event.layer ?? null);
    };
    const handleClusterOut = () => {
      if (!interactionsReadyRef.current) return;
      updateClusterHighlight(null);
    };
    const handleClusterClick = (event: any) => {
      event?.originalEvent?.preventDefault?.();
      event?.originalEvent?.stopPropagation?.();
      const map = mapRef.current;
      if (!map) return;
      const layer = event.layer;
      if (!layer) return;
      if (!(group as any)?._map) return;

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
          }
        );
        setTimeout(() => target.fire("click"), 360);
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
    if (fullMapPage) {
      legendInitializedRef.current = true;
      setOpenPanel((prev) => prev ?? "legend");
    }
  }, [fullMapPage, setOpenPanel]);
  const filterCount = filters.size;

  const overlayButtonBase = cn(
    "inline-flex items-center justify-center rounded-full border p-3",
    "border-border/55 bg-background/70 text-foreground backdrop-blur-md",
    "dark:border-border/35 dark:bg-highlight-4/60",
    "transition-colors duration-200 motion-reduce:transition-none",
    "hover:border-border/70 hover:bg-sky-200/80",
    "dark:hover:border-border/45 dark:hover:bg-sky-300/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0",
    "active:scale-[0.98] motion-reduce:transform-none"
  );

  const overlayButtonActive = cn(
    "bg-sky-200/80 border-sky-300/70 text-sky-950",
    "dark:bg-sky-600/40 dark:border-sky-300/35 dark:text-sky-50"
  );
  const wrapperHeight = smallScreen
    ? {
        minHeight: "calc(100dvh)",
        height: "calc(100dvh)",
      }
    : {
        minHeight: "28rem",
      };
  if (navigationPending) {
    return (
      <aside
        id="map-container"
        className={cn(
          "fixed w-full mx-auto max-w-screen transition-all duration-300",
          "@min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(100vh-8rem)] flex"
        )}
        style={smallScreen ? wrapperHeight : undefined}
      >
        <div
          className="flex w-full h-full items-center justify-center text-sm text-muted-foreground"
          style={{
            ...wrapperHeight,
            borderRadius: !smallScreen ? "18px" : "0px",
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
            background: "var(--highlight-5)",
          }}
        >
          Preparing map…
        </div>
      </aside>
    );
  }

  if (editPage || (isDesktop && fullMapPage && !showMap)) {
    return null;
  }

  return (
    <aside
      id="map-container"
      className={cn(
        "fixed w-full mx-auto max-w-screen transition-all duration-300",
        "@min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(100vh-8rem)] flex"
      )}
      style={smallScreen ? wrapperHeight : undefined}
    >
      <div
        className="relative w-full h-full"
        style={{
          ...wrapperHeight,
          borderRadius: !smallScreen ? "18px" : "0px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
        {!showMap && fullMapPage && !smallScreen && (
          <div className="absolute inset-0 z-[600] bg-black/70 backdrop-blur-md" />
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
        {showLoadingPill && (
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 z-[1200] -translate-x-1/2",
              fullMapPage ? "top-21 @min-4xl:top-3" : "top-3"
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-border/60 border-t-sky-500 motion-reduce:animate-none" />
              Updating markers
            </div>
          </div>
        )}
        {(showMap || smallScreen) && (
          <div
            className={cn(
              "absolute left-3 z-[1000] flex flex-col gap-3 transition-opacity duration-200",
              fullMapPage ? "top-21" : "top-3",
              "@min-4xl:top-3"
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
                disabled={!selectedBeachId || refocusDisabled}
                className={cn(
                  overlayButtonBase,
                  "text-sm font-medium",
                  (!selectedBeachId || refocusDisabled) &&
                    "opacity-50 pointer-events-none"
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
              onClick={() => togglePanel("filters")}
              className={cn(
                overlayButtonBase,
                "relative text-sm font-medium",
                openPanel === "filters" && overlayButtonActive,
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
                onClick={() => togglePanel("legend")}
                className={cn(
                  overlayButtonBase,
                  "text-sm font-medium",
                  openPanel === "legend" && overlayButtonActive
                )}
              >
                <Info className="w-5 h-5 mx-auto" />
              </button>
            )}
            {fullMapPage && !smallScreen && (
              <button
                type="button"
                aria-label="open map"
                className={cn(overlayButtonBase, "text-sm font-medium")}
                onClick={() => {
                  if (openPanel) setOpenPanel(null);
                  router.push("/beaches");
                }}
              >
                <MapIcon className="w-5 h-5 mx-auto" />
              </button>
            )}
          </div>
        )}
        {!fullMapPage && (
          <button
            type="button"
            aria-label="select date"
            onClick={() => togglePanel("date")}
            className={cn(
              "z-[1000] absolute left-3 top-17 @min-4xl:top-auto @min-4xl:bottom-25",
              overlayButtonBase,
              "text-sm font-medium",
              openPanel === "date" && overlayButtonActive
            )}
          >
            <CalendarDays className="w-5 h-5 mx-auto" />
          </button>
        )}
        {fullMapPage && !smallScreen && (
          <button
            type="button"
            aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
            className={cn(
              "z-[1000] absolute left-3 bottom-3",
              overlayButtonBase,
              "text-sm font-medium"
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
        {!fullMapPage && openPanel === "date" && (
          <MapDateOverlay
            selectedDate={effectiveStatsDate}
            onSelectDate={handleMapDateSelect}
            onClose={() => setOpenPanel(null)}
            disableBlur={false}
          />
        )}
        {fullMapPage && openPanel === "legend" && (
          <LegendPanel onClose={() => setOpenPanel(null)} disableBlur={false} />
        )}
        {mapReady && selectedBeach && overlayAnchor && swellDirections && (
          <SelectedBeachOverlay
            key={layoutVersion}
            mapRef={mapRef}
            anchor={overlayAnchor}
            selected={selectedBeach}
            swellDirections={swellDirections}
            windDirection={windDirection}
            overlayLabels={overlayLabels}
            legendOpen={openPanel === "legend"}
            mapReady={mapReady}
            overlayPane={OVERLAY_PANE_ID}
            layoutVersion={layoutVersion}
          />
        )}
        {!fullMapPage && (
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
          }
          .ww-leaflet-cluster-icon {
            cursor: pointer;
            transition: transform 140ms ease, filter 140ms ease;
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
            width: 85%;
            height: 85%;
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
            font-family: var(--font-poppins), ui-sans-serif, system-ui,
              -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
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
            font-family: var(--font-poppins), ui-sans-serif, system-ui,
              -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
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
            z-index: 820 !important;
          }
          .leaflet-popup {
            transform: translate3d(0, -14px, 0);
            pointer-events: none;
          }
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip {
            pointer-events: none;
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
            border-radius: 999px;
            border: 1px solid
              color-mix(in oklch, var(--border) 65%, transparent);
            margin: 4px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 1rem;
            color: var(--foreground);
            background: color-mix(in oklch, var(--background) 60%, transparent);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: background 140ms ease, color 140ms ease,
              border-color 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
            text-decoration: none;
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
          .leaflet-control-zoom a:not(.is-disabled):hover,
          .leaflet-control-zoom a:not(.is-disabled):hover {
            color: var(--muted-foreground);
            outline: none;
          }
          .leaflet-control-zoom a:not(.is-disabled):focus-visible {
            color: var(--foreground);
            border-color: color-mix(in oklch, var(--border) 80%, transparent);
            box-shadow: 0 0 0 2px
              color-mix(in oklch, var(--foreground) 20%, transparent);
          }
          // .leaflet-control-zoom a:not(.is-disabled):active {
          //   transform: scale(0.95);
          // }
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
          .leaflet-control-zoom a.is-disabled {
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

export default LeafletMap;
const resolveSurfIntensity = (
  source: Record<string | number, number>,
  beach: BeachPoint
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
