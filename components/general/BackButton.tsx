"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  className?: string;
  label?: string;
  loggedIn?: boolean;
};

export default function BackButton({
  className,
  label = "Back",
  loggedIn,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // Always navigate to /beaches (preserving previously selected tab if available)
    let tab: string | null = null;
    let target = "/beaches";
    try {
      if (typeof window !== "undefined") {
        // 1) Prefer referrer query if it was the beaches page
        const ref = document.referrer;
        if (ref) {
          try {
            const url = new URL(ref);
            if (url.pathname === "/beaches") {
              const qp = url.searchParams.get("tab");
              if (qp === "saved" || qp === "nearby") tab = qp;
            }
          } catch {}
        }
        // 2) Fallback to persisted tab
        if (!tab) {
          const savedTab = window.localStorage.getItem("tab:/beaches");
          if (savedTab === "saved" || savedTab === "nearby") tab = savedTab;
        }
        if (tab) target = `/beaches?tab=${tab}`;
      }
    } catch {
      // ignore storage errors and use default
    }
    // If Saved is requested but user is not logged in, forward to login
    if (tab === "saved" && loggedIn === false) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={handleClick}
      className={cn(
        "group/button self-center flex items-center gap-1 rounded-full",
        "border border-border/25 bg-highlight-7 shadow-even",
        "supports-[backdrop-filter]:backdrop-blur-md",
        "hover:bg-highlight-6/60 transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
        // On overview we show icon + label with slightly larger padding
        "flex items-center gap-1 p-2 @min-2xl:px-4 @min-2xl:py-2.5",
        className
      )}
    >
      <Undo2 className="w-6 h-6 text-foreground @min-2xl:-mt-[3px]" />
      <span className="font-medium hidden @min-2xl:inline-block">{label}</span>
    </button>
  );
}
