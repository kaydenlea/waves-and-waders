"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useMapData } from "@/components/context/MapFilterContext";
import { useDateContext } from "@/components/context/DateContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import BeachCard from "@/components/general/BeachCard";
import type { Beach as UIBeach } from "@/components/general/BeachCard";
import { cn } from "@/lib/utils";
import { FEATURE_COLUMNS, getFeatureDisplayName } from "@/lib/supabase";
import { ChevronDown, ChevronUp, SearchX } from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";
import { Spinner } from "../ui/spinner";
import { AnimatePresence, motion } from "motion/react";
import { useClientPath } from "../context/PathContext";
import { useViewportBeachesContext } from "../context/ViewportBeachesContext";
import { useBeachStatsCache } from "@/components/context/BeachStatsCacheContext";
import {
  type BeachStatsSnapshot,
  normalizeHour,
  extractDailySurfWindStats,
  mergeDailyStatsIntoConditions,
} from "@/lib/beachStatsShared";

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

const buildFeatureTags = (
  featureFlags?: Record<string, boolean>
): UIBeach["features"] => {
  if (!featureFlags) return [];
  const tags = FEATURE_COLUMNS.filter((key) => featureFlags[key])
    .map((key) => {
      const label = getFeatureDisplayName(key) || key;
      const meta = BEACH_FEATURE_ICONS[key] ?? DEFAULT_FEATURE_ICON;
      return {
        label,
        icon: meta.icon,
        color: meta.color,
        rank: meta.rank,
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return tags.slice(0, 5);
};

const decorateBeachWithStats = (
  beach: UIBeach,
  snapshot?: BeachStatsSnapshot | null
): UIBeach => {
  const dailyStats = snapshot ? extractDailySurfWindStats(snapshot) : null;
  const mergedConditions = mergeDailyStatsIntoConditions(
    {
      surf: beach.conditions.surf,
      wind: beach.conditions.wind,
      windDir: beach.conditions.windDir,
      temp: beach.conditions.temp,
      rating: beach.conditions.rating ?? 0,
    },
    dailyStats
  );
  return {
    ...beach,
    conditions: mergedConditions,
    current: snapshot?.current ?? beach.current,
  };
};

export default function NearbyBeaches() {
  const {
    filters,
    beaches: sharedBeaches,
    favoriteIds: favoriteIdsSet,
  } = useMapData();
  const { status: viewportStatus } = useViewportBeachesContext();
  const deferredBeaches = useDeferredValue(sharedBeaches);
  const { selected: selectedDate, hour } = useDateContext();
  const filterCount = filters?.size ?? 0;
  const effectiveDate = useMemo(() => {
    if (selectedDate instanceof Date) return selectedDate;
    return null;
  }, [selectedDate]);
  const effectiveHour = Number.isFinite(hour) ? hour : null;
  const resolveDateKey = useCallback((value: Date | null) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const day = new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
      return day.toISOString().split("T")[0];
    }
    return "today";
  }, []);
  const statsDateKey = resolveDateKey(
    effectiveDate instanceof Date ? effectiveDate : null
  );
  const statsHourKey =
    typeof effectiveHour === "number"
      ? normalizeHour(effectiveHour)
      : effectiveDate instanceof Date
      ? "midday"
      : "now";
  const filteredRawBeaches = useMemo(
    () =>
      (deferredBeaches || []).filter((beach) => {
        if (!filters.size) return true;
        const feats = beach.features ?? {};
        for (const k of filters) {
          if (!feats[k]) return false;
        }
        return true;
      }),
    [deferredBeaches, filters]
  );

  const baseUiBeaches: UIBeach[] = useMemo(
    () =>
      filteredRawBeaches.map((beach) => ({
        id: String(beach.id),
        name: beach.name ?? "",
        region: beach.county ?? "",
        coords: [Number(beach.latitude), Number(beach.longitude)],
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
        conditions: {
          surf: "-",
          wind: "-",
          windDir: 0,
          temp: 0,
          rating: 0,
        },
        features: buildFeatureTags(beach.features),
      })),
    [filteredRawBeaches]
  );

  const hasCommittedBeaches = (deferredBeaches?.length ?? 0) > 0;

  const favoriteSet = useMemo(
    () => new Set(Array.from(favoriteIdsSet ?? new Set()).map(String)),
    [favoriteIdsSet]
  );

  const [sorted, setSorted] = useState<UIBeach[]>(baseUiBeaches);
  const [isSortingPending, startSortingTransition] = useTransition();
  useEffect(() => {
    startSortingTransition(() => {
      setSorted(baseUiBeaches);
    });
  }, [baseUiBeaches, startSortingTransition]);

  useEffect(() => {
    if (!baseUiBeaches.length) {
      startSortingTransition(() => {
        setSorted([]);
      });
      return;
    }
    let cancelled = false;
    if (!navigator?.geolocation) {
      startSortingTransition(() => {
        setSorted(baseUiBeaches);
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const origin: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        const ordered = [...baseUiBeaches]
          .map((beach) => ({
            beach,
            distanceKm: haversineKm(origin, [beach.coords[0], beach.coords[1]]),
          }))
          .sort((a, b) => {
            const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
            const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
            return aDist - bDist;
          })
          .map((entry) => entry.beach);
        startSortingTransition(() => {
          setSorted(ordered);
        });
      },
      () => {
        if (!cancelled) {
          startSortingTransition(() => {
            setSorted(baseUiBeaches);
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return () => {
      cancelled = true;
    };
  }, [baseUiBeaches, startSortingTransition]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { selectedTab } = useClientPath();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tabFilteredList = useMemo(() => {
    if (selectedTab === "saved") {
      return sorted.filter((b) => favoriteSet.has(String(b.id)));
    }
    return sorted;
  }, [sorted, favoriteSet, selectedTab]);

  const visibleList = useDeferredValue(tabFilteredList);

  useEffect(() => {
    setPage(1);
  }, [selectedTab]);

  const totalPages = Math.max(
    1,
    Math.ceil((visibleList.length || 0) / perPage)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const currentItems = useMemo(() => {
    if (!visibleList.length) return [];
    const start = (page - 1) * perPage;
    return visibleList.slice(start, start + perPage);
  }, [visibleList, page, perPage]);
  const { getSnapshot, prefetchSnapshots, version: statsVersion } =
    useBeachStatsCache();
  const decoratedCacheRef = useRef<
    Record<
      string,
      {
        base: UIBeach;
        snapshot?: BeachStatsSnapshot | null;
        decorated: UIBeach;
      }
    >
  >({});

  const snapshotMap = useMemo(() => {
    const map = new Map<string, BeachStatsSnapshot | null | undefined>();
    currentItems.forEach((beach) => {
      const id = String(beach.id);
      const cached = getSnapshot(id, statsDateKey, statsHourKey);
      map.set(id, cached);
    });
    return map;
  }, [currentItems, getSnapshot, statsDateKey, statsHourKey, statsVersion]);

  useEffect(() => {
    if (!currentItems.length) return;
    const missing = currentItems
      .map((beach) => String(beach.id))
      .filter((id) => snapshotMap.get(id) === undefined);
    if (!missing.length) return;
    prefetchSnapshots(missing, {
      date: effectiveDate instanceof Date ? effectiveDate : undefined,
      hour: effectiveHour ?? undefined,
    }).catch((error) => {
      console.error("Failed to prefetch card stats", error);
    });
  }, [
    currentItems,
    snapshotMap,
    prefetchSnapshots,
    effectiveDate,
    effectiveHour,
  ]);

  const renderedItems = useMemo(() => {
    const startTs =
      typeof performance !== "undefined" ? performance.now() : null;
    const cache = decoratedCacheRef.current;
    const next: UIBeach[] = [];
    const presentIds = new Set<string>();

    currentItems.forEach((beach) => {
      const id = String(beach.id);
      presentIds.add(id);
      const cached = cache[id];
      const snapshotRaw = snapshotMap.get(id);
      const snapshotEffective =
        snapshotRaw === undefined ? cached?.snapshot ?? null : snapshotRaw;
      if (
        cached &&
        cached.base === beach &&
        cached.snapshot === snapshotEffective
      ) {
        next.push(cached.decorated);
        return;
      }
      const decorated = decorateBeachWithStats(beach, snapshotEffective);
      cache[id] = {
        base: beach,
        snapshot: snapshotEffective,
        decorated,
      };
      next.push(decorated);
    });

    Object.keys(cache).forEach((id) => {
      if (!presentIds.has(id)) delete cache[id];
    });

    if (
      startTs != null &&
      typeof performance !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      const duration = performance.now() - startTs;
      // eslint-disable-next-line no-console
      console.log(
        `[BeachesPerf] decorate-cards page=${page} count=${
          next.length
        } duration=${duration.toFixed(1)}ms`
      );
    }

    return next;
  }, [currentItems, snapshotMap]);

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

  // Page size selector – custom popover with disabled state while loading
  const handleSelect = (value: number) => {
    setPerPage(value);
    setPage(1);
  };

  const PageOptions = () => {
    const disabled = false;
    const toggle = () => {
      if (disabled) return; // Prevent open while loading to avoid flicker
      setOpen((v) => !v);
    };
    const close = () => setOpen(false);

    return (
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <span className="text-sm text-muted-foreground font-medium select-none">
          Per page:
        </span>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border/20",
              "bg-highlight-3 px-3.5 py-1.5 text-sm font-medium text-foreground",
              "shadow-inner transition-all duration-200",
              "hover:bg-background/60 dark:hover:bg-highlight-5/40",
              "focus:outline-none",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            <span>{perPage}</span>
            {open ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {open && !disabled && (
              <motion.ul
                key="perpage-menu"
                role="menu"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className={cn(
                  "absolute right-0 z-20 mt-2 min-w-[7rem] overflow-hidden",
                  "rounded-xl border border-border/30 bg-background shadow-lg"
                )}
              >
                {[10, 20, 50].map((num) => {
                  const active = num === perPage;
                  return (
                    <li key={num} role="menuitem">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelect(num);
                          close();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm",
                          active
                            ? "bg-highlight-5/60 text-foreground"
                            : "hover:bg-highlight-3/70",
                          "transition-colors"
                        )}
                      >
                        {num}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const viewportBusy =
    viewportStatus === "idle" ||
    viewportStatus === "loading" ||
    viewportStatus === "dirty";
  const hasVisibleItems = visibleList.length > 0;
  const showGlobalLoading = !hasCommittedBeaches && viewportBusy;
  const showListLoading =
    !hasVisibleItems && hasCommittedBeaches && viewportBusy;
  const showSortingLoading = !hasVisibleItems && isSortingPending;
  const showLoadingState =
    showGlobalLoading || showListLoading || showSortingLoading;
  const showEmptyState = !hasVisibleItems && !showLoadingState;

  // console.log("FINAL BEACHES", currentItems);
  return (
    <>
      {/* <div className="flex mb-4 ml-2 items-center justify-between gap-10 mx-2"> */}
      {/* {status === "locating" && (
          <div className="text-sm text-foreground/70">
            Finding your location…
          </div>
        )}
        {status === "denied" && (
          <div className="hidden @min-lg:flex text-sm text-foreground/70">
            Location denied. Showing unsorted beaches.
          </div>
        )} */}
      {/* Per Page Dropdown */}
      {/* <div className="flex items-center gap-2">
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
        </div> */}
      {/* <PageOptions /> */}
      {/* </div> */}

      {showLoadingState ? (
        <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
          <span className="text-lg">Loading beaches...</span>
          <Spinner />
        </section>
      ) : showEmptyState ? (
        filterCount > 0 ? (
          <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
            <SearchX className="w-10 h-10" />
            <span className="text-lg">No beaches found...</span>
          </section>
        ) : (
          <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
            <SearchX className="w-10 h-10" />
            <span className="text-lg">
              {selectedTab === "saved"
                ? "No saved beaches in the current map view."
                : "No beaches in the current map view."}
            </span>
            <span className="text-sm text-muted-foreground">
              Pan or zoom the map to see beaches here.
            </span>
          </section>
        )
      ) : (
        <section
          className={cn(
            "grid grid-cols-1 gap-3 @min-4xl/main:gap-4 @min-md/beaches:grid-cols-2 px-0.5 pb-4",
            // `content-visibility`/aggressive `contain` can cause intermittent
            // paint issues (cards vanishing) while scrolling in some browsers.
            "ww-disable-backdrop"
          )}
        >
          {renderedItems.map((b, idx) => {
            const id = String(b.id);
            const snapshotRaw = snapshotMap.get(id);
            const loadingStats = snapshotRaw === undefined;
            const priorityImage = page === 1 && idx < 4;
            return (
              <BeachCard
                key={b.id}
                b={b}
                isFav={favoriteSet.has(id)}
                loadingStats={loadingStats}
                priorityImage={priorityImage}
              />
            );
          })}
        </section>
      )}

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
                    .querySelector("article#content")
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
                        .querySelector("article#content")
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
                    .querySelector("article#content")
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
