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
  SlidersHorizontal,
  Info,
  MapPin,
  Minimize2,
} from "lucide-react";
import { useMapFilters } from "../context/MapFilterContext";
import {
  MAP_FOCUS_EVENT,
  type MapFocusEventDetail,
} from "../general/mapEvents";
import { motion, AnimatePresence } from "framer-motion";
import FocusMapButton from "../general/FocusMapButton";

type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
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
  scale?: number;
  className?: string;
}> = ({ directions, scale = 1, className = "" }) => {
  const size = 160 * scale;
  const center = size / 2;
  const rings: Array<{
    key: "primary" | "secondary" | "tertiary";
    radius: number;
    color: string;
  }> = [
    { key: "primary", radius: 36 * scale, color: "#2563eb" },
    { key: "secondary", radius: 56 * scale, color: "#16a34a" },
    { key: "tertiary", radius: 76 * scale, color: "#f97316" },
  ];

  const renderArrow = (
    direction: number,
    radius: number,
    color: string
  ): React.ReactNode => {
    const normalized = ((direction % 360) + 360) % 360;
    const arrowLength = 14 * scale;
    const arrowWidth = 12 * scale;
    return (
      <g
        key={`${color}-${radius}`}
        transform={`rotate(${normalized} ${center} ${center})`}
      >
        <g transform={`translate(${center} ${center - radius})`}>
          <polygon
            points={`0 ${-arrowLength / 2} ${-arrowWidth / 2} ${
              arrowLength / 2
            } ${arrowWidth / 2} ${arrowLength / 2}`}
            fill={color}
            opacity={0.9}
          />
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
      {rings.map(({ key, radius, color }) => (
        <g key={key}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={4 * scale}
            strokeOpacity={0.35}
          />
          {typeof directions[key] === "number" &&
            renderArrow(directions[key] as number, radius, color)}
        </g>
      ))}
    </svg>
  );
};

export const WindRing: React.FC<{
  direction: number | null | undefined;
  scale?: number;
  className?: string;
}> = ({ direction, scale = 1, className = "" }) => {
  const size = 160 * scale;
  const center = size / 2;
  const radius = 96 * scale;
  const color = "#a855f7"; // purple-500

  const renderArrow = (dir: number): React.ReactNode => {
    const normalized = ((dir % 360) + 360) % 360;
    const arrowLength = 14 * scale;
    const arrowWidth = 12 * scale;
    return (
      <g transform={`rotate(${normalized} ${center} ${center})`}>
        <g transform={`translate(${center} ${center - radius})`}>
          <polygon
            points={`0 ${-arrowLength / 2} ${-arrowWidth / 2} ${
              arrowLength / 2
            } ${arrowWidth / 2} ${arrowLength / 2}`}
            fill={color}
            opacity={0.9}
          />
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
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4 * scale}
        strokeOpacity={0.35}
      />
      {typeof direction === "number" && renderArrow(direction)}
    </svg>
  );
};

type Props = { beachId?: string | number };

const InteractiveMap: React.FC<Props> = ({ beachId }) => {
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [selected, setSelected] = React.useState<BeachPoint | null>(null);
  const selectedRef = React.useRef<BeachPoint | null>(null);
  const [storedSelectionId, setStoredSelectionId] = React.useState<
    string | null
  >(null);
  const {
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
  const [swellDirections, setSwellDirections] =
    React.useState<SwellDirectionSet | null>(null);
  const [windDirection, setWindDirection] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState<number>(6);
  const userMovedRef = React.useRef(false);
  const suppressMoveRef = React.useRef(false);
  const prevEffectiveIdRef = React.useRef<string | null>(null);
  const prevFilterSignatureRef = React.useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const mapRef = React.useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = React.useState<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);
  const [openPanel, setOpenPanel] = React.useState<"filters" | "legend" | null>(
    null
  );

  const togglePanel = (panel: "filters" | "legend") => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const mapToId: Record<
    string,
    { id: number; longitude: number; latitude: number; properties: any }
  > = React.useMemo(() => ({}), []);

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
  }, []);

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

  // Fetch surf intensity when date changes
  React.useEffect(() => {
    if (!selectedDate) {
      setSurfIntensity({});
      return;
    }

    let cancelled = false;
    const loadSurfIntensity = async () => {
      try {
        // Format date as YYYY-MM-DD to match how DatePicker does it
        const dateStr = selectedDate.toISOString().split("T")[0];

        console.log("Fetching surf intensity for date:", dateStr);

        // Use API route instead of direct Supabase query to reduce egress
        const res = await fetch(`/api/surf-intensity?date=${dateStr}`);

        if (!res.ok) {
          console.error("Failed to fetch surf intensity:", res.status);
          return;
        }

        const json = await res.json();

        if (!cancelled && json?.success && json.data) {
          console.log("Loaded surf intensity from", json.source);
          setSurfIntensity(json.data);
        }
      } catch (e) {
        console.error("Failed to load surf intensity", e);
      }
    };

    loadSurfIntensity();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  React.useEffect(() => {
    let cancelled = false;

    const loadSwellDirections = async () => {
      if (!selected) {
        setSwellDirections(null);
        setWindDirection(null);
        return;
      }

      try {
        const { fetchBeachByIdLoose, fetchBeachForecast } = await import(
          "@/lib/supabase"
        );
        const beach = await fetchBeachByIdLoose(String(selected.id));
        const resolvedId = beach?.id ? String(beach.id) : String(selected.id);

        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

        const selectedDateObj =
          selectedDate instanceof Date
            ? new Date(selectedDate.getTime())
            : selectedDate
            ? new Date(selectedDate)
            : null;

        if (selectedDateObj && !Number.isNaN(selectedDateObj.getTime())) {
          selectedDateObj.setHours(0, 0, 0, 0);
          startWindow = selectedDateObj;
          endWindow = new Date(selectedDateObj.getTime() + 24 * 60 * 60 * 1000);
        }

        const forecast = await fetchBeachForecast(
          resolvedId,
          startWindow,
          endWindow
        );

        let baseRow =
          Array.isArray(forecast) && forecast.length ? forecast[0] : null;

        if (Array.isArray(forecast) && forecast.length > 0) {
          const normalizedHour = (h: number) => ((h % 24) + 24) % 24;
          const targetHour = (() => {
            if (typeof selectedHour === "number")
              return normalizedHour(selectedHour);
            if (selectedDateObj) return 12;
            return normalizedHour(now.getHours());
          })();

          let best = forecast[0];
          let bestDiff = Number.POSITIVE_INFINITY;
          for (const row of forecast) {
            const rowHour = normalizedHour(new Date(row.timestamp).getHours());
            let diff = Math.abs(rowHour - targetHour);
            if (diff > 12) diff = 24 - diff;
            if (diff < bestDiff) {
              bestDiff = diff;
              best = row;
            }
          }
          baseRow = best;
        }

        if (!cancelled) {
          if (baseRow?.swell) {
            setSwellDirections({
              primary: baseRow.swell.primary?.direction ?? null,
              secondary: baseRow.swell.secondary?.direction ?? null,
              tertiary: baseRow.swell.tertiary?.direction ?? null,
            });
          } else {
            setSwellDirections(null);
          }

          // Fetch wind direction
          if (baseRow?.conditions?.windDirection != null) {
            setWindDirection(baseRow.conditions.windDirection);
          } else {
            setWindDirection(null);
          }
        }
      } catch (err) {
        console.error("Failed to load swell directions for map", err);
        if (!cancelled) {
          setSwellDirections(null);
          setWindDirection(null);
        }
      }
    };

    loadSwellDirections();

    return () => {
      cancelled = true;
    };
  }, [selected, selectedDate, selectedHour]);

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
    const baseFiltered = beaches.filter((b) => {
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
    console.log("Filtered beaches:", baseFiltered.length);
    return baseFiltered;
  }, [beaches, filters, selected]);

  const beachesGeoJSON = React.useMemo(() => {
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
        map.easeTo({
          center: [match.longitude, match.latitude],
          zoom: 16,
          duration: 500,
        });
        setZoom(16);
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
      const mapInstance = ref?.getMap?.() ?? ref;
      if (!mapInstance || typeof mapInstance.easeTo !== "function") return;

      if (fullMapPage && isDesktop) {
        setShowMap(true);
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
      mapInstance.easeTo({
        center: [match.longitude, match.latitude],
        zoom: 16,
        duration: 500,
      });
      setZoom(16);
      setSelected(match);
      prevEffectiveIdRef.current = String(match.id);
    };

    window.addEventListener(MAP_FOCUS_EVENT, handleRefocus as EventListener);
    return () =>
      window.removeEventListener(
        MAP_FOCUS_EVENT,
        handleRefocus as EventListener
      );
  }, [findBeachMatch, fullMapPage, isDesktop]);

  // if (editPage || (forecastPage && !smallScreen)) {
  //   return <></>;
  // }

  // if (editPage) {
  //   return <></>;
  // }

  React.useEffect(() => {
    console.log("FIXING BUG");
    if (popupData) {
      if (popupId.current) {
        console.log("ENTER SAME");
        if (map)
          map.setFeatureState(
            { source: "beaches", id: mapToId[popupId.current].id },
            { hover: false }
          );
        setPopupInfo(null);
        popupId.current = null;
        popupRef.current = null;
      }
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
    } else {
      setPopupInfo(null);
      popupId.current = null;
      popupRef.current = null;
    }
  }, [popupData]);

  if (editPage || (isDesktop && fullMapPage && !showMap)) {
    return <></>;
  }

  return (
    <aside
      id="map-container"
      className={cn(
        "fixed w-full transition-all duration-300",
        "@min-4xl:sticky @min-4xl:top-[7rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-3 @min-4xl:h-[calc(100vh-7rem)] flex",
        !isDesktop && "min-h-[calc(100dvh-6.25rem)]"
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
          borderRadius: isDesktop ? "12px" : "0px",
        }}
        mapStyle={MAP_STYLE_URL}
        maxZoom={16}
        minZoom={3}
        dragRotate={false}
        attributionControl={false}
        interactiveLayerIds={[
          "clusters",
          "cluster-count",
          "unclustered-point",
          "unclustered-point-label",
        ]}
        onMouseEnter={(e) => {
          const map = e.target;
          if (e.features?.length) {
            const f = e.features[0];
            if (
              f.layer.id === "clusters" ||
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

          map.on("moveend", showCounts);

          // Track zoom level for ring scaling
          map.on("zoom", () => {
            const currentZoom = map.getZoom();
            setZoom(currentZoom);
          });

          map.on("movestart", () => {
            if (suppressMoveRef.current) {
              suppressMoveRef.current = false;
              return;
            }
            userMovedRef.current = true;
          });

          // Cluster clicks are now handled in the React onClick handler
          // No need for direct map event listeners

          // Hover for individual points (not clusters)
          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
            console.log("VALS", popupId, popupRef.current);
            if (popupId.current) {
              const beach = mapToId[popupId.current];
              map.setFeatureState(
                { source: "beaches", id: beach.id },
                { hover: false }
              );
              setPopupInfo(null);
              popupId.current = null;
              popupRef.current = null;
            }
          });

          map.on("click", () => {
            // properly clear pop up if it still exists
            if (popupId.current) {
              const beach = mapToId[popupId.current];
              map.setFeatureState(
                { source: "beaches", id: beach.id },
                { hover: false }
              );
              setPopupInfo(null);
              setPopupData(null);
              popupId.current = null;
              popupRef.current = null;
            }
          });

          map.on("mousemove", "unclustered-point", (event) => {
            const originalEvent = event.originalEvent as
              | MouseEvent
              | PointerEvent
              | TouchEvent
              | undefined;
            if (originalEvent) {
              if ("touches" in originalEvent) {
                return;
              }
              if (
                "pointerType" in originalEvent &&
                originalEvent.pointerType !== "mouse"
              ) {
                return;
              }
              if (
                "buttons" in originalEvent &&
                typeof originalEvent.buttons === "number" &&
                originalEvent.buttons !== 0
              ) {
                return;
              }
            }
            const feature = event.features?.[0];
            if (!feature) return;
            const coordinates = (feature.geometry as any).coordinates;

            if (popupId.current) {
              console.log("ENTER SAME");
              map.setFeatureState(
                { source: "beaches", id: mapToId[popupId.current].id },
                { hover: false }
              );
              setPopupData(null);
              setPopupInfo(null);
              popupId.current = null;
              popupRef.current = null;
            }

            // if (popupId.current && popupId.current !== feature.properties.id) {
            //   map.setFeatureState(
            //     { source: "beaches", id: mapToId[popupId.current].id },
            //     { hover: false }
            //   );
            //   setPopupInfo(null);
            //   popupId.current = null;
            //   popupRef.current = null;
            // }

            const beach = mapToId[feature.properties.id];
            console.log("BEECH", mapToId[feature.properties.id]);
            popupId.current = feature.properties.id;
            if (!beach) return;
            map.setFeatureState(
              { source: "beaches", id: beach.id },
              { hover: true }
            );
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
          });
          setZoom(map.getZoom());
        }}
        onClick={(e) => {
          const feature = e.features && e.features[0];
          if (!feature) return;

          // Handle cluster clicks
          const isCluster =
            feature.properties && (feature.properties as any).cluster;
          const isClusterCount = feature.layer?.id === "cluster-count";

          if (isCluster || isClusterCount) {
            // Handle cluster expansion
            const clusterId = feature.properties?.cluster_id;
            const mapInstance = mapRef.current?.getMap?.();
            const source: any = mapInstance?.getSource("beaches");

            if (source && clusterId != null && mapInstance) {
              source.getClusterExpansionZoom(
                clusterId,
                (err: any, expansionZoom: number) => {
                  if (err) return;
                  // Ensure we zoom past clusterMaxZoom (12) to show unclustered points
                  const targetZoom = Math.max(expansionZoom, 12.5);
                  mapInstance.easeTo({
                    center: (feature.geometry as any).coordinates,
                    zoom: targetZoom,
                    duration: 500,
                  });
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
          // Don't clear swellDirections - let the useEffect update it for the new beach
          popupId.current = null;
          setPopupData(null);
          setPopupInfo(null);
          setSelected(point);
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
                  "step",
                  ["get", "point_count"],
                  "#9ed5ff",
                  50,
                  "#69b7ff",
                  100,
                  "#3f9bff",
                ],
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  12,
                  50,
                  16,
                  100,
                  20,
                ],
                "circle-stroke-width": 1,
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
                    "#d1d5db", // gray for no data (bg-gray-300 / highlight-3)
                    0.1,
                    "#86efac", // green-300 for small (< 3ft)
                    3,
                    "#fdba74", // orange-300 for moderate (3-6ft)
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
                "text-offset": [0, 1.5],
                "text-size": 10,
                "text-anchor": "top",
              }}
              paint={{
                "text-color": "#1f2937",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1,
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

            return (
              <Marker
                longitude={selected.longitude}
                latitude={selected.latitude}
                anchor="center"
              >
                <div className="pointer-events-none relative flex flex-col items-center justify-center overflow-visible">
                  <div className="absolute -top-14 bg-background rounded-lg border border-border px-3 py-1.5 shadow-lg whitespace-nowrap">
                    <span className="text-sm font-semibold text-foreground antialiased">
                      {selected.name}
                    </span>
                  </div>
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: ringSize, height: ringSize }}
                  >
                    <SwellRings
                      directions={{
                        primary: swellDirections.primary,
                        secondary: swellDirections.secondary,
                        tertiary: swellDirections.tertiary,
                      }}
                      scale={scale}
                      className="absolute inset-0"
                    />
                    {typeof windDirection === "number" && (
                      <WindRing
                        direction={windDirection}
                        scale={scale}
                        className="absolute inset-0"
                      />
                    )}
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
                  {typeof popupInfo.properties.conditions.windDirection ===
                    "number" && (
                    <WindRing
                      direction={popupInfo.properties.conditions.windDirection}
                      scale={0.55}
                    />
                  )}
                </div>
              </div> */}
              <header className="p-1 flex gap-1">
                <div
                  className={cn(
                    "p-1 w-2 rounded-full",
                    !popupInfo.properties.surfIntensity ||
                      (popupInfo.properties.surfIntensity < 0.1 &&
                        "bg-gray-300"),
                    popupInfo.properties.surfIntensity >= 0.1 &&
                      popupInfo.properties.surfIntensity < 3 &&
                      "bg-green-300",
                    popupInfo.properties.surfIntensity >= 3 &&
                      popupInfo.properties.surfIntensity < 6 &&
                      "bg-orange-300",
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
          <div className="absolute top-32 left-3 @min-4xl:top-3 flex flex-col gap-3 z-40">
            {selected && (
              <button
                type="button"
                aria-label="Refocus map on beach"
                onClick={() => {
                  if (selected)
                    map?.easeTo({
                      center: [selected.longitude, selected.latitude],
                      zoom: 16,
                      duration: 500,
                    });
                }}
                className="bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition"
              >
                <MapPin className="w-5 h-5 mx-auto" />
              </button>
            )}
            <button
              type="button"
              aria-label="toggle filters"
              onClick={() => togglePanel("filters")}
              className={cn(
                "bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                openPanel === "filters" && "bg-blue-300"
              )}
            >
              <SlidersHorizontal className="w-5 h-5 mx-auto" />
            </button>
            <button
              type="button"
              aria-label="toggle legend"
              onClick={() => togglePanel("legend")}
              className={cn(
                "bg-background hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium flex items-center gap-2 active:scale-95 transition",
                openPanel === "legend" && "bg-blue-300"
              )}
            >
              <Info className="w-5 h-5 mx-auto" />
            </button>
            {fullMapPage && !smallScreen && (
              <button
                aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
                className={cn(
                  "z-80 bg-background rounded-full p-3 shadow-lg border border-border hover:bg-blue-200 dark:hover:bg-blue-400"
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
          </div>
        )}

        {/* LEGEND PANEL (small, upper overlay) */}
        <AnimatePresence>
          {openPanel === "legend" && (
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
                    "absolute top-32 right-3 max-w-[200px] @min-4xl:top-3"
                  )}
                >
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

        <AnimatePresence>
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
        </AnimatePresence>
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

          @media (max-width: 911px) {
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
