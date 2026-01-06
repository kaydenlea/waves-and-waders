"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandHeart, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  React.useEffect(() => {
    if (pathname === "/donate") {
      setDismissed(true);
      return;
    }
    setDismissed(false);
  }, [pathname]);

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

  const dismiss = () => setDismissed(true);

  return (
    <div
      className={cn(
        "fixed z-[60] right-4 bottom-4 sm:right-6 sm:bottom-6",
        "pb-[env(safe-area-inset-bottom)]",
        reducedMotion ? "" : "transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none",
        className
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
