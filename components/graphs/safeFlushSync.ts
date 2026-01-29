import { flushSync } from "react-dom";

const defer =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (cb: () => void) => Promise.resolve().then(cb);

function isFlushSyncReentryError(err: unknown) {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("flushsync was called from inside a lifecycle method") ||
    msg.includes("react cannot flush when react is already rendering") ||
    msg.includes("cannot flush when react is already rendering")
  );
}

export function safeFlushSync(fn: () => void) {
  // Never call flushSync synchronously from observer callbacks; in rare cases
  // they can fire while React is already rendering/committing.
  // A microtask still runs before the next paint, so we keep the "no 1-frame jump"
  // behavior without triggering the flushSync re-entry error.
  defer(() => {
    try {
      flushSync(fn);
    } catch (err) {
      if (!isFlushSyncReentryError(err)) {
        throw err;
      }
      // If React is *still* rendering, fall back to the next frame.
      requestAnimationFrame(() => {
        try {
          flushSync(fn);
        } catch (err2) {
          if (!isFlushSyncReentryError(err2)) {
            throw err2;
          }
          fn();
        }
      });
    }
  });
}
