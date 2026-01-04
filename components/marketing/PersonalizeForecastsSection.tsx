import Link from "next/link";

import DashboardPersonalizationPreview from "@/components/marketing/DashboardPersonalizationPreview";
import { cn } from "@/lib/utils";

export default function PersonalizeForecastsSection({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      aria-labelledby="personalize-forecasts-heading"
      className={cn(
        "relative mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6",
        className
      )}
    >
      <div className="grid grid-cols-1 items-start gap-10 xl:grid-cols-12 xl:gap-12">
        <div className="xl:col-span-5">
          <h2
            id="personalize-forecasts-heading"
            className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Personalize your forecasts.
          </h2>
          <p className="mt-4 max-w-prose text-pretty text-base text-muted-foreground sm:text-lg">
            Use Edit dashboard to drag and drop widgets, and toggle what you
            want to see. Keep separate layouts for Overview and Forecast.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/beaches#content"
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl",
                "transition-shadow motion-reduce:transition-none hover:shadow-cyan-500/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              Try personalization
            </Link>
            <a
              href="#personalize-demo"
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-border/40 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              See example layouts
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-foreground/80">
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Drag & drop
            </span>
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Show / hide widgets
            </span>
            <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
              Per-tab layouts
            </span>
          </div>
        </div>

        <div id="personalize-demo" className="xl:col-span-7">
          <DashboardPersonalizationPreview />
        </div>
      </div>
    </section>
  );
}

