"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";

const PathContext = createContext<string | null>(null);

export function PathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <PathContext.Provider value={pathname}>{children}</PathContext.Provider>
  );
}

export function useClientPath() {
  return useContext(PathContext);
}
