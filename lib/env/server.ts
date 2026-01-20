import "server-only";

const requireServerEnv = (key: string): string => {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getOptionalServerEnv = (key: string): string | null => {
  const value = process.env[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const serverEnv = {
  SUPABASE_URL: getOptionalServerEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getOptionalServerEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: getOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  RESEND_API_KEY: getOptionalServerEnv("RESEND_API_KEY"),
} as const;

export const getSupabaseServiceRoleKey = () => serverEnv.SUPABASE_SERVICE_ROLE_KEY;

export const requireSupabaseServiceRoleKey = () =>
  requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
