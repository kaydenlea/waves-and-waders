"use client";

import { useEffect, useMemo, useState } from "react";
import BeachCard, { type Beach as UIBeach } from "@/components/general/BeachCard";

type DbBeach = {
  id: string | number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
};

const haversineKm = (a: [number, number], b: [number, number]) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export default function NearbyBeaches({ beaches }: { beaches: DbBeach[] }) {
  const initialList: UIBeach[] = useMemo(
    () =>
      (beaches || []).map((b) => ({
        id: String(b.id),
        name: b.Name,
        region: b.COUNTY ?? "",
        coords: [Number(b.LATITUDE), Number(b.LONGITUDE)],
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
        conditions: {
          surf: "-",
          wind: "-",
          temp: 0,
          rating: 0,
        },
      })),
    [beaches]
  );

  const [sorted, setSorted] = useState<UIBeach[]>(initialList);
  const [status, setStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");

  useEffect(() => {
    if (!navigator?.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        const withDistance = initialList.map((b) => ({
          ...b,
          distanceKm: haversineKm(origin, b.coords),
        }));
        withDistance.sort(
          (a, z) => (a.distanceKm ?? 9e9) - (z.distanceKm ?? 9e9)
        );
        setSorted(withDistance);
        setStatus("granted");
      },
      () => {
        setStatus("denied");
        setSorted(initialList);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [initialList]);

  return (
    <>
      {status === "locating" && (
        <div className="text-sm text-foreground/70 mb-2 ml-2">
          Finding your location…
        </div>
      )}
      {status === "denied" && (
        <div className="text-sm text-foreground/70 mb-2 ml-2">
          Location denied. Showing unsorted beaches.
        </div>
      )}
      <section className="grid grid-cols-1 gap-3 @min-md:grid-cols-2 @min-4xl:grid-cols-3 mb-2">
        {sorted.map((b) => (
          <BeachCard key={b.id} b={b} isFav={false} />
        ))}
      </section>
    </>
  );
}

