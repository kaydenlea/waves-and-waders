"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  pathname: string;
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
};

const PathContext = createContext<Ctx | null>(null);

export function PathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selectedTab, setSelectedTab] = useState("");
  const value = useMemo(
    () => ({
      pathname,
      selectedTab,
      setSelectedTab,
    }),
    [selectedTab, pathname]
  );
  return <PathContext.Provider value={value}>{children}</PathContext.Provider>;
}

export function useClientPath() {
  const ctx = useContext(PathContext);
  if (!ctx) throw new Error("useClientPath must be used within PathProvider");
  return ctx;
}
