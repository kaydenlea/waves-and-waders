"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapFilters } from "@/components/context/MapFilterContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import BeachCard, {
  type Beach as UIBeach,
} from "@/components/general/BeachCard";
import { cn } from "@/lib/utils";

type DbBeach = {
  id: string | number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
};

type ApiBeach = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  features?: Record<string, boolean>;
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
  const { filters } = useMapFilters();
  const initialList: UIBeach[] = useMemo(
    () =>
      (beaches || []).map(
        (b) =>
          ({
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
          } satisfies UIBeach)
      ),
    [beaches]
  );

  const [sorted, setSorted] = useState<UIBeach[]>(initialList);
  const [apiBeaches, setApiBeaches] = useState<ApiBeach[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Load richer beach data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/beaches");
        const json = await res.json();
        if (!cancelled && json?.success) setApiBeaches(json.data as ApiBeach[]);
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtering + sorting
  useEffect(() => {
    const base = (apiBeaches ?? []).length
      ? apiBeaches!
      : (beaches || []).map(
          (b) =>
            ({
              id: b.id,
              name: b.Name,
              county: b.COUNTY,
              latitude: b.LATITUDE,
              longitude: b.LONGITUDE,
            } as ApiBeach)
        );

    const applyFilters = (list: ApiBeach[]) =>
      list.filter((b) => {
        if (!filters.size) return true;
        const feats = (b.features ?? {}) as Record<string, boolean>;
        for (const k of filters) if (!feats[k]) return false;
        return true;
      });

    if (!navigator?.geolocation) {
      setStatus("unavailable");
      const filtered = applyFilters(base);
      const toUi: UIBeach[] = filtered.map((b) => ({
        id: String(b.id),
        name: b.name ?? (b as any).Name,
        region: b.county ?? (b as any).COUNTY ?? "",
        coords: [
          Number(b.latitude ?? (b as any).LATITUDE),
          Number(b.longitude ?? (b as any).LONGITUDE),
        ],
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
        conditions: { surf: "-", wind: "-", temp: 0, rating: 0 },
      }));
      setSorted(toUi);
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        const filtered = applyFilters(base);
        const withDistance: UIBeach[] = filtered.map((b) => ({
          id: String(b.id),
          name: b.name ?? (b as any).Name,
          region: b.county ?? (b as any).COUNTY ?? "",
          coords: [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ],
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
          conditions: { surf: "-", wind: "-", temp: 0, rating: 0 },
          distanceKm: haversineKm(origin, [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ]),
        }));
        withDistance.sort(
          (a, z) => (a.distanceKm ?? 9e9) - (z.distanceKm ?? 9e9)
        );
        setSorted(withDistance);
        setStatus("granted");
      },
      () => {
        setStatus("denied");
        const filtered = applyFilters(base);
        const toUi: UIBeach[] = filtered.map((b) => ({
          id: String(b.id),
          name: b.name ?? (b as any).Name,
          region: b.county ?? (b as any).COUNTY ?? "",
          coords: [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ],
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
          conditions: { surf: "-", wind: "-", temp: 0, rating: 0 },
        }));
        setPage(1);
        setSorted(toUi);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [initialList, filters, apiBeaches]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const currentItems = sorted.slice((page - 1) * perPage, page * perPage);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Build pagination range with ellipses
  const getPageNumbers = () => {
    const delta = 1;
    const pages: (number | string)[] = [];
    const range = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift("…");
    }
    if (page + delta < totalPages - 1) {
      range.push("…");
    }

    if (totalPages >= 1) pages.push(1);
    pages.push(...range);
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <>
      <div className="flex mb-4 ml-2 items-center justify-between">
        {status === "locating" && (
          <div className="text-sm text-foreground/70">
            Finding your location…
          </div>
        )}
        {status === "denied" && (
          <div className="text-sm text-foreground/70">
            Location denied. Showing unsorted beaches.
          </div>
        )}
        {/* Per Page Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="perPage" className="text-sm text-gray-600">
            Per page:
          </label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option className="bg-highlight-5" value={10}>
              10
            </option>
            <option className="bg-highlight-5" value={20}>
              20
            </option>
          </select>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 @min-md:grid-cols-2 mb-4">
        {currentItems.map((b) => (
          <BeachCard key={b.id} b={b} isFav={false} />
        ))}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={cn(
                  page === 1 && "pointer-events-none text-muted-foreground"
                )}
                onClick={() => {
                  handlePrev();
                  document
                    .getElementById("content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </PaginationItem>
            {getPageNumbers().map((p, idx) =>
              p === "…" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p as number);
                      document
                        .getElementById("content")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                className={cn(
                  page === totalPages &&
                    "pointer-events-none text-muted-foreground"
                )}
                onClick={() => {
                  handleNext();
                  document
                    .getElementById("content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
