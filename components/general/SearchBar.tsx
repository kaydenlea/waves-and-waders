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
import { acquireScrollLock } from "@/lib/scrollLock";
import { useOptionalSearchContext } from "../context/SearchContext";
import ToggleFilters from "./ToggleFilters";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  // Track scroll position for reference
  const scrollYRef = useRef(0);

  // Block scroll events when overlay is open
  useLayoutEffect(() => {
    if (!isOverlay) return;
    if (typeof document === "undefined") return;

    // Capture scroll position for reference
    scrollYRef.current = window.scrollY;

    // Use an overflow-only scroll lock so `window.scrollY` stays stable while the
    // overlay is open. Several pages use scroll position for layout/peek behavior;
    // a body-fixed lock can temporarily set `scrollY` to 0 and cause visible jumps.
    const release = acquireScrollLock({ mode: "overflow" });

    // Also block wheel and touch scroll on document, but allow inside search results
    const blockScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // Allow scroll inside the search results container or its children
      if (target?.closest("[data-search-results]")) return;
      e.preventDefault();
    };

    // Block keyboard scroll
    const blockKeyScroll = (e: KeyboardEvent) => {
      const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (scrollKeys.includes(e.key)) {
        const target = e.target as HTMLElement | null;
        // Allow inside input
        if (target?.tagName === "INPUT") return;
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", blockScroll, { passive: false });
    document.addEventListener("touchmove", blockScroll, { passive: false });
    document.addEventListener("keydown", blockKeyScroll);

    return () => {
      release();
      document.removeEventListener("wheel", blockScroll);
      document.removeEventListener("touchmove", blockScroll);
      document.removeEventListener("keydown", blockKeyScroll);
    };
  }, [isOverlay]);

  // Focus the input when overlay opens
  useEffect(() => {
    if (!isOverlay) return;
    
    const id1 = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    const id2 = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 60);
    const id3 = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 180);
    return () => {
      window.cancelAnimationFrame(id1);
      window.clearTimeout(id2);
      window.clearTimeout(id3);
    };
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
            className="z-[70] bg-background/90 dark:bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              overflow: "hidden",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setIsOverlay(false);
            }}
          >
            <div
              ref={overlayControlsRef}
              className="z-[80] mx-auto flex w-full max-w-2xl min-w-0 gap-2"
              style={{
                position: "fixed",
                top: 12,
                left: 16,
                right: 16,
                width: "calc(100% - 32px)",
              }}
            >
              <div className="relative flex-1 min-w-0 flex items-center bg-highlight-4 rounded-full shadow-lg ring ring-border/70 px-3 py-2 gap-2">
                <Search
                  strokeWidth={3}
                  className="w-5 h-5 text-muted-foreground"
                />
                <label htmlFor="overlay-query" className="sr-only">
                  Search beaches
                </label>
                <input
                  ref={inputRef}
                  autoFocus
                  id="overlay-query"
                  name="overlay-query"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (hits.length > 0) setOpen(true);
                  }}
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
                className="icon-button shrink-0 p-3.5 hover:bg-highlight-5 hidden @min-sm:inline-flex"
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
                data-search-results
                className="z-[80] mx-auto max-w-2xl bg-background border border-border/30 shadow-even rounded-md overflow-y-auto overscroll-contain touch-pan-y"
                style={{
                  position: "fixed",
                  top: 68, // Below the search controls (12px + ~56px control height)
                  left: 16,
                  right: 16,
                  maxHeight: overlayResultsMaxHeight
                    ? `${overlayResultsMaxHeight}px`
                    : "calc(100vh - 80px)",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <ul className="rounded-xl p-2">
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
          document.body
        )}
    </>
  );
};

export default SearchBar;
