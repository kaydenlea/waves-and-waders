// "use client";

// import React from "react";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useRouter } from "next/navigation";
// import { Map, Search } from "lucide-react";
// import { cn } from "@/lib/utils";

// type BeachHit = {
//   id: string | number;
//   name: string;
//   county?: string | null;
//   latitude?: number | null;
//   longitude?: number | null;
// };

// const SearchBar = ({ className }: { className?: string }) => {
//   const router = useRouter();
//   const [query, setQuery] = useState("");
//   const [open, setOpen] = useState(false);
//   const [hits, setHits] = useState<BeachHit[]>([]);
//   const [active, setActive] = useState(0);
//   const abortRef = useRef<AbortController | null>(null);
//   const boxRef = useRef<HTMLDivElement | null>(null);

//   // simple debounce
//   useEffect(() => {
//     if (!query || query.trim().length < 2) {
//       setHits([]);
//       setOpen(false);
//       return;
//     }
//     const t = setTimeout(async () => {
//       try {
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;
//         const res = await fetch(
//           `/api/search/beaches?q=${encodeURIComponent(query)}`,
//           { signal: ac.signal }
//         );
//         if (!res.ok) return;
//         const json = await res.json();
//         if (json?.success && Array.isArray(json.data)) {
//           setHits(json.data as BeachHit[]);
//           setOpen(true);
//           setActive(0);
//         }
//       } catch (e) {
//         // ignore aborted
//       }
//     }, 200);
//     return () => clearTimeout(t);
//   }, [query]);

//   // close on outside click
//   useEffect(() => {
//     const onDoc = (e: MouseEvent) => {
//       if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", onDoc);
//     return () => document.removeEventListener("mousedown", onDoc);
//   }, []);

//   const onSelect = (hit: BeachHit) => {
//     setOpen(false);
//     setQuery("");
//     const id = String(hit.id);
//     router.push(`/${id}/overview`);
//   };

//   const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
//     if (!open || hits.length === 0) return;
//     if (e.key === "ArrowDown") {
//       e.preventDefault();
//       setActive((i) => (i + 1) % hits.length);
//     } else if (e.key === "ArrowUp") {
//       e.preventDefault();
//       setActive((i) => (i - 1 + hits.length) % hits.length);
//     } else if (e.key === "Enter") {
//       e.preventDefault();
//       const hit = hits[active];
//       if (hit) onSelect(hit);
//     } else if (e.key === "Escape") {
//       setOpen(false);
//     }
//   };

//   return (
//     <form
//       ref={boxRef}
//       className={cn(
//         "relative flex items-center gap-2 w-full mr-2 @min-4xl:mr-0 justify-end @min-4xl:justify-center",
//         className
//       )}
//     >
//       <button
//         type="button"
//         aria-label="search"
//         onClick={() => {}}
//         className="group/button hover:scale-[1.05] inline-flex @min-4xl:hidden items-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
//       >
//         <Search
//           className="h-5 w-5 group-hover/button:scale-[1.05]"
//           strokeWidth={3}
//         />
//       </button>
//       <div className="pl-1.5 py-1.5 hidden @min-4xl:flex items-center rounded-full h-full shadow-lg ring ring-border/70 gap-2 bg-highlight-4 w-full max-w-50 @min-xl:max-w-75 @min-5xl:max-w-md">
//         <button
//           type="button"
//           aria-label="search"
//           className="bg-gradient-to-br from-cyan-300 to-blue-400 p-1.5 text-white rounded-full flex-shrink-0 max-[360px]:p-1 max-[320px]:p-0.5"
//           onClick={() => query && setOpen((o) => !o)}
//         >
//           <Search
//             strokeWidth={3}
//             className="w-5 h-5 max-[360px]:w-3.5 max-[360px]:h-3.5 max-[320px]:w-3 max-[320px]:h-3"
//           />
//         </button>
//         <input
//           name="query"
//           aria-label="beach search"
//           type="text"
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onFocus={() => hits.length > 0 && setOpen(true)}
//           onKeyDown={onKeyDown}
//           placeholder="Search beaches"
//           className="placeholder:text-sm focus:outline-none bg-transparent flex-1 min-w-0 max-[360px]:text-[11px] max-[320px]:text-[10px] mr-4"
//         />
//       </div>

