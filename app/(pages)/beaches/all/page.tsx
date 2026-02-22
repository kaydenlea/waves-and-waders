import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import NavBar from "@/components/general/NavBar";
import Footer from "@/components/general/Footer";
import PersistBeachesReturn from "@/components/general/PersistBeachesReturn";
import { fetchAllBeaches, generateBeachUrl, type Beach } from "@/lib/supabase";
import { buildPageMetadata } from "@/lib/seo";
import { ChevronDown, MapPinned, Waves } from "lucide-react";

const fetchAllBeachesCached = unstable_cache(
  () => fetchAllBeaches(),
  ["beaches:all-beaches-page"],
  { revalidate: 21600 },
);

export const revalidate = 21600;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "All surf spots and beaches",
    description:
      "Browse all beaches with surf forecasts and conditions, organized by county.",
    canonicalPath: "/beaches/all",
  }),
  keywords: [
    "surf spots",
    "surf forecast",
    "beach directory",
    "California beaches",
    "tide charts",
    "swell forecast",
  ],
};

export default async function AllBeachesPage() {
  const allBeaches = await fetchAllBeachesCached().catch(() => []);
  const beachesByCounty: Record<string, Beach[]> = {};
  for (const beach of allBeaches) {
    const key = (beach.COUNTY || "Other").trim() || "Other";
    beachesByCounty[key] ??= [];
    beachesByCounty[key].push(beach);
  }
  const sortedCountyKeys = Object.keys(beachesByCounty).sort((a, b) =>
    a.localeCompare(b),
  );
  const toCountyId = (value: string) =>
    `county-${value}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const totalBeaches = allBeaches.length;
  const totalCounties = sortedCountyKeys.length;

  return (
    <>
      <NavBar landingPage variant="marketing" centerMode="search" />
      <main
        id="main-content"
        className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground pt-32 pb-16 @min-4xl:pt-32"
      >
        <PersistBeachesReturn />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(34,211,238,0.16),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_85%_0%,rgba(99,102,241,0.14),transparent_65%)]" />
          <div className="ww-scroll-hide-blur absolute -top-36 left-1/2 h-[520px] w-[1080px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="ww-scroll-hide-blur absolute -bottom-64 -right-36 h-[620px] w-[620px] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-10">
          <header className="mx-auto max-w-2xl md:max-w-3xl px-2 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground shadow-xs">
              <Waves className="h-4 w-4 text-cyan-500/80" aria-hidden="true" />
              Surf spot directory
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Browse all beaches by county
            </h1>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              A directory of surf spots. Use the search in the top navigation to
              jump to a beach, or expand a county to browse the full list.
            </p>

            <div className="mt-8 mx-auto max-w-md grid gap-3 @min-lg:grid-cols-3">
              <div className="rounded-3xl border border-border/40 bg-highlight-7/20 px-4 py-4 text-left shadow-xs">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                  Total spots
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {totalBeaches.toLocaleString("en-US")}
                </div>
              </div>
              <div className="rounded-3xl border border-border/40 bg-highlight-7/20 px-4 py-4 text-left shadow-xs">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">
                  Counties
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {totalCounties.toLocaleString("en-US")}
                </div>
              </div>
              <a
                href="/beaches"
                className="group flex items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary px-4 py-4 text-left text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:translate-y-px"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold tracking-wide text-primary-foreground/80">
                    Map
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight">
                    Open
                  </div>
                </div>
                <MapPinned
                  className="h-6.5 w-6.5 shrink-0 text-primary-foreground/90 transition group-hover:scale-105"
                  aria-hidden="true"
                />
              </a>
            </div>
          </header>

          <section
            aria-label="Beaches organized by county"
            className="mt-12 space-y-4"
          >
            {sortedCountyKeys.map((county) => {
              const countyId = toCountyId(county);
              const countyBeaches = beachesByCounty[county] ?? [];
              return (
                <details
                  key={county}
                  className="group rounded-3xl border border-border/40 bg-highlight-7/20 shadow-xs"
                >
                  <summary
                    id={countyId}
                    className="bg-highlight-7/50 hover:bg-highlight-5 flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-3xl"
                  >
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground sm:text-lg">
                        {county}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {countyBeaches.length.toLocaleString("en-US")} spots
                      </p>
                    </div>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-foreground/60 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="px-5 py-5">
                    <ul className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                      {countyBeaches.map((beach) => (
                        <li key={String(beach.id)} className="min-w-0">
                          <a
                            className="group/link inline-flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm text-foreground/85 transition hover:bg-highlight-3/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            href={`${generateBeachUrl(
                              beach.Name,
                              beach.id,
                            )}/overview`}
                          >
                            <span className="truncate">{beach.Name}</span>
                            {/* <span className="text-xs text-muted-foreground group-hover/link:text-foreground/70">
                              Forecast
                            </span> */}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              );
            })}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
