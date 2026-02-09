"use client";

export type PageScrollRoot = Window | HTMLElement;

function getMainElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("main-content");
}

export function getPageScrollContainer(): HTMLElement | null {
  if (typeof window === "undefined") return null;
  const main = getMainElement();
  if (!main) return null;

  if (main.dataset.wwScrollContainer !== "1") return null;

  const style = window.getComputedStyle(main);
  const overflowY = style.overflowY;
  return overflowY === "auto" || overflowY === "scroll" ? main : null;
}

export function getPageScrollRoot(): PageScrollRoot | null {
  if (typeof window === "undefined") return null;
  return getPageScrollContainer() ?? window;
}

export function getPageScrollY(): number {
  if (typeof window === "undefined") return 0;
  const container = getPageScrollContainer();
  return container ? container.scrollTop : window.scrollY ?? 0;
}

export function getPageScrollX(): number {
  if (typeof window === "undefined") return 0;
  const container = getPageScrollContainer();
  return container ? container.scrollLeft : window.scrollX ?? 0;
}

export function pageScrollTo(options: ScrollToOptions) {
  if (typeof window === "undefined") return;
  const container = getPageScrollContainer();
  if (container) {
    container.scrollTo(options);
    return;
  }
  window.scrollTo(options);
}

export function pageScrollBy(options: ScrollToOptions) {
  if (typeof window === "undefined") return;
  const container = getPageScrollContainer();
  if (container) {
    container.scrollBy(options);
    return;
  }
  window.scrollBy(options);
}

export function addPageScrollListener(
  handler: (event: Event) => void,
  options?: AddEventListenerOptions,
) {
  if (typeof window === "undefined") return () => {};
  const root = getPageScrollRoot();
  if (!root) return () => {};

  root.addEventListener("scroll", handler, options);
  return () => root.removeEventListener("scroll", handler, options);
}

export function getPageScrollOffsetTop(
  target: HTMLElement,
  headerOffsetPx = 0,
): number {
  if (typeof window === "undefined") return 0;
  const container = getPageScrollContainer();
  if (!container) {
    const rect = target.getBoundingClientRect();
    return Math.max(0, Math.round(rect.top + getPageScrollY() - headerOffsetPx));
  }

  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const withinContainerTop = targetRect.top - containerRect.top;
  return Math.max(
    0,
    Math.round(container.scrollTop + withinContainerTop - headerOffsetPx),
  );
}
