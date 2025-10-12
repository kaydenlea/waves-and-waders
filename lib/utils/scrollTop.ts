"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    // always scroll to top on route change
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
