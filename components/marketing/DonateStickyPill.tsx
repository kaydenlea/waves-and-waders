"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandHeart, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DONATE_PILL_DISMISS_KEY = "ww:donate-pill:v1:dismissedAt";
const DONATE_PILL_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(mql.matches));
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

export default function DonateStickyPill({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();

  const [dismissed, setDismissed] = React.useState(false);
  const [eligibleByScroll, setEligibleByScroll] = React.useState(false);
  const eligibleByScrollRef = React.useRef(false);

  const readDismissedPreference = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(DONATE_PILL_DISMISS_KEY);
      if (!raw) return false;
      const ts = Number.parseInt(raw, 10);
      if (!Number.isFinite(ts) || ts <= 0) return true;
      if (Date.now() - ts <= DONATE_PILL_DISMISS_TTL_MS) return true;
      window.localStorage.removeItem(DONATE_PILL_DISMISS_KEY);
      return false;
    } catch {
      return false;
    }
  }, []);

  const writeDismissedPreference = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DONATE_PILL_DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // On route changes, reset eligibility immediately to avoid briefly showing the pill
    // using stale `eligibleByScroll` from the previous page.
    const nextDismissed = pathname === "/donate" || readDismissedPreference();
    setDismissed(nextDismissed);
    eligibleByScrollRef.current = false;
    setEligibleByScroll(false);

    if (nextDismissed) return;

    const threshold = () => Math.round(window.innerHeight * 0.42);
    const raf = window.requestAnimationFrame(() => {
      const nextEligible = window.scrollY > threshold();
      eligibleByScrollRef.current = nextEligible;
      setEligibleByScroll(nextEligible);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [pathname, readDismissedPreference]);

  React.useEffect(() => {
    if (dismissed) return;

    let rafId: number | null = null;
    const threshold = () => Math.round(window.innerHeight * 0.42);

    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        // Avoid state updates every scroll tick; only commit when the boolean flips.
        const nextEligible = window.scrollY > threshold();
        if (nextEligible === eligibleByScrollRef.current) return;
        eligibleByScrollRef.current = nextEligible;
        setEligibleByScroll(nextEligible);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [dismissed]);

  const visible = !dismissed && eligibleByScroll;

  const dismiss = () => {
    writeDismissedPreference();
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "fixed z-[60] right-4 bottom-4 sm:right-6 sm:bottom-6",
        "pb-[env(safe-area-inset-bottom)]",
        reducedMotion ? "" : "transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
        className,
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/90 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur px-2 py-2">
        <Link
          href="/donate?from=sticky"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          <HandHeart className="h-4 w-4" aria-hidden="true" />
          Support
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss support button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/50 text-foreground/80 shadow-xs transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
