import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

const mobileDir = typeof __dirname === "string" ? __dirname : process.cwd();
const repoDir = resolve(mobileDir, "..");

const envPaths = [
  resolve(mobileDir, ".env.local"),
  resolve(mobileDir, ".env"),
  resolve(repoDir, ".env.local"),
  resolve(repoDir, ".env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

const normalizeUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  return `https://${value}`.replace(/\/+$/, "");
};

const toHostname = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
};

const serverUrl = normalizeUrl(
  process.env.MOBILE_SERVER_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL,
);

const supabaseHost = toHostname(
  normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
);

const config: CapacitorConfig = {
  // NOTE: Update these before shipping to stores.
  appId: process.env.MOBILE_APP_ID ?? "com.example.wavesandwaders",
  appName: process.env.MOBILE_APP_NAME ?? "Waves and Waders",
  webDir: "www",
  bundledWebRuntime: false,
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          // Allow OAuth/payment navigations inside the WebView (otherwise Capacitor may
          // block or bounce them to an external browser depending on platform config).
          allowNavigation: [
            supabaseHost,
            "*.supabase.co",
            "accounts.google.com",
            "*.google.com",
            "*.gstatic.com",
            "checkout.stripe.com",
            "buy.stripe.com",
            "*.stripe.com",
          ].filter(Boolean) as string[],
        },
      }
    : {}),
};

export default config;
