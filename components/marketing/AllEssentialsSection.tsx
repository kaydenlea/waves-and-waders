import InViewOnce from "@/components/marketing/InViewOnce";
import type { CSSProperties } from "react";
import AllEssentialsSectionClient from "./AllEssentialsSectionClient";

export default function AllEssentialsSection() {
  return (
    <section
      id="why"
      aria-labelledby="essentials-title"
      className="ww-section relative mx-auto w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-20 scroll-mt-28"
      data-ww-section
      data-inview="false"
    >
      <InViewOnce rootAttr="data-ww-section" />

      <header className="mx-auto max-w-3xl text-center">
        <h2
          id="essentials-title"
          className="text-balance text-foreground text-4xl sm:text-5xl font-semibold tracking-tight"
        >
          All the essentials
        </h2>
        <p className="mt-4 text-pretty text-foreground/70 dark:text-foreground/80 text-base sm:text-lg">
          Pick a day and hour, scan charts, and read wind + swell direction in a
          surf-first view.
        </p>
      </header>

      <div className="ww-reveal" style={{ "--delay": "60ms" } as CSSProperties}>
        <AllEssentialsSectionClient />
      </div>
    </section>
  );
}
