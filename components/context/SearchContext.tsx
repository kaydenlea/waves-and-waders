"use client";

import React from "react";

type Ctx = {
  isOverlay: boolean;
  setIsOverlay: React.Dispatch<React.SetStateAction<boolean>>;
};

const SearchContext = React.createContext<Ctx | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOverlay, setIsOverlay] = React.useState(false);
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

export function useSearchContext(): Ctx {
  const ctx = React.useContext(SearchContext);
  if (!ctx)
    throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}
