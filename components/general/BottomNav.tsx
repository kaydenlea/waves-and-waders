"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  MapPinned,
  Heart,
  Search,
  ChevronDown,
  ArrowUp,
  LogOut,
  Bike,
  Building2,
  CreditCard,
  TreePine,
  Waves,
  CircleCheck,
  X,
} from "lucide-react";
import BackToMapButton from "./BackToMapButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useOptionalSearchContext } from "../context/SearchContext";
import { usePathname } from "next/navigation";
import { useDateContext } from "../context/DateContext";
import { useMapData, useMapUI } from "../context/MapFilterContext";
import { useClientPath } from "../context/PathContext";
import { useOptionalDashboardEditMode } from "../context/DashboardEditModeContext";
import FiltersPanel from "./FiltersPanel";
import NavMoreMenu from "./NavMoreMenu";
import {
  AppMenu,
  AppMenuContent,
  AppMenuHeader,
  AppMenuItem,
  AppMenuSeparator,
  AppMenuTrigger,
} from "@/components/ui/app-menu";
import { FEATURE_CATEGORIES } from "@/lib/supabase";

const BOTTOM_NAV_MORE_LINKS = [
  { href: "/donate?from=menu", label: "Donate", iconKey: "donate" as const },
  { href: "/contact?from=menu", label: "Contact", iconKey: "contact" as const },
  // { href: "/privacy", label: "Privacy", iconKey: "privacy" as const },
  // { href: "/terms", label: "Terms", iconKey: "terms" as const },
];

