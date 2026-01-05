import type { Metadata } from "next";
import StaticPageShell from "@/components/general/StaticPageShell";
import { toAbsoluteUrl } from "@/lib/seo";

const LAST_UPDATED = "2026-01-05";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Waves and Waders, including accounts and acceptable use.",
  alternates: {
    canonical: toAbsoluteUrl("/terms"),
  },
};

export default function TermsPage() {
  return (
    <StaticPageShell
      title="Terms of Service"
      subtitle="Clear expectations for using the site and its forecasts."
    >
      <article className="space-y-10 text-foreground/80 leading-relaxed">
        <div className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            <span className="font-medium text-foreground/80">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4">
            By accessing or using Waves and Waders, you agree to these Terms. If you
            don’t agree, please don’t use the service.
          </p>
        </div>

        <section aria-labelledby="terms-service">
          <h2 id="terms-service" className="text-xl font-semibold tracking-tight text-foreground">
            The service
          </h2>
          <p className="mt-4">
            Waves and Waders provides surf forecasts, beach information, and planning
            tools. We may change, improve, or discontinue parts of the service over
            time.
          </p>
        </section>

        <section aria-labelledby="terms-accounts">
          <h2 id="terms-accounts" className="text-xl font-semibold tracking-tight text-foreground">
            Accounts
          </h2>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>You may need an account to save favorites or personalize your dashboard.</li>
            <li>You’re responsible for keeping your account secure.</li>
            <li>Don’t share access in a way that compromises the service or other users.</li>
          </ul>
        </section>

        <section aria-labelledby="terms-acceptable">
          <h2
            id="terms-acceptable"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Acceptable use
          </h2>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>Don’t attempt to break, disrupt, or overload the service.</li>
            <li>Don’t misuse the site for scraping that harms performance or availability.</li>
            <li>Don’t use the service for unlawful or abusive behavior.</li>
          </ul>
        </section>

        <section aria-labelledby="terms-ip">
          <h2 id="terms-ip" className="text-xl font-semibold tracking-tight text-foreground">
            Intellectual property
          </h2>
          <p className="mt-4">
            The site, design, and content are owned by Waves and Waders or its licensors.
            You may not copy or redistribute it except as allowed by law.
          </p>
        </section>

        <section aria-labelledby="terms-forecast">
          <h2
            id="terms-forecast"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Forecast disclaimer and limitation of liability
          </h2>
          <p className="mt-4">
            Forecasts are estimates and may be inaccurate or out of date. Conditions can
            change quickly. You are responsible for your decisions and safety.
          </p>
          <p className="mt-3">
            To the maximum extent permitted by law, Waves and Waders is not liable for
            losses or damages arising from your use of the service.
          </p>
        </section>

        <section aria-labelledby="terms-donations">
          <h2 id="terms-donations" className="text-xl font-semibold tracking-tight text-foreground">
            Donations
          </h2>
          <p className="mt-4">
            Donations are voluntary and not a purchase. Donations are processed by Square’s
            hosted checkout when available.
          </p>
        </section>

        <section aria-labelledby="terms-contact">
          <h2 id="terms-contact" className="text-xl font-semibold tracking-tight text-foreground">
            Contact
          </h2>
          <p className="mt-4">
            Questions about these Terms? Visit the Contact page and reach out—we’ll help.
          </p>
        </section>
      </article>
    </StaticPageShell>
  );
}

