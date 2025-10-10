"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AttributionControl,
  Map,
  Popup,
  Source,
  Layer,
  Marker,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  FEATURE_CATEGORIES,
  getFeatureDisplayName,
  generateBeachSlug,
} from "@/lib/supabase";
const DEFAULT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE;
import { cn } from "@/lib/utils";
import { ArrowLeftFromLine, ArrowRightFromLine, X } from "lucide-react";
import { useMapFilters } from "../context/MapFilterContext";

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

const SwellRings: React.FC<{
  directions: {
    primary: number | null | undefined;
    secondary: number | null | undefined;
    tertiary: number | null | undefined;
  };
}> = ({ directions }) => {
  const size = 160;
  const center = size / 2;
  const rings: Array<{
    key: "primary" | "secondary" | "tertiary";
    radius: number;
    color: string;
  }> = [
    { key: "primary", radius: 36, color: "#2563eb" },
    { key: "secondary", radius: 56, color: "#16a34a" },
    { key: "tertiary", radius: 76, color: "#f97316" },
  ];

  const renderArrow = (
    direction: number,
    radius: number,
    color: string
  ): React.ReactNode => {
    const normalized = ((direction % 360) + 360) % 360;
    const arrowLength = 14;
    const arrowWidth = 12;
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
      className="pointer-events-none absolute inset-0 overflow-visible"
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
            strokeWidth={4}
            strokeOpacity={0.35}
          />
          {typeof directions[key] === "number" &&
            renderArrow(directions[key] as number, radius, color)}
        </g>
      ))}
    </svg>
  );
};

