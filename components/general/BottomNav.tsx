"use client";

import { useEffect, useMemo, useState } from "react";
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
  LogOut,
} from "lucide-react";
import BackToMapButton from "./BackToMapButton";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useRouter } from "next/navigation";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import ThemeToggle from "./ThemeToggle";
import { useSearchContext } from "../context/SearchContext";
import { usePathname } from "next/navigation";
import { useDateContext } from "../context/DateContext";
import { AnimatePresence, motion } from "motion/react";
import { useMapFilters } from "../context/MapFilterContext";
import { FEATURE_CATEGORIES, getFeatureDisplayName } from "@/lib/supabase";
import { useClientPath } from "../context/PathContext";

export default function BottomNav() {
  const router = useRouter();
  const user = useUser();
  const displayEmail = user?.email ?? "Account";
  const supabase = useSupabaseClient();
  const [showBottomUI, setShowBottomUI] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const pathname = usePathname();
  const fullMapPage = !pathname.endsWith("/beaches");
  const landingPage = pathname === "/";
  const { mode, setMode } = useDateContext();
  const { setIsOverlay } = useSearchContext();
  const [mobile, setIsMobile] = useState(false);
  const { openPanel, setOpenPanel, filters, setFilters } = useMapFilters();
  const { selectedTab } = useClientPath();
  const forecastPage = selectedTab === "forecast";
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    const onResize = () => setProfileOpen(false);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Detect screen width and reset nav visibility when switching to mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 910; // Tailwind's `md` breakpoint
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

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(FEATURE_CATEGORIES).forEach((key) => {
      initial[key] = false; // start collapsed by default
    });
    return initial;
  });

  // temporary, uncommitted filters
  const [tempFilters, setTempFilters] = useState<Set<string>>(new Set(filters));

  const featureSections = useMemo(
    () =>
      Object.entries(FEATURE_CATEGORIES).map(([key, cat]) => ({
        key,
        label: (cat as any).label || key,
        features: (cat as any).features as string[],
      })),
    []
  );

  const sectionSelections = useMemo(() => {
    const result: Record<string, number> = {};
    featureSections.forEach((section) => {
      result[section.key] = section.features.reduce(
        (count, key) => count + (tempFilters.has(key) ? 1 : 0),
        0
      );
    });
    return result;
  }, [featureSections, tempFilters]);

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

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !(prev?.[key] ?? true),
    }));

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
          <div className="touch-pan-y block @min-4xl:hidden flex justify-center mt-10 mb-8">
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
            <div className="touch-pan-y block @min-4xl:hidden flex justify-center mt-10 mb-4">
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

      {/* Filters overlay + sheet (always mounted to avoid flicker) */}
      <>
        <div
          className={cn(
            "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-150",
            openPanel === "filters"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={() => setOpenPanel(null)}
        />

        {/* Responsive Sheet / Modal */}
        <div
          style={{ touchAction: "pan-y" }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-background/95 rounded-t-3xl border-t border-border/30 shadow-[0_-12px_40px_rgba(2,6,23,0.08)] max-h-[85vh] transition-all duration-200 will-change-transform translate-y-4 opacity-0 pointer-events-none",
            openPanel === "filters" && "translate-y-0 opacity-100 pointer-events-auto",
            "@min-4xl:bottom-auto @min-4xl:left-1/2 @min-4xl:top-1/2 @min-4xl:right-auto @min-4xl:-translate-x-1/2 @min-4xl:-translate-y-1/2 @min-4xl:rounded-3xl @min-4xl:border @min-4xl:shadow-2xl @min-4xl:max-h-[80vh] @min-4xl:w-[800px]"
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
                {featureSections.map((section) => {
                  const catKey = section.key;
                  const label = section.label;
                  const selectedCount = sectionSelections[catKey] ?? 0;
                  const isOpen = expandedSections[catKey] ?? true;
                  return (
                    <section key={catKey} aria-labelledby={`cat-${catKey}`}>
                      {/* Section header */}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`filters-cat-${catKey}`}
                        onClick={() => toggleSection(catKey)}
                        className="flex w-full items-center justify-between gap-2 mb-2 bg-highlight-5 rounded-2xl px-2 py-2 hover:bg-highlight-4 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 flex items-center justify-center">
                            {getSectionIcon(label)}
                          </div>
                          <div className="flex flex-col items-start text-left">
                            <h3
                              id={`cat-${catKey}`}
                              className="text-base font-semibold text-foreground leading-tight"
                            >
                              {label}
                            </h3>
                            {selectedCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {selectedCount} selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-1 rounded-full bg-background/60 text-muted-foreground">
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Filter options */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`filters-cat-${catKey}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.12, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 gap-1">
                              {section.features.map((key: string) => {
                                const checked = tempFilters.has(key); // use tempFilters for uncommitted state
                                const display =
                                  getFeatureDisplayName(key) || key;
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
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                  className="flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-semibold text-white bg-sky-400 hover:bg-sky-600 dark:bg-sky-400 dark:hover:bg-sky-300 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>

      {/* floating day / hour mode button */}
      {/* {selectedTab !== "forecast" && fullMapPage && !landingPage && (
        <button
          onClick={() => setMode(mode === "date" ? "hour" : "date")}
          className={cn(
            "fixed bottom-24 left-3 @min-[460px]:hidden z-40 icon-button py-2 min-w-18 rounded-3xl bg-background hover:bg-highlight-5 flex-col items-center justify-center transition-all duration-300",
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
      )} */}

      {/* Bottom Navigation */}
      <div
        className={cn(
          "shadow-md @min-4xl:hidden safe-area-inset-bottom rounded-2xl bg-highlight-4 backdrop-blur border border-border mb-1 mx-1 fixed bottom-0 left-0 right-0 z-30 transition-all duration-300",
          showBottomUI ? "translate-y-0" : "mb-0 translate-y-full"
        )}
      >
        <nav
          aria-label="bottom navigation"
          className="max-w-150 mx-auto flex justify-around items-center h-17 -mb-0.5"
        >
          <button
            type="button"
            className="hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
            onClick={() => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("tab:/beaches", "nearby");
                }
              } catch {}
              router.push("/beaches?tab=nearby");
            }}
          >
            <MapPinned className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
            <span className="text-xs sr-only @min-[350px]:not-sr-only">
              Browse
            </span>
          </button>
          <button
            type="button"
            className="hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
            onClick={() => {
              try {
                if (!user) {
                  router.push(`/login?next=${encodeURIComponent("/beaches")}`);
                  return;
                }
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("tab:/beaches", "saved");
                }
                router.push("/beaches?tab=saved");
              } catch {
                router.push("/beaches?tab=saved");
              }
            }}
          >
            <Heart className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
            <span className="text-xs sr-only @min-[350px]:not-sr-only">
              Saved
            </span>
          </button>
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
          {user ? (
            <Popover open={profileOpen} onOpenChange={setProfileOpen}>
              <PopoverTrigger className="hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15">
                <User className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
                <span className="text-xs sr-only @min-[350px]:not-sr-only">
                  Profile
                </span>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="z-50 w-56 py-2 px-4 flex flex-col gap-1"
              >
                <span className="px-2 py-1.5 text-sm text-muted-foreground max-w-[208px] truncate">
                  {displayEmail}
                </span>
                <div className="border-t border-border/40 my-1" />
                <Link
                  className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap"
                  href="/beaches"
                  onClick={() => {
                    try {
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("tab:/beaches", "saved");
                      }
                      router.push("/beaches?tab=saved");
                    } catch {
                      router.push("/beaches?tab=saved");
                    }
                    setProfileOpen(false);
                  }}
                >
                  <Heart className="w-5 h-5 -mt-0.5" /> Saved
                </Link>
                <div className="border-t border-border/40 my-1" />
                <button
                  onClick={async () => {
                    setProfileOpen(false);
                    await supabase.auth.signOut();
                    router.refresh();
                  }}
                  className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-5 w-5" /> Sign out
                </button>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              type="button"
              className="hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
              onClick={() => router.push("/login")}
            >
              <User className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
              <span className="text-xs sr-only @min-[350px]:not-sr-only">
                Profile
              </span>
            </button>
          )}
          <ThemeToggle bottomNavMode />
        </nav>
      </div>
    </>
  );
}
