import InViewOnce from "@/components/marketing/InViewOnce";
import AllEssentialsCardsDeck from "@/components/marketing/AllEssentialsCardsDeck";

export default function AllEssentialsCardsSection() {
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
        <p className="text-xs font-semibold tracking-[0.24em] uppercase text-foreground/60 dark:text-foreground/75">
          All the essentials
        </p>
        <h2
          id="essentials-title"
          className="mt-3 text-balance text-foreground text-4xl xl:text-5xl font-semibold tracking-tight"
        >
          Everything you need to plan.
        </h2>
        <p className="mt-3 xl:mt-4 text-pretty text-foreground/70 text-sm xl:text-base">
          Hour-by-hour surf forecasts with clear direction, charts, and spot
          context—powered by reputable public data sources.
        </p>
      </header>

      <AllEssentialsCardsDeck />
    </section>
  );
}
