"use client";

import React from "react";

type Ctx = {
  isOverlay: boolean;
  setIsOverlay: React.Dispatch<React.SetStateAction<boolean>>;
};

const SearchContext = React.createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOverlay, setIsOverlayState] = React.useState(false);
  const isOverlayRef = React.useRef(isOverlay);
  const clearAttrsTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    isOverlayRef.current = isOverlay;
  }, [isOverlay]);

  const setIsOverlay = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >((next) => {
    if (typeof document !== "undefined") {
      const html = document.documentElement;

      const resolved =
        typeof next === "function"
          ? next(isOverlayRef.current)
          : Boolean(next);

      if (resolved) {
        if (clearAttrsTimerRef.current != null) {
          window.clearTimeout(clearAttrsTimerRef.current);
          clearAttrsTimerRef.current = null;
        }
        html.dataset.wwSearchOverlay = "1";
        delete html.dataset.wwSearchOverlayClosing;
      } else {
        // Keep the underlying layout frozen briefly while the keyboard is closing,
        // so background pages (e.g., map views) don't visibly shift.
        html.dataset.wwSearchOverlayClosing = "1";
        if (clearAttrsTimerRef.current != null) {
          window.clearTimeout(clearAttrsTimerRef.current);
        }
        clearAttrsTimerRef.current = window.setTimeout(() => {
          clearAttrsTimerRef.current = null;
          delete html.dataset.wwSearchOverlay;
          delete html.dataset.wwSearchOverlayClosing;
        }, 650);
      }
    }

    setIsOverlayState(next);
  }, []);

  const value = React.useMemo(
    () => ({
      isOverlay,
      setIsOverlay,
    }),
    [isOverlay]
  );
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useOptionalSearchContext(): Ctx | null {
  return React.useContext(SearchContext);
}

export function useSearchContext(): Ctx {
  const ctx = useOptionalSearchContext();
  if (!ctx) {
    throw new Error("useSearchContext must be used within SearchProvider");
  }
  return ctx;
}
