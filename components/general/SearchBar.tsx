"use client";

import { createPortal } from "react-dom";
import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Map, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionalSearchContext } from "../context/SearchContext";
import ToggleFilters from "./ToggleFilters";
import { acquireScrollLock } from "@/lib/scrollLock";

type BeachHit = {
  id: string | number;
  name: string;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

// Memoized search result item for faster list rendering
const SearchResultItem = memo(function SearchResultItem({
  hit,
  isActive,
  onSelect,
}: {
  hit: BeachHit;
  isActive: boolean;
  onSelect: (hit: BeachHit) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(hit);
  }, [hit, onSelect]);

  return (
    <li className="rounded-lg">
      <button
        type="button"
        className={cn(
          "w-full p-3.5 text-left rounded-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          isActive ? "bg-highlight-3" : "hover:bg-highlight-3"
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          handleSelect();
        }}
      >
        <div className="flex flex-col @min-4xl:flex-row items-start @min-4xl:items-center justify-between gap-1">
          <span className="font-medium text-sm">{hit.name}</span>
          {hit.county ? (
            <span className="text-xs text-muted-foreground">{hit.county}</span>
          ) : null}
        </div>
      </button>
    </li>
  );
});

const SearchBar = ({
  className,
  beachesPage = false,
  showMapButton = true,
  subtitle,
  desktopClassName,
}: {
  className?: string;
  beachesPage?: boolean;
  showMapButton?: boolean;
  subtitle?: string;
  desktopClassName?: string;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BeachHit[]>([]);
  const [active, setActive] = useState(-1);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLFormElement | null>(null);
  const overlayControlsRef = useRef<HTMLDivElement | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const [overlayResultsMaxHeight, setOverlayResultsMaxHeight] = useState<
    number | null
  >(null);

  const searchCtx = useOptionalSearchContext();
  const isOverlay = searchCtx?.isOverlay ?? false;
  const setIsOverlay = useMemo<React.Dispatch<React.SetStateAction<boolean>>>(
    () =>
      searchCtx?.setIsOverlay ?? ((next) => void next),
    [searchCtx?.setIsOverlay]
  );

  // Deferred query for smoother typing - input stays responsive
  const deferredQuery = useDeferredValue(query);
  const visibleHits = open ? hits : [];

  // keep a ref to always know the latest query value
  const latestQueryRef = useRef<string>(query);

  // Memoized input handler to prevent re-renders
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    []
  );

  // Memoized select handler
  const onSelect = useCallback(
    (hit: BeachHit) => {
      setOpen(false);
      setQuery("");
      setIsOverlay(false);
      router.push(`/${hit.id}/overview`);
    },
    [router, setIsOverlay]
  );

  // Memoized results list for stable reference
  const searchResults = useMemo(() => {
    if (!open || visibleHits.length === 0) return null;
    return visibleHits.map((h, idx) => ({
      hit: h,
      isActive: idx === active,
      index: idx,
    }));
  }, [visibleHits, open, active]);

  useEffect(() => {
    // keep ref in sync
    latestQueryRef.current = deferredQuery;

    // If empty or shorter than 2 chars — immediately clear and abort any in-flight request.
    if (!deferredQuery || deferredQuery.trim().length < 2) {
      // abort outstanding fetch (if any)
      abortRef.current?.abort();
      startTransition(() => {
        setHits([]);
        setOpen(false);
      });
      return;
    }

    // schedule the debounced search - reduced to 150ms for snappier feel
    const timer = setTimeout(async () => {
      // capture the query value for this scheduled request
      const qSnapshot = deferredQuery;

      // abort previous request before making a new one
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(
          `/api/search/beaches?q=${encodeURIComponent(qSnapshot)}`,
          { signal: ac.signal }
        );

        // non-OK response -> ignore
        if (!res.ok) return;

        const json = await res.json();

        // IMPORTANT: ensure the query hasn't changed since we started this request.
        // If it has changed, ignore this (stale) response.
        if (latestQueryRef.current !== qSnapshot) {
          return;
        }

        if (json?.success && Array.isArray(json.data)) {
          startTransition(() => {
            setHits(json.data as BeachHit[]);
            setOpen(true);
            setActive(-1);
          });
        } else {
          // If API returned no data, ensure UI reflects that
          startTransition(() => {
            setHits([]);
            setOpen(false);
          });
        }
      } catch (err: unknown) {
        // ignore AbortError (expected)
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [deferredQuery]);

  // Close results on outside click (for non-overlay)
  useEffect(() => {
    if (isOverlay) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOverlay]);

  // Keyboard navigation
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i < 0 ? 0 : (i + 1) % hits.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        i < 0 ? hits.length - 1 : (i - 1 + hits.length) % hits.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = active >= 0 ? hits[active] : undefined;
      if (hit) onSelect(hit);
    } else if (e.key === "Escape") {
      if (isOverlay) setIsOverlay(false);
      setOpen(false);
    }
  };

  // Handle resize – close overlay on large screens
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (window.innerWidth >= BREAKPOINT_4XL) {
  //       setWideScreen(true);
  //       if (isOverlay) setIsOverlay(false);
  //     } else {
  //       setWideScreen(false);
  //     }
  //   };
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, [isOverlay]);

  // Prevent document scroll when overlay is active, without causing layout shift when the
  // scrollbar is removed/restored (common trigger for map reflows on narrow screens).
  useLayoutEffect(() => {
    if (!isOverlay) return;
    return acquireScrollLock();
  }, [isOverlay]);

  // Ensure the overlay starts scrolled to the top (some mobile browsers can restore/shift scroll on open).
  useEffect(() => {
    if (!isOverlay) return;
    const node = overlayRootRef.current;
    if (!node) return;
    const id = window.requestAnimationFrame(() => {
      node.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOverlay]);

  // Keep results pane visible above mobile keyboards.
  useEffect(() => {
    if (!isOverlay) {
      setOverlayResultsMaxHeight(null);
      return;
    }

    const updateMaxHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const controlsBottom =
        overlayControlsRef.current?.getBoundingClientRect().bottom ?? 120;
      const available = Math.floor(viewportHeight - controlsBottom - 16);
      setOverlayResultsMaxHeight(Math.max(140, available));
    };

    updateMaxHeight();
    const vv = window.visualViewport;
    window.addEventListener("resize", updateMaxHeight);
    vv?.addEventListener("resize", updateMaxHeight);
    vv?.addEventListener("scroll", updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
      vv?.removeEventListener("resize", updateMaxHeight);
      vv?.removeEventListener("scroll", updateMaxHeight);
    };
  }, [isOverlay]);

  return (
    <>
      {/* Normal Nav Search Form */}
      <form
        ref={boxRef}
        className={cn(
          "relative flex items-center gap-2 w-full justify-end",
          className,
          beachesPage ? "@min-4xl:justify-center" : "@min-4xl:justify-center"
        )}
      >
        {/* Search button (mobile) */}
        {!beachesPage && !desktopClassName && (
          <button
            type="button"
            aria-label="search"
            onClick={() => setIsOverlay(true)}
            className="group/button hover:scale-[1.05] items-center gap-1 inline-flex @min-4xl:hidden rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
          >
            <Search
              className="h-5 w-5 group-hover/button:scale-[1.05]"
              strokeWidth={3}
            />
          </button>
        )}

        {/* Search bar - visible on large screens */}
        <button
          type="button"
          aria-label="search"
          onClick={() => setIsOverlay(true)}
          className={cn(
            "hover:bg-highlight-3 dark:hover:bg-highlight-3 duration-200 transition transition-all transform hover:translate-y-[1px] pl-1.5 py-2 items-center rounded-full h-full shadow-lg ring ring-border/70 gap-2 dark:bg-highlight-5 w-full",
            beachesPage
              ? "flex @min-xl:max-w-75 @min-3xl:max-w-100 @min-5xl:max-w-md"
              : desktopClassName ??
                  "hidden @min-4xl:flex max-w-50 @min-xl:max-w-75 @min-5xl:max-w-md"
          )}
        >
          <div className="hidden @min-sm:block bg-gradient-to-br from-cyan-300 to-blue-400 p-2 text-white rounded-full flex-shrink-0 p-1">
            <Search
              strokeWidth={3}
              className="w-5 h-5 group-hover/button:scale-[1.05]"
            />
          </div>
          <span className="flex flex-col justify-center w-full -ml-[6px] @min-sm:-ml-[30px]">
            <span className="font-medium text-md w-full mr-10">
              Search <span className="hidden @min-md:inline">for</span> beaches
            </span>
            <span className="text-muted-foreground text-xs">
              {subtitle ?? "Nearby \u00b7 Saved \u00b7 Filters"}
            </span>
          </span>
        </button>

        {beachesPage && <ToggleFilters />}

        {/* Map button */}
        {!beachesPage && showMapButton && (
          <button
            type="button"
            aria-label="open map"
            className="icon-button p-3 hide-button dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3"
            onClick={() => router.push("/beaches")}
          >
            <Map className="icon-md" />
          </button>
        )}
      </form>

      {/* ---------------- Overlay Mode ---------------- */}
      {isOverlay &&
        createPortal(
          <div
            ref={overlayRootRef}
            className="fixed inset-0 z-[70] bg-background/85 dark:bg-background/95 flex flex-col items-center pt-5.5 px-8 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                // setQuery("");
                setIsOverlay(false);
            }}
          >
            <div
              ref={overlayControlsRef}
              className="flex gap-2 w-full justify-center max-w-60 @min-md:max-w-full"
            >
              <div className="relative w-full max-w-lg flex items-center bg-highlight-4 rounded-full shadow-lg ring ring-border/70 px-3 py-2 gap-2">
                <Search
                  strokeWidth={3}
                  className="w-5 h-5 text-muted-foreground"
                />
                <label htmlFor="overlay-query" className="sr-only">
                  Search beaches
                </label>
                <input
                  autoFocus
                  id="overlay-query"
                  name="overlay-query"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => hits.length > 0 && setOpen(true)}
                  onKeyDown={onKeyDown}
                  placeholder="Search beaches..."
                  className="placeholder:text-sm focus:outline-none bg-transparent flex-1 min-w-0 text-base"
                />
                <button
                  type="button"
                  aria-label="close search"
                  onClick={() => {
                    setQuery("");
                    setIsOverlay(false);
                  }}
                  className="p-1.5 rounded-full hover:bg-highlight-5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                aria-label="open map"
                className="icon-button p-3.5 hover:bg-highlight-5"
                onClick={() => {
                  setQuery("");
                  setIsOverlay(false);
                  router.push("/beaches");
                }}
              >
                <Map className="icon-md" />
              </button>
            </div>

            {/* Search results in overlay */}
            {open && visibleHits.length > 0 && (
              <div
                className="mt-4 w-full max-w-2xl bg-background border border-border/30 shadow-even rounded-md overflow-hidden"
                style={
                  overlayResultsMaxHeight
                    ? { maxHeight: `${overlayResultsMaxHeight}px` }
                    : undefined
                }
              >
                <ul className="rounded-xl overflow-y-auto overscroll-contain max-h-full p-2 touch-pan-y">
                  {visibleHits.map((h, idx) => (
                    <SearchResultItem
                      key={`${h.id}`}
                      hit={h}
                      isActive={idx === active}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>,
          document.documentElement
        )}
    </>
  );
};

export default SearchBar;
