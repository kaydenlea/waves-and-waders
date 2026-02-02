"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

const STORAGE_KEY = "ww:beaches:return";

export default function PersistBeachesReturn() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname !== "/beaches" && pathname !== "/beaches/all") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, href);
    } catch {
      // ignore storage errors
    }
  }, [href, pathname]);

  return null;
}

