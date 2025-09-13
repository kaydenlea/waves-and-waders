"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AttributionControl, Map, Popup, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FEATURE_CATEGORIES, getFeatureDisplayName } from "@/lib/supabase";

type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  features?: Record<string, boolean>;
};

type Props = { beachId?: string | number };

const InteractiveMap: React.FC<Props> = ({ beachId }) => {
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [selected, setSelected] = React.useState<BeachPoint | null>(null);
  const { filters, setFilters } = require("@/components/context/MapFilterContext").useMapFilters();
  const [located, setLocated] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const mapRef = React.useRef<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/beaches");
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          console.debug("InteractiveMap: loaded beaches", json.data.length);
          setBeaches(json.data as BeachPoint[]);
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

  // Use uncontrolled map; control camera via imperative mapRef to avoid update loops
  const initialView = React.useMemo(() => ({ longitude: -122.4, latitude: 37.8, zoom: 6 }), []);
  const FILTER_KEYS = React.useMemo(() => [
    'RESTROOMS', 'PARKING', 'DOG_FRIEND', 'LIFEGUARD', 'SNDY_BEACH', 'FISHING'
  ], []);

  const filteredBeaches = React.useMemo(() => {
    if (!filters.size) return beaches;
    return beaches.filter(b => {
      const f = b.features || {};
      for (const key of filters) {
        if (!f[key]) return false;
      }
      return true;
    })
  }, [beaches, filters]);

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
    const effectiveId = beachId != null ? String(beachId) : (beachFromPath ? String(beachFromPath) : null);

    // If page context identifies a beach, center and zoom to it
    if (effectiveId != null) {
      const match = beaches.find((b) => String(b.id) === effectiveId || String(b.name).toLowerCase() === effectiveId.toLowerCase());
      if (match) {
        map.easeTo({ center: [match.longitude, match.latitude], zoom: 11, duration: 500 });
        setSelected(match);
        return;
      }
    }
    // Otherwise, optionally use user's location once
    if (!located && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocated(true);
          map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 10, duration: 600 });
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
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      map.easeTo({ center: [centerLon, centerLat], zoom: 6, duration: 500 });
    }
  }, [beaches, filteredBeaches, beachId, pathname]);

  return (
    <Map
      ref={mapRef}
      reuseMaps
      initialViewState={initialView}
      style={{ width: "100%", height: "100%", borderRadius: "12px" }}
      mapStyle="https://demotiles.maplibre.org/style.json"
      attributionControl={false}
      interactiveLayerIds={["clusters", "cluster-count", "unclustered-point"]}
      onClick={(e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;
        // If cluster, zoom in
        if (feature.properties && (feature.properties as any).cluster) {
          const map = mapRef.current?.getMap?.();
          const source: any = map?.getSource("beaches");
          if (source && (feature.properties as any).cluster_id != null) {
            source.getClusterExpansionZoom((feature.properties as any).cluster_id, (err: any, zoom: number) => {
              if (err) return;
              map.easeTo({ center: (feature.geometry as any).coordinates, zoom });
            });
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
      <AttributionControl compact={true} />

      {/* Clustered beach points */}
      {filteredBeaches.length > 0 && (
        <Source
          id="beaches"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: filteredBeaches.map((b) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
              properties: { id: b.id, name: b.name, county: b.county },
            })),
          } as any}
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
              "circle-radius": ["step", ["get", "point_count"], 12, 50, 16, 100, 20],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"] as any}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              // omit text-font to use default fonts from style
              "text-size": 12,
            }}
            paint={{ "text-color": "#1f2937" }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={["!has", "point_count"] as any}
            paint={{
              "circle-color": "#2563eb",
              "circle-radius": 5,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>
      )}

      {/* Filter controls (collapsible) */}
      <div className="absolute top-2 left-2 z-[1]">
        <div className="bg-white/90 backdrop-blur rounded border border-border shadow min-w-[220px]">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
            onClick={(e) => { e.stopPropagation(); setShowFilters((s) => !s); }}
          >
            <span>Filters {filters.size ? `(${filters.size})` : ""}</span>
            <span className="text-gray-500">{showFilters ? "▴" : "▾"}</span>
          </button>
          {showFilters && (
            <div className="max-h-72 overflow-auto px-2 pb-2">
              {Object.entries(FEATURE_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey} className="mb-2">
                  <div className="px-1 py-1 text-[11px] uppercase text-gray-600 font-semibold">
                    {(cat as any).label}
                  </div>
                  <div className="grid grid-cols-1 gap-1 px-1">
                    {(cat as any).features.map((key: string) => {
                      const checked = filters.has(key);
                      const label = getFeatureDisplayName(key) || key;
                      return (
                        <label key={key} className="flex items-center gap-2 text-[12px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const che = e.currentTarget.checked;
                              setFilters((prev) => {
                                const next = new Set(prev);
                                if (che) next.add(key); else next.delete(key);
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
                    className="text-[11px] px-2 py-1 rounded border bg-gray-100 border-gray-300 text-gray-700"
                    onClick={(e) => { e.stopPropagation(); setFilters(new Set()); }}
                  >
                    Clear
                  </button>
                )}
                <button
                  className="text-[11px] px-2 py-1 rounded border bg-highlight-4 border-border text-foreground"
                  onClick={(e) => { e.stopPropagation(); setShowFilters(false); }}
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
          closeButton={true}
          closeOnClick={false}
        >
          <div className="flex flex-col gap-1">
            <strong className="text-sm">{selected.name}</strong>
            <span className="text-xs text-muted-foreground">{selected.county}</span>
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
  );
};

export default InteractiveMap;
