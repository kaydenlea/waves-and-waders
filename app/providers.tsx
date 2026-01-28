"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { ScrollToTopOnRouteChange } from "@/lib/utils/scrollTop";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SearchProvider } from "@/components/context/SearchContext";
import { PathProvider } from "@/components/context/PathContext";
import ScrollPerfHandler from "@/components/general/ScrollPerfHandler";

export function AppProviders({
  initialSession,
  children,
}: {
  initialSession: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SupabaseProvider initialSession={initialSession}>
      <QueryProvider>
        <PathProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <SearchProvider>
                <ScrollToTopOnRouteChange />
                <ScrollPerfHandler />
                {children}
              </SearchProvider>
            </ToastProvider>
          </ThemeProvider>
        </PathProvider>
      </QueryProvider>
    </SupabaseProvider>
  );
}
