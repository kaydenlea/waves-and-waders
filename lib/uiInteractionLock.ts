"use client";

type InteractionLockToken = {
  id: symbol;
  lockScroll: boolean;
};

let activeTokens: Map<symbol, InteractionLockToken> | null = null;
let scrollLockSnapshot: {
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
} | null = null;

function applyScrollLock() {
  if (typeof document === "undefined") return;
  if (scrollLockSnapshot) return;

  const html = document.documentElement;
  const body = document.body;
  const scroller = document.scrollingElement as HTMLElement | null;
  const maxScrollY = scroller
    ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    : 0;
  const scrollY = Math.max(0, Math.min(window.scrollY, maxScrollY));

  scrollLockSnapshot = {
    scrollY,
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  };

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
}

function releaseScrollLock() {
  if (typeof document === "undefined") return;
  if (!scrollLockSnapshot) return;

  const html = document.documentElement;
  const body = document.body;
  const snapshot = scrollLockSnapshot;
  scrollLockSnapshot = null;

  html.style.overflow = snapshot.htmlOverflow;
  body.style.overflow = snapshot.bodyOverflow;
  body.style.position = snapshot.bodyPosition;
  body.style.top = snapshot.bodyTop;
  body.style.left = snapshot.bodyLeft;
  body.style.right = snapshot.bodyRight;
  body.style.width = snapshot.bodyWidth;
  window.scrollTo(0, snapshot.scrollY);
}

function syncBodyAttribute() {
  if (typeof document === "undefined") return;
  const active = (activeTokens?.size ?? 0) > 0;
  const shouldLockScroll =
    active &&
    Array.from(activeTokens?.values?.() ?? []).some((t) => t.lockScroll);
  if (active) {
    document.body.dataset.wwInteractionLock = "1";
    document.documentElement.dataset.wwInteractionLock = "1";
    if (shouldLockScroll) applyScrollLock();
    else releaseScrollLock();
  } else {
    delete document.body.dataset.wwInteractionLock;
    delete document.documentElement.dataset.wwInteractionLock;
    releaseScrollLock();
  }
}

export function acquireInteractionLock(options?: {
  lockScroll?: boolean;
}): () => void {
  const lockScroll = options?.lockScroll !== false;
  if (!activeTokens) activeTokens = new Map();
  const id = Symbol("ww-interaction-lock");
  activeTokens.set(id, { id, lockScroll });
  syncBodyAttribute();

  return () => {
    if (!activeTokens) return;
    activeTokens.delete(id);
    syncBodyAttribute();
  };
}

