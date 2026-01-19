import Link from "next/link";
import type { CSSProperties } from "react";
import { Heart, LayoutDashboard } from "lucide-react";

import DashboardPersonalizationPreview from "@/components/marketing/DashboardPersonalizationPreview";
import InViewOnce from "@/components/marketing/InViewOnce";
import { cn } from "@/lib/utils";

export default function PersonalizeForecastsSection({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      id="personalize"
      aria-labelledby="personalize-forecasts-heading"
      className={cn(
        "ww-section relative mx-auto w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-20 scroll-mt-28 overflow-hidden",
        className
      )}
      data-ww-section
      data-inview="false"
    >
      <InViewOnce
        rootAttr="data-ww-section"
        rootMargin="0px 0px -15% 0px"
        threshold={0}
      />
      <div className="grid grid-cols-1 items-start justify-items-center gap-10 2xl:grid-cols-12 2xl:justify-items-stretch 2xl:gap-12">
        <div className="w-full max-w-2xl 2xl:col-span-5 2xl:max-w-none">
          <h2
            id="personalize-forecasts-heading"
            className="text-balance text-center 2xl:text-left text-4xl font-semibold tracking-tight text-foreground xl:text-5xl"
          >
            Personalize your forecasts.
          </h2>
          <p className="mt-3 2xl:mt-4 max-w-prose text-pretty text-center 2xl:text-left text-sm text-muted-foreground xl:text-base mx-auto 2xl:mx-0">
            Use the edit dashboard to drag and drop widgets, and toggle what you
            want to see. Keep separate layouts for your surf overview and
            forecast.
          </p>

          <div
            className="ww-reveal mt-6 flex flex-wrap items-center justify-center 2xl:justify-start gap-3"
            style={{ "--delay": "80ms" } as CSSProperties}
          >
            <Link
              href="/beaches?tab=nearby"
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl",
                "transition-shadow motion-reduce:transition-none hover:shadow-cyan-500/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Personalize
            </Link>
            <Link
              href="/beaches?tab=saved"
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-border/40 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              <Heart className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Favorites
            </Link>
          </div>

          {/* <div className="mt-6 flex flex-wrap justify-center xl:justify-start gap-2 text-xs font-semibold text-foreground/80">
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Drag & drop
            </span>
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Show / hide widgets
            </span>
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Per-tab layouts
            </span>
          </div> */}
        </div>

        <div
          id="personalize-demo"
          className="w-full max-w-[40rem] 2xl:col-span-7 2xl:max-w-none 2xl:ml-auto"
        >
          <div
            className="ww-reveal"
            style={{ "--delay": "120ms" } as CSSProperties}
          >
            <DashboardPersonalizationPreview className="mx-auto w-full max-w-[46rem] 2xl:max-w-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
