import type { Metadata } from "next";
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

export default function PrivacyPage() {
  return (
    <StaticPageShell
      title="Privacy Policy"
      subtitle="A clear summary of what we collect, why, and how to reach us."
    >
      <article className="space-y-10 text-foreground/80 leading-relaxed">
        <div className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            <span className="font-medium text-foreground/80">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4">
            Waves and Waders is built to help you plan coastal sessions with surf
            forecasts, conditions, and beach tools. We keep data collection limited
            to what’s needed to run the product.
          </p>
        </div>

        <section aria-labelledby="privacy-collect">
          <h2
            id="privacy-collect"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            What we collect
          </h2>
          <div className="mt-4 space-y-4">
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
                <li>
                  Dashboard personalization settings (layout and widget
                  configuration).
                </li>
                <li>
                  Local device preferences stored in your browser (for example:
                  theme, last selected beach, map view, and selected tabs).
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="privacy-use">
          <h2
            id="privacy-use"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            How we use information
          </h2>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>To create and maintain your account session.</li>
            <li>To save your favorites and personalization settings across devices.</li>
            <li>To operate core features like forecasts, maps, and beach discovery.</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            We do not run third-party advertising trackers on the site.
          </p>
        </section>

        <section aria-labelledby="privacy-storage">
          <h2
            id="privacy-storage"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Cookies and local storage
          </h2>
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
          <h2
            id="privacy-third-parties"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Third parties we use
          </h2>
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
                <span className="font-semibold text-foreground">Square</span> for
                donations (if you choose to donate, you’ll be redirected to Square’s
                hosted checkout).
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              We don’t receive or store your payment card details when donating
              through Square.
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-rights">
          <h2
            id="privacy-rights"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Your choices
          </h2>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>Use the app without signing in for basic browsing.</li>
            <li>Clear browser storage to remove local preferences.</li>
            <li>Request account or data deletion by contacting us (see Contact page).</li>
          </ul>
        </section>

        <section aria-labelledby="privacy-disclaimer">
          <h2
            id="privacy-disclaimer"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Forecast disclaimer
          </h2>
          <p className="mt-4">
            Forecasts are informational and conditions can change quickly. Always use
            your judgment and follow local safety guidance when planning a session.
          </p>
        </section>
      </article>
    </StaticPageShell>
  );
}

