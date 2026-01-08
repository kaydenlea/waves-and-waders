import type { Metadata } from "next";
import Link from "next/link";
import StaticPageShell from "@/components/general/StaticPageShell";
import ContactForm from "@/components/general/ContactForm";
import { toAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Waves and Waders.",
  alternates: {
    canonical: toAbsoluteUrl("/contact"),
  },
};

export default function ContactPage() {
  return (
    <StaticPageShell
      title="Contact"
      subtitle="Questions, feedback, or a beach we should add? We'd love to hear it."
    >
      <section className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
          Send us a message
        </h2>
        <ContactForm />
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

