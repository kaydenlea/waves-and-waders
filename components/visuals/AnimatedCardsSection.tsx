import Link from "next/link";
import ForecastsMadeSimpleVisual from "@/components/visuals/ForecastsMadeSimpleVisual";
import { Heart, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

export const Description = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "p-2 space-y-0 flex-1 flex flex-col items-center xl:items-end",
        className
      )}
    >
      <h2 className="text-balance text-center xl:text-right text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Forecasts made simple.
      </h2>
      <p className="mt-4 max-w-prose text-pretty text-center xl:text-right text-base text-muted-foreground sm:text-lg mx-auto xl:mx-0">
        Find nearby and saved beaches fast, then scan conditions at a glance
        with time + direction cues built into the overview.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center xl:justify-start gap-3">
        <Link
          href="/beaches?tab=saved"
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl",
            "transition-shadow motion-reduce:transition-none hover:shadow-cyan-500/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          )}
        >
          <Heart className="h-4 w-4 mr-1.5" /> Favorites
        </Link>
        <Link
          href="/beaches"
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-border/40 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur",
            "transition-colors motion-reduce:transition-none hover:bg-highlight-3",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          )}
        >
          <MapPinned className="h-4 w-4 mr-1.5" /> Browse
        </Link>
      </div>

      {/* <div className="mt-6 flex flex-wrap justify-center xl:justify-start gap-2 text-xs font-semibold text-foreground/80">
        <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
          Nearby + saved
        </span>
        <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
          At-a-glance overview
        </span>
        <span className="rounded-full border border-border/50 bg-highlight-5/60 px-3 py-1">
          Time + direction cues
        </span>
      </div> */}
    </div>
  );
};

export default function AnimatedCardsSection() {
  return <ForecastsMadeSimpleVisual />;
}
