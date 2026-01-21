import "server-only";
import { getSupabaseAdminOptional } from "@/lib/supabase-admin";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

const BEACH_COUNT_CACHE_MS = 5 * 60 * 1000;
let cachedBeachCount: { timestamp: number; count: number } | null = null;
let loggedMissingAdminKey = false;
let cachedPublicClient: SupabaseClient<any> | null = null;

const getSupabasePublicServerClient = () => {
  if (cachedPublicClient) return cachedPublicClient;

  const supabaseUrl = serverEnv.SUPABASE_URL ?? publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    serverEnv.SUPABASE_ANON_KEY ?? publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cachedPublicClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedPublicClient;
};

export async function fetchBeachCount(): Promise<number> {
  const now = Date.now();
  if (cachedBeachCount && now - cachedBeachCount.timestamp < BEACH_COUNT_CACHE_MS) {
    return cachedBeachCount.count;
  }

  const supabaseAdmin = getSupabaseAdminOptional();
  const client = supabaseAdmin ?? getSupabasePublicServerClient();
  const usingAdminClient = Boolean(supabaseAdmin);

  if (!usingAdminClient) {
    if (process.env.NODE_ENV !== "production" && !loggedMissingAdminKey) {
      loggedMissingAdminKey = true;
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY not set; using anon client for beach count."
      );
    }
  }

  let count: number | null = null;
  let error: unknown = null;
  try {
    const result = await client
      .from("beaches_optimized")
      .select("id", { count: "exact", head: true })
      .or("INLND_AREA.is.null,INLND_AREA.neq.Yes");
    count = typeof result.count === "number" ? result.count : null;
    error = result.error ?? null;
  } catch (err) {
    error = err;
  }

  if (error) {
    console.error("Failed to fetch beach count:", {
      error,
    });
    cachedBeachCount = { timestamp: now, count: 0 };
    return 0;
  }

  const resolved = typeof count === "number" ? count : 0;
  cachedBeachCount = { timestamp: now, count: resolved };
  return resolved;
}
