"use client";

import dynamic from "next/dynamic";

const loadAnimatedCardsSection = () =>
  import("@/components/visuals/AnimatedCardsSection");

// Start fetching the chunk as soon as this component's module is evaluated so the
// section can reveal real content (no visible skeleton swap) even on fast scroll.
if (typeof window !== "undefined") {
  void loadAnimatedCardsSection();
}

const AnimatedCardsSection = dynamic(loadAnimatedCardsSection, {
  ssr: false,
  loading: () => <Skeleton />,
});

function Skeleton() {
  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 shadow-lg shadow-black/10 ring-1 ring-black/5">
        <div className="aspect-[16/10] min-h-[18rem] sm:min-h-[20rem]" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
      </div>
    </div>
  );
}

export function LazyLoadCardsSection({
}: {}) {
  return (
    <div className="w-full">
      <AnimatedCardsSection />
    </div>
  );
}
