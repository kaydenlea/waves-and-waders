import Link from "next/link";
import { HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import InViewOnce from "@/components/marketing/InViewOnce";
import { cn } from "@/lib/utils";

export default function DonateSection({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="support-heading"
      data-ww-section
      data-inview="false"
      className={cn(
        "ww-section mx-auto w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-20",
        className
      )}
    >
      <div
        className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-foreground/[0.035] to-foreground/[0.015] p-6 shadow-sm sm:p-10"
      >
        <InViewOnce rootAttr="data-ww-section" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.09),transparent_55%)]" />

        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-medium text-foreground/85 shadow-xs">
              <Sparkles className="h-4 w-4 text-sky-500" aria-hidden="true" />
              Support the forecast
            </div>
            <h2
              id="support-heading"
              className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Keep it free, keep it improving.
            </h2>
            <p className="mt-4 max-w-prose text-pretty text-base text-muted-foreground sm:text-lg">
              Donations help cover hosting, data costs, and ongoing development. Forecasts
              remain free to use.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-foreground/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                Secure checkout via Square
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1.5">
                <HandHeart className="h-4 w-4 text-rose-500" aria-hidden="true" />
                Donations are optional
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className={cn(
                "ww-reveal rounded-3xl border border-border/50 bg-background/60 p-5 shadow-lg shadow-black/10 ring-1 ring-black/5",
                "transition-transform motion-reduce:transition-none hover:-translate-y-0.5"
              )}
              style={{ ["--delay" as any]: "80ms" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-tight text-foreground">
                    Donate with Square
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Choose any amount at checkout.
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-highlight-5/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/80">
                  Secure
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2" aria-label="Suggested amounts">
                {["$5", "$15", "$30"].map((amount) => (
                  <span
                    key={amount}
                    className="rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-semibold text-foreground/80"
                    aria-hidden="true"
                  >
                    {amount}
                  </span>
                ))}
                <span
                  className="rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-semibold text-foreground/70"
                  aria-hidden="true"
                >
                  Custom
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/donate?from=section"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-sm",
                    "transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
                  )}
                >
                  <HandHeart className="h-4 w-4" aria-hidden="true" />
                  Donate
                </Link>
                <Link
                  href="/contact?from=donate-section"
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-5 py-3 text-sm font-medium text-foreground shadow-xs",
                    "transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
                  )}
                >
                  Share feedback
                </Link>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Donations are voluntary and not a purchase.
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-background/30" />
      </div>
    </section>
  );
}