//       {/* Search results dropdown */}
//       {open && hits.length > 0 && (
//         <ul className="absolute top-full mt-2 left-0 right-0 max-w-xl mx-auto z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
//           {hits.map((h, idx) => (
//             <li
//               key={`${h.id}`}
//               className={`px-3 py-2 cursor-pointer ${
//                 idx === active ? "bg-highlight-3" : "hover:bg-highlight-3"
//               }`}
//               onMouseEnter={() => setActive(idx)}
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 onSelect(h);
//               }}
//             >
//               <div className="flex items-center justify-between">
//                 <span className="font-medium text-sm mr-4">{h.name}</span>
//                 {h.county && (
//                   <span className="text-xs text-muted-foreground">
//                     {h.county}
//                   </span>
//                 )}
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//       <button
//         type="button"
//         aria-label="open map"
//         className="icon-button p-3 hide-button hover:bg-highlight-3"
//         onClick={() => router.push("/beaches")}
//       >
//         <Map className="icon-md" />
//       </button>
//     </form>
//   );
// };

// export default SearchBar;

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BeachHit = {
  id: string | number;
  name: string;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const BREAKPOINT_4XL = 911; // adjust to match your @min-4xl breakpoint

const SearchBar = ({ className }: { className?: string }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BeachHit[]>([]);
  const [active, setActive] = useState(0);
  const [isOverlay, setIsOverlay] = useState(false);
  const [wideScreen, setWideScreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Simple debounce for search
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
      } catch {
        // ignore aborted
      }
    }, 200);
    return () => clearTimeout(t);
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
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= BREAKPOINT_4XL) {
        setWideScreen(true);
        if (isOverlay) setIsOverlay(false);
      } else {
        setWideScreen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOverlay]);

  // Prevent body scroll when overlay active
  useEffect(() => {
    if (isOverlay) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [isOverlay]);

  return (
    <>
      {/* Normal Nav Search Form */}
      <form
        ref={boxRef}
        className={cn(
          "relative flex items-center gap-2 w-full mr-2 @min-4xl:mr-0 justify-end @min-4xl:justify-center",
          className
        )}
      >
        {/* Search button (mobile) */}
        <button
          type="button"
          aria-label="search"
          onClick={() => setIsOverlay(true)}
          className="group/button hover:scale-[1.05] inline-flex @min-4xl:hidden items-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
        >
          <Search
            className="h-5 w-5 group-hover/button:scale-[1.05]"
            strokeWidth={3}
          />
        </button>

        {/* Search bar - visible on large screens */}
        <div className="pl-1.5 py-1.5 hidden @min-4xl:flex items-center rounded-full h-full shadow-lg ring ring-border/70 gap-2 bg-highlight-4 w-full max-w-50 @min-xl:max-w-75 @min-5xl:max-w-md">
          <button
            type="button"
            aria-label="search"
            className="group/button hover:scale-[1.05] hover:shadow-md bg-gradient-to-br from-cyan-300 to-blue-400 p-1.5 text-white rounded-full flex-shrink-0 max-[360px]:p-1"
            onClick={() => query && setOpen((o) => !o)}
          >
            <Search
              strokeWidth={3}
              className="w-5 h-5 group-hover/button:scale-[1.05]"
            />
          </button>
          <input
            name="query"
            aria-label="beach search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onFocus={() => hits.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search beaches"
            className="placeholder:text-sm focus:outline-none bg-transparent flex-1 min-w-0"
          />
          {query && (
            <button
              type="button"
              aria-label="close search"
              onClick={() => {
                setQuery("");
              }}
              className="mr-2 p-1 rounded-full hover:bg-highlight-5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results dropdown (desktop only) */}
        {wideScreen && !isOverlay && open && hits.length > 0 && (
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
                  <span className="font-medium text-sm mr-4">{h.name}</span>
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

        {/* Map button */}
        <button
          type="button"
          aria-label="open map"
          className="icon-button p-3 hide-button hover:bg-highlight-3"
          onClick={() => router.push("/beaches")}
        >
          <Map className="icon-md" />
        </button>
      </form>

      {/* ---------------- Overlay Mode ---------------- */}
      {((!wideScreen && query.length > 0) || isOverlay) && (
        <div
          className="fixed h-screen inset-0 z-[9999] backdrop-blur-xl bg-muted-foreground/70 dark:bg-background/90 flex flex-col items-center px-4 pt-7 animate-fadeIn"
          onClick={(e) => {
            // close when clicking outside inner box
            if (e.target === e.currentTarget) {
              setQuery("");
              setIsOverlay(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg flex items-center bg-highlight-4 rounded-full shadow-lg ring ring-border/70 px-3 py-2 gap-2">
            <Search strokeWidth={3} className="w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              name="overlay-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

          {/* Search results in overlay */}
          {open && hits.length > 0 && (
            <ul className="mt-4 w-full max-w-lg bg-background border border-border rounded-xl shadow-lg overflow-y-auto max-h-[60vh]">
              {hits.map((h, idx) => (
                <li
                  key={`${h.id}`}
                  className={`px-4 py-3 cursor-pointer ${
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
        </div>
      )}
    </>
  );
};

export default SearchBar;
