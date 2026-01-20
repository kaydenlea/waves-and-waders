import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import { getSupabaseServiceRoleKey, requireSupabaseServiceRoleKey, serverEnv } from "@/lib/env/server";

// Server-side admin client that bypasses RLS - use only in API routes.
let cachedAdminClient: SupabaseClient<any> | null = null;

export const getSupabaseAdminOptional = () => {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = serverEnv.SUPABASE_URL ?? publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = getSupabaseServiceRoleKey();
  if (!supabaseServiceKey) return null;

  const client = createClient<any>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  cachedAdminClient = client;

  return client;
};

export const getSupabaseAdmin = () => getSupabaseAdminOptional() ?? (() => {
  requireSupabaseServiceRoleKey();
  throw new Error("Unreachable");
})();
