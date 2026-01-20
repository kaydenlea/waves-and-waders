import type { Metadata } from "next";
import Link from "next/link";

import StaticPageShell from "@/components/general/StaticPageShell";
import { buildPageMetadata } from "@/lib/seo";
import { ArrowUpRight, HeartHandshake, MessageSquareHeart } from "lucide-react";

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

const getStripeDonateUrl = (
  amount: Amount | null
): { url: string | null; isAmountSpecific: boolean } => {
  const base = process.env.NEXT_PUBLIC_STRIPE_DONATE_URL ?? null;
  if (!amount) return { url: base, isAmountSpecific: false };
  const byAmount =
    amount === 1
      ? process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_1
      : amount === 3
      ? process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_3
      : process.env.NEXT_PUBLIC_STRIPE_DONATE_URL_5;
  if (byAmount) return { url: byAmount, isAmountSpecific: true };
  return { url: base, isAmountSpecific: false };
};

export default async function DonatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedAmount = parseAmount(resolvedSearchParams?.amount);
  const stripeDonate = getStripeDonateUrl(selectedAmount);
  const stripeUrl = stripeDonate.url;

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
          Donations support the development and maintenance of Waves & Waders. Donations
          are not tax-deductible.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If you&apos;re able, recurring monthly support is especially appreciated.
          This kind of site has ongoing costs (hosting, data, and maintenance), and
          monthly donations help keep forecasts accessible to as many people as
          possible while the product keeps improving.
        </p>
        <div className="mt-5">
          <div className="text-xs font-semibold tracking-wide text-foreground/70">
            Suggested
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMOUNTS.map((amount) => {
              const isActive = amount === selectedAmount;
              return (
                <Link
                  key={amount}
                  href={`/donate?amount=${amount}`}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm",
                    "transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isActive
                      ? "border-border/70 bg-foreground text-background"
                      : "border-border/50 bg-background/50 text-foreground/80 hover:bg-background/70",
                  ].join(" ")}
                >
                  ${amount}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          {stripeUrl ? (
            <a
              href={stripeUrl}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              <HeartHandshake className="mr-2 h-4 w-4" aria-hidden="true" />
              {selectedAmount && stripeDonate.isAmountSpecific
                ? `Donate $${selectedAmount}`
                : "Donate"}
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Donation link isn&apos;t configured yet. Set{" "}
              <code className="font-mono">NEXT_PUBLIC_STRIPE_DONATE_URL</code> to
              enable.
            </div>
          )}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-5 py-2.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            <MessageSquareHeart className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Feedback
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          We don&apos;t store payment card details. Stripe processes payments.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link className="underline underline-offset-4 hover:text-foreground" href="/terms">
            Terms
          </Link>
        </div>
      </section>
    </StaticPageShell>
  );
}
