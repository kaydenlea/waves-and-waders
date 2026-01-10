"use client";

import React from "react";

type Ctx = {
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const OverviewPageBusyContext = React.createContext<Ctx | null>(null);

export function OverviewPageBusyProvider({
  children,
  initialBusy = false,
}: {
  children: React.ReactNode;
  initialBusy?: boolean;
}) {
  const [busy, setBusy] = React.useState(Boolean(initialBusy));

  const value = React.useMemo(() => ({ busy, setBusy }), [busy]);

  return (
    <OverviewPageBusyContext.Provider value={value}>
      {children}
    </OverviewPageBusyContext.Provider>
  );
}

export function useOptionalOverviewPageBusy() {
  const ctx = React.useContext(OverviewPageBusyContext);
  return ctx?.busy ?? false;
}

export function useOptionalOverviewPageBusyControls() {
  const ctx = React.useContext(OverviewPageBusyContext);
  return ctx?.setBusy ?? null;
}
