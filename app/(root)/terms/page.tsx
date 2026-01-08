import type { Metadata } from "next";
import Link from "next/link";
import type React from "react";
import {
  AlertTriangle,
  FileText,
  HandHeart,
  Mail,
  Scale,
  ShieldCheck,
  User,
} from "lucide-react";

import StaticPageShell from "@/components/general/StaticPageShell";
import { toAbsoluteUrl } from "@/lib/seo";

const LAST_UPDATED = "2026-01-05";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Waves and Waders, including accounts and acceptable use.",
  alternates: {
    canonical: toAbsoluteUrl("/terms"),
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

export default function TermsPage() {
  return (
    <StaticPageShell
      title="Terms of Service"
      subtitle="Clear expectations for using the site and its forecasts."
    >
      <div className="mb-10 rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground shadow-xs">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a className="underline underline-offset-4 hover:text-foreground" href="#terms-service">
            The service
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="#terms-accounts">
            Accounts
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="#terms-acceptable">
            Acceptable use
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="#terms-forecast">
            Forecast disclaimer
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="#terms-contact">
            Contact
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
            By accessing or using Waves and Waders, you agree to these Terms. If you
            don&apos;t agree, please don&apos;t use the service.
          </p>
        </div>

        <section aria-labelledby="terms-service">
          <SectionTitle id="terms-service" icon={Scale}>
            The service
          </SectionTitle>
          <p className="mt-4">
            Waves and Waders provides surf forecasts, beach information, and planning
            tools. We may change, improve, or discontinue parts of the service over
            time.
          </p>
        </section>

        <section aria-labelledby="terms-accounts">
          <SectionTitle id="terms-accounts" icon={User}>
            Accounts
          </SectionTitle>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>
              You may need an account to save favorites or personalize your dashboard.
            </li>
            <li>You&apos;re responsible for keeping your account secure.</li>
            <li>
              Don&apos;t share access in a way that compromises the service or other
              users.
            </li>
          </ul>
        </section>

        <section aria-labelledby="terms-acceptable">
          <SectionTitle id="terms-acceptable" icon={ShieldCheck}>
            Acceptable use
          </SectionTitle>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>Don&apos;t attempt to break, disrupt, or overload the service.</li>
            <li>
              Don&apos;t misuse the site for scraping that harms performance or
              availability.
            </li>
            <li>Don&apos;t use the service for unlawful or abusive behavior.</li>
          </ul>
        </section>

        <section aria-labelledby="terms-ip">
          <SectionTitle id="terms-ip" icon={FileText}>
            Intellectual property
          </SectionTitle>
          <p className="mt-4">
            The site, design, and content are owned by Waves and Waders or its
            licensors. You may not copy or redistribute it except as allowed by law.
          </p>
        </section>

        <section aria-labelledby="terms-forecast">
          <SectionTitle id="terms-forecast" icon={AlertTriangle}>
            Forecast disclaimer and limitation of liability
          </SectionTitle>
          <p className="mt-4">
            Forecasts are estimates and may be inaccurate or out of date. Conditions
            can change quickly. You are responsible for your decisions and safety.
          </p>
          <p className="mt-3">
            To the maximum extent permitted by law, Waves and Waders is not liable for
            losses or damages arising from your use of the service.
          </p>
        </section>

        <section aria-labelledby="terms-donations">
          <SectionTitle id="terms-donations" icon={HandHeart}>
            Donations
          </SectionTitle>
          <p className="mt-4">
            Donations are voluntary and not a purchase. Donations are processed by
            Stripe&apos;s hosted checkout when available.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Visit{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/donate">
              Donate
            </Link>{" "}
            to support the project.
          </p>
        </section>

        <section aria-labelledby="terms-contact">
          <SectionTitle id="terms-contact" icon={Mail}>
            Contact
          </SectionTitle>
          <p className="mt-4">
            Questions about these Terms? Visit{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/contact">
              Contact
            </Link>{" "}
            and reach out — we&apos;ll help.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            For privacy details, see{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            .
          </p>
        </section>
      </article>
    </StaticPageShell>
  );
}
