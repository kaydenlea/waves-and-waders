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
    // First check localStorage for persisted tab preference (highest priority when no explicit override)
    if (typeof window !== "undefined") {
      // If there's an explicit query param, use it (deep-link behavior)
      const params = new URLSearchParams(window.location.search);
      const qp = params.get("tab");
      if (qp) return qp;
      
      // Check localStorage for persisted preference
      if (pathname) {
        const key = getTabStorageKey(pathname);
        const saved = window.localStorage.getItem(key);
        if (saved) return saved;
      }
    }
    
    // Use server-provided override if available (only set when explicit ?tab= query param)
    if (initialTabOverride) return initialTabOverride;
    
    // Fall back to path-based default
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
      
      // If localStorage has a saved value, use it (even if it matches current state).
      // This prevents the path-based fallback from overriding user preference.
      if (saved) {
        if (saved !== selectedTab) {
          setSelectedTab(saved);
        }
        return;
      }

      // Only fall back to path-based default if no localStorage value exists
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
      
      // Only persist tab if it's valid for the current path type.
      // This prevents accidentally saving "nearby" to "tab:beach-dashboard"
      // when navigating away from beach pages.
      const key = getTabStorageKey(pathname);
      if (key === "tab:beach-dashboard") {
        // Only save overview/forecast to beach dashboard key
        if (selectedTab !== "overview" && selectedTab !== "forecast") return;
      }
      
      window.localStorage.setItem(key, selectedTab);
    } catch {}
  }, [selectedTab, pathname, getTabStorageKey]);

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
