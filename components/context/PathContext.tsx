"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  pathname: string;
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
};

const PathContext = createContext<Ctx | null>(null);

export function PathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectedTab, setSelectedTab] = useState("");
  // Restore persisted tab per-path on mount/path change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = `tab:${pathname}`;
      const saved = window.localStorage.getItem(key);
      if (saved && saved !== selectedTab) {
        setSelectedTab(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
