"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersVertical } from "lucide-react";

type BeachHit = {
  id: string | number;
  name: string;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const SearchBar = ({ className }: { className?: string }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BeachHit[]>([]);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // simple debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const res = await fetch(
          `/api/search/beaches?q=${encodeURIComponent(query)}`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setHits(json.data as BeachHit[]);
          setOpen(true);
          setActive(0);
        }
      } catch (e) {
        // ignore aborted
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSelect = (hit: BeachHit) => {
    setOpen(false);
    setQuery("");
    const id = String(hit.id);
    router.push(`/${id}/overview`);
  };

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
      setOpen(false);
    }
  };

  return (
    <form
      ref={boxRef}
      className={
        "relative flex items-center gap-2 w-full justify-center" +
        (className ?? "")
      }
    >
      {/* Search bar - now always visible, smaller on mobile */}
      <div className="pl-1.5 py-1.5 flex items-center rounded-full h-full shadow-lg ring ring-border/70 gap-2 bg-highlight-4 w-full max-w-[200px] max-[400px]:max-w-[180px] max-[360px]:max-w-[160px] max-[320px]:max-w-[140px] max-[360px]:pl-1 max-[320px]:pl-0.5 max-[360px]:py-1 max-[320px]:py-0.5 @min-4xl:min-w-40 @min-4xl:max-w-md">
        <button
          type="button"
          aria-label="search"
          className="bg-gradient-to-br from-cyan-300 to-blue-400 p-1.5 text-white rounded-full flex-shrink-0 max-[360px]:p-1 max-[320px]:p-0.5"
          onClick={() => query && setOpen((o) => !o)}
        >
          <Search strokeWidth={3} className="w-4 h-4 max-[360px]:w-3.5 max-[360px]:h-3.5 max-[320px]:w-3 max-[320px]:h-3" />
        </button>
        <input
          name="query"
          aria-label="beach search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search beaches"
          className="placeholder:text-xs @min-4xl:placeholder:text-sm focus:outline-none bg-transparent flex-1 min-w-0 max-[360px]:text-[11px] max-[320px]:text-[10px]"
        />
      </div>

      {/* Search results dropdown */}
      {open && hits.length > 0 && (
        <ul className="absolute top-full mt-2 left-0 right-0 max-w-xl mx-auto z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
          {hits.map((h, idx) => (
            <li
              key={`${h.id}`}
              className={`px-3 py-2 cursor-pointer ${
                idx === active ? "bg-highlight-3" : "hover:bg-highlight-3"
              }`}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(h);
              }}
            >
              <div className="flex items-center justify-between">
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
      )}
      <button
        type="button"
        aria-label="filters"
        className="icon-button p-3.5 hide-button hover:bg-highlight-3"
      >
        <SlidersVertical className="icon-sm" />
      </button>
    </form>
  );
};

export default SearchBar;
