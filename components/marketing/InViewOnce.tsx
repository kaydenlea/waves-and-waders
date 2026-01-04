"use client";

import { useEffect, useRef } from "react";

export default function InViewOnce({
  rootAttr = "data-essentials-root",
  inViewAttr = "data-inview",
}: {
  rootAttr?: string;
  inViewAttr?: string;
}) {
  const sentinelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = sentinel.closest<HTMLElement>(`[${rootAttr}]`);
    if (!root) return;

    const setInView = () => root.setAttribute(inViewAttr, "true");

    if (typeof IntersectionObserver === "undefined") {
      setInView();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setInView();
        observer.disconnect();
      },
      { rootMargin: "20% 0px", threshold: 0.15 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [inViewAttr, rootAttr]);

  return (
    <span
      ref={sentinelRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 h-px w-px"
    />
  );
}

