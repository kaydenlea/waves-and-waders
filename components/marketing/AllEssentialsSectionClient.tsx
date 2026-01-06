"use client";

import dynamic from "next/dynamic";
import * as React from "react";

const AllEssentialsSectionBody = dynamic(
  () => import("./AllEssentialsSectionBody"),
  { ssr: false, loading: () => <AllEssentialsSkeleton /> }
);

function useNearViewport<T extends Element>({
  rootMargin = "500px",
  threshold = 0.01,
}: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const ref = React.useRef<T | null>(null);
  const [near, setNear] = React.useState(false);

  React.useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [near, rootMargin, threshold]);

  return { ref, near } as const;
}

function AllEssentialsSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      <div className="md:col-span-2 lg:col-span-2">
        <div className="overflow-hidden rounded-3xl border border-border/30 bg-background/40 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
          <div className="border-b border-border/25 bg-background/50 px-5 py-4 dark:border-border/35 dark:bg-highlight-5/45">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="h-4 w-40 rounded bg-foreground/10 dark:bg-foreground/15" />
                <div className="mt-2 h-3 w-64 rounded bg-foreground/8 dark:bg-foreground/12" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-28 rounded-full bg-foreground/10 dark:bg-foreground/15" />
                <div className="h-9 w-36 rounded-full bg-foreground/10 dark:bg-foreground/15" />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-border/25 bg-background/55 p-3 shadow-sm dark:border-border/35 dark:bg-highlight-5/45">
              <div className="h-12 rounded-full bg-foreground/10 dark:bg-foreground/15" />
              <div className="mt-2 h-3 w-52 rounded bg-foreground/8 dark:bg-foreground/12" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex h-[13rem] flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5 dark:bg-highlight-5/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-foreground/10 dark:bg-foreground/15" />
                    <div className="h-4 w-24 rounded bg-foreground/10 dark:bg-foreground/15" />
                  </div>
                  <div className="mt-4 flex-1 rounded-xl bg-foreground/5 dark:bg-foreground/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="h-4 w-28 rounded bg-foreground/10 dark:bg-foreground/15" />
            <div className="mt-2 h-3 w-48 rounded bg-foreground/8 dark:bg-foreground/12" />
          </div>
          <div className="h-9 w-9 rounded-full bg-foreground/10 dark:bg-foreground/15" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="aspect-square rounded-2xl bg-foreground/5 dark:bg-foreground/10" />
          <div className="aspect-square rounded-2xl bg-foreground/5 dark:bg-foreground/10" />
        </div>
      </div>

      <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="h-4 w-36 rounded bg-foreground/10 dark:bg-foreground/15" />
            <div className="mt-2 h-3 w-52 rounded bg-foreground/8 dark:bg-foreground/12" />
          </div>
          <div className="h-9 w-9 rounded-full bg-foreground/10 dark:bg-foreground/15" />
        </div>
        <div className="mt-4 aspect-[16/10] rounded-2xl bg-foreground/5 dark:bg-foreground/10" />
      </div>

      <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="h-4 w-40 rounded bg-foreground/10 dark:bg-foreground/15" />
            <div className="mt-2 h-3 w-48 rounded bg-foreground/8 dark:bg-foreground/12" />
          </div>
          <div className="h-9 w-9 rounded-full bg-foreground/10 dark:bg-foreground/15" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-10 w-40 rounded-full bg-foreground/10 dark:bg-foreground/15" />
          <div className="h-10 w-40 rounded-full bg-foreground/10 dark:bg-foreground/15" />
        </div>
      </div>
    </div>
  );
}

export default function AllEssentialsSectionClient() {
  const { ref, near } = useNearViewport<HTMLDivElement>();

  return (
    <div ref={ref}>
      {near ? <AllEssentialsSectionBody /> : <AllEssentialsSkeleton />}
    </div>
  );
}

