"use client";

import React, { createContext, useContext, useState, useTransition } from "react";

type LoadingContextType = {
  isTransitioning: boolean;
  startTransition: (callback: () => void) => void;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  
  return (
    <LoadingContext.Provider value={{ isTransitioning: isPending, startTransition }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
