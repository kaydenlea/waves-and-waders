import "server-only";
import { getSupabaseAdminOptional } from "@/lib/supabase-admin";

const BEACH_COUNT_CACHE_MS = 5 * 60 * 1000;
let cachedBeachCount: { timestamp: number; count: number } | null = null;
let loggedMissingAdminKey = false;

export async function fetchBeachCount(): Promise<number> {
  const now = Date.now();
  if (cachedBeachCount && now - cachedBeachCount.timestamp < BEACH_COUNT_CACHE_MS) {
    return cachedBeachCount.count;
  }

  const supabaseAdmin = getSupabaseAdminOptional();
  if (!supabaseAdmin) {
    if (process.env.NODE_ENV !== "production" && !loggedMissingAdminKey) {
      loggedMissingAdminKey = true;
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY not set; beach count will be 0 until configured."
      );
    }
    cachedBeachCount = { timestamp: now, count: 0 };
    return 0;
  }

  let count: number | null = null;
  let error: unknown = null;
  try {
    const result = await supabaseAdmin
      .from("beaches_optimized")
      .select("id", { count: "exact" })
      .or("INLND_AREA.is.null,INLND_AREA.neq.Yes")
      .limit(1);
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
