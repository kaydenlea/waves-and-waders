"use client";

export function getAppScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("main-content") as HTMLElement | null;
  if (el?.dataset?.wwScrollShell === "1") return el;
  return null;
}

export function getAppScrollTop(): number {
  const root = getAppScrollRoot();
  if (root) return root.scrollTop;
  return typeof window !== "undefined" ? window.scrollY : 0;
}

export function appScrollToTop(behavior: ScrollBehavior = "auto") {
  const root = getAppScrollRoot();
  if (root) {
    root.scrollTo({ top: 0, left: 0, behavior });
    return;
  }
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
}

export function appScrollBy(top: number, behavior: ScrollBehavior = "auto") {
  const root = getAppScrollRoot();
  if (root) {
    root.scrollBy({ top, left: 0, behavior });
    return;
  }
  window.scrollBy({ top, left: 0, behavior });
}

