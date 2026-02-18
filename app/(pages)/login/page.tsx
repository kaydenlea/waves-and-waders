import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getServerSupabase } from "@/lib/supabaseServer";
import { AuthForm } from "@/components/auth/AuthForm";
import { buildPageMetadata } from "@/lib/seo";
import { BrandWordmark } from "@/components/general/BrandWordmark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in to manage saved beaches and forecasts.",
  canonicalPath: "/login",
  robots: { index: false, follow: false },
});

const noiseSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity=".35"/>
  </svg>
`);

const authNoiseUrl = `data:image/svg+xml,${noiseSvg}`;

export default async function LoginPage() {
  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to load user", userError);
  }
  const user = userData.user ?? null;

  if (user) {
    redirect("/");
  }

  return (
    <main
      data-ww-page="login"
      className="relative isolate bg-gradient-to-b from-background via-background-2 to-background overflow-x-hidden max-[911px]:ww-disable-backdrop"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 transform-gpu will-change-transform"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-2 to-background" />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-sky-600/20 via-cyan-500/14 to-indigo-600/18 dark:from-sky-500/40 dark:via-cyan-500/30 dark:to-indigo-500/40" />
        <div className="absolute inset-0 lg:hidden bg-[radial-gradient(900px_circle_at_15%_0%,rgba(255,255,255,0.35),transparent_60%)] opacity-25 dark:opacity-15" />
        <div className="absolute -top-24 -right-24 h-[360px] w-[360px] rounded-full bg-white/10 blur-3xl lg:hidden dark:bg-white/10" />
        <div
          className="ww-hero-noise absolute inset-0 opacity-[0.08] mix-blend-overlay lg:hidden"
          style={{ backgroundImage: `url('${authNoiseUrl}')` }}
        />
        <div className="absolute inset-0 opacity-[0.14] lg:hidden [background-image:linear-gradient(to_right,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.08]" />
        <div className="absolute -top-56 left-1/2 h-[720px] w-[1220px] -translate-x-1/2 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute -bottom-80 -left-52 h-[820px] w-[820px] rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="absolute -bottom-72 -right-52 h-[820px] w-[820px] rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_0%,rgba(34,211,238,0.16),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(720px_circle_at_10%_20%,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10 flex min-h-[var(--ww-100vh,100dvh)] flex-col lg:grid lg:grid-cols-2 lg:grid-rows-1">
        <section className="relative flex min-h-[18rem] items-end px-5 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] sm:px-8 sm:pb-12 lg:min-h-full lg:items-center lg:px-14 lg:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600/20 via-cyan-500/14 to-indigo-600/18 dark:from-sky-500/40 dark:via-cyan-500/30 dark:to-indigo-500/40" />
            {/* <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(255,255,255,0.35),transparent_60%)] opacity-30 dark:opacity-15" />
            <div className="absolute -top-24 -right-24 h-[360px] w-[360px] rounded-full bg-white/10 blur-3xl dark:bg-white/10" />
            <div className="absolute -bottom-36 -left-28 h-[420px] w-[420px] rounded-full bg-black/10 blur-3xl dark:bg-black/30" /> */}
            <div
              className="ww-hero-noise absolute inset-0 opacity-[0.08] mix-blend-overlay"
              style={{ backgroundImage: `url('${authNoiseUrl}')` }}
            />
            {/* <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.1]" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-black/10 dark:to-black/40 lg:h-24" /> */}
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mx-0">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-2xl px-2 py-2 text-white/95 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <span className="ww-disable-backdrop">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 shadow-sm ring-1 ring-white/20 supports-[backdrop-filter]:bg-white/10 supports-[backdrop-filter]:backdrop-blur-md [backface-visibility:hidden] [transform:translateZ(0)]">
                  <Image
                    src="/logo.png"
                    alt="Waves and Waders logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                    priority
                  />
                </span>
              </span>
              <BrandWordmark
                className="text-base font-semibold tracking-tight"
                spacing="-mt-1.5"
              />
            </Link>

            <h1 className="mt-9 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sign in or create an account
            </h1>
            <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-white/85 sm:text-base">
              Save beaches, personalize forecasts, and plan sessions with
              confidence.
            </p>
          </div>
        </section>

        <section className="relative flex flex-none flex-col items-stretch px-4 pb-10 pt-6 sm:px-6 lg:flex-1 lg:min-h-0 lg:items-center lg:justify-center lg:px-14 lg:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block bg-gradient-to-b from-background/20 via-background to-background"
          />
          <AuthForm
            className="transform-gpu will-change-transform [backface-visibility:hidden] flex-none w-full max-w-none mx-0 rounded-[2.75rem] border border-white/12 bg-background/95 shadow-[0_-22px_80px_rgba(2,6,23,0.22)] supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md sm:mx-auto sm:max-w-xl dark:border-white/10 dark:bg-background/70 lg:flex-none lg:h-auto lg:max-w-md lg:mx-0 lg:rounded-[2rem] lg:border lg:border-border/60 lg:bg-background/90 lg:shadow-[0_24px_70px_rgba(2,6,23,0.12)] lg:supports-[backdrop-filter]:bg-background/70 lg:supports-[backdrop-filter]:backdrop-blur-xl lg:dark:bg-background/40 lg:dark:border-border/60 lg:dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            footer={
              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            }
          />
        </section>
      </div>
    </main>
  );
}
