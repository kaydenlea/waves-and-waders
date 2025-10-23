"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  MapPinned,
  Heart,
  Search,
  ChevronDown,
  Calendar,
  Clock,
  ArrowUp,
  Waves,
  ChevronUp,
  X,
  Trash2,
  TreePine,
  Building2,
  CreditCard,
  Bike,
  Filter,
} from "lucide-react";
import BackToMapButton from "./BackToMapButton";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useSearchContext } from "../context/SearchContext";
import { usePathname } from "next/navigation";
import { useDateContext } from "../context/DateContext";
import { AnimatePresence, motion } from "motion/react";
import { useMapFilters } from "../context/MapFilterContext";
import { FEATURE_CATEGORIES, getFeatureDisplayName } from "@/lib/supabase";

export default function BottomNav() {
  const [showBottomUI, setShowBottomUI] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const pathname = usePathname();
  const forecastPage = pathname.endsWith("/forecast");
  const fullMapPage = !pathname.endsWith("/beaches");
  const landingPage = pathname === "/";
  const { mode, setMode } = useDateContext();
  const { setIsOverlay } = useSearchContext();
  const [mobile, setIsMobile] = useState(false);
  const { openPanel, setOpenPanel, filters, setFilters } = useMapFilters();

  // Detect screen width and reset nav visibility when switching to mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 911; // Tailwind's `md` breakpoint
      setIsMobile(mobile);

      if (mobile) {
        // always show nav on entering mobile layout
        setShowBottomUI(true);
      }
    };

    handleResize(); // initialize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (window.innerWidth >= 911 || landingPage) return;
      // Clear previous timeout
      if (scrollTimeout) clearTimeout(scrollTimeout);

      // Wait for user to *stop scrolling* for 120ms
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY;
        if (scrollY > 0 && scrollY < 150) {
          // Near top → snap smoothly to top
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // hide main scrollbar when filters panel is open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (openPanel === "filters") html.style.overflow = "hidden";
    else {
      // Restore defaults
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.paddingRight = "";
      body.style.paddingRight = "";
    }
    return () => {
      // Restore defaults
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.paddingRight = "";
      body.style.paddingRight = "";
    };
  }, [openPanel]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollY;

          // scroll direction detection
          if (diff > 5) setShowBottomUI(false);
          else if (diff < -5) setShowBottomUI(true);

          // near top detection
          setAtTop(currentY < 350);

          setLastScrollY(currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleToggle = (key: string) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const clearAll = () => setFilters(new Set());

  const getSectionIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("activities"))
      return <Bike className="w-6 h-6 text-red-300" />;
    if (l.includes("trails") || l.includes("nature"))
      return (
        <TreePine className="w-6 h-6 text-green-500 dark:text-green-400" />
      );
    if (l.includes("beach"))
      return <Waves className="w-6 h-6 text-cyan-400 dark:text-cyan-300" />;
    if (l.includes("facilities") || l.includes("amenities"))
      return <Building2 className="w-6 h-6 text-gray-500 dark:text-gray-300" />;
    if (l.includes("access") || l.includes("fees"))
      return (
        <CreditCard className="w-6 h-6 text-purple-400 dark:text-purple-300" />
      );
    return <Waves className="w-6 h-6 text-sky-300 opacity-70" />;
  };

  // temporary, uncommitted filters
  const [tempFilters, setTempFilters] = useState<Set<string>>(new Set(filters));

  useEffect(() => {
    if (openPanel === "filters") {
      setTempFilters(new Set(filters)); // sync temp filters when opening
    }
  }, [openPanel, filters]);

  const handleTempToggle = (key: string) => {
    setTempFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else next.add(key);
      return next;
    });
  };

  // const clearAll = () => setTempFilters(new Set());

  const applyFilters = (newFilters: Set<string>) => {
    setFilters(new Set(newFilters));
    // optionally trigger data refresh or re-fetch
  };

  return (
    <>
      {/* Floating Map Button */}
      <div
        className={cn(
          "fixed bottom-34 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300 @min-4xl:hidden flex items-center justify-center h-0",
          showBottomUI
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-5 pointer-events-none"
        )}
      >
        {atTop && !landingPage ? (
          <div className="touch-pan-y block @min-4xl:hidden flex justify-center pt-10 pb-4">
            <button
              onClick={() => {
                const content = document.getElementById("content");
                if (content) {
                  const headerOffset = 117;
                  const rect = content.getBoundingClientRect();
                  const absoluteTop = rect.top + window.scrollY;
                  try {
                    window.scrollTo({
                      top: Math.max(absoluteTop - headerOffset, 0),
                      behavior: "smooth",
                    });
                  } catch {
                    content.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }
              }}
              aria-label="Scroll to content"
              className="flex items-center gap-1 px-4 py-3 rounded-full bg-background backdrop-blur border border-border shadow-lg text-sm font-medium text-foreground hover:bg-highlight-5 transition-colors"
            >
              <span>
                View{" "}
                {fullMapPage
                  ? forecastPage
                    ? "Forecast"
                    : "Overview"
                  : "Beaches"}
              </span>
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        ) : landingPage ? (
          atTop ? (
            <></>
          ) : (
            <div className="touch-pan-y block @min-4xl:hidden flex justify-center pt-10 pb-4">
              <button
                aria-label="back to top"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1 px-4 py-3 rounded-full bg-background backdrop-blur border border-border shadow-lg text-sm font-medium text-foreground hover:bg-highlight-3 transition-colors"
              >
                <span>Top</span>
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          )
        ) : (
          <BackToMapButton />
        )}
      </div>

      <AnimatePresence>
        {openPanel === "filters" && (
          <>
            {/* Dimmed background */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenPanel(null)}
            />

            {/* Responsive Sheet / Modal */}
            <motion.div
              key="filters"
              initial={{ y: "100%", opacity: 0, scale: 1 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80) setOpenPanel(null); // only draggable down
              }}
              style={{ touchAction: "pan-y" }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-background/95 backdrop-blur-lg rounded-t-3xl border-t border-border/30 shadow-[0_-12px_40px_rgba(2,6,23,0.08)] max-h-[85vh] transition-all duration-300",
                "@min-4xl:bottom-auto @min-4xl:left-1/2 @min-4xl:top-1/2 @min-4xl:right-auto @min-4xl:-translate-x-1/2 @min-4xl:-translate-y-1/2 @min-4xl:rounded-3xl @min-4xl:border @min-4xl:shadow-2xl @min-4xl:max-h-[80vh] @min-4xl:w-[800px] @min-4xl:drag-none"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <Filter className="w-6 h-6 text-sky-400" />
                  <h2 className="text-base font-semibold text-foreground">
                    Filters
                  </h2>
                  {filters.size > 0 && (
                    <span className="text-xs font-medium bg-sky-400 text-white rounded-full px-2 py-1">
                      {filters.size}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpenPanel(null)}
                  className="p-2 rounded-full hover:bg-highlight-5 transition"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div
                className="overflow-y-auto px-5 py-4 space-y-4"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {Object.entries(FEATURE_CATEGORIES).map(([catKey, cat]) => {
                  const label = (cat as any).label || catKey;
                  return (
                    <section key={catKey} aria-labelledby={`cat-${catKey}`}>
                      {/* Section header */}
                      <div className="flex items-center gap-1 mb-2 bg-highlight-5 rounded-2xl p-1">
                        <div className="w-9 h-9 flex items-center justify-center">
                          {getSectionIcon(label)}
                        </div>
                        <h3
                          id={`cat-${catKey}`}
                          className="text-base font-semibold text-foreground leading-tight"
                        >
                          {label}
                        </h3>
                      </div>

                      {/* Filter options */}
                      <div className="grid grid-cols-1 gap-1">
                        {(cat as any).features.map((key: string) => {
                          const checked = tempFilters.has(key); // use tempFilters for uncommitted state
                          const display = getFeatureDisplayName(key) || key;
                          return (
                            <label
                              key={key}
                              className={cn(
                                "flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-colors border border-transparent",
                                checked
                                  ? "bg-sky-50 dark:bg-sky-900/30 text-foreground border-sky-100 dark:border-sky-800"
                                  : "hover:bg-highlight-5 text-muted-foreground"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTempToggle(key)} // toggles in tempFilters
                                className="w-4 h-4 accent-sky-300 rounded-sm flex-shrink-0"
                              />
                              <span className="text-[13px] leading-tight text-foreground">
                                {display}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-border/20 px-5 py-3 bg-background/95 backdrop-blur-sm rounded-b-3xl flex justify-between items-center gap-3">
                <button
                  onClick={clearAll}
                  disabled={tempFilters.size === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition",
                    tempFilters.size > 0
                      ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100/60"
                      : "text-muted-foreground opacity-60 cursor-not-allowed"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Filters
                </button>

                <button
                  onClick={() => {
                    applyFilters(tempFilters);
                    setOpenPanel(null);
                  }}
                  className="flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 dark:bg-sky-400 dark:hover:bg-sky-300 transition"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* floating day / hour mode button */}
      {!forecastPage && fullMapPage && !landingPage && (
        <button
          onClick={() => setMode(mode === "date" ? "hour" : "date")}
          className={cn(
            "fixed bottom-24 left-3 @min-[460px]:hidden z-50 icon-button py-2 min-w-18 rounded-3xl bg-background hover:bg-highlight-5 flex-col items-center justify-center transition-all duration-300",
            showBottomUI
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
          )}
        >
          {mode === "date" ? (
            <Calendar className="w-6 h-6 mx-auto" />
          ) : (
            <Clock className="w-6 h-6 mx-auto" />
          )}
          <span className="text-sm font-medium text-center">
            {mode === "date" ? "Day" : "Hour"}
          </span>
        </button>
      )}

      {/* Bottom Navigation */}
      <nav
        aria-label="bottom navigation"
        className={cn(
          "rounded-t-lg fixed bottom-0 left-0 right-0 z-30 bg-highlight-4 dark:bg-highlight-3 border border-border flex justify-around items-center h-16 shadow-md transition-transform duration-300 @min-4xl:hidden safe-area-inset-bottom",
          showBottomUI ? "translate-y-0" : "translate-y-full"
        )}
      >
        <Link
          className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex flex-col items-center gap-1"
          href="/beaches"
        >
          <MapPinned className="w-5 h-5 -mt-0.5" />
          <span className="text-xs">Browse</span>
        </Link>
        <Link
          className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex flex-col items-center gap-1"
          href="/favorites"
        >
          <Heart className="w-5 h-5 -mt-0.5" />
          <span className="text-xs">Saved</span>
        </Link>
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
        {/* <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
          <Waves className="h-6 w-6" aria-hidden />
        </div> */}
        <Link
          className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex flex-col items-center gap-1"
          href="/login"
        >
          <User className="w-5 h-5 -mt-0.5" />
          <span className="text-xs">Profile</span>
        </Link>
        <ThemeToggle bottomNavMode />
      </nav>
    </>
  );
}
