"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Map,
  Marker,
  AttributionControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { FaMapMarkerAlt } from "react-icons/fa";
import { fetchAllBeaches, type Beach } from "@/lib/supabase";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const InteractiveMap = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapRef>(null);

  // Load beach points
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchAllBeaches();
        if (mounted) setBeaches(data);
      } catch (e) {
        console.error("Map beach load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Initial center/zoom
  const initialViewState = useMemo(() => {
    // default: SoCal-ish
    let view = { longitude: -119.5, latitude: 34.2, zoom: 6.75 };
    if (selectedId && beaches.length) {
      const b = beaches.find((x) => x.id === selectedId);
      if (b) view = { longitude: b.LONGITUDE, latitude: b.LATITUDE, zoom: 11 };
    }
    return view;
  }, [beaches, selectedId]);

  // Fly to selected beach when ?id changes
  useEffect(() => {
    if (!mapRef.current || !selectedId || !beaches.length) return;
    const b = beaches.find((x) => x.id === selectedId);
    if (!b) return;
    mapRef.current.flyTo({
      center: [b.LONGITUDE, b.LATITUDE],
      zoom: 11,
      duration: 800,
    });
  }, [selectedId, beaches]);

  // Push ?id=<beachId> without changing layout
  const goToBeach = useCallback(
    (b: Beach) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", String(b.id));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="relative z-10 h-full w-full pointer-events-auto">
      <Map
        ref={mapRef}
        reuseMaps
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%", borderRadius: 12 }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        attributionControl={false}
        dragRotate={false}
        touchZoomRotate
      >
        <AttributionControl compact />

        {!loading &&
          beaches.map((b) => {
            const isSelected = selectedId === b.id;
            return (
              <Marker
                key={b.id}
                longitude={b.LONGITUDE}
                latitude={b.LATITUDE}
                anchor="bottom"
              >
                <button
                  onClick={() => goToBeach(b)}
                  className="flex flex-col items-center -translate-y-1"
                  style={{ pointerEvents: "auto", background: "transparent" }}
                  aria-label={`View conditions for ${b.Name}`}
                >
                  <FaMapMarkerAlt
                    size={isSelected ? 28 : 22}
                    color={isSelected ? "#2563eb" : "#ef4444"}
                    className="drop-shadow"
                  />
                  {/* inline label so names are always visible */}
                  <span
                    className="mt-0.5 px-1 py-0.5 rounded text-[10px] leading-none bg-white/90 border border-gray-200 shadow-sm"
                    style={{ pointerEvents: "none" }}
                  >
                    {b.Name}
                  </span>
                </button>
              </Marker>
            );
          })}
      </Map>
    </div>
  );
};

export default InteractiveMap;
