import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env/public";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

export type SupabaseBrowserClient = ReturnType<
  typeof createSupabaseBrowserClient
>;
