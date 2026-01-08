// Server-side admin client that bypasses RLS
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseServiceKey) {
  console.warn(
    "WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Using anon key (RLS will apply)."
  );
}

// Admin client bypasses RLS - use only in API routes
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
