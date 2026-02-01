"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

const TAB_COOKIE_BEACHES = "ww_tab_beaches";
const TAB_COOKIE_BEACH_DASHBOARD = "ww_tab_beach_dashboard";

const normalizePathname = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
};

const normalizeTabForStorageKey = (key: string, tab: string | null) => {
  if (!tab) return null;
  if (key === "tab:beach-dashboard") {
    return tab === "overview" || tab === "forecast" ? tab : null;
  }
  if (key === "tab:/beaches") {
    return tab === "nearby" || tab === "saved" ? tab : null;
  }
  return tab;
};

const getTabCookieNameForStorageKey = (key: string) => {
  if (key === "tab:beach-dashboard") return TAB_COOKIE_BEACH_DASHBOARD;
  if (key === "tab:/beaches") return TAB_COOKIE_BEACHES;
  return null;
};

const setTabCookieForStorageKey = (key: string, tab: string) => {
  try {
    if (typeof window === "undefined") return;
    const cookieName = getTabCookieNameForStorageKey(key);
    if (!cookieName) return;

    const maxAgeSeconds = 60 * 60 * 24 * 365;
    window.document.cookie = [
      `${cookieName}=${encodeURIComponent(tab)}`,
      "Path=/",
      `Max-Age=${maxAgeSeconds}`,
      "SameSite=Lax",
    ].join("; ");
  } catch {}
};

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
  initialTabPreferences,
}: {
  children: React.ReactNode;
  initialTabOverride?: string;
  initialTabPreferences?: {
    beaches?: string | null;
    beachDashboard?: string | null;
  };
}) {
  const pathnameRaw = usePathname();
  const router = useRouter();
  const pathname = useMemo(() => normalizePathname(pathnameRaw), [pathnameRaw]);
  const isDashboardPath = useMemo(() => {
    if (!pathname) return false;
    return pathname.includes("/overview");
  }, [pathname]);
  const getTabStorageKey = useCallback(
    (path: string) => {
      const stablePath = normalizePathname(path);
      if (stablePath.includes("/overview")) {
        return "tab:beach-dashboard";
      }
      return `tab:${stablePath}`;
    },
    []
  );
  const [selectedTab, setSelectedTab] = useState(() => {
    const key = getTabStorageKey(pathname);

    if (initialTabOverride) {
      const override = normalizeTabForStorageKey(key, initialTabOverride);
      if (override) return override;
    }

    const prefRaw =
      key === "tab:/beaches"
        ? (initialTabPreferences?.beaches ?? null)
        : key === "tab:beach-dashboard"
          ? (initialTabPreferences?.beachDashboard ?? null)
          : null;

    const pref = normalizeTabForStorageKey(key, prefRaw);
    if (pref) return pref;

    // Keep the default SSR-stable; restore the real tab preference in a layout effect.
    // When no cookie exists yet, this avoids forcing a tab that could be wrong.
    return "";
  });

  const tabParamRef = useRef<string | null>(null);
  const hasMountedRef = useRef(false);
  const pendingRestoreTabRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!initialTabOverride) return;
    const key = getTabStorageKey(pathname);
    const override = normalizeTabForStorageKey(key, initialTabOverride);
    if (!override) return;
    setSelectedTab((prev) => (prev === override ? prev : override));
  }, [initialTabOverride, pathname, getTabStorageKey]);

  const handleTabParam = useCallback((tab: string | null) => {
    tabParamRef.current = tab;
    const key = getTabStorageKey(pathname);
    const next = normalizeTabForStorageKey(key, tab);
    if (!next) return;

    setSelectedTab((prev) => (prev === next ? prev : next));
  }, [getTabStorageKey, pathname]);
  // Restore persisted tab per-path on mount/path change
  useLayoutEffect(() => {
    hasMountedRef.current = false;
    pendingRestoreTabRef.current = null;
    try {
      if (typeof window === "undefined") return;

      const key = getTabStorageKey(pathname);
      let nextTab: string | null = null;

      // Query param takes precedence if provided - check this FIRST
      const qpRaw = new URLSearchParams(window.location.search).get("tab");
      const qp = normalizeTabForStorageKey(key, qpRaw);

      const savedRaw = window.localStorage.getItem(key);
      const saved = normalizeTabForStorageKey(key, savedRaw);
      if (savedRaw && !saved) {
        window.localStorage.removeItem(key);
      }

      // If the URL explicitly specifies a tab, it wins (supports deep-linking).
      if (qp) nextTab = qp;
       
      // If localStorage has a saved value, use it (even if it matches current state).
      // This prevents the path-based fallback from overriding user preference.
      if (!nextTab && saved) nextTab = saved;

      if (!nextTab && key === "tab:/beaches") {
        if (selectedTab !== "nearby" && selectedTab !== "saved") nextTab = "nearby";
      }

      // Only fall back to path-based default if no localStorage value exists
      if (!nextTab && isDashboardPath) {
        nextTab = "overview";
      }

      // Beaches defaults to "nearby" only if there's no stronger preference.
      if (!nextTab && key === "tab:/beaches") {
        nextTab = "nearby";
      }

      if (nextTab && nextTab !== selectedTab) {
        setTabCookieForStorageKey(key, nextTab);
        pendingRestoreTabRef.current = nextTab;
        setSelectedTab(nextTab);
        return;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Unblock persistence once the restored tab has applied.
  useEffect(() => {
    if (!pathname) return;
    const pending = pendingRestoreTabRef.current;
    if (!pending || pending === selectedTab) {
      pendingRestoreTabRef.current = null;
      hasMountedRef.current = true;
    }
  }, [pathname, selectedTab]);

  // Persist tab selection per-path
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!selectedTab) return;
      
      // Skip the first render to avoid overwriting localStorage before
      // useLayoutEffect has a chance to read and restore the saved value.
      // This prevents a race condition during hydration.
      if (!hasMountedRef.current) return;
      
      // Only persist tab if it's valid for the current path type.
      // This prevents accidentally saving "nearby" to "tab:beach-dashboard"
      // when navigating away from beach pages.
      const key = getTabStorageKey(pathname);
      const normalized = normalizeTabForStorageKey(key, selectedTab);
      if (!normalized) return;

      window.localStorage.setItem(key, normalized);
      setTabCookieForStorageKey(key, normalized);
    } catch {}
  }, [selectedTab, pathname, getTabStorageKey]);

  // Keep the combined dashboard (/{beach}/overview) query string in sync with the selected tab.
  // This ensures that opening the overview page without `?tab=` still deep-links to the restored tab.
  useLayoutEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!pathname) return;
      if (!pathname.endsWith("/overview")) return;

      const key = getTabStorageKey(pathname);
      if (key !== "tab:beach-dashboard") return;

      const normalized = normalizeTabForStorageKey(key, selectedTab);
      if (!normalized) return;

      const params = new URLSearchParams(window.location.search);
      const qp = params.get("tab");
      if (qp === normalized) return;

      params.set("tab", normalized);
      const qs = params.toString();
      const hash = window.location.hash ?? "";
      router.replace(`${pathname}?${qs}${hash}`, { scroll: false });
    } catch {}
  }, [pathname, selectedTab, router, getTabStorageKey]);

  // Guard against invalid tab values for dashboard routes (e.g. "nearby" on /overview).
  useEffect(() => {
    if (!pathname) return;
    if (!isDashboardPath) return;
    if (!selectedTab) return;
    if (selectedTab === "overview" || selectedTab === "forecast") return;
    setSelectedTab("overview");
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
