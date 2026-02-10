"use client";

export const SHEET_SCROLL_CONTAINER_ID = "ww-sheet-scroll";

export type ScrollContainer = Window | HTMLElement;

function isHTMLElement(value: unknown): value is HTMLElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodeType" in (value as any) &&
    (value as any).nodeType === 1
  );
}

export function getSheetScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(SHEET_SCROLL_CONTAINER_ID);
  return isHTMLElement(el) ? el : null;
}

export function getActiveScrollContainer(): ScrollContainer {
  if (typeof window === "undefined") return window as any;
  const sheetEnabled =
    typeof document !== "undefined" &&
    document.body?.dataset.wwSheetScroll === "1";
  if (!sheetEnabled) return window;
  return getSheetScrollElement() ?? window;
}

export function getScrollTop(container: ScrollContainer): number {
  return container === window ? window.scrollY ?? 0 : container.scrollTop ?? 0;
}

export function scrollToTop(container: ScrollContainer) {
  if (container === window) {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
    return;
  }
  container.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  container.scrollTop = 0;
}

export function scrollToY(container: ScrollContainer, top: number) {
  const safeTop = Number.isFinite(top) ? Math.max(0, Math.round(top)) : 0;
  if (container === window) {
    try {
      window.scrollTo({ top: safeTop, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, safeTop);
    }
    return;
  }
  container.scrollTo?.({ top: safeTop, left: 0, behavior: "auto" });
  container.scrollTop = safeTop;
}

export function addScrollListener(
  container: ScrollContainer,
  handler: () => void,
  opts?: AddEventListenerOptions,
) {
  const options = opts ?? { passive: true };
  if (container === window) {
    window.addEventListener("scroll", handler, options);
    return () => window.removeEventListener("scroll", handler);
  }
  container.addEventListener("scroll", handler, options);
  return () => container.removeEventListener("scroll", handler);
}

export function notifyScrollOwnerChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ww-scroll-owner-changed"));
}

