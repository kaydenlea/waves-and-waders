"use client";

type ScrollTarget = Window | HTMLElement;

export function getSheetScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector("[data-ww-sheet-scroll='1']") as
    | HTMLElement
    | null;
}

export function getActiveScrollTarget(): ScrollTarget {
  return getSheetScrollElement() ?? window;
}

export function getActiveScrollTop(): number {
  const target = getActiveScrollTarget();
  if (target instanceof HTMLElement) return target.scrollTop ?? 0;
  return window.scrollY ?? 0;
}

export function scrollActiveToTop(behavior: ScrollBehavior = "auto") {
  const target = getActiveScrollTarget();
  if (!(target instanceof HTMLElement)) {
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }
    return;
  }

  try {
    target.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    target.scrollTop = 0;
  }
}

export function scrollActiveToY(top: number, behavior: ScrollBehavior = "auto") {
  const target = getActiveScrollTarget();
  const y = Math.max(0, Math.round(top));
  if (!(target instanceof HTMLElement)) {
    try {
      window.scrollTo({ top: y, left: 0, behavior });
    } catch {
      window.scrollTo(0, y);
    }
    return;
  }

  try {
    target.scrollTo({ top: y, left: 0, behavior });
  } catch {
    target.scrollTop = y;
  }
}

export function getElementTopInActiveScroller(el: HTMLElement): number {
  const target = getActiveScrollTarget();
  const rect = el.getBoundingClientRect();
  if (!(target instanceof HTMLElement)) {
    return rect.top + (window.scrollY ?? 0);
  }
  const rootRect = target.getBoundingClientRect();
  return rect.top - rootRect.top + (target.scrollTop ?? 0);
}

export function addActiveScrollListener(
  handler: () => void,
  options?: AddEventListenerOptions,
): () => void {
  const target = getActiveScrollTarget();
  if (!(target instanceof HTMLElement)) {
    window.addEventListener("scroll", handler, options);
    return () => window.removeEventListener("scroll", handler);
  }
  target.addEventListener("scroll", handler, options);
  return () => target.removeEventListener("scroll", handler);
}
