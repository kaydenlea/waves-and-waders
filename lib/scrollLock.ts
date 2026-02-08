"use client";

type ScrollLockSnapshot = {
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  rootScrollLockPadRight: string;
};

let lockCount = 0;
let snapshot: ScrollLockSnapshot | null = null;

function applyScrollLock() {
  if (typeof document === "undefined") return;
  if (snapshot) return;

  const html = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

  snapshot = {
    scrollY,
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    rootScrollLockPadRight: html.style.getPropertyValue(
      "--ww-scroll-lock-pad-right",
    ),
  };

  const computedPaddingRight = Number.parseFloat(
    window.getComputedStyle(body).paddingRight || "0",
  );

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";

  if (scrollbarWidth > 0 && Number.isFinite(computedPaddingRight)) {
    body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
  }

  // Expose the removed scrollbar width for fixed-position UI (map, bottom nav, etc)
  // so they can opt into the same "no-shift" compensation during scroll lock.
  html.style.setProperty("--ww-scroll-lock-pad-right", `${scrollbarWidth}px`);
}

function releaseScrollLock() {
  if (typeof document === "undefined") return;
  if (!snapshot) return;

  const html = document.documentElement;
  const body = document.body;
  const prev = snapshot;
  snapshot = null;

  html.style.overflow = prev.htmlOverflow;
  body.style.overflow = prev.bodyOverflow;
  body.style.position = prev.bodyPosition;
  body.style.top = prev.bodyTop;
  body.style.left = prev.bodyLeft;
  body.style.right = prev.bodyRight;
  body.style.width = prev.bodyWidth;
  body.style.paddingRight = prev.bodyPaddingRight;
  html.style.setProperty("--ww-scroll-lock-pad-right", prev.rootScrollLockPadRight);
  window.scrollTo(0, prev.scrollY);
}

export function acquireScrollLock(): () => void {
  lockCount += 1;
  if (lockCount === 1) applyScrollLock();

  let released = false;
  return () => {
    if (released) return;
    released = true;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) releaseScrollLock();
  };
}
