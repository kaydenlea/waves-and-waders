"use client";

import React from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

type SupabaseAuthContextValue = {
  supabaseClient: SupabaseClient;
  session: Session | null;
  isLoading: boolean;
};

const SupabaseAuthContext = React.createContext<SupabaseAuthContextValue | null>(
  null,
);

export function SessionContextProvider({
  supabaseClient,
  initialSession,
  children,
}: {
  supabaseClient: SupabaseClient;
  initialSession?: Session;
  children: React.ReactNode;
}) {
  const [session, setSession] = React.useState<Session | null>(
    initialSession ?? null,
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const value = React.useMemo(
    () => ({
      supabaseClient,
      session,
      isLoading,
    }),
    [isLoading, session, supabaseClient],
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSessionContext() {
  const context = React.useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionContextProvider");
  }

  return {
    isLoading: context.isLoading,
    session: context.session,
    supabaseClient: context.supabaseClient,
    error: null as null,
  };
}

export function useSupabaseClient() {
  return useSessionContext().supabaseClient;
}

export function useUser(): User | null {
  return useSessionContext().session?.user ?? null;
}
