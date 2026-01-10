import { HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import InViewOnce from "@/components/marketing/InViewOnce";
import DonateOptionsCard from "@/components/marketing/DonateOptionsCard";
import { cn } from "@/lib/utils";

export default function DonateSection({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="support-heading"
      data-ww-section
      data-inview="false"
      className={cn(
        "ww-section mx-auto w-full max-w-4xl xl:max-w-7xl px-4 sm:px-6 py-16 sm:py-20",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-foreground/[0.035] to-foreground/[0.015] p-6 shadow-sm sm:p-10">
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
              className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Keep it free, keep it improving.
            </h2>
            <p className="mt-3 max-w-prose text-pretty text-base text-muted-foreground sm:text-base">
              Donations cover hosting, data costs, and ongoing development.
              Forecasts remain free to use.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-foreground/70">
              <span className="shadow-xs inline-flex items-center gap-2 font-medium rounded-full border border-border/40 bg-background/40 pl-3 pr-4.5 py-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-500"
                  aria-hidden="true"
                />
                Secure
              </span>
              <span className="shadow-xs inline-flex items-center gap-2 font-medium rounded-full border border-border/40 bg-background/40 pl-3 pr-4.5 py-1.5">
                <HandHeart
                  className="h-4 w-4 text-rose-500"
                  aria-hidden="true"
                />
                Optional
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <DonateOptionsCard />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-background/30" />
      </div>
    </section>
  );
}
