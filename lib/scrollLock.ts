"use client";

type ScrollLockSnapshot = {
  scrollY: number;
  mode: "fixed" | "overflow";
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

type ScrollLockMode = "fixed" | "overflow";

function applyScrollLock(mode: ScrollLockMode) {
  if (typeof document === "undefined") return;
  if (snapshot) {
    // If a weaker lock was applied first, allow upgrading to the stronger lock.
    if (snapshot.mode === "overflow" && mode === "fixed") {
      const body = document.body;
      body.style.position = "fixed";
      body.style.top = `-${snapshot.scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      snapshot.mode = "fixed";
    }
    return;
  }

  const html = document.documentElement;
  const body = document.body;
  const scroller = document.scrollingElement as HTMLElement | null;
  const maxScrollY = scroller
    ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    : 0;
  const scrollY = Math.max(0, Math.min(window.scrollY, maxScrollY));
  // We only want to compensate for an actual layout width change caused by locking.
  // On wide screens with `scrollbar-gutter: stable`, removing the scrollbar does not
  // change `clientWidth`, so compensation should be 0.
  const beforeClientWidth = html.clientWidth;
  const wideLayout =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 912px)").matches;

  snapshot = {
    scrollY,
    mode,
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

  if (mode === "fixed") {
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  }

  const afterClientWidth = html.clientWidth;
  const compensation = wideLayout
    ? 0
    : Math.max(0, afterClientWidth - beforeClientWidth);

  if (compensation > 0 && Number.isFinite(computedPaddingRight)) {
    body.style.paddingRight = `${computedPaddingRight + compensation}px`;
  }

  // Expose the compensated width for fixed-position UI (map, bottom nav, etc).
  html.style.setProperty("--ww-scroll-lock-pad-right", `${compensation}px`);
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

export function acquireScrollLock(options?: { mode?: ScrollLockMode }): () => void {
  lockCount += 1;
  if (lockCount === 1) applyScrollLock(options?.mode ?? "fixed");
  else if (options?.mode === "fixed") applyScrollLock("fixed");

  let released = false;
  return () => {
    if (released) return;
    released = true;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) releaseScrollLock();
  };
}
