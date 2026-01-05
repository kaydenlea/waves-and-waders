import type { Metadata } from "next";
import Link from "next/link";
import StaticPageShell from "@/components/general/StaticPageShell";
import { toAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support Waves and Waders via Square.",
  alternates: {
    canonical: toAbsoluteUrl("/donate"),
  },
};

const getSquareDonateUrl = (): string | null => {
  return process.env.NEXT_PUBLIC_SQUARE_DONATE_URL ?? null;
};

export default function DonatePage() {
  const squareUrl = getSquareDonateUrl();

  return (
    <StaticPageShell
      title="Support the forecast"
      subtitle="Donations help keep the product improving and the service running."
    >
      <section className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Donate with Square
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          We use Square’s hosted checkout for secure donations. Donations are voluntary and not a purchase.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          {squareUrl ? (
            <a
              href={squareUrl}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              Donate with Square
            </a>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Donation link isn’t configured yet. Set{" "}
              <code className="font-mono">NEXT_PUBLIC_SQUARE_DONATE_URL</code> to enable donations.
            </div>
          )}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-5 py-2.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            Share feedback
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          We don’t store payment card details. Square processes payments.
        </p>
      </section>
    </StaticPageShell>
  );
}

