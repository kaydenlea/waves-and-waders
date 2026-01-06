import Link from "next/link";
import { HandHeart } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import InViewOnce from "@/components/marketing/InViewOnce";

export default function DonateInlineCallout({
  className,
}: {
  className?: string;
}) {
  return (
    <aside
      data-ww-section
      data-inview="false"
      className={cn(
        "ww-section mx-auto w-full max-w-7xl px-4 sm:px-6",
        className
      )}
      aria-label="Support this project"
    >
      <InViewOnce rootAttr="data-ww-section" />
      <div
        className="ww-reveal rounded-3xl border border-border/40 bg-background/40 p-5 shadow-xs sm:p-6"
        style={{ "--delay": "40ms" } as CSSProperties}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-md shadow-cyan-500/20">
              <HandHeart className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground">
                Support Waves &amp; Waders
              </div>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                If this helped you plan a session, donations keep the forecasts free and improving.
              </p>
            </div>
          </div>

          <Link
            href="/donate?from=inline"
            className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            Donate
          </Link>
        </div>
      </div>
    </aside>
  );
}
