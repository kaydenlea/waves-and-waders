"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  pathname: string;
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
};

const PathContext = createContext<Ctx | null>(null);

export function PathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState("");
  // Restore persisted tab per-path on mount/path change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      // Query param takes precedence if provided
      const qp = searchParams?.get("tab");
      if (qp && qp !== selectedTab) {
        setSelectedTab(qp);
        return;
      }

      // For beach pages, default to "overview" instead of saved tab
      // This ensures clicking a beach card always goes to overview
      if (pathname.includes("/overview") || pathname.match(/^\/[^/]+\/[^/]+$/)) {
        if (selectedTab !== "overview") {
          setSelectedTab("overview");
        }
        return;
      }

      // For forecast pages, set to "forecast"
      if (pathname.includes("/forecast")) {
        if (selectedTab !== "forecast") {
          setSelectedTab("forecast");
        }
        return;
      }

      const key = `tab:${pathname}`;
      const saved = window.localStorage.getItem(key);
      if (saved && saved !== selectedTab) {
        setSelectedTab(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Persist tab selection per-path
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!selectedTab) return;
      const key = `tab:${pathname}`;
      window.localStorage.setItem(key, selectedTab);
    } catch {}
  }, [selectedTab, pathname]);
  const value = useMemo(
    () => ({
      pathname,
      selectedTab,
      setSelectedTab,
    }),
    [selectedTab, pathname]
  );
  return <PathContext.Provider value={value}>{children}</PathContext.Provider>;
}

export function useClientPath() {
  const ctx = useContext(PathContext);
  if (!ctx) throw new Error("useClientPath must be used within PathProvider");
  return ctx;
}
