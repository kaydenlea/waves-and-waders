import type { Metadata } from "next";
import Link from "next/link";
import StaticPageShell from "@/components/general/StaticPageShell";
import { toAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Waves and Waders.",
  alternates: {
    canonical: toAbsoluteUrl("/contact"),
  },
};

const getContactEmail = (): string | null => {
  return process.env.CONTACT_EMAIL ?? process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null;
};

export default function ContactPage() {
  const email = getContactEmail();
  const mailto = email ? `mailto:${email}` : null;

  return (
    <StaticPageShell
      title="Contact"
      subtitle="Questions, feedback, or a beach we should add? We’d love to hear it."
    >
      <section className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Email</h2>
        {email ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Best for support and feedback.</p>
            <a
              href={mailto ?? undefined}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              Email us at {email}
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Contact email isn’t configured yet. Set{" "}
            <code className="font-mono">CONTACT_EMAIL</code> (or{" "}
            <code className="font-mono">NEXT_PUBLIC_CONTACT_EMAIL</code>) to enable a mail link.
          </p>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Support the project
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          If you find the forecasts helpful, donations help cover ongoing development and service
          costs.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/donate"
            className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            Go to Donate
          </Link>
        </div>
      </section>
    </StaticPageShell>
  );
}