const WindRing: React.FC<{
  direction: number | null | undefined;
}> = ({ direction }) => {
  const size = 160;
  const center = size / 2;
  const radius = 96;
  const color = "#a855f7"; // purple-500

  const renderArrow = (dir: number): React.ReactNode => {
    const normalized = ((dir % 360) + 360) % 360;
    const arrowLength = 14;
    const arrowWidth = 12;
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
      className="pointer-events-none absolute inset-0 overflow-visible"
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
        strokeWidth={4}
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
  const { filters, setFilters, selectedDate, selectedHour } = useMapFilters();
  const [located, setLocated] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [surfIntensity, setSurfIntensity] = React.useState<
    Record<string | number, number>
  >({});
  const [swellDirections, setSwellDirections] =
    React.useState<SwellDirectionSet | null>(null);
  const [windDirection, setWindDirection] = React.useState<number | null>(null);
  const userMovedRef = React.useRef(false);
  const suppressMoveRef = React.useRef(false);
  const prevEffectiveIdRef = React.useRef<string | null>(null);
  const prevFilterSignatureRef = React.useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const mapRef = React.useRef<any>(null);

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

  const [showMap, setShowMap] = React.useState(true);
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);
  const pathName = usePathname() ?? "";
  const fullMapPage = !pathName.endsWith("/beaches");
  const editPage = pathName.includes("edit");
  const forecastPage = pathName.includes("forecast");

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#main-content");
      const width = container ? container.clientWidth : 0;
      if (width < 768) {
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
        const json = await res.json();
        console.log("Beaches API response:", json);
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          console.log("InteractiveMap: loaded beaches", json.data.length);
          console.log("Sample beach:", json.data[0]);
          setBeaches(json.data as BeachPoint[]);
        } else {
          console.error("Failed to load beaches - invalid response:", json);
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

  // Fetch surf intensity when date changes
  React.useEffect(() => {
    if (!selectedDate) {
      setSurfIntensity({});
      return;
    }

    let cancelled = false;
    const loadSurfIntensity = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");

        // Format date as YYYY-MM-DD to match how DatePicker does it
        const dateStr = selectedDate.toISOString().split("T")[0];

        console.log("Fetching daily surf intensity for date:", dateStr);

        const PAGE_SIZE = 1000;

        const fetchDailyRows = async () => {
          const rows: any[] = [];
          let page = 0;
          while (true) {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
              .from("daily_beach_surf_intensity")
              .select("beach_id, avg_surf_max_ft")
              .eq("date", dateStr)
              .order("beach_id", { ascending: true })
              .range(from, to);

            if (error) {
              return { data: rows, error };
            }

            if (!data || data.length === 0) {
              break;
            }

            rows.push(...data);

            if (data.length < PAGE_SIZE) {
              break;
            }

            page += 1;
          }

          return { data: rows, error: null };
        };

        const { data: dailyData, error } = await fetchDailyRows();

        let intensityMap: Record<string, number> | null = null;

        if (!error && Array.isArray(dailyData)) {
          const dailyMap: Record<string, number> = {};
          dailyData.forEach((row: any) => {
            const avg = row?.avg_surf_max_ft;
            if (avg != null && !Number.isNaN(Number(avg))) {
              dailyMap[String(row.beach_id)] = Number(avg);
            }
          });
          intensityMap = dailyMap;

          if (dailyData.length > 0) {
            console.log("Loaded daily surf intensity rows:", dailyData.length);
            if (!cancelled) {
              setSurfIntensity(intensityMap);
            }
            return;
          }
        }

        if (error) {
          console.error(
            "Failed to load daily surf intensity from table; falling back to forecast data aggregation:",
            error
          );
        } else {
          console.log(
            "No daily surf intensity rows found, computing from forecast_data as fallback"
          );
        }

        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();
        const startWindow = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endWindow = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        const fetchForecastRows = async () => {
          const rows: any[] = [];
          let page = 0;

          while (true) {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
              .from("forecast_data")
              .select("beach_id, surf_height_max_ft")
              .gte("timestamp", startWindow.toISOString())
              .lte("timestamp", endWindow.toISOString())
              .order("beach_id", { ascending: true })
              .range(from, to);

            if (error) {
              return { data: rows, error };
            }

            if (!data || data.length === 0) {
              break;
            }

            rows.push(...data);

            if (data.length < PAGE_SIZE) {
              break;
            }

            page += 1;
          }

          return { data: rows, error: null };
        };

        const { data: rawData, error: queryError } = await fetchForecastRows();

        if (queryError || !rawData) {
          console.error(
            "Unable to calculate fallback surf intensity:",
            queryError
          );
          if (!cancelled) setSurfIntensity(intensityMap ?? {});
          return;
        }

        console.log("Fetched", rawData.length, "forecast records for fallback");

        const beachMaxValues: Record<string, number[]> = {};
        rawData.forEach((record: any) => {
          const beachId = String(record.beach_id);
          const surfHeight = record.surf_height_max_ft;
          if (surfHeight != null && !Number.isNaN(Number(surfHeight))) {
            if (!beachMaxValues[beachId]) {
              beachMaxValues[beachId] = [];
            }
            beachMaxValues[beachId].push(Number(surfHeight));
          }
        });

        const fallbackIntensity: Record<string, number> = {};
        Object.keys(beachMaxValues).forEach((beach) => {
          const maxes = beachMaxValues[beach];
          if (maxes.length > 0) {
            fallbackIntensity[beach] =
              maxes.reduce((sum, val) => sum + val, 0) / maxes.length;
          }
        });

        console.log(
          "Calculated fallback intensity for",
          Object.keys(fallbackIntensity).length,
          "beaches"
        );

        if (!cancelled) {
          setSurfIntensity(
            Object.keys(fallbackIntensity).length > 0
              ? fallbackIntensity
              : intensityMap ?? {}
          );
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
    if (!filters.size) {
      console.log("No filters, returning all beaches:", beaches.length);
      return beaches;
    }
    const filtered = beaches.filter((b) => {
      const f = b.features || {};
      for (const key of filters) {
        if (!f[key]) return false;
      }
      return true;
    });
    console.log("Filtered beaches:", filtered.length);
    return filtered;
  }, [beaches, filters]);

  const beachesGeoJSON = React.useMemo(() => {
    const features = filteredBeaches.map((b) => {
      const intensity = surfIntensity[b.id] || 0;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
        properties: {
          id: b.id,
          name: b.name,
          county: b.county,
          surfIntensity: intensity,
        },
      };
    });

    console.log("Generated GeoJSON with", features.length, "features");

    return {
      type: "FeatureCollection",
      features,
    } as any;
  }, [filteredBeaches, surfIntensity]);

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
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const beachFromPath = (() => {
      const parts = (pathname || "").split("/").filter(Boolean);
      return parts.length > 0 ? parts[0] : null;
    })();
    const effectiveId =
      beachId != null
        ? String(beachId)
        : beachFromPath
        ? String(beachFromPath)
        : null;

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

    // If page context identifies a beach, center and zoom to it
    if (effectiveId != null) {
      const normalizedEffectiveId = effectiveId.toLowerCase();
      const match = beaches.find((b) => {
        const idMatch = String(b.id).toLowerCase() === normalizedEffectiveId;
        const nameMatch =
          String(b.name).toLowerCase() === normalizedEffectiveId;
        const slugMatch =
          generateBeachSlug(String(b.name)).toLowerCase() ===
          normalizedEffectiveId;
        return idMatch || nameMatch || slugMatch;
      });
      if (match) {
        suppressMoveRef.current = true;
        map.easeTo({
          center: [match.longitude, match.latitude],
          zoom: 16,
          duration: 500,
        });
        setSelected(match);
        prevEffectiveIdRef.current = effectiveKey;
        return;
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
    }
    prevEffectiveIdRef.current = effectiveKey;
  }, [beaches, filteredBeaches, beachId, pathname, located]);

  // if (editPage || (forecastPage && !smallScreen)) {
  //   return <></>;
  // }

  // if (editPage) {
  //   return <></>;
  // }

  return (
    <aside
      className={cn(
        "fixed @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 w-full h-full @min-3xl:h-[calc(100vh-5.5rem)] transition-all",
        // "relative w-full h-[320px] sm:h-[380px] @min-3xl:flex-1 @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:h-[calc(100vh-5.5rem)] @min-3xl:py-3 @min-3xl:pl-3 transition-all duration-300",
        !smallScreen && fullMapPage && showMap && "@min-3xl:max-w-200",
        !smallScreen &&
          fullMapPage &&
          !showMap &&
          "@min-3xl:max-w-20 @min-3xl:overflow-hidden"
      )}
    >
      <Map
        ref={mapRef}
        reuseMaps
        initialViewState={initialView}
        style={{ width: "100%", height: "100%", borderRadius: "12px" }}
        mapStyle={MAP_STYLE_URL}
        maxZoom={16}
        minZoom={3}
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
              // f.layer.id === "clusters" ||
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
            const imageRespone = await map.loadImage("/marker.png");
            map.addImage("marker-icon", imageRespone.data);
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

          // map.on("movestart", hideCounts);
          map.on("zoomstart", hideCounts);
          // map.on("moveend", showCounts);
          map.on("zoomend", showCounts);

          map.on("movestart", () => {
            if (suppressMoveRef.current) {
              suppressMoveRef.current = false;
              return;
            }
            userMovedRef.current = true;
          });
        }}
        onClick={(e) => {
          const feature = e.features && e.features[0];
          if (!feature) return;
          // If cluster, zoom in
          if (feature.properties && (feature.properties as any).cluster) {
            const map = mapRef.current?.getMap?.();
            const source: any = map?.getSource("beaches");
            if (source && (feature.properties as any).cluster_id != null) {
              source.getClusterExpansionZoom(
                (feature.properties as any).cluster_id,
                (err: any, zoom: number) => {
                  if (err) return;
                  map.easeTo({
                    center: (feature.geometry as any).coordinates,
                    zoom,
                  });
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
          setSwellDirections(null);
          setSelected(point);
          const slug = generateBeachSlug(point.name);
          const destination = `/${slug}/overview`;
          router.push(destination);
        }}
      >
        {!showMap && fullMapPage && !smallScreen && (
          <div className="absolute bg-black/70 h-full w-full" />
        )}
        {fullMapPage && !smallScreen && (
          <button
            aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
            className={cn(
              "absolute right-2 bg-background rounded-full p-2 shadow-lg border border-border hover:bg-highlight-3",
              showMap ? "top-2" : "top-[50%]"
            )}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? (
              <ArrowLeftFromLine className="w-5 h-5" />
            ) : (
              <ArrowRightFromLine className="w-5 h-5" />
            )}
          </button>
        )}
        <AttributionControl compact={true} />

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
                "circle-radius": 8,
                "circle-color": [
                  "step",
                  ["get", "surfIntensity"],
                  "#9ca3af", // gray for no data (bg-highlight-3)
                  0.1,
                  "#4ade80", // green for small (< 3ft) (bg-green-400)
                  3,
                  "#fb923c", // orange for moderate (3-6ft) (bg-orange-400)
                  6,
                  "#f87171", // red for big (>= 6ft) (bg-red-400)
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
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
          ].some((d) => typeof d === "number") && (
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
                <div className="relative flex items-center justify-center w-[160px] h-[160px]">
                  <SwellRings
                    directions={{
                      primary: swellDirections.primary,
                      secondary: swellDirections.secondary,
                      tertiary: swellDirections.tertiary,
                    }}
                  />
                  {typeof windDirection === "number" && (
                    <WindRing direction={windDirection} />
                  )}
                </div>
              </div>
            </Marker>
          )}

        {/* Filter controls (collapsible) */}
        {showMap && (
          <div className="absolute top-27 @min-3xl:top-2 left-2 z-[1]">
            <div className="bg-background/90 backdrop-blur rounded border border-border shadow min-w-[220px]">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters((s) => !s);
                }}
              >
                <span>Filters {filters.size ? `(${filters.size})` : ""}</span>
                <span className="text-muted-foreground">
                  {showFilters ? "▴" : "▾"}
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
                  <div className="flex justify-end gap-2 mt-2 px-1">
                    {filters.size > 0 && (
                      <button
                        className="text-[11px] px-2 py-1 rounded border bg-highlight-5 border border-border hover:bg-highlight-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilters(new Set());
                        }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="text-[11px] px-2 py-1 rounded border border-border bg-highlight-4 border-border text-foreground hover:bg-highlight-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFilters(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showMap &&
          selected &&
          swellDirections &&
          [
            swellDirections.primary,
            swellDirections.secondary,
            swellDirections.tertiary,
          ].some((d) => typeof d === "number") && (
            <div className="absolute bottom-15 @min-3xl:bottom-3 left-3 z-[1] max-w-[200px]">
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
          )}

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

          @media (max-width: 1023px) {
            .maplibregl-ctrl-attrib {
              bottom: 7.5vh;
            }
          }
        `}</style>
      </Map>
    </aside>
  );
};

export default InteractiveMap;
