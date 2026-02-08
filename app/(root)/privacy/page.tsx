import type { Metadata } from "next";
import Link from "next/link";
import type React from "react";
import {
  Cookie,
  Database,
  FileText,
  Globe,
  Mail,
  ShieldCheck,
} from "lucide-react";

import StaticPageShell from "@/components/general/StaticPageShell";
import { buildPageMetadata } from "@/lib/seo";

const LAST_UPDATED = "2026-02-06";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How Waves and Waders collects and uses information, including accounts, favorites, and donations.",
  canonicalPath: "/privacy",
});

function SectionTitle({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-38 flex items-start gap-2 text-xl font-semibold tracking-tight text-foreground leading-snug"
    >
      <Icon
        className="mt-1 h-5 w-5 shrink-0 text-foreground/70"
        aria-hidden="true"
      />
      {children}
    </h2>
  );
}

function TocPill({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
      href={href}
    >
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <StaticPageShell
      title="Privacy Policy"
      subtitle="A clear summary of what we collect, why, and how to reach us."
    >
      <div className="flex flex-col gap-8">
        <section className="ww-static-card p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            <span className="font-medium text-foreground/80">
              {LAST_UPDATED}
            </span>
          </p>
          <p className="mt-4 text-foreground/80 leading-relaxed">
            Waves and Waders is built to help you plan coastal sessions with
            surf forecasts, conditions, and beach tools. We keep data collection
            limited to what&apos;s needed to run the product.
          </p>
          <ul className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>
              <span className="font-medium text-foreground/80">
                No card details stored:
              </span>{" "}
              donations run through Stripe checkout.
            </li>
            <li>
              <span className="font-medium text-foreground/80">
                No ad trackers:
              </span>{" "}
              we don&apos;t run third-party advertising trackers.
            </li>
          </ul>
        </section>

        <nav
          aria-label="On this page"
          className="ww-static-card p-5"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <TocPill href="#privacy-collect">What we collect</TocPill>
            <TocPill href="#privacy-use">How we use it</TocPill>
            <TocPill href="#privacy-storage">Cookies &amp; storage</TocPill>
            <TocPill href="#privacy-third-parties">Third parties</TocPill>
            <TocPill href="#privacy-rights">Your choices</TocPill>
          </div>
        </nav>

        <article className="space-y-6 text-foreground/80 leading-relaxed">
          <section
            aria-labelledby="privacy-collect"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-collect" icon={Database}>
              What we collect
            </SectionTitle>
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground">
                  Account information (if you sign in)
                </h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Email address and authentication identifiers.</li>
                  <li>
                    If you sign in with Google, authentication is handled by
                    Google and Supabase; we receive the basic account info
                    needed to create your session (such as email).
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  Your saved items and preferences
                </h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Saved beaches (favorites) tied to your account.</li>
                  <li>
                    Dashboard personalization settings (layout and widgets).
                  </li>
                  <li>
                    Local device preferences stored in your browser (for
                    example: theme, last selected beach, map view, and selected
                    tabs).
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="privacy-use"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-use" icon={ShieldCheck}>
              How we use information
            </SectionTitle>
            <ul className="mt-4 list-disc pl-5 space-y-1">
              <li>To create and maintain your account session.</li>
              <li>
                To save favorites and personalization settings across devices.
              </li>
              <li>
                To operate core features like forecasts, maps, and beach
                discovery.
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              We do not run third-party advertising trackers on the site.
            </p>
          </section>

          <section
            aria-labelledby="privacy-storage"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-storage" icon={Cookie}>
              Cookies and local storage
            </SectionTitle>
            <div className="mt-4 space-y-3">
              <p>
                We use cookies for authentication sessions (via Supabase). We
                also use browser storage (localStorage/sessionStorage) to
                remember preferences like theme and UI state.
              </p>
              <p className="text-sm text-muted-foreground">
                You can clear local storage at any time in your browser
                settings. If you are signed in, signing out will end your
                authenticated session.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="privacy-third-parties"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-third-parties" icon={Globe}>
              Third parties we use
            </SectionTitle>
            <div className="mt-4 space-y-3">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold text-foreground">
                    Supabase
                  </span>{" "}
                  for authentication and data storage.
                </li>
                <li>
                  <span className="font-semibold text-foreground">
                    OpenStreetMap tile servers
                  </span>{" "}
                  for map tiles (your device connects directly to load map
                  imagery).
                </li>
                <li>
                  <span className="font-semibold text-foreground">Stripe</span>{" "}
                  for donations (if you choose to donate, you&apos;ll be
                  redirected to Stripe&apos;s hosted checkout).
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                We don&apos;t receive or store your payment card details when
                donating through Stripe.
              </p>
              <p className="text-sm text-muted-foreground">
                Want to support the project? Visit{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  href="/donate"
                >
                  Donate
                </Link>
                .
              </p>
            </div>
          </section>

          <section
            aria-labelledby="privacy-rights"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-rights" icon={FileText}>
              Your choices
            </SectionTitle>
            <ul className="mt-4 list-disc pl-5 space-y-1">
              <li>Use the app without signing in for basic browsing.</li>
              <li>Clear browser storage to remove local preferences.</li>
              <li>
                Request account or data deletion by contacting us (see{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  href="/contact"
                >
                  Contact
                </Link>
                ).
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="privacy-disclaimer"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-disclaimer" icon={ShieldCheck}>
              Forecast disclaimer
            </SectionTitle>
            <p className="mt-4">
              Forecasts are informational and conditions can change quickly.
              Always use your judgment and follow local safety guidance when
              planning a session.
            </p>
          </section>

          <section
            aria-labelledby="privacy-contact"
            className="scroll-mt-28 ww-static-card p-6 sm:p-8"
          >
            <SectionTitle id="privacy-contact" icon={Mail}>
              Contact
            </SectionTitle>
            <p className="mt-4">
              Questions about this policy? Reach out via{" "}
              <Link
                className="underline underline-offset-4 hover:text-foreground"
                href="/contact"
              >
                Contact
              </Link>
              .
            </p>
          </section>
        </article>
      </div>
    </StaticPageShell>
  );
}
