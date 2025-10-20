"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const prev = useRef<string>("");
  useEffect(() => {
    // always scroll to top on route change, unless after editing dashboard
    if (!prev.current.endsWith("/edit"))
      window.scrollTo({ top: 0, behavior: "auto" });
    prev.current = pathname;
  }, [pathname]);

  return null;
}
