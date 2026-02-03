import type { Metadata } from "next";
import Link from "next/link";

import StaticPageShell from "@/components/general/StaticPageShell";
import DonateCheckoutPanel from "@/components/marketing/DonateCheckoutPanel";
import { buildPageMetadata } from "@/lib/seo";
import { MessageSquareHeart } from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "Donate",
  description: "Support Waves and Waders via Stripe.",
  canonicalPath: "/donate",
});

const AMOUNTS = [1, 3, 5] as const;
type Amount = (typeof AMOUNTS)[number];

const parseAmount = (raw: string | string[] | undefined): Amount | null => {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return (AMOUNTS as readonly number[]).includes(parsed)
    ? (parsed as Amount)
    : null;
};

export default async function DonatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedAmount = parseAmount(resolvedSearchParams?.amount);
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <StaticPageShell
      title="Support the forecast"
      subtitle="Donations help keep the product improving and the service running."
    >
      <section className="rounded-2xl border border-border/40 bg-background/40 p-6 shadow-xs">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Donate with Stripe
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          We use Stripe&apos;s hosted checkout for secure donations. Donations are
          voluntary and not a purchase.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Donations support the development and maintenance of Waves &amp; Waders.
          Donations are not tax-deductible.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If you&apos;re able, recurring monthly support is especially appreciated.
          This kind of site has ongoing costs (hosting, data, and maintenance),
          and monthly donations help keep forecasts accessible to as many people
          as possible while the product keeps improving.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-start">
          {stripeEnabled ? (
            <DonateCheckoutPanel
              amounts={[...AMOUNTS]}
              initialAmount={selectedAmount}
            />
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Stripe isn&apos;t configured yet. Set{" "}
              <code className="font-mono">STRIPE_SECRET_KEY</code> to enable.
            </div>
          )}
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none sm:w-auto sm:self-start"
          >
            <MessageSquareHeart className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Feedback
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          We don&apos;t store payment card details. Stripe processes payments.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/privacy"
          >
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/terms"
          >
            Terms
          </Link>
        </div>
      </section>
    </StaticPageShell>
  );
}
