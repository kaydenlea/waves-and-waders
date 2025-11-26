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
import { useMapFilters } from "../context/MapFilterContext";
import {
  MAP_FOCUS_EVENT,
  type MapFocusEventDetail,
} from "../general/mapEvents";
import { motion, AnimatePresence } from "framer-motion";
import FocusMapButton from "../general/FocusMapButton";
import { useSearchContext } from "../context/SearchContext";
import { useClientPath } from "../context/PathContext";

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
  grid_id?: number;
  features?: Record<string, boolean>;
  surfIntensity?: number;
};

type SwellDirectionSet = {
  primary: number | null;
  secondary: number | null;
  tertiary: number | null;
};

type WindDirection = {
  direction: number | null;
};

export const SwellRings: React.FC<{
  directions: {
    primary: number | null | undefined;
    secondary: number | null | undefined;
    tertiary: number | null | undefined;
  };
  labels?: {
    primary?: string | null;
    secondary?: string | null;
    tertiary?: string | null;
  };
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({ directions, labels, scale = 1, className = "", variant = "full" }) => {
  const size = 160 * scale;
  const center = size / 2;
  const rings: Array<{
    key: "primary" | "secondary" | "tertiary";
    radius: number;
    color: string;
  }> = [
    // Slightly spaced-out radii to reduce cross-ring arrow overlap
    { key: "primary", radius: 40 * scale, color: "#1d4ed8" }, // deep blue
    { key: "secondary", radius: 64 * scale, color: "#0ea5e9" }, // sky
    { key: "tertiary", radius: 88 * scale, color: "#22d3ee" }, // cyan
  ];

  const renderArrow = (
    direction: number,
    radius: number,
    color: string,
    kind?: "primary" | "secondary" | "tertiary"
  ): React.ReactNode => {
    const normalized = ((direction % 360) + 360) % 360;
    const isPreview = variant === "preview";
    // Pointer-like, softly-rounded arrowhead sized to fit icon snugly
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    const connectorLen = 1.5 * scale;
    const badgeRadius = 7 * scale;
    // Place badge to the side so it stays out of adjacent rings
    const badgeOffsetX = arrowWidth * 0.62;
    const badgeCy = baseY - headLen * 0.04;
    return (
      <g
        key={`${color}-${radius}`}
        transform={`rotate(${normalized} ${center} ${center})`}
      >
        <g transform={`translate(${center} ${center - radius})`}>
          {/* Head: pointer-like arrow with gentle rounding */}
          <path
            d={`M 0 ${tipY}
                L ${arrowWidth / 2} ${shoulderY}
                L ${arrowWidth * 0.38} ${baseY}
                Q 0 ${baseY + headLen * 0.1} ${-arrowWidth * 0.38} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {/* Swell icon rotates with arrow; badge stays upright (hidden in preview) */}
          {kind &&
            !isPreview &&
            (() => {
              const iconSize = Math.min(arrowWidth * 0.75, headLen * 0.75);
              const iconCenterY = (tipY + baseY) / 2 + headLen * 0.08;
              const num =
                kind === "primary" ? "1" : kind === "secondary" ? "2" : "3";
              return (
                <>
                  <Waves
                    color="#ffffff"
                    strokeWidth={2.2 * scale}
                    width={iconSize}
                    height={iconSize}
                    x={-iconSize / 2}
                    y={iconCenterY - iconSize / 2 + 4}
                  />
                  {/* <line
                    x1={0}
                    y1={baseY}
                    x2={badgeOffsetX * 0.82}
                    y2={badgeCy - badgeRadius * 0.65}
                    stroke="#ffffff"
                    strokeWidth={2 * scale}
                    strokeLinecap="round"
                    opacity={0.8}
                  /> */}
                  <circle
                    cx={badgeOffsetX}
                    cy={badgeCy}
                    r={badgeRadius}
                    fill="#ffffff"
                    stroke="#cacacaff"
                    opacity={0.98}
                  />
                  <text
                    x={badgeOffsetX}
                    y={badgeCy}
                    transform={`rotate(${-normalized} ${badgeOffsetX} ${badgeCy})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8.6 * scale}
                    fontWeight={900}
                    fill={color}
                  >
                    {num}
                  </text>
                </>
              );
            })()}
        </g>
      </g>
    );
  };

  return (
    <svg
      className={cn("pointer-events-none overflow-visible", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Path defs for curved labels around rings (cw and ccw for flipping) */}
      <defs>
        {rings.map(({ key, radius }) => (
          <g key={`ring-defs-${key}`}>
            <path
              id={`ring-path-${key}`}
              d={`M ${center - radius},${center} a ${radius},${radius} 0 1,1 ${
                2 * radius
              },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`}
            />
            <path
              id={`ring-path-${key}-rev`}
              d={`M ${center - radius},${center} a ${radius},${radius} 0 1,0 ${
                2 * radius
              },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`}
            />
          </g>
        ))}
      </defs>
      {rings.map(({ key, radius, color }) => {
        const dir = directions[key];
        // Default to 0 (North) if direction is null/undefined
        const direction = typeof dir === "number" && !isNaN(dir) ? dir : 0;
        // Curved label: compute startOffset along ring path and optionally flip side
        const needsFlip = direction > 90 && direction < 270;
        const circ = 2 * Math.PI * radius;
        const baseAngle = (direction + 90) % 360;
        // Spacing from arrowhead and additional offset when flipped (keep label away from arrow)
        const delta = 45 * scale;
        const extra = needsFlip ? -100 * scale : 0;
        const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center of label/gap
        const useRev = needsFlip;
        const centerOffset = useRev ? circ - baseOffset : baseOffset;
        const labelText = labels?.[key] ?? null;
        // Build path commands for ring (normal and reversed)
        const pathD = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,1 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`;
        const pathDRev = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,0 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`;
        // Estimate gap length and apply stroke-dasharray to remove ring segment under label
        const fontSize = 11 * scale;
        const estimate = (t: string | null | undefined) =>
          (t?.length ?? 0) * fontSize * 0.48;
        const labelLen = labelText ? estimate(labelText) : 0;
        // Slightly larger gap pad so text breathes inside the removed segment
        const gapLen = labelText ? labelLen + 12 * scale : 0;
        const dashLen = Math.max(0, circ - gapLen);
        const labelStart = ((centerOffset - labelLen / 2 + circ) % circ) + 10;
        const gapStart = ((centerOffset - gapLen / 2 + circ) % circ) + 10;
        return (
          <g key={key}>
            <path
              d={useRev ? pathDRev : pathD}
              fill="none"
              stroke={color}
              strokeWidth={4 * scale}
              strokeOpacity={0.35}
              strokeDasharray={labelText ? `${dashLen} ${gapLen}` : undefined}
              strokeDashoffset={
                labelText ? (dashLen - gapStart + circ) % circ : undefined
              }
            />
            {renderArrow(direction, radius, color, key)}
            {labelText && (
              <text fill={color} fontSize={11 * scale} fontWeight={800}>
                <textPath
                  href={`#ring-path-${key}${useRev ? "-rev" : ""}`}
                  startOffset={labelStart}
                  dy={3 * scale}
                >
                  {labelText}
                </textPath>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const WindRing: React.FC<{
  direction: number | null | undefined;
  label?: string | null;
  scale?: number;
  className?: string;
  variant?: "full" | "preview";
}> = ({ direction, label, scale = 1, className = "", variant = "full" }) => {
  const size = 160 * scale;
  const center = size / 2;
  // Slightly larger wind ring radius to increase spacing from swell rings
  const radius = 108 * scale;
  const color = "#a855f7"; // purple-500

  const renderArrow = (dir: number): React.ReactNode => {
    const normalized = ((dir % 360) + 360) % 360;
    const isPreview = variant === "preview";
    // Arrowhead centered on ring; no shaft
    const headLen = (isPreview ? 14 : 20) * scale;
    const arrowWidth = (isPreview ? 12 : 18) * scale;
    const tipY = -headLen * 0.64;
    const baseY = headLen * 0.48;
    const shoulderY = headLen * 0.16;
    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - radius})`}>
          {/* Head: compact arrowhead */}
          <path
            d={`M 0 ${tipY}
                L ${arrowWidth / 2} ${shoulderY}
                L ${arrowWidth * 0.38} ${baseY}
                Q 0 ${baseY + headLen * 0.1} ${-arrowWidth * 0.38} ${baseY}
                L ${-arrowWidth / 2} ${shoulderY} Z`}
            fill={color}
            opacity={0.95}
            stroke={color}
            strokeWidth={(isPreview ? 1 : 1.4) * scale}
            strokeLinejoin="round"
          />
          {/* No shaft */}
          {/* Wind icon follows arrow rotation */}
          {!isPreview &&
            (() => {
              const iconSize = Math.min(arrowWidth * 0.75, headLen * 0.75);
              const iconCenterY = (tipY + baseY) / 2 + headLen * 0.05;
              return (
                <Wind
                  color="#ffffff"
                  strokeWidth={2.2 * scale}
                  width={iconSize}
                  height={iconSize}
                  x={-iconSize / 2}
                  y={iconCenterY - iconSize / 2 + 4}
                />
              );
            })()}
        </g>
      </g>
    );
  };

  // Default to 0 (North) if direction is null/undefined
  const finalDirection =
    typeof direction === "number" && !isNaN(direction) ? direction : 0;

  return (
    <svg
      className={cn("pointer-events-none overflow-visible", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Path defs for curved label on wind ring (cw and ccw) */}
      <defs>
        <path
          id="wind-ring-path"
          d={`M ${center - radius},${center} a ${radius},${radius} 0 1,1 ${
            2 * radius
          },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`}
        />
        <path
          id="wind-ring-path-rev"
          d={`M ${center - radius},${center} a ${radius},${radius} 0 1,0 ${
            2 * radius
          },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`}
        />
      </defs>
      {(() => {
        const circ = 2 * Math.PI * radius;
        const pathD = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,1 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,1 ${-2 * radius},0`;
        const pathDRev = `M ${
          center - radius
        },${center} a ${radius},${radius} 0 1,0 ${
          2 * radius
        },0 a ${radius},${radius} 0 1,0 ${-2 * radius},0`;
        const needsFlip = finalDirection > 90 && finalDirection < 270;
        const baseAngle = (finalDirection + 90) % 360;
        // Match swell logic for consistent spacing and placement
        const delta = 45 * scale;
        const extra = needsFlip ? -90 * scale : 0;
        const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center
        const centerOffset = needsFlip ? circ - baseOffset : baseOffset;
        const labelText = label ?? null;
        const estimate = (t: string | null) =>
          (t?.length ?? 0) * (11 * scale) * 0.55;
        const labelLen = labelText ? estimate(labelText) : 0;
        const gapLen = labelText ? labelLen + 25 * scale : 0;
        const dashLen = Math.max(0, circ - gapLen);
        const gapStart = (centerOffset - gapLen / 2 + circ) % circ;
        return (
          <path
            d={needsFlip ? pathDRev : pathD}
            fill="none"
            stroke={color}
            strokeWidth={4 * scale}
            strokeOpacity={0.35}
            strokeDasharray={labelText ? `${dashLen} ${gapLen}` : undefined}
            strokeDashoffset={
              labelText ? (dashLen - gapStart + circ) % circ : undefined
            }
          />
        );
      })()}
      {renderArrow(finalDirection)}
      {label && (
        <text fill={color} fontSize={11 * scale} fontWeight={800}>
          <textPath
            href={`#${
              finalDirection > 90 && finalDirection < 270
                ? "wind-ring-path-rev"
                : "wind-ring-path"
            }`}
            startOffset={(() => {
              const circ = 2 * Math.PI * radius;
              const needsFlip = finalDirection > 90 && finalDirection < 270;
              const baseAngle = (finalDirection + 90) % 360;
              // Match swell logic for text start offset as well
              const delta = 40 * scale;
              const extra = needsFlip ? -80 * scale : 0;
              const baseOffset = (baseAngle / 360) * circ + delta + extra; // desired center
              const centerOffset = needsFlip ? circ - baseOffset : baseOffset;
              const estimate = (t: string | null) =>
                (t?.length ?? 0) * (11 * scale) * 0.55;
              const labelLen = label ? estimate(label) : 0;
              const labelStart = (centerOffset - labelLen / 2 + circ) % circ;
              return labelStart;
            })()}
            dy={3 * scale}
          >
            {label}
          </textPath>
        </text>
      )}
    </svg>
  );
};

type Props = { beachId?: string | number };

const InteractiveMap: React.FC<Props> = ({ beachId }) => {
  const {
    beaches: beaches,
    setBeaches,
    favoriteIds,
    hoverCardId,
  } = useMapFilters();

  // Debug: Log beaches count whenever it changes
  React.useEffect(() => {
    console.log(`🏖️ Beaches from context: ${beaches.length} beaches`);
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
    popupData,
    setPopupData,
    popupId,
    popupRef,
    map,
    setMap,
    filters,
    setFilters,
    selectedDate,
    selectedHour,
    showMap,
    setShowMap,
  } = useMapFilters();
  const [located, setLocated] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [surfIntensity, setSurfIntensity] = React.useState<
    Record<string | number, number>
  >({});
  // Cache surf intensity data for multiple dates
  const surfIntensityCacheRef = React.useRef<
    Record<string, Record<string | number, number>>
  >({});
  const [swellDirections, setSwellDirections] =
    React.useState<SwellDirectionSet | null>(null);
  const [windDirection, setWindDirection] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState<number>(6);
  const zoomRafRef = React.useRef<number | null>(null);
  const lastHoverInternalIdRef = React.useRef<number | null>(null);
  // Map ref must be declared before helpers that depend on it
  const mapRef = React.useRef<MapRef>(null);
  // Manage a single smooth camera transition once the map/container are ready
  const centerRafRef = React.useRef<number | null>(null);
  const readinessRafRef = React.useRef<number | null>(null);
  // Removed static offset; compute exact center using symmetric pixel bounds

  const easeToWhenReady = React.useCallback(
    (
      target: { longitude: number; latitude: number },
      zoomLevel: number = 16,
      duration: number = 500
    ) => {
      const cancelPending = () => {
        if (centerRafRef.current != null) {
          cancelAnimationFrame(centerRafRef.current as any);
          centerRafRef.current = null;
        }
        if (readinessRafRef.current != null) {
          cancelAnimationFrame(readinessRafRef.current as any);
          readinessRafRef.current = null;
        }
      };
      cancelPending();

      const attempt = () => {
        const ref = mapRef.current as any;
        const mapInstance: any = ref?.getMap?.() ?? ref;
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
    [mapRef]
  );
  const hoverRafRef = React.useRef<number | null>(null);
  const lastHoverFeatureIdRef = React.useRef<string | number | null>(null);
  const suppressCountsRef = React.useRef(0);
  const mapLastHoverInternalIdRef = React.useRef<number | null>(null);
  const [hoverClusterId, setHoverClusterId] = React.useState<number | null>(
    null
  );
  const userMovedRef = React.useRef(false);
  const suppressMoveRef = React.useRef(false);
  const prevEffectiveIdRef = React.useRef<string | null>(null);
  const prevFilterSignatureRef = React.useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [popupInfo, setPopupInfo] = React.useState<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);
  const { isOverlay, setIsOverlay } = useSearchContext();
  // Ensure we bind cluster layer click handlers once style/layers are ready
  const clusterHandlersBoundRef = React.useRef(false);
  // const [openPanel, setOpenPanel] = React.useState<"filters" | "legend" | null>(
  //   null
  // );
  // const togglePanel = (panel: "filters" | "legend") => {
  //   setOpenPanel((prev) => (prev === panel ? null : panel));
  // };

  const mapToId: Record<
    string,
    { id: number; longitude: number; latitude: number; properties: any }
  > = React.useMemo(() => ({}), []);

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

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        console.log("Loading beaches from API...");
        // If beaches are already loaded in context, skip fetching
        if (beaches && beaches.length > 0) {
          return;
        }
        const res = await fetch("/api/beaches");

        // Check if response is ok
        if (!res.ok) {
          console.error(
            "Failed to load beaches - HTTP error:",
            res.status,
            res.statusText
          );
          return;
        }

        const json = await res.json();
        console.log("Beaches API response:", json);

        if (!cancelled && json?.success && Array.isArray(json.data)) {
          console.log("InteractiveMap: loaded beaches", json.data.length);
          if (json.data.length > 0) {
            console.log("Sample beach:", json.data[0]);

            // Check how many beaches have grid_id
            const beachesWithGridId = json.data.filter(
              (b: any) => b.grid_id != null
            ).length;
            console.log(
              `Beaches with grid_id: ${beachesWithGridId} / ${json.data.length}`
            );
          }
          setBeaches(json.data as BeachPoint[]);
        } else {
          // Only log error if response is not empty - empty {} might mean API is still initializing
          if (Object.keys(json || {}).length > 0 && json.length > 0) {
            console.error(
              "Failed to load beaches - invalid response structure:",
              json
            );
          } else {
            console.warn(
              "Beaches API returned empty response - API may still be initializing"
            );
          }
        }
      } catch (e) {
        console.error("Failed to load beaches for map", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [beaches, setBeaches]);

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
    if ((mapInstance as any).__lastClusterHoverId != null) {
      try {
        if (mapInstance.getSource("beaches")) {
          mapInstance.setFeatureState(
            {
              source: "beaches",
              id: (mapInstance as any).__lastClusterHoverId,
            },
            { hover: false }
          );
        }
      } catch {}
      (mapInstance as any).__lastClusterHoverId = null;
    }

    if (!hoverCardId) {
      // No card hovered -> ensure popup closed and highlights cleared (done above)
      setPopupInfo(null);
      popupId.current = null;
      popupRef.current = null as any;
      setHoverClusterId(null);
      return;
    }

    // Default: close any previous popup. We'll reopen below if unclustered.
    setPopupInfo(null);
    popupId.current = null;
    popupRef.current = null as any;

    // Detect whether the hovered beach is currently unclustered by inspecting rendered features
    try {
      const entry = (mapToId as any)[hoverCardId];
      if (!entry) return;
      const px = mapInstance.project([entry.longitude, entry.latitude]);
      const pad = 12;
      const unclustered = mapInstance
        .queryRenderedFeatures(
          [
            [px.x - pad, px.y - pad],
            [px.x + pad, px.y + pad],
          ] as any,
          { layers: ["unclustered-point"] as any }
        )
        .some(
          (f: any) => String(f?.properties?.id) === String(entry.properties.id)
        );

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
        } as any;
        return;
      }

      // Otherwise, highlight the nearest cluster bubble around that point (centroid may be offset)
      {
        try {
          const radius = 150; // px search window
          const clusters = mapInstance.queryRenderedFeatures(
            [
              [px.x - radius, px.y - radius],
              [px.x + radius, px.y + radius],
            ] as any,
            { layers: ["clusters"] as any }
          ) as any[];

          if (Array.isArray(clusters) && clusters.length > 0) {
            let best: any = null;
            let bestDist = Number.POSITIVE_INFINITY;
            for (const c of clusters) {
              const coords = (c.geometry?.coordinates ?? []) as [
                number,
                number
              ];
              if (!coords || coords.length !== 2) continue;
              const p = mapInstance.project(coords as any);
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
              popupRef.current = null as any;
            }
          }
        } catch {}
      }
    } catch {}
  }, [hoverCardId, mapToId]);

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

    // Helper to fetch and cache surf intensity for a specific date
    const fetchSurfIntensityForDate = async (
      date: Date
    ): Promise<Record<string | number, number>> => {
      const dateStr = date.toISOString().split("T")[0];

      // Check cache first
      if (surfIntensityCacheRef.current[dateStr]) {
        console.log(`💾 Using cached surf intensity for ${dateStr}`);
        return surfIntensityCacheRef.current[dateStr];
      }

      try {
        console.log(`🗺️  Fetching surf intensity for date: ${dateStr}`);
        const res = await fetch(`/api/surf-intensity?date=${dateStr}`);

        if (!res.ok) {
          console.error("Failed to fetch surf intensity:", res.status);
          return {};
        }

        const json = await res.json();

        if (json?.success && json.data) {
          // Cache the result
          surfIntensityCacheRef.current[dateStr] = json.data;
          console.log(
            `✅ Loaded and cached surf intensity for ${dateStr} (${
              Object.keys(json.data).length
            } beaches)`
          );
          return json.data;
        }

        return {};
      } catch (e) {
        console.error(`Failed to load surf intensity for ${dateStr}`, e);
        return {};
      }
    };

    const loadSurfIntensity = async () => {
      // Load current date first
      const currentData = await fetchSurfIntensityForDate(selectedDate);

      if (!cancelled) {
        setSurfIntensity(currentData);
      }

      // Preload adjacent dates in the background (±3 days)
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
          if (!cancelled) {
            console.log(
              ` Preloaded surf intensity for ${preloadDates.length} adjacent dates`
            );
          }
        })
        .catch((err) => console.warn("Preload error:", err));
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
  const initialView = React.useMemo(
    () => ({ longitude: -122.4, latitude: 37.8, zoom: 6 }),
    []
  );
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

  const filteredBeaches = React.useMemo(() => {
    console.log(
      "Filtering beaches - total:",
      beaches.length,
      "filters:",
      filters.size
    );

    if (beaches.length === 0) {
      console.warn("⚠️ beaches array is empty! Map will show no dots.");
    }
    let baseFiltered = beaches.filter((b) => {
      if (b.features?.INLND_AREA) return false;
      if (!filters.size) {
        return true;
      }
      // always make selected beach visible regardless of filters
      if (selected?.id === b.id) return true;
      const f = b.features || {};
      for (const key of filters) {
        if (!f[key]) return false;
      }
      return true;
    });
    if (selectedTab === "saved") {
      baseFiltered = baseFiltered.filter((b) => favoriteIds.has(String(b.id)));
    }
    console.log("Filtered beaches:", baseFiltered.length);
    return baseFiltered;
  }, [beaches, filters, selected, selectedTab, favoriteIds]);

  const beachesGeoJSON = React.useMemo(() => {
    console.log("=== Building GeoJSON ===");
    console.log(
      "surfIntensity object has",
      Object.keys(surfIntensity).length,
      "entries"
    );
    console.log("filteredBeaches has", filteredBeaches.length, "beaches");

    // Sample the first few beach IDs and check if they have intensity
    const firstFiveBeaches = filteredBeaches.slice(0, 5);
    console.log("First 5 beach IDs and their intensities:");
    firstFiveBeaches.forEach((b) => {
      const intensity = surfIntensity[b.id];
      console.log(
        `  Beach ${b.id}: ${
          intensity !== undefined ? intensity : "undefined (will use 0)"
        }`
      );
    });

    const features = filteredBeaches.map((b, idx) => {
      const intensity = surfIntensity[b.id] || 0;
      mapToId[b.id] = {
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
        geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
        properties: {
          id: b.id,
          name: b.name,
          county: b.county,
          surfIntensity: intensity,
        },
      };
    });
    console.log("BUILD ID MAP", mapToId);
    console.log("Generated GeoJSON with", features.length, "features");

    // Debug: Count features by intensity range
    const intensityCounts = {
      noData: features.filter((f) => f.properties.surfIntensity === 0).length,
      small: features.filter(
        (f) => f.properties.surfIntensity > 0 && f.properties.surfIntensity < 3
      ).length,
      moderate: features.filter(
        (f) => f.properties.surfIntensity >= 3 && f.properties.surfIntensity < 6
      ).length,
      big: features.filter((f) => f.properties.surfIntensity >= 6).length,
    };
    console.log("Surf intensity distribution:", intensityCounts);

    return {
      type: "FeatureCollection",
      features,
    } as any;
  }, [filteredBeaches, surfIntensity, mapToId]);

  // Helper function to determine marker color based on surf intensity (in feet)
  const getMarkerColor = (intensity: number): string => {
    if (intensity === 0) return "#9ca3af"; // gray for no data
    if (intensity < 2) return "#60a5fa"; // light blue for small (< 2ft)
    if (intensity < 4) return "#3b82f6"; // blue for moderate (2-4ft)
    if (intensity < 6) return "#f59e0b"; // orange for good (4-6ft)
    if (intensity < 8) return "#ef4444"; // red for excellent (6-8ft)
    return "#dc2626"; // dark red for epic (8ft+)
  };

  // After beaches load, align map to page context (selected beach if provided, otherwise fit to all)
  React.useEffect(() => {
    if (!beaches.length) return;
    setMap(mapRef.current?.getMap?.());
    if (!map) return;

    const beachFromPath = (() => {
      const parts = (pathname || "").split("/").filter(Boolean);
      // Extract beach ID from the first URL segment (which could be "beach-name--id" or just "id")
      if (parts.length > 0) {
        const extracted = extractBeachId(parts[0]);
        console.log(
          "InteractiveMap: Extracted beach ID from URL:",
          parts[0],
          "->",
          extracted
        );
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
      console.log("InteractiveMap: Looking for beach with ID:", effectiveId);
      const match = findBeachMatch(effectiveId);
      if (match) {
        console.log(
          "InteractiveMap: Found beach match, zooming to:",
          match,
          match.name
        );
        suppressMoveRef.current = true;
        easeToWhenReady(
          { longitude: match.longitude, latitude: match.latitude },
          16,
          500
        );
        const currentSelectedId = selectedRef.current?.id;
        if (String(currentSelectedId ?? "") !== String(match.id)) {
          setSelected(match);
        }
        prevEffectiveIdRef.current = effectiveKey;
        return;
      } else {
        console.log(
          "InteractiveMap: No beach match found for ID:",
          effectiveId
        );
      }
    }

    // Otherwise, optionally use user's location once
    if (!located && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocated(true);
          suppressMoveRef.current = true;
          map.easeTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 10,
            duration: 600,
          });
          setZoom(10);
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

      const ref = mapRef.current;
      const mapInstance: any = ref?.getMap?.() ?? ref;
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
  }, [findBeachMatch, fullMapPage, setShowMap]);

  // if (editPage || (forecastPage && !smallScreen)) {
  //   return <></>;
  // }

  // if (editPage) {
  //   return <></>;
  // }

  React.useEffect(() => {
    console.log(
      "FIXING BUG: CLICK CARD",
      popupData,
      popupId.current,
      popupRef,
      popupInfo,
      popupId.current ? mapToId[popupId.current].id : null,
      popupRef?.current?.id
    );
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
    const ref = mapRef.current as any;
    const mapInstance: any = ref?.getMap?.() ?? ref;
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
  }, [showMap, selected, easeToWhenReady]);

  const filterCount = filters?.size ?? 0;

  // Show legend by default on non-/beaches pages (overview/forecast)
  React.useEffect(() => {
    try {
      if (fullMapPage && !openPanel) {
        setOpenPanel("legend");
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
        }}
        mapStyle={MAP_STYLE_URL}
        antialias={false}
        fadeDuration={0}
        maxZoom={16}
        minZoom={3}
        dragRotate={false}
        attributionControl={false}
        interactiveLayerIds={[
          "clusters",
          "cluster-count",
          "clusters-hover",
          "unclustered-point",
          "unclustered-point-label",
        ]}
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

          map.on("movestart", hideCounts);

          map.on("moveend", () => {
            if ((suppressCountsRef.current ?? 0) === 0) {
              showCounts();
            }
          });

          // Track zoom level for ring scaling
          map.on("zoom", () => {
            const z = map.getZoom();
            if (zoomRafRef.current != null) {
              cancelAnimationFrame(zoomRafRef.current as any);
            }
            zoomRafRef.current = requestAnimationFrame(() => {
              setZoom(z);
              zoomRafRef.current = null;
            });
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

            const onClusterClick = (ev: any) => {
              const feat = ev?.features && ev.features[0];
              const coords = (feat?.geometry as any)?.coordinates as
                | [number, number]
                | undefined;
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
                  center: (coords as any) ?? ev.lngLat,
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

          // Attempt immediate bind; also re-attempt on style/sources ready
          bindClusterHandlers();
          map.on("styledata", bindClusterHandlers);
          map.on("sourcedata", bindClusterHandlers);
          map.on("idle", bindClusterHandlers);

          // Hover for individual points (not clusters)
          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
            console.log(
              "FIXING BUG: mouse leave",
              popupId.current,
              popupRef.current
            );
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

          map.on("click", (ev: any) => {
            // If clicking a cluster or point layer, let dedicated handlers manage it
            try {
              const p = ev?.point ?? map.project(ev?.lngLat);
              const hits = map.queryRenderedFeatures(
                [
                  [p.x - 20, p.y - 20],
                  [p.x + 20, p.y + 20],
                ] as any,
                {
                  layers: [
                    "clusters",
                    "cluster-count",
                    "clusters-hover",
                    "unclustered-point",
                  ] as any,
                }
              );
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

          map.on("mousemove", "unclustered-point", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const fid = feature.properties?.id;
            if (lastHoverFeatureIdRef.current === fid) return;
            lastHoverFeatureIdRef.current = fid;
            if (hoverRafRef.current != null) {
              cancelAnimationFrame(hoverRafRef.current as any);
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
          });
          // Provide clear hover indication for clusters to communicate interactivity
          const setHoverClusterFromEvent = (ev: any) => {
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
          const mapInstance: any = mapRef.current?.getMap?.();
          const feature = e.features && e.features[0];
          if (!mapInstance || !feature) return;

          // Handle cluster clicks robustly
          const isCluster =
            feature &&
            feature.properties &&
            (feature.properties as any).cluster;
          const isClusterCount =
            feature && feature.layer?.id === "cluster-count";
          const isClusterHover =
            feature && feature.layer?.id === "clusters-hover";

          if (isCluster || isClusterCount) {
            const clusterId = feature.properties?.cluster_id;
            const source: any = mapInstance.getSource("beaches");
            if (source && clusterId != null) {
              const coords = (feature.geometry as any).coordinates;
              try {
                const current = mapInstance.getZoom?.() ?? 5;
                mapInstance.easeTo({
                  center: coords,
                  zoom: Math.min(current + 2, 16),
                  duration: 200,
                });
              } catch {}
              try {
                console.info("cluster click ->", { clusterId, coords });
              } catch {}
              (source as any).getClusterExpansionZoom(
                clusterId,
                (err: any, expansionZoom: number) => {
                  if (err) return;
                  const targetZoom = Math.max(expansionZoom, 12.5);
                  try {
                    mapInstance.easeTo({
                      center: coords,
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
          const props: any = feature.properties || {};
          const point: BeachPoint = {
            id: props.id,
            name: props.name,
            county: props.county,
            longitude: (feature.geometry as any).coordinates[0],
            latitude: (feature.geometry as any).coordinates[1],
          };

          console.log("ENTER CLICK SELECTED BEACH 1");
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
          position="bottom-right"
          showCompass={false}
          visualizePitch={false}
        />

        {/* Clustered beach points */}
        {filteredBeaches.length > 0 && (
          <Source
            key={`beaches-${Object.keys(surfIntensity).length}`}
            id="beaches"
            type="geojson"
            data={beachesGeoJSON}
            cluster={true}
            clusterMaxZoom={12}
            clusterRadius={40}
          >
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"] as any}
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
                  [
                    "+",
                    ["step", ["get", "point_count"], 12, 50, 16, 100, 20],
                    2,
                  ],
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
              filter={
                [
                  "all",
                  ["has", "point_count"],
                  ["==", ["get", "cluster_id"], hoverClusterId ?? -1],
                ] as any
              }
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
              filter={["has", "point_count"] as any}
              layout={{
                // use the raw point_count (exact) and convert to string to avoid layout/abbrev races
                "text-field": ["to-string", ["get", "point_count"]],
                "text-size": 12,
                // critical — allow overlap & ignore placement so the label renders immediately
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                // optionally specify a bold system font or style available in your style
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
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
              filter={["!has", "point_count"] as any}
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
                    "#e5e7eb", // gray-200 for no data (bg-highlight-3)
                    0.1,
                    "#4ade80", // green-400 for small (< 3ft)
                    3,
                    "#fb923c", // orange-400 for moderate (3-6ft)
                    6,
                    "#f87171", // red-400 for big (>= 6ft)
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
              filter={["!has", "point_count"] as any}
              layout={{
                "text-field": ["get", "name"],
                "text-offset": [0, 1.8],
                "text-size": 10,
                "text-anchor": "top",
                visibility: "visible",
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
        )}

        {selected &&
          swellDirections &&
          [
            swellDirections.primary,
            swellDirections.secondary,
            swellDirections.tertiary,
          ].some((d) => typeof d === "number") &&
          (() => {
            // Calculate scale based on zoom level
            // Hide rings when the point is not visible (clustered or off-screen)
            if (!selectedPointVisible) {
              return null;
            }
            // Also hide rings below zoom 9 for cleaner view
            if (zoom < 9) {
              return null;
            }

            const scale = zoom >= 14 ? 1 : zoom / 14;
            const ringSize = 160 * scale;
            const outerRadius =
              (typeof windDirection === "number" ? 110 : 76) * scale;
            // Integrate compass labels inside the overlay near the center
            const labelDistance = 130 * scale;
            const centerOffset = ringSize / 2;
            const blurOuter = outerRadius;
            const markerHole = 8 * scale;
            const haloPadding = Math.max(blurOuter - ringSize / 2, 0);
            const blurMask = `radial-gradient(circle ${blurOuter}px at center, transparent 0, transparent ${markerHole}px, black ${
              markerHole + 2 * scale
            }px, black ${blurOuter}px, transparent ${blurOuter + 1}px)`;
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
                      openPanel === "legend" ? "-top-25" : "-top-19"
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
                      className="pointer-events-none absolute rounded-full bg-white/15 shadow-[0_8px_28px_rgba(0,0,0,0.08)] border border-border/40"
                      aria-hidden="true"
                      style={{
                        top: -haloPadding,
                        left: -haloPadding,
                        right: -haloPadding,
                        bottom: -haloPadding,
                        backdropFilter: "blur(1px)",
                        WebkitBackdropFilter: "blur(1px)",
                        maskImage: blurMask,
                        WebkitMaskImage: blurMask,
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
                    {/* Compass ring removed; integrated labels sit closer to wind ring */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      aria-hidden="true"
                    >
                      <div className="absolute left-1/2 top-0 h-6 w-[1px] -translate-x-1/2 bg-border/35" />
                      <div className="absolute left-1/2 bottom-0 h-6 w-[1px] -translate-x-1/2 bg-border/35" />
                      <div className="absolute top-1/2 left-0 w-6 h-[1px] -translate-y-1/2 bg-border/35" />
                      <div className="absolute top-1/2 right-0 w-6 h-[1px] -translate-y-1/2 bg-border/35" />
                    </div>
                    {/* Basemap place label mask removed to avoid covering marker */}
                    {openPanel === "legend" && (
                      <div className="pointer-events-none absolute inset-0">
                        {cardinalLabels.map(({ id, style }) => (
                          <span
                            key={id}
                            className="absolute rounded-md px-1.5 py-[1px] text-[11px] font-black uppercase text-slate-900 dark:text-slate-100 bg-white/90 dark:bg-slate-900/85 border border-border select-none"
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
                      scale={scale}
                      className="absolute inset-0"
                    />
                    <WindRing
                      direction={windDirection}
                      label={overlayLabels?.wind ?? null}
                      scale={scale}
                      className="absolute inset-0"
                    />
                  </div>
                </div>
              </Marker>
            );
          })()}

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
                                  setFilters((prev) => {
                                    const next = new Set(prev);
                                    if (che) next.add(key);
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
              )}
              {showFilters && (
                <div className="flex justify-center gap-2 px-1 py-2 rounded-b-xl">
                  {filters.size > 0 && (
                    <button
                      className="text-[11px] font-semibold px-2 py-1 rounded-xl border bg-highlight-3 dark:bg-background border border-border/90 hover:bg-highlight-5 dark:hover:bg-highlight-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters(new Set());
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
          <div className="absolute top-21 left-3 @min-4xl:top-3 flex flex-col gap-3 z-40">
            {selected && (
              <button
                type="button"
                aria-label="Refocus map on beach"
                onClick={() => {
                  const ref = mapRef.current;
                  const mapInstance: any = ref?.getMap?.() ?? ref;
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
                className="bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition"
              >
                <MapPin className="w-5 h-5 mx-auto" />
              </button>
            )}
            {fullMapPage && (
              <button
                type="button"
                aria-label="toggle filters"
                onClick={() => {
                  togglePanel("filters");
                  setShowFilters(true);
                }}
                className={cn(
                  "relative bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                  openPanel === "filters" && "bg-blue-300",
                  !fullMapPage && "hidden @min-4xl:block"
                )}
              >
                <SlidersHorizontal className="w-5 h-5 mx-auto" />
                {filterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background dark:ring-highlight-5">
                    {filterCount}
                  </span>
                )}
              </button>
            )}
            {fullMapPage && (
              <button
                type="button"
                aria-label="toggle legend"
                onClick={() => togglePanel("legend")}
                className={cn(
                  "bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                  openPanel === "legend" && "bg-blue-300",
                  !fullMapPage && "hidden @min-4xl:block"
                )}
              >
                <Info className="w-5 h-5 mx-auto" />
              </button>
            )}
            {fullMapPage && (
              <button
                type="button"
                aria-label="open map"
                className="icon-button p-3 hover:bg-blue-200 dark:hover:bg-blue-400"
                onClick={() => {
                  setIsOverlay(false);
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
            className={cn(
              "z-80 bg-background rounded-full p-3 shadow-lg border border-border hover:bg-blue-200 dark:hover:bg-blue-400 absolute left-3 bottom-3"
              // showMap ? "top-4" : "top-[50%] transform -translate-y-1/2"
            )}
            onClick={() => {
              if (openPanel) setOpenPanel(null);
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
          {fullMapPage && openPanel === "legend" && (
            <motion.div
              key="legend"
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
              {(showMap || smallScreen) && (
                <div
                  className={cn(
                    "absolute top-21 right-3 max-w-[200px] @min-4xl:top-3"
                  )}
                >
                  <div className="rounded-lg border border-border/60 bg-background/90 backdrop-blur px-3 py-2 shadow">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Direction Rings
                    </span>
                    <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground">
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
                                        setFilters((prev) => {
                                          const next = new Set(prev);
                                          if (che) next.add(key);
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
                            setFilters(new Set());
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
        {/* FILTER PANEL — slides from bottom */}

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
              bottom: 60px;
            }

            .maplibregl-ctrl.maplibregl-ctrl-group {
              margin-bottom: 60px;
            }
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