export default function BottomNav({ beachName }: { beachName?: string }) {
  const router = useRouter();
  const user = useUser();
  const displayEmail = user?.email ?? "Account";
  const supabase = useSupabaseClient();
  const dashboardEditMode = useOptionalDashboardEditMode();
  const isEditing = dashboardEditMode?.isEditing ?? false;
  const [showBottomUI, setShowBottomUI] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollDirRef = useRef<-1 | 0 | 1>(0);
  const scrollAccumRef = useRef(0);
  const lastToggleTsRef = useRef(0);
  const lastVisualViewportHeightRef = useRef<number | null>(null);
  const viewportStableFramesRef = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const pathname = usePathname();
  const fullMapPage = !pathname.endsWith("/beaches");
  const landingPage = pathname === "/";
  const { mode, setMode } = useDateContext();
  const searchCtx = useOptionalSearchContext();
  const isOverlay = searchCtx?.isOverlay ?? false;
  const setIsOverlay = useMemo<React.Dispatch<React.SetStateAction<boolean>>>(
    () => searchCtx?.setIsOverlay ?? ((next) => void next),
    [searchCtx?.setIsOverlay],
  );
  const [mobile, setIsMobile] = useState(false);
  const {
    openPanel,
    setOpenPanel,
    contentCollapsed,
    setContentCollapsed,
    setContentRevealRequestId,
  } = useMapUI();
  const { filters, setFilters } = useMapData();
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

  // Expose mobile bottom nav height so global toasts can sit above it.
  useEffect(() => {
    const root = document.documentElement;
    if (!mobile || landingPage) {
      root.style.removeProperty("--ww-bottom-nav-h");
      return;
    }
    root.style.setProperty("--ww-bottom-nav-h", "4.25rem"); // matches `h-17`
    return () => {
      root.style.removeProperty("--ww-bottom-nav-h");
    };
  }, [landingPage, mobile]);

  // // Mobile map pages: prevent accidental page scroll while the map is in view.
  // // The content drawer should only be revealed via the "View …" button, not by
  // // dragging UI chrome (map controls, bottom nav, etc).
  // useEffect(() => {
  //   if (typeof window === "undefined") return;
  //   if (!mobile) return;
  //   if (landingPage) return;
  //   if (isEditing) return;
  //   if (!atTop) return;
  //   if (openPanel === "filters") return;

  //   const mapContainer = document.getElementById("map-container");
  //   if (!mapContainer) return;

  // if (window.scrollY !== 0) {
  //   try {
  //     window.scrollTo({ top: 0 });
  //   } catch {
  //     window.scrollTo(0, 0);
  //   }
  // }

  //   const prevHtmlOverscroll =
  //     document.documentElement.style.overscrollBehaviorY;
  //   const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
  //   document.documentElement.style.overscrollBehaviorY = "none";
  //   document.body.style.overscrollBehaviorY = "none";

  //   const preventScroll = (event: Event) => {
  //     if (!event.cancelable) return;
  //     event.preventDefault();
  //   };

  //   window.addEventListener("touchmove", preventScroll, { passive: false });
  //   window.addEventListener("wheel", preventScroll, { passive: false });

  //   return () => {
  //     window.removeEventListener("touchmove", preventScroll);
  //     window.removeEventListener("wheel", preventScroll);
  //     document.documentElement.style.overscrollBehaviorY = prevHtmlOverscroll;
  //     document.body.style.overscrollBehaviorY = prevBodyOverscroll;
  //   };
  // }, [mobile, landingPage, isEditing, atTop, openPanel, pathname]);

  // useEffect(() => {
  //   if (typeof window === "undefined") return;
  //   if (!mobile) return;
  //   if (landingPage) return;
  //   if (!atTop) return;
  //   if (openPanel === "filters") return;

  //   const mapContainer = document.getElementById("map-container");
  //   if (!mapContainer) return;

  //   if (window.scrollY !== 0) {
  //     try {
  //       window.scrollTo({ top: 0 });
  //     } catch {
  //       window.scrollTo(0, 0);
  //     }
  //   }
  // }, [atTop, mobile, isEditing, landingPage, openPanel]);

  // hide main scrollbar when filters panel is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (openPanel !== "filters") return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollY: html.style.overscrollBehaviorY,
      bodyOverscrollY: body.style.overscrollBehaviorY,
      hadDisableBackdrop: body.classList.contains("ww-disable-backdrop"),
    };

    const isTouchDevice = window.matchMedia?.(
      "(hover: none) and (pointer: coarse)"
    )?.matches;

    // On touch devices, lock the document scroll to prevent dragging the sheet/backdrop
    // from scrolling the underlying page. On desktop, avoid removing the scrollbar.
    if (mobile && isTouchDevice) {
      html.style.overflow = "hidden";
    }

    if (mobile) {
      body.classList.add("ww-disable-backdrop");
      html.style.overscrollBehaviorY = "contain";
      body.style.overscrollBehaviorY = "contain";
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehaviorY = prev.htmlOverscrollY;
      body.style.overscrollBehaviorY = prev.bodyOverscrollY;
      if (!prev.hadDisableBackdrop) body.classList.remove("ww-disable-backdrop");
    };
  }, [openPanel, mobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mobile) return;
    let ticking = false;

    const readVisualViewportHeight = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? null;
      return typeof h === "number" && Number.isFinite(h) && h > 0 ? h : null;
    };

    // Consider the viewport "stable" only after the visual viewport has stopped changing
    // for several consecutive animation frames. This avoids relying on fixed timers and
    // prevents BottomNav toggles from overlapping with mobile browser chrome animations.
    const requiredStableFrames = 12;
    const bumpViewportStability = () => {
      const h = readVisualViewportHeight();
      const prev = lastVisualViewportHeightRef.current;
      if (h == null) {
        lastVisualViewportHeightRef.current = null;
        viewportStableFramesRef.current = requiredStableFrames;
        return;
      }
      if (prev == null || Math.abs(h - prev) >= 1) {
        lastVisualViewportHeightRef.current = h;
        viewportStableFramesRef.current = 0;
        return;
      }
      viewportStableFramesRef.current = Math.min(
        requiredStableFrames,
        viewportStableFramesRef.current + 1,
      );
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollYRef.current;
          const now = window.performance?.now?.() ?? Date.now();
          const viewportChanging =
            typeof document !== "undefined" &&
            document.documentElement.dataset.wwViewportChanging === "1";

          // Show the "View ..." button when near the top (small tolerance).
          const nextAtTop = currentY < 150;
          setAtTop((prev) => (prev === nextAtTop ? prev : nextAtTop));

          // Keep the nav visible while at the top; otherwise use scroll direction detection.
          // On mobile Safari (and similar), the browser chrome animates in/out while scrolling
          // (visualViewport height changes). Avoid animating our BottomNav at the same time.
          setShowBottomUI((prev) => {
            if (nextAtTop) return true;

            bumpViewportStability();

            // While the browser UI is animating (URL bar / bottom controls), do not toggle.
            // Also require the visual viewport to have settled for several consecutive frames.
            if (
              viewportChanging ||
              viewportStableFramesRef.current < requiredStableFrames
            ) {
              scrollAccumRef.current = 0;
              scrollDirRef.current = 0;
              return prev;
            }

            // Hysteresis: require sustained scroll distance before toggling.
            // This keeps BottomNav behavior decoupled from small scroll jitter and mobile
            // browser chrome hide/show animations.
            const abs = Math.abs(diff);
            if (!Number.isFinite(abs) || abs < 2) return prev;

            const dir: -1 | 1 = diff > 0 ? 1 : -1;
            if (scrollDirRef.current !== dir) {
              scrollDirRef.current = dir;
              scrollAccumRef.current = 0;
            }
            scrollAccumRef.current += abs;

            // Cooldown between toggles prevents rapid flicker.
            const canToggle = now - lastToggleTsRef.current > 800;
            if (!canToggle) return prev;

            // Require more distance to hide than to show (feels better).
            const HIDE_PX = 96;
            const SHOW_PX = 52;

            if (dir === 1 && prev && scrollAccumRef.current >= HIDE_PX) {
              lastToggleTsRef.current = now;
              scrollAccumRef.current = 0;
              return false;
            }
            if (dir === -1 && !prev && scrollAccumRef.current >= SHOW_PX) {
              lastToggleTsRef.current = now;
              scrollAccumRef.current = 0;
              return true;
            }
            return prev;
          });

          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Keep stability tracking updated during browser chrome animations.
    const vv = window.visualViewport;
    vv?.addEventListener("resize", bumpViewportStability, { passive: true });
    vv?.addEventListener("scroll", bumpViewportStability, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      vv?.removeEventListener("resize", bumpViewportStability);
      vv?.removeEventListener("scroll", bumpViewportStability);
    };
  }, [landingPage, mobile]);

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
        label: cat.label || key,
        features: Array.from(cat.features),
      })),
    [],
  );

  const sectionSelections = useMemo(() => {
    const result: Record<string, number> = {};
    featureSections.forEach((section) => {
      result[section.key] = section.features.reduce(
        (count, key) => count + (tempFilters.has(key) ? 1 : 0),
        0,
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
            // Use a full-width fixed container + flex centering to avoid subpixel jitter
            // when the button label changes during transitions.
            "fixed bottom-34 inset-x-0 z-40 transition-all duration-300 @min-4xl:hidden flex items-center justify-center h-0",
            // Hide when filters are active (overlay covers it)
            showBottomUI && openPanel !== "filters"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-5 pointer-events-none",
          )}
      >
        {atTop && !landingPage ? (
          contentCollapsed ? (
            <div className="touch-pan-y block @min-4xl:hidden flex justify-center mt-10 mb-8">
              <button
                onClick={() => {
                  const runScroll = () => {
                    const content = document.getElementById("content");
                    if (!content) return;
                    try {
                      content.scrollIntoView({ behavior: "smooth", block: "start" });
                    } catch {
                      try {
                        const rect = content.getBoundingClientRect();
                        const absoluteTop = rect.top + window.scrollY;
                        window.scrollTo({
                          top: Math.max(absoluteTop - 117, 0),
                          behavior: "smooth",
                        });
                      } catch {}
                    }
                  };

                  // If the content is currently fully collapsed, expand it first so the
                  // scroll target is computed against the final layout (avoids a
                  // secondary "extra scroll" caused by spacer height changes).
                  if (contentCollapsed) {
                    setContentRevealRequestId((prev) => prev + 1);
                    setContentCollapsed(false);
                    requestAnimationFrame(runScroll);
                    return;
                  }

                  runScroll();
                }}
                aria-label="Scroll to content"
                className="flex items-center gap-1 px-4 py-3 rounded-full bg-background backdrop-blur border border-border shadow-lg text-sm font-medium text-foreground hover:bg-highlight-5 transition-colors touch-none select-none"
              >
                <span className="min-w-0 max-w-[min(72vw,18rem)] truncate text-center">
                  {fullMapPage
                    ? beachName?.trim()
                      ? beachName.trim()
                      : forecastPage
                        ? "Forecast"
                        : "Overview"
                    : "Beaches"}
                </span>
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          ) : null
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
        ) : isEditing ? null : (
          <BackToMapButton />
        )}
      </div>

      {/* Filters overlay + sheet (always mounted to avoid flicker) */}
      <>
        <div
          className={cn(
            "fixed inset-0 z-70 bg-black/30 transition-opacity duration-100",
            openPanel === "filters"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          onClick={() => setOpenPanel(null)}
        />

        {/* Responsive Sheet / Modal */}
        <div
          style={{ touchAction: "pan-y" }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-70 flex flex-col max-h-[85vh] transition-[transform,opacity] duration-150 will-change-transform translate-y-4 opacity-0 pointer-events-none",
            openPanel === "filters" &&
              "translate-y-0 opacity-100 pointer-events-auto",
            "@min-4xl:bottom-auto @min-4xl:left-1/2 @min-4xl:top-1/2 @min-4xl:right-auto @min-4xl:-translate-x-1/2 @min-4xl:-translate-y-1/2 @min-4xl:max-h-[80vh] @min-4xl:w-[800px]",
          )}
        >
          <FiltersPanel
            open={openPanel === "filters"}
            appliedFilters={filters}
            onClose={() => setOpenPanel(null)}
            onApply={(next) => {
              setFilters(new Set(next));
              setOpenPanel(null);
            }}
            className={cn(
              "rounded-t-3xl rounded-b-none border-t border-border/30 shadow-[0_-12px_40px_rgba(2,6,23,0.08)]",
              "@min-4xl:rounded-3xl @min-4xl:border @min-4xl:shadow-2xl",
            )}
          />
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
          "shadow-md @min-4xl:hidden safe-area-inset-bottom bg-highlight-4 backdrop-blur border-t border-border fixed bottom-0 left-0 right-0 transition-all duration-300 touch-none",
          isEditing ? "z-[1000003]" : "z-60",
          // Hide when: scrolled away or filters open
          showBottomUI && openPanel !== "filters"
            ? "translate-y-0"
            : "translate-y-full",
        )}
      >
        <nav
          aria-label="bottom navigation"
          className={cn(
            "max-w-150 mx-auto flex items-center h-17",
            isEditing ? "justify-center px-4" : "justify-around",
          )}
        >
          {isEditing ? (
            <div className="w-full max-w-sm flex items-center gap-3">
              <button
                type="button"
                onClick={() => dashboardEditMode?.confirm?.()}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2",
                  "rounded-full px-4 py-2.5 text-sm font-semibold",
                  "border border-border bg-highlight-4 ring-1 ring-border/55",
                  "supports-[backdrop-filter]:backdrop-blur-md",
                  "hover:bg-highlight-5 hover:dark:bg-highlight-5 hover:shadow-2xl transition-[opacity,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                  "active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/35 focus-visible:ring-offset-0",
                )}
              >
                <CircleCheck className="stroke-[2.5px] w-4.5 h-4.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => dashboardEditMode?.cancel?.()}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2",
                  "rounded-full px-4 py-2.5 text-sm font-semibold",
                  "border border-destructive/45 bg-transparent",
                  "text-destructive",
                  "supports-[backdrop-filter]:backdrop-blur-md",
                  "hover:bg-destructive/10 transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/25 focus-visible:ring-offset-0",
                )}
              >
                <X className="stroke-[2.5px] w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const isBeaches = pathname.endsWith("/beaches");
                const isNearby = isBeaches && selectedTab === "nearby";
                const isSaved = isBeaches && selectedTab === "saved";
                const browseHref = "/beaches?tab=nearby";
                const savedHref = user
                  ? "/beaches?tab=saved"
                  : `/login?next=${encodeURIComponent("/beaches?tab=saved")}`;
                const itemClass = (active: boolean) =>
                  cn(
                    "p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15 transition-colors",
                    "hover:bg-highlight-5",
                    active ? "text-foreground" : "text-foreground/80",
                  );
                return (
                  <>
                    <Link
                      href={browseHref}
                      aria-current={isNearby ? "page" : undefined}
                      className={itemClass(isNearby)}
                      onClick={() => {
                        try {
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "tab:/beaches",
                              "nearby",
                            );
                          }
                        } catch {}
                      }}
                    >
                      <MapPinned
                        className={cn(
                          "w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5",
                          isNearby
                            ? "fill-foreground text-background"
                            : "text-foreground/80",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[0.6rem] @min-md:text-xs",
                          "font-medium leading-none",
                          isNearby
                            ? "font-medium text-foreground"
                            : "text-foreground/80",
                        )}
                      >
                        Browse
                      </span>
                    </Link>
                    <Link
                      href={savedHref}
                      aria-current={isSaved ? "page" : undefined}
                      className={itemClass(isSaved)}
                      onClick={() => {
                        if (!user) return;
                        try {
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "tab:/beaches",
                              "saved",
                            );
                          }
                        } catch {}
                      }}
                    >
                      <Heart
                        className={cn(
                          "w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5",
                          isSaved
                            ? "fill-foreground text-background"
                            : "text-foreground/80",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[0.6rem] @min-md:text-xs",
                          "font-medium leading-none",
                          isSaved
                            ? "font-medium text-foreground"
                            : "text-foreground/80",
                        )}
                      >
                        Saved
                      </span>
                    </Link>
                  </>
                );
              })()}
              <button
                type="button"
                aria-label="search"
                onClick={() => setIsOverlay(true)}
                aria-pressed={isOverlay}
                className={cn(
                  "group/button inline-flex @min-4xl:hidden items-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]",
                  isOverlay
                    ? "ring-2 ring-foreground/20"
                    : "hover:scale-[1.05]",
                )}
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
                <AppMenu
                  open={profileOpen}
                  onOpenChange={setProfileOpen}
                  closeOnScroll
                >
                  <AppMenuTrigger
                    id="bottom-nav-profile-trigger"
                    className="text-foreground/80 hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
                  >
                    <User className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
                    <span className="font-medium text-[0.6rem] @min-md:text-xs">
                      Profile
                    </span>
                  </AppMenuTrigger>
                  <AppMenuContent
                    data-ww-scroll-lock="1"
                    align="end"
                    sideOffset={10}
                    className="w-72"
                  >
                    <AppMenuHeader
                      title="Account"
                      subtitle={displayEmail}
                      icon={<User className="h-4 w-4" />}
                    />
                    <AppMenuSeparator />
                    <AppMenuItem
                      asChild
                      onSelect={() => {
                        try {
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "tab:/beaches",
                              "saved",
                            );
                          }
                        } catch {}
                        setProfileOpen(false);
                      }}
                    >
                      <Link href="/beaches?tab=saved">
                        <Heart className="w-5 h-5 -mt-0.5" /> Saved spots
                      </Link>
                    </AppMenuItem>
                    <AppMenuSeparator />
                    <AppMenuItem
                      variant="destructive"
                      onSelect={async () => {
                        setProfileOpen(false);
                        await supabase.auth.signOut();
                        router.push("/login");
                        router.refresh();
                      }}
                    >
                      <LogOut className="h-5 w-5" /> Sign out
                    </AppMenuItem>
                  </AppMenuContent>
                </AppMenu>
              ) : (
                <button
                  type="button"
                  className="text-foreground/80 hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
                  onClick={() => router.push("/login")}
                >
                  <User className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
                  <span className="font-medium text-[0.6rem] @min-md:text-xs">
                    Profile
                  </span>
                </button>
              )}
              <NavMoreMenu
                bottomNavMode
                landingPage={landingPage}
                links={BOTTOM_NAV_MORE_LINKS}
              />
            </>
          )}
        </nav>
      </div>
    </>
  );
}
