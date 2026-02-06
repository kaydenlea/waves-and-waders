import type { ComponentType, ReactNode, SVGProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import StaticPageShell from "@/components/general/StaticPageShell";
import DonateCheckoutPanel from "@/components/marketing/DonateCheckoutPanel";
import { cn } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";
import DonationTierCarousel from "./DonationTierCarousel";
import {
  CreditCard,
  HandHeart,
  HeartHandshake,
  Lock,
  MessageSquareHeart,
  Sparkles,
  Waves,
} from "lucide-react";

export const metadata: Metadata = buildPageMetadata({
  title: "Donate",
  description:
    "Support Waves and Waders. Donations help cover hosting, data, and development.",
  canonicalPath: "/donate",
});

const AMOUNTS = [1, 3, 5, 10] as const;
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

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-3xl border border-border/40 bg-background/50 shadow-xs ring-1 ring-black/5",
        "dark:bg-highlight-7/30",
        className,
      )}
    >
      {children}
    </section>
  );
}

function IconRow({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl border border-border/40 bg-background/60 text-foreground/80"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}

export default async function DonatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedAmount = parseAmount(resolvedSearchParams?.amount);
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

  const tiers: Array<{
    amount: Amount;
    title: string;
    description: string;
    icon: IconComponent;
    iconKey: "waves" | "sparkles" | "handshake" | "handheart";
  }> = [
    {
      amount: 1,
      title: "Keep it running",
      description: "Covers a slice of hosting/uptime.",
      icon: Waves,
      iconKey: "waves",
    },
    {
      amount: 3,
      title: "Cover data costs",
      description: "Helps pay for forecast data.",
      icon: Sparkles,
      iconKey: "sparkles",
    },
    {
      amount: 5,
      title: "Ship features",
      description: "Supports ongoing development time.",
      icon: HeartHandshake,
      iconKey: "handshake",
    },
    {
      amount: 10,
      title: "Sustain project",
      description: "Meaningful support for core costs.",
      icon: HandHeart,
      iconKey: "handheart",
    },
  ];

  return (
    <StaticPageShell
      title="Support Waves & Waders"
      subtitle="A small donation helps keep forecasts free and improving."
    >
      <div className="flex flex-col gap-6 sm:gap-8">
        <Section className="relative overflow-hidden px-6 py-7 sm:px-10 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.10),transparent_55%)]"
          />

          <div className="relative grid grid-cols-1 gap-7 sm:gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground/80 shadow-xs">
                <Sparkles className="h-4 w-4 text-sky-500" aria-hidden="true" />
                Impact
              </div>
              <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Fuel hosting, data, and product improvements.
              </h2>
              <p className="mt-3 max-w-prose text-pretty text-sm text-muted-foreground sm:text-base">
                Donations are optional and keep the forecast experience fast,
                reliable, and free to use.
              </p>

              <div className="mt-6 flex flex-col gap-4">
                <IconRow
                  icon={Waves}
                  title="Reliability"
                  description="Keeps servers and APIs running smoothly."
                />
                <IconRow
                  icon={CreditCard}
                  title="Secure checkout"
                  description="Stripe-hosted payment flow."
                />
                <IconRow
                  icon={HandHeart}
                  title="Independent"
                  description="Supports maintenance and new features."
                />
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#donate"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-sm",
                    "transition-[background-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                    "hover:bg-foreground/90 hover:shadow-md hover:shadow-black/15 active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <HandHeart className="h-4 w-4" aria-hidden="true" />
                  Donate now
                </a>
                {/* <Link
                  href="/contact?from=donate"
                  className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Questions or feedback?
                </Link> */}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-border/40 bg-background/60 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-sm"
                  >
                    <Lock className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Private and secure
                    </div>
                    <div className="text-sm text-muted-foreground">
                      We don&apos;t store details.
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-border/40 bg-background/50 p-3">
                    <div className="text-xs font-semibold tracking-wide text-foreground/70">
                      Suggested
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {/* ${selectedAmount ?? 5} */} Any!
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-background/50 p-3">
                    <div className="text-xs font-semibold tracking-wide text-foreground/70">
                      Checkout
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      Stripe
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Donations are voluntary and not a purchase.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section className="px-6 py-7 sm:px-10 sm:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                What your support does
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear impact without a wall of text.
              </p>
            </div>
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <IconRow
                  icon={Waves}
                  title="Keeps forecasts accessible"
                  description="Fast loads and stable uptime."
                />
                <IconRow
                  icon={Sparkles}
                  title="Improves the experience"
                  description="Polish, fixes, and new features."
                />
                <IconRow
                  icon={CreditCard}
                  title="Covers required costs"
                  description="Hosting/data services add up."
                />
                <IconRow
                  icon={HandHeart}
                  title="Stays community-backed"
                  description="No paywalls for core forecasts."
                />
              </div>
            </div>
          </div>
        </Section>

        <Section className="px-6 py-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Choose an amount
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick picks that map to common support levels.
              </p>
            </div>
            <span className="hidden items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground/75 shadow-xs sm:inline-flex">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Secure
            </span>
          </div>

          <DonationTierCarousel
            tiers={tiers.map((tier) => ({
              amount: tier.amount,
              title: tier.title,
              description: tier.description,
              iconKey: tier.iconKey,
              href: `/donate?from=tier&amount=${tier.amount}#donate`,
              selected: selectedAmount === tier.amount,
            }))}
          />
        </Section>

        <Section
          id="donate"
          className="scroll-mt-28 px-6 py-7 sm:px-10 sm:py-10"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Donate securely
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stripe-hosted checkout. Optional. Not tax-deductible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 shadow-xs">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Encrypted
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 shadow-xs">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                Stripe
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            {stripeEnabled ? (
              <div className="rounded-3xl border border-border/40 bg-background/60 p-5 shadow-sm">
                <DonateCheckoutPanel
                  key={selectedAmount ?? "none"}
                  amounts={[...AMOUNTS]}
                  initialAmount={selectedAmount}
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-border/40 bg-background/60 p-5 text-sm text-muted-foreground shadow-sm">
                Stripe isn&apos;t configured yet. Set{" "}
                <code className="font-mono">STRIPE_SECRET_KEY</code> to enable.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:pt-2">
              <Link
                href="/contact?from=donate"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/50 bg-background/60 px-5 py-2.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
                Feedback
              </Link>
              <div className="rounded-3xl border border-border/40 bg-background/60 p-4 text-xs text-muted-foreground shadow-sm">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">Reassurance</span>
                </div>
                <ul className="mt-2 space-y-1">
                  <li>Stripe processes payments.</li>
                  <li>No card details stored by us.</li>
                  <li>Donations are voluntary.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Secure payment
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="underline underline-offset-4 hover:text-foreground"
                href="/privacy"
              >
                Privacy
              </Link>
              <span aria-hidden="true">{"\u00B7"}</span>
              <Link
                className="underline underline-offset-4 hover:text-foreground"
                href="/terms"
              >
                Terms
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </StaticPageShell>
  );
}
