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

export function PathProvider({
  children,
  initialTabOverride,
}: {
  children: React.ReactNode;
  initialTabOverride?: string;
}) {
  const pathname = usePathname();
  const isDashboardPath = useMemo(() => {
    if (!pathname) return false;
    return pathname.includes("/overview") || pathname.includes("/forecast");
  }, [pathname]);
  const getTabStorageKey = useCallback(
    (path: string) => {
      if (path.includes("/overview") || path.includes("/forecast")) {
        return "tab:beach-dashboard";
      }
      return `tab:${path}`;
    },
    []
  );
  const [selectedTab, setSelectedTab] = useState(() => {
    if (initialTabOverride) return initialTabOverride;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get("tab");
      if (qp) return qp;
      if (pathname) {
        const key = getTabStorageKey(pathname);
        const saved = window.localStorage.getItem(key);
        if (saved) return saved;
      }
    }
    if (pathname?.includes("/forecast")) return "forecast";
    if (pathname?.includes("/overview")) return "overview";
    return "";
  });

  const tabParamRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!initialTabOverride) return;
    setSelectedTab((prev) => (prev === initialTabOverride ? prev : initialTabOverride));
  }, [initialTabOverride]);

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

      const key = getTabStorageKey(pathname);
      const saved = window.localStorage.getItem(key);
      if (saved && saved !== selectedTab) {
        setSelectedTab(saved);
        return;
      }

      if (isDashboardPath) {
        const fallback = pathname.includes("/forecast") ? "forecast" : "overview";
        if (selectedTab !== fallback) {
          setSelectedTab(fallback);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Persist tab selection per-path
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!selectedTab) return;
      const key = getTabStorageKey(pathname);
      window.localStorage.setItem(key, selectedTab);
    } catch {}
  }, [selectedTab, pathname]);

  // Guard against invalid tab values for dashboard routes (e.g. "nearby" on /overview).
  useEffect(() => {
    if (!pathname) return;
    if (!isDashboardPath) return;
    if (selectedTab === "overview" || selectedTab === "forecast") return;
    const fallback = pathname.includes("/forecast") ? "forecast" : "overview";
    setSelectedTab(fallback);
  }, [pathname, selectedTab, isDashboardPath]);
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
