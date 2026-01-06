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

const getSquareDonateUrl = (
  amount: Amount | null
): { url: string | null; isAmountSpecific: boolean } => {
  const base = process.env.NEXT_PUBLIC_SQUARE_DONATE_URL ?? null;
  if (!amount) return { url: base, isAmountSpecific: false };
  const byAmount =
    amount === 1
      ? process.env.NEXT_PUBLIC_SQUARE_DONATE_URL_1
      : amount === 3
      ? process.env.NEXT_PUBLIC_SQUARE_DONATE_URL_3
      : process.env.NEXT_PUBLIC_SQUARE_DONATE_URL_5;
  if (byAmount) return { url: byAmount, isAmountSpecific: true };
  return { url: base, isAmountSpecific: false };
};

export default function DonatePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const selectedAmount = parseAmount(searchParams?.amount);
  const squareDonate = getSquareDonateUrl(selectedAmount);
  const squareUrl = squareDonate.url;

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
          We use Square&apos;s hosted checkout for secure donations. Donations
          are voluntary and not a purchase.
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

        <p className="mt-3 text-sm text-muted-foreground">
          Donations support the development and maintenance of Waves & Waders.
          Donations are not tax-deductible.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          {squareUrl ? (
            <a
              href={squareUrl}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              {selectedAmount && squareDonate.isAmountSpecific
                ? `Donate $${selectedAmount} with Square`
                : "Donate with Square"}
            </a>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Donation link isn&apos;t configured yet. Set{" "}
              <code className="font-mono">NEXT_PUBLIC_SQUARE_DONATE_URL</code>{" "}
              to enable donations.
            </div>
          )}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-5 py-2.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            Share feedback
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          We don&apos;t store payment card details. Square processes payments.
        </p>
      </section>
    </StaticPageShell>
  );
}
