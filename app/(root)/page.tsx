import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/seo";
import Hero from "@/components/marketing/Hero";

import { Sparkles, Pencil } from "lucide-react";
import { LazyLoadCardsSection } from "@/components/general/LazyLoad/LazyLoadCardsSection";
import { LazyLoadSpotlightCard } from "@/components/general/LazyLoad/LazyLoadSpotlightCard";
import { Description } from "@/components/visuals/AnimatedCardsSection";
import AnimatedCountSection from "@/components/visuals/AnimatedCountSection";
import FaqSection from "@/components/visuals/FaqSection";
import PersonalizeForecastsSection from "@/components/marketing/PersonalizeForecastsSection";
import AllEssentialsSection from "@/components/marketing/AllEssentialsSection";
import DonateInlineCallout from "@/components/marketing/DonateInlineCallout";
import DonateSection from "@/components/marketing/DonateSection";
import DonateStickyPill from "@/components/marketing/DonateStickyPill";
import InViewOnce from "@/components/marketing/InViewOnce";

export const metadata: Metadata = {
  title: "Surf forecasts, maps, and beach features",
  description:
    "Live surf conditions, beach maps, and feature-rich spot guides for coastal breaks. Find California beaches with bathrooms, parking, showers, and lifeguards. Real-time wave forecasts from NOAA.",
  keywords: [
    "surf forecast",
    "surf conditions",
    "beach conditions",
    "swell forecast",
    "wave forecast",
    "tide forecast",
    "surf report",
    "beach weather",
    "ocean conditions",
    "surf spots",
    "wave height",
    "swell direction",
    "wind forecast",
    "California beaches",
    "beaches with bathrooms",
    "beaches with parking",
    "beaches near me",
    "Orange County beaches",
    "San Diego surf",
    "Los Angeles beaches",
  ],
  openGraph: {
    title: "Surf forecasts, maps, and beach features",
    description:
      "Live surf conditions, beach maps, and feature-rich spot guides for coastal breaks.",
    url: "/",
    images: [
      {
        url: toAbsoluteUrl("/logo.png"),
        width: 512,
        height: 512,
        alt: "Waves and Waders logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Surf forecasts, maps, and beach features",
    description:
      "Live surf conditions, beach maps, and feature-rich spot guides for coastal breaks.",
    images: [toAbsoluteUrl("/logo.png")],
  },
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 3600; // Revalidate every hour

const Home = () => {
  const baseUrl = getSiteUrl();
  // Search + feature chips
  // const [query, setQuery] = useState("");
  // const [featureFilters, setFeatureFilters] = useState<Set<string>>(new Set());
  // // Data from API (/api/beaches includes feature flags)
  // const [apiBeaches, setApiBeaches] = useState<
  //   {
  //     id: string | number;
  //     Name?: string;
  //     name?: string;
  //     COUNTY?: string;
  //     county?: string;
  //     LATITUDE?: number;
  //     latitude?: number;
  //     LONGITUDE?: number;
  //     longitude?: number;
  //     features?: Record<string, boolean>;
  //   }[]
  // >([]);
  // // Location
  // const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
  //   null
  // );
  // const favorites = ["2", "4"];

  // useEffect(() => {
  //   let cancelled = false;
  //   const load = async () => {
  //     try {
  //       const res = await fetch("/api/beaches");
  //       const json = await res.json();
  //       if (!cancelled && json?.success && Array.isArray(json.data)) {
  //         setApiBeaches(json.data);
  //       }
  //     } catch (e) {
  //       console.error("Home: failed to load beaches", e);
  //     }
  //   };
  //   load();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, []);

  // useEffect(() => {
  //   if (!navigator?.geolocation) return;
  //   const id = setTimeout(() => {
  //     navigator.geolocation.getCurrentPosition(
  //       (pos) =>
  //         setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
  //       () => {},
  //       { enableHighAccuracy: true, timeout: 8000 }
  //     );
  //   }, 0);
  //   return () => clearTimeout(id);
  // }, []);

  // const computedBeaches = useMemo(() => {
  //   // Prefer live API data; fall back to demo BEACHES
  //   const source = (
  //     apiBeaches.length
  //       ? apiBeaches.map((b) => ({
  //           id: String(b.id),
  //           name: b.name ?? (b as any).Name,
  //           region: b.county ?? (b as any).COUNTY,
  //           coords: [
  //             Number(b.latitude ?? (b as any).LATITUDE),
  //             Number(b.longitude ?? (b as any).LONGITUDE),
  //           ] as [number, number],
  //           features: b.features ?? {},
  //         }))
  //       : BEACHES
  //   ) as (Beach & { features?: Record<string, boolean> })[];

  //   const enriched = source.map((b) => {
  //     if (!location) return b as Beach;
  //     const km = haversineKm([location.lat, location.lon], b.coords);
  //     return { ...(b as Beach), distanceKm: km } as Beach;
  //   });

  //   // Apply text search
  //   const q = query.trim().toLowerCase();
  //   const textFiltered = q
  //     ? enriched.filter((b) =>
  //         `${b.name} ${b.region}`.toLowerCase().includes(q)
  //       )
  //     : enriched;

  //   // Apply feature filters (all selected must be true)
  //   const featureKeys = Array.from(featureFilters);
  //   const featureFiltered = featureKeys.length
  //     ? textFiltered.filter((b) => {
  //         const f = (b as any).features || {};
  //         return featureKeys.every((k) => !!f[k]);
  //       })
  //     : textFiltered;

  //   // Sort by distance when available
  //   return featureFiltered.sort(
  //     (a, z) => (a.distanceKm ?? 9e9) - (z.distanceKm ?? 9e9)
  //   );
  // }, [apiBeaches, location, query, featureFilters]);

  // const nearby = computedBeaches.slice(0, 6);
  // const saved = computedBeaches.filter((b) => favorites.includes(b.id));

  // const toggleFavorite = (id: string) => {
  //   setFavorites((prev) =>
  //     prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  //   );
  // };

  return (
    <div className="touch-pan-y">
      <main className="relative min-h-screen bg-background text-foreground selection:bg-cyan-300/40">
        <DonateStickyPill />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Waves and Waders",
              url: baseUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${baseUrl}/beaches?search={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <div className="relative pb-2 @min-5xl:pb-8">
          <Hero />

          {/* <section
            id="search"
            className="mx-auto max-w-70 xs:max-w-80 sm:max-w-140 md:max-w-xl lg:max-w-3xl xl:max-w-5xl px-4 sm:px-6"
          >
            <div className="rounded-3xl border border-border/50 bg-highlight-1/15 dark:bg-highlight-2 p-4 backdrop-blur md:p-6 shadow-md">
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    aria-label="Search for a beach"
                    className="h-12 w-full rounded-xl border border-border/50 dark:bg-background/60 bg-background/50 pl-10 pr-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    placeholder="Search beaches…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {query && (
                <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {computedBeaches.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground/70">
                          {b.region}
                        </p>
                        <p className="truncate text-base font-medium">
                          {b.name}
                        </p>
                      </div>
                      <Link
                        href={`${generateBeachUrl(b.name, b.id)}/overview`}
                        className="text-cyan-300 hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section> */}
          {/* <div className="flex justify-center">
              <LazyLoadLogoLoop
                className="text-white touch-pan-y"
                width="98%"
              />
            </div> */}
          {/* <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Badge icon={Zap}>Realtime swell + wind</Badge>
              <Badge icon={ShieldCheck}>Verified buoy sources</Badge>
              <Badge icon={Trophy}>Crowd-rated breaks</Badge>
            </div> */}
        </div>

        {/* <section
          id="nearby"
          className="@container mx-auto max-w-7xl px-4 pt-12 sm:px-6 md:pt-16"
        >
          <div className="flex justify-between items-start">
            <SectionHeader
              icon={MapPin}
              title="Nearby"
              // subtitle="Calculated from your device location for a fast, privacy-first experience."
            />
            <Link
              href="/beaches#content"
              className="whitespace-nowrap inline-flex items-center gap-2 rounded-full border border-border bg-highlight-1/60 px-4 py-2 font-medium text-foreground/90 backdrop-blur transition hover:bg-highlight-3"
            >
              <Map className="h-4 w-4" /> See more
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 @min-md:grid-cols-2 @min-3xl:grid-cols-3">
            {nearby.map((b) => (
              <BeachCard
                key={b.id}
                b={b}
                // useMiles={useMiles}
                // onToggleFavorite={toggleFavorite}
                isFav={favorites.includes(b.id)}
              />
            ))}
          </div>
        </section> */}
        <AnimatedCountSection />
        <AllEssentialsSection />
        {/* <section
          id="why"
          className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6"
        >
          <div>
            <h2 className="text-center text-foreground text-4xl sm:text-5xl font-semibold tracking-tight mb-10">
              All the essentials.
            </h2>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <WhyItem icon={ShieldCheck} title="Reliable data">
                Sourced from NOAA/NDBC buoys, tide stations, and curated
                reports. Redundant caching keeps the app fast—even on flaky
                beach Wi‑Fi.
              </WhyItem>
              <WhyItem icon={Zap} title="Real-time insights">
                We fuse multiple signals (swell height, direction, wind shear,
                tide) into a simple readability score so you know if it’s worth
                the trip.
              </WhyItem>
              <WhyItem icon={Sparkles} title="Personal & clean">
                Minimal UI, maximal clarity. Save spots, tailor alerts, and get
                concise summaries—no ads, no clutter, just surf.
              </WhyItem>
            </div>
          </div>
        </section> */}
        <PersonalizeForecastsSection />
        <section
          id="forecast"
          data-ww-section
          data-inview="false"
          className="ww-section relative mx-auto w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-20 overflow-hidden scroll-mt-28"
        >
          <InViewOnce rootAttr="data-ww-section" />
          <div
            className="ww-reveal grid grid-cols-1 items-start justify-items-center gap-10 xl:grid-cols-12 xl:justify-items-stretch xl:gap-12"
            style={{ ["--delay" as any]: "60ms" }}
          >
            <div className="w-full max-w-xl xl:col-span-5 xl:max-w-none order-1 xl:order-2">
              <Description />
            </div>
            <div className="w-full max-w-[46rem] xl:col-span-7 xl:max-w-none order-2 xl:order-1 min-w-0">
              <LazyLoadCardsSection />
            </div>
          </div>
        </section>

        {/* <DonateInlineCallout className="pb-16 sm:pb-20" /> */}
        {/* <section
          id="nearby"
          className="@container mx-auto max-w-7xl px-4 pt-12 sm:px-6 md:pt-16"
        >
          <div className="flex justify-between items-start">
            <SectionHeader
              icon={MapPin}
              title="Nearby"
              // subtitle="Calculated from your device location for a fast, privacy-first experience."
            />
            <Link
              href="/beaches#content"
              className="whitespace-nowrap inline-flex items-center gap-2 rounded-full border border-border bg-highlight-1/60 px-4 py-2 font-medium text-foreground/90 backdrop-blur transition hover:bg-highlight-3"
            >
              <Map className="h-4 w-4" /> See more
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 @min-md:grid-cols-2 @min-3xl:grid-cols-3">
            {nearby.map((b) => (
              <BeachCard
                key={b.id}
                b={b}
                // useMiles={useMiles}
                // onToggleFavorite={toggleFavorite}
                isFav={favorites.includes(b.id)}
              />
            ))}
          </div>
        </section> */}
        {/* <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex flex-col lg:flex-row gap-10">
            <LazyLoadSpotlightCard
              className="flex-1"
              spotlightColor="rgba(92, 190, 255, 0.38)"
            >
              <div className="space-y-8">
                <header className="space-y-2">
                  <Pencil className="w-8 h-8 md:w-12 md:h-12" />
                  <h2 className="text-2xl md:text-3xl font-medium">
                    Customize your forecasts
                  </h2>
                </header>
                <p className="w-full xl:w-9/10 text-muted-foreground">
                  All-in-one forecasts of your local spots provide all the
                  conditions you need. Feel too cluttered? Pick and choose what
                  data you want!
                </p>
                <Link
                  href="/beaches#content"
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground border border-transparent px-4 py-3 font-medium text-background shadow-xl transition hover:shadow-cyan-500/20"
                >
                  <Sparkles className="h-4 w-4" /> Try
                  <span className="hidden md:block md:-ml-1">free</span>
                </Link>
              </div>
            </LazyLoadSpotlightCard>
            <LazyLoadSpotlightCard
              className="flex-1"
              spotlightColor="rgba(92, 190, 255, 0.38)"
            >
              <div className="space-y-8">
                <header className="space-y-2">
                  <Sparkles className="w-8 h-8 md:w-12 md:h-12" />
                  <h2 className="text-2xl md:text-3xl font-medium">
                    Simple, accurate, easy
                  </h2>
                </header>
                <p className="w-full xl:w-9/10 text-muted-foreground">
                  Get ahead and access 14 day forecasts of your favorite local
                  spots! Enjoy a simplified and modern view of all the
                  conditions you need.
                </p>
                <Link
                  href="/beaches#content"
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground border border-transparent px-4 py-3 font-medium text-background shadow-xl transition hover:shadow-cyan-500/20"
                >
                  <Sparkles className="h-4 w-4" /> Explore
                </Link>
              </div>
            </LazyLoadSpotlightCard>
          </div>
        </section> */}

        <DonateSection />
        <FaqSection />
        {/* <section className="flex justify-center">
          <div className="flex flex-col md:flex-row">
            <Image
              className="rounded-b-2xl"
              src="/surf2.png"
              alt="Surf background"
              width={500}
              height={500}
              priority
            />
            <ul>
              <li>
                <LazyLoadCountNums
                  from={900}
                  to={1000}
                  separator=","
                  direction="up"
                />
              </li>
            </ul>
          </div>
        </section> */}

        {/* <section
        id="saved"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10"
      >
        <SectionHeader
          icon={Heart}
          title="Your saved spots"
          subtitle="Quick access to the breaks you love—sync across devices soon."
        />
        {saved.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((b) => (
              <BeachCard
                key={b.id}
                b={b}
                useMiles={useMiles}
                onToggleFavorite={toggleFavorite}
                isFav={favorites.includes(b.id)}
              />
            ))}
          </div>
        )}
      </section> */}

        {/* <section id="why" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="shadow-lg rounded-3xl border border-border/50 bg-gradient-to-br from-highlight-1 to-highlight-1/40 p-6 shadow-2xl shadow-highlight-3/50 md:p-10">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl mb-5">
              Learn More
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <WhyItem icon={ShieldCheck} title="Reliable data">
                Sourced from NOAA/NDBC buoys, tide stations, and curated
                reports. Redundant caching keeps the app fast—even on flaky
                beach Wi‑Fi.
              </WhyItem>
              <WhyItem icon={Zap} title="Real-time insights">
                We fuse multiple signals (swell height, direction, wind shear,
                tide) into a simple readability score so you know if it’s worth
                the trip.
              </WhyItem>
              <WhyItem icon={Sparkles} title="Personalized & clean">
                Minimal UI, maximal clarity. Save spots, tailor alerts, and get
                concise summaries—no ads, no clutter, just surf.
              </WhyItem>
            </div>
          </div>
        </section> */}
      </main>
    </div>
  );
};

export default Home;
