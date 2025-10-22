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
} from "lucide-react";
import BackToMapButton from "./BackToMapButton";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useSearchContext } from "../context/SearchContext";
import { usePathname } from "next/navigation";
import { useDateContext } from "../context/DateContext";

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
