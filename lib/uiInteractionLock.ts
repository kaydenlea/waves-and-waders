"use client";

let activeTokens: Set<symbol> | null = null;
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
  const scrollY = window.scrollY;

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
  if (active) {
    document.body.dataset.wwInteractionLock = "1";
    document.documentElement.dataset.wwInteractionLock = "1";
    applyScrollLock();
  } else {
    delete document.body.dataset.wwInteractionLock;
    delete document.documentElement.dataset.wwInteractionLock;
    releaseScrollLock();
  }
}

export function acquireInteractionLock(): () => void {
  if (!activeTokens) activeTokens = new Set();
  const token = Symbol("ww-interaction-lock");
  activeTokens.add(token);
  syncBodyAttribute();

  return () => {
    if (!activeTokens) return;
    activeTokens.delete(token);
    syncBodyAttribute();
  };
}

