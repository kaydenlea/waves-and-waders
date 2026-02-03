"use client";

import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  className?: string;
  label?: string;
  loggedIn?: boolean;
};

const STORAGE_KEY = "ww:beaches:return";

export default function BackButton({
  className,
  label = "Back",
  loggedIn,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // Navigate back to whichever beaches page the user came from (e.g. /beaches or /beaches/all).
    let tab: string | null = null;
    let target = "/beaches";
    let hasStoredTarget = false;
    try {
      if (typeof window !== "undefined") {
        // 0) Prefer persisted return href from beaches pages.
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (
          stored &&
          (stored === "/beaches" ||
            stored.startsWith("/beaches?") ||
            stored === "/beaches/all")
        ) {
          target = stored;
          hasStoredTarget = true;
        }

        // 1) If we don't have a stored target, fall back to referrer if it was a beaches page.
        // Note: document.referrer can be stale across client-side navigations, so it should never
        // override the stored target.
        if (!hasStoredTarget) {
          const ref = document.referrer;
          if (ref) {
            try {
              const url = new URL(ref);
              if (url.pathname === "/beaches/all") {
                target = `${url.pathname}${url.search ?? ""}`;
              } else if (url.pathname === "/beaches") {
                target = `${url.pathname}${url.search ?? ""}`;
                const qp = url.searchParams.get("tab");
                if (qp === "saved" || qp === "nearby") tab = qp;
              }
            } catch {}
          }
        }
        // 2) Fallback to persisted tab
        if (!tab) {
          const savedTab = window.localStorage.getItem("tab:/beaches");
          if (savedTab === "saved" || savedTab === "nearby") tab = savedTab;
        }
        // Only apply tab fallback when target is the main beaches page without a tab.
        if (tab && (target === "/beaches" || target.startsWith("/beaches?"))) {
          try {
            const url = new URL(target, window.location.origin);
            if (!url.searchParams.get("tab")) url.searchParams.set("tab", tab);
            target = `${url.pathname}${url.search ? url.search : ""}`;
          } catch {
            target = `/beaches?tab=${tab}`;
          }
        }
      }
    } catch {
      // ignore storage errors and use default
    }
    // If Saved is requested but user is not logged in, forward to login
    const wantsSavedTab =
      tab === "saved" ||
      (typeof window !== "undefined" &&
        (() => {
          try {
            const url = new URL(target, window.location.origin);
            return (
              url.pathname === "/beaches" &&
              url.searchParams.get("tab") === "saved"
            );
          } catch {
            return false;
          }
        })());

    if (wantsSavedTab && loggedIn === false) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <button
      type="button"
      aria-label="Back to beaches"
      title="Back to beaches"
      onClick={handleClick}
      className={cn(
        "group/button self-center flex items-center gap-1 rounded-full",
        "border border-border/25 bg-highlight-7 shadow-even",
        "supports-[backdrop-filter]:backdrop-blur-md",
        "hover:bg-highlight-6/60 transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
        // On overview we show icon + label with slightly larger padding
        "flex items-center gap-1 p-2 @min-2xl:px-4 @min-2xl:py-2.5",
        className,
      )}
    >
      <Undo2 className="w-6 h-6 text-foreground @min-2xl:-mt-[3px]" />
      <span className="font-medium hidden @min-2xl:inline-block">{label}</span>
    </button>
  );
}
