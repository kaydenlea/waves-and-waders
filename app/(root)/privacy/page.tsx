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
import { toAbsoluteUrl } from "@/lib/seo";

const LAST_UPDATED = "2026-01-05";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Waves and Waders collects and uses information, including accounts, favorites, and donations.",
  alternates: {
    canonical: toAbsoluteUrl("/privacy"),
  },
};

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
      className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground"
    >
      <Icon className="h-5 w-5 text-foreground/70" aria-hidden="true" />
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <StaticPageShell
      title="Privacy Policy"
      subtitle="A clear summary of what we collect, why, and how to reach us."
    >
      <div className="mb-10 rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground shadow-xs">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="#privacy-collect"
          >
            What we collect
          </a>
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="#privacy-use"
          >
            How we use it
          </a>
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="#privacy-storage"
          >
            Cookies &amp; storage
          </a>
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="#privacy-third-parties"
          >
            Third parties
          </a>
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="#privacy-rights"
          >
            Your choices
          </a>
        </div>
      </div>

      <article className="space-y-10 text-foreground/80 leading-relaxed">
        <div className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            <span className="font-medium text-foreground/80">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4">
            Waves and Waders is built to help you plan coastal sessions with surf
            forecasts, conditions, and beach tools. We keep data collection limited
            to what&apos;s needed to run the product.
          </p>
        </div>

        <section aria-labelledby="privacy-collect">
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
                  If you sign in with Google, authentication is handled by Google
                  and Supabase; we receive the basic account info needed to create
                  your session (such as email).
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">
                Your saved items and preferences
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Saved beaches (favorites) tied to your account.</li>
                <li>Dashboard personalization settings (layout and widgets).</li>
                <li>
                  Local device preferences stored in your browser (for example:
                  theme, last selected beach, map view, and selected tabs).
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="privacy-use">
          <SectionTitle id="privacy-use" icon={ShieldCheck}>
            How we use information
          </SectionTitle>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>To create and maintain your account session.</li>
            <li>To save favorites and personalization settings across devices.</li>
            <li>To operate core features like forecasts, maps, and beach discovery.</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            We do not run third-party advertising trackers on the site.
          </p>
        </section>

        <section aria-labelledby="privacy-storage">
          <SectionTitle id="privacy-storage" icon={Cookie}>
            Cookies and local storage
          </SectionTitle>
          <div className="mt-4 space-y-3">
            <p>
              We use cookies for authentication sessions (via Supabase). We also use
              browser storage (localStorage/sessionStorage) to remember preferences
              like theme and UI state.
            </p>
            <p className="text-sm text-muted-foreground">
              You can clear local storage at any time in your browser settings. If
              you are signed in, signing out will end your authenticated session.
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-third-parties">
          <SectionTitle id="privacy-third-parties" icon={Globe}>
            Third parties we use
          </SectionTitle>
          <div className="mt-4 space-y-3">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-semibold text-foreground">Supabase</span> for
                authentication and data storage.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  OpenStreetMap tile servers
                </span>{" "}
                for map tiles (your device connects directly to load map imagery).
              </li>
              <li>
                <span className="font-semibold text-foreground">Stripe</span> for
                donations (if you choose to donate, you&apos;ll be redirected to
                Stripe&apos;s hosted checkout).
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              We don&apos;t receive or store your payment card details when donating
              through Stripe.
            </p>
            <p className="text-sm text-muted-foreground">
              Want to support the project? Visit{" "}
              <Link className="underline underline-offset-4 hover:text-foreground" href="/donate">
                Donate
              </Link>
              .
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-rights">
          <SectionTitle id="privacy-rights" icon={FileText}>
            Your choices
          </SectionTitle>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>Use the app without signing in for basic browsing.</li>
            <li>Clear browser storage to remove local preferences.</li>
            <li>
              Request account or data deletion by contacting us (see{" "}
              <Link className="underline underline-offset-4 hover:text-foreground" href="/contact">
                Contact
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section aria-labelledby="privacy-disclaimer">
          <SectionTitle id="privacy-disclaimer" icon={ShieldCheck}>
            Forecast disclaimer
          </SectionTitle>
          <p className="mt-4">
            Forecasts are informational and conditions can change quickly. Always use
            your judgment and follow local safety guidance when planning a session.
          </p>
        </section>

        <section aria-labelledby="privacy-contact">
          <SectionTitle id="privacy-contact" icon={Mail}>
            Contact
          </SectionTitle>
          <p className="mt-4">
            Questions about this policy? Reach out via{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/contact">
              Contact
            </Link>
            .
          </p>
        </section>
      </article>
    </StaticPageShell>
  );
}
