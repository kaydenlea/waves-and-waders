"use client";

let activeTokens: Set<symbol> | null = null;

function syncBodyAttribute() {
  if (typeof document === "undefined") return;
  const active = (activeTokens?.size ?? 0) > 0;
  if (active) {
    document.body.dataset.wwInteractionLock = "1";
  } else {
    delete document.body.dataset.wwInteractionLock;
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

