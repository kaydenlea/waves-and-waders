"use client";

import { useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import type { Session } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface SupabaseProviderProps {
  initialSession: Session | null;
  children: React.ReactNode;
}

export const SupabaseProvider = ({
  initialSession,
  children,
}: SupabaseProviderProps) => {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={initialSession ?? undefined}
    >
      {children}
    </SessionContextProvider>
  );
};
