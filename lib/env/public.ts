const requirePublicEnv = (key: string, value: string | undefined): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? null,
  NEXT_PUBLIC_STRIPE_DONATE_URL:
    process.env.NEXT_PUBLIC_STRIPE_DONATE_URL ?? null,
  NEXT_PUBLIC_STRIPE_DONATE_URL_1:
    process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_1 ?? null,
  NEXT_PUBLIC_STRIPE_DONATE_URL_3:
    process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_3 ?? null,
  NEXT_PUBLIC_STRIPE_DONATE_URL_5:
    process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_5 ?? null,
} as const;
