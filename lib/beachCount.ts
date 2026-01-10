import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BEACH_COUNT_CACHE_MS = 5 * 60 * 1000;
let cachedBeachCount: { timestamp: number; count: number } | null = null;

export async function fetchBeachCount(): Promise<number> {
  const now = Date.now();
  if (cachedBeachCount && now - cachedBeachCount.timestamp < BEACH_COUNT_CACHE_MS) {
    return cachedBeachCount.count;
  }

  const { count, error } = await supabaseAdmin
    .from("beaches_optimized")
    .select("id", { count: "exact" })
    .or("INLND_AREA.is.null,INLND_AREA.neq.Yes")
    .limit(1);

  if (error) {
    console.error("Failed to fetch beach count:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    cachedBeachCount = { timestamp: now, count: 0 };
    return 0;
  }

  const resolved = typeof count === "number" ? count : 0;
  cachedBeachCount = { timestamp: now, count: resolved };
  return resolved;
}
