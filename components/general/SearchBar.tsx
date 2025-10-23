"use client";

import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchContext } from "../context/SearchContext";
import ToggleFilters from "./ToggleFilters";

type BeachHit = {
  id: string | number;
  name: string;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const BREAKPOINT_4XL = 911; // adjust to match your @min-4xl breakpoint

const SearchBar = ({
  className,
  beachesPage = false,
}: {
  className?: string;
  beachesPage?: boolean;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BeachHit[]>([]);
  const [active, setActive] = useState(0);
  // const [isOverlay, setIsOverlay] = useState(false);
  const [wideScreen, setWideScreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLFormElement | null>(null);

  const { isOverlay, setIsOverlay } = useSearchContext();

  // keep a ref to always know the latest query value
  const latestQueryRef = useRef<string>(query);

  useEffect(() => {
    console.log("SEE QUERY VAL", query);
    // keep ref in sync
    latestQueryRef.current = query;

    // If empty or shorter than 2 chars — immediately clear and abort any in-flight request.
    if (!query || query.trim().length < 2) {
      // abort outstanding fetch (if any)
      abortRef.current?.abort();
      setHits([]);
      setOpen(false);
      return;
    }

    // schedule the debounced search
    const timer = setTimeout(async () => {
      // capture the query value for this scheduled request
      const qSnapshot = query;

      // abort previous request before making a new one
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(
          `/api/search/beaches?q=${encodeURIComponent(qSnapshot)}`,
          {
            signal: ac.signal,
          }
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
          setHits(json.data as BeachHit[]);
          setOpen(true);
          setActive(0);
        } else {
          // If API returned no data, ensure UI reflects that
          setHits([]);
          setOpen(false);
        }
      } catch (err: any) {
        // ignore AbortError (expected); log other unexpected errors optionally
        if (err?.name === "AbortError") return;
        // optional: console.error(err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      // do NOT abort here automatically — we abort explicitly before starting new request.
      // leaving previous abort to the next invocation is fine; but clearing timer is required.
    };
  }, [query]);

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
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) onSelect(hit);
    } else if (e.key === "Escape") {
      if (isOverlay) setIsOverlay(false);
      setOpen(false);
    }
  };

  const onSelect = (hit: BeachHit) => {
    setOpen(false);
    setQuery("");
    setIsOverlay(false);
    router.push(`/${hit.id}/overview`);
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

  // Prevent body scroll when overlay active
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (isOverlay) {
      // Measure scrollbar width *before* hiding scroll
      const scrollbarWidth = window.innerWidth - html.clientWidth;

      // Lock scroll on both html & body
      html.style.overflow = "hidden";
      // body.style.overflow = "hidden";

      // Apply compensation only once (to the element that actually scrolls)
      // Check which element has scrollbar width > 0 (some setups attach scroll to html, others to body)
      const hasHtmlScrollbar = html.scrollHeight > html.clientHeight;
      const target = hasHtmlScrollbar ? html : body;

      if (scrollbarWidth > 0) {
        target.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      // Restore defaults
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.paddingRight = "";
      body.style.paddingRight = "";
    }

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.paddingRight = "";
      body.style.paddingRight = "";
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
        {!beachesPage && (
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
              : "hidden @min-4xl:flex max-w-50 @min-xl:max-w-75 @min-5xl:max-w-md"
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
              Nearby &middot; Saved &middot; Filters
            </span>
          </span>
        </button>

        {beachesPage && <ToggleFilters />}

        {/* Map button */}
        {!beachesPage && (
          <button
            type="button"
            aria-label="open map"
            className="icon-button p-4 hide-button dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3"
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
            className="fixed inset-0 z-[9999] backdrop-blur-lg bg-background/20 flex flex-col items-center pt-5.5 px-8"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                // setQuery("");
                setIsOverlay(false);
            }}
          >
            <div className="flex gap-2 w-full justify-center max-w-60 @min-md:max-w-full">
              <div className="relative w-full max-w-lg flex items-center bg-highlight-4 rounded-full shadow-lg ring ring-border/70 px-3 py-2 gap-2">
                <Search
                  strokeWidth={3}
                  className="w-5 h-5 text-muted-foreground"
                />
                <input
                  autoFocus
                  name="overlay-query"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
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
                  className="p-1.5 rounded-full hover:bg-highlight-3 transition"
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
            {open && hits.length > 0 && (
              <div className="mt-4 w-full max-w-2xl bg-background border border-border/30 shadow-even rounded-md">
                <ul className="rounded-xl overflow-y-auto max-h-[80vh] p-2">
                  {hits.map((h, idx) => (
                    <li
                      key={`${h.id}`}
                      className={`p-3.5 cursor-pointer rounded-lg ${
                        idx === active
                          ? "bg-highlight-3"
                          : "hover:bg-highlight-3"
                      }`}
                      onMouseEnter={() => setActive(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(h);
                      }}
                    >
                      <div className="flex flex-col @min-4xl:flex-row items-start @min-4xl:items-center justify-between">
                        <span className="font-medium text-sm">{h.name}</span>
                        {h.county && (
                          <span className="text-xs text-muted-foreground">
                            {h.county}
                          </span>
                        )}
                      </div>
                    </li>
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
