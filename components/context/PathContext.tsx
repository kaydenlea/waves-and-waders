"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  Suspense,
  useCallback,
  useRef,
  useState,
} from "react";

type Ctx = {
  pathname: string;
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
};

const PathContext = createContext<Ctx | null>(null);

function PathSearchParamsSync({
  onTabParam,
}: {
  onTabParam: (tab: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const qpTab = searchParams?.get("tab") ?? null;

  useLayoutEffect(() => {
    onTabParam(qpTab);
  }, [onTabParam, qpTab]);

  return null;
}

export function PathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialTab = useMemo(() => {
    if (pathname?.includes("/forecast")) return "forecast";
    if (pathname?.includes("/overview")) return "overview";
    return "";
  }, [pathname]);
  const [selectedTab, setSelectedTab] = useState(initialTab);

  const tabParamRef = useRef<string | null>(null);

  const handleTabParam = useCallback((tab: string | null) => {
    tabParamRef.current = tab;
    if (tab) {
      setSelectedTab((prev) => (prev === tab ? prev : tab));
    }
  }, []);
  // Restore persisted tab per-path on mount/path change
  useLayoutEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // Query param takes precedence if provided - check this FIRST
      const qp = tabParamRef.current;
      if (qp) {
        if (qp !== selectedTab) {
          setSelectedTab(qp);
        }
        return;
      }

      const isForecastPath = pathname.includes("/forecast");
      const isOverviewPath = pathname.includes("/overview");

      // For dedicated forecast/overview routes, the URL semantics win over any
      // saved local state to avoid tab flicker on refresh.
      if (isForecastPath && selectedTab !== "forecast") {
        setSelectedTab("forecast");
        return;
      }
      if (isOverviewPath && selectedTab !== "overview") {
        setSelectedTab("overview");
        return;
      }

      const key = `tab:${pathname}`;
      const saved = window.localStorage.getItem(key);
      if (saved && saved !== selectedTab) {
        setSelectedTab(saved);
        return;
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
  return (
    <PathContext.Provider value={value}>
      <Suspense fallback={null}>
        <PathSearchParamsSync onTabParam={handleTabParam} />
      </Suspense>
      {children}
    </PathContext.Provider>
  );
}

export function useClientPath() {
  const ctx = useContext(PathContext);
  if (!ctx) throw new Error("useClientPath must be used within PathProvider");
  return ctx;
}
