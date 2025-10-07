"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AttributionControl,
  Map,
  Popup,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FEATURE_CATEGORIES, getFeatureDisplayName } from "@/lib/supabase";
const DEFAULT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE;
import { cn } from "@/lib/utils";
import { ArrowLeftFromLine, ArrowRightFromLine, X } from "lucide-react";

type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  features?: Record<string, boolean>;
  surfIntensity?: number;
};

type Props = { beachId?: string | number };

const InteractiveMap: React.FC<Props> = ({ beachId }) => {
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [selected, setSelected] = React.useState<BeachPoint | null>(null);
  const { filters, setFilters, selectedDate } =
    require("@/components/context/MapFilterContext").useMapFilters();
  const [located, setLocated] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [surfIntensity, setSurfIntensity] = React.useState<Record<string | number, number>>({});
  const router = useRouter();
  const pathname = usePathname();
  const mapRef = React.useRef<any>(null);

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
  const fullMapPage =
    !pathName.endsWith("/beaches") && !pathName.endsWith("/overview");
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
      console.log("No date selected, clearing surf intensity");
      setSurfIntensity({});
      return;
    }

    let cancelled = false;
    const loadSurfIntensity = async () => {
      try {
        const dateStr = selectedDate.toISOString();
        console.log("Fetching surf intensity for date:", dateStr);
        console.log("Selected date local:", selectedDate.toLocaleDateString(), selectedDate.toLocaleTimeString());
        const res = await fetch(`/api/beaches/surf-intensity?date=${dateStr}`);
        const json = await res.json();
        console.log("Surf intensity API response:", json);
        if (!cancelled && json?.success) {
          console.log("Setting surf intensity data:", json.data);
          console.log("Total beaches with data:", Object.keys(json.data).length);
          const nonZeroCount = Object.values(json.data).filter((v: any) => v > 0).length;
          console.log("Beaches with non-zero surf:", nonZeroCount);
          setSurfIntensity(json.data);
        } else {
          console.error("API returned error:", json);
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
    console.log("Filtering beaches - total:", beaches.length, "filters:", filters.size);
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
      // Handle both numeric and UUID beach IDs
      const beachIdKey = typeof b.id === 'string' && isNaN(Number(b.id)) ? b.id : Number(b.id);
      const intensity = surfIntensity[beachIdKey] || 0;

      // Debug: check if we're missing data for this beach
      if (!intensity && Object.keys(surfIntensity).length > 0) {
        // Sample a few misses to see the ID format
        if (Math.random() < 0.01) {
          console.log("Beach missing surf data:", {
            beachId: b.id,
            beachIdKey,
            name: b.name,
            hasSurfData: beachIdKey in surfIntensity
          });
        }
      }
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
        properties: {
          id: b.id,
          name: b.name,
          county: b.county,
          surfIntensity: intensity
        },
      };
    });

    console.log("Generated GeoJSON with", features.length, "features");
    const sample = features.slice(0, 10).map(f => ({
      id: f.properties.id,
      name: f.properties.name,
      intensity: f.properties.surfIntensity
    }));
    console.log("Sample surf intensities:", sample);
    console.log("Surf intensity lookup object keys:", Object.keys(surfIntensity).length);
    console.log("First 5 surf intensity values:", Object.entries(surfIntensity).slice(0, 5));

    // Count how many beaches have surf data vs no data
    const withData = features.filter(f => f.properties.surfIntensity > 0).length;
    const withoutData = features.filter(f => f.properties.surfIntensity === 0).length;
    console.log(`Beaches with surf data: ${withData}, without data: ${withoutData}`);

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
    // Derive beach id from prop or URL path: "/:beach/..."
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

    // If page context identifies a beach, center and zoom to it
    if (effectiveId != null) {
      const match = beaches.find(
        (b) =>
          String(b.id) === effectiveId ||
          String(b.name).toLowerCase() === effectiveId.toLowerCase()
      );
      if (match) {
        map.easeTo({
          center: [match.longitude, match.latitude],
          zoom: 16,
          duration: 500,
        });
        setSelected(match);
        return;
      }
    }
    // Otherwise, optionally use user's location once
    if (!located && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocated(true);
          map.easeTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 10,
            duration: 600,
          });
        },
        () => setLocated(true),
        { enableHighAccuracy: true, timeout: 7000 }
      );
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
      map.easeTo({ center: [centerLon, centerLat], zoom: 6, duration: 500 });
    }
  }, [beaches, filteredBeaches, beachId, pathname]);

  // if (editPage || (forecastPage && !smallScreen)) {
  //   return <></>;
  // }

  // if (editPage) {
  //   return <></>;
  // }

  return (
    <aside
      className={cn(
        "relative w-full h-[320px] sm:h-[380px] @min-3xl:flex-1 @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:h-[calc(100vh-5.5rem)] @min-3xl:py-3 @min-3xl:pl-3 transition-all duration-300",
        !smallScreen && fullMapPage && showMap && "@min-3xl:max-w-200",
        !smallScreen && fullMapPage && !showMap && "@min-3xl:max-w-20 @min-3xl:overflow-hidden"
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
        interactiveLayerIds={["clusters", "cluster-count", "unclustered-point", "unclustered-point-label"]}
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
          setSelected(point);
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
                  "#9ca3af", // gray for no data (0)
                  0.1, "#60a5fa", // light blue for small (> 0.1ft)
                  2, "#3b82f6", // blue for moderate (>= 2ft)
                  4, "#f59e0b", // orange for good (>= 4ft)
                  6, "#ef4444", // red for excellent (>= 6ft)
                  8, "#dc2626" // dark red for epic (>= 8ft)
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

        {/* Filter controls (collapsible) */}
        <div className="absolute top-2 left-2 z-[1]">
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

        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="top"
            onClose={() => setSelected(null)}
            closeButton={false}
            closeOnClick={true}
          >
            <button
              className="p-0.5 rounded-2xl bg-highlight-5 hover:bg-highlight-3 border border-border/30 ml-auto"
              onClick={() => setSelected(null)}
            >
              <X size={16} />
            </button>
            <div className="flex flex-col gap-1">
              <strong className="text-sm text-foreground">
                {selected.name}
              </strong>
              <span className="text-xs text-muted-foreground">
                {selected.county}
              </span>
              <button
                className="mt-1 text-xs px-2 py-1 rounded bg-highlight-3 hover:bg-highlight-2 border border-border"
                onClick={() => router.push(`/${selected.id}/overview`)}
              >
                View overview
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </aside>
  );
};

export default InteractiveMap;
