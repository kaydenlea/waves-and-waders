// import type { Metadata } from "next";

// export const metadata: Metadata = {
//   title: "Home | Waves and Waders",
//   description: "Check the surf conditions of your local beaches",
// };

// export default function Home() {
//   // throw new Error("NOT IMPLEMENTED");
//   return (
//     <>
//       <h1>Landing Page</h1>
//       <p>content</p>
//     </>
//   );
// }

// "use client";

// import { useState } from "react";

// const beaches = [
//   {
//     id: 1,
//     name: "Laguna Beach",
//     conditions: "3 ft waves • 72°F water • Light wind",
//   },
//   {
//     id: 2,
//     name: "Newport Beach",
//     conditions: "2 ft waves • 70°F water • Calm winds",
//   },
//   {
//     id: 3,
//     name: "Huntington Beach",
//     conditions: "5 ft waves • 68°F water • Offshore winds",
//   },
//   {
//     id: 4,
//     name: "Malibu Beach",
//     conditions: "4 ft waves • 71°F water • Sunny skies",
//   },
// ];

// function BeachCard({ name, conditions }: { name: string; conditions: string }) {
//   return (
//     <div className="rounded-2xl shadow-md bg-white hover:shadow-lg transition transform hover:-translate-y-1">
//       {/* Placeholder Canvas */}
//       <div className="w-full h-48 bg-gradient-to-r from-blue-200 to-blue-100 flex items-center justify-center text-gray-500 text-sm">
//         Canvas
//       </div>
//       <div className="p-4">
//         <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
//         <p className="text-gray-600 text-sm">{conditions}</p>
//       </div>
//     </div>
//   );
// }

// export default function HomePage() {
//   const [search, setSearch] = useState("");

//   return (
//     <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white text-gray-900">
//       {/* Header */}
//       <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
//         <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
//           <h1 className="text-xl font-bold text-blue-600">WaveWatch</h1>
//           <nav className="space-x-6 font-medium">
//             <a href="#nearby" className="hover:text-blue-600">
//               Nearby
//             </a>
//             <a href="#favorites" className="hover:text-blue-600">
//               Favorites
//             </a>
//             <a href="#about" className="hover:text-blue-600">
//               About
//             </a>
//           </nav>
//         </div>
//       </header>

//       {/* Hero */}
//       <section className="flex flex-col items-center justify-center text-center px-6 py-24">
//         <h2 className="text-4xl md:text-6xl font-bold leading-tight">
//           Discover Beaches & Surf Conditions
//         </h2>
//         <p className="mt-4 text-gray-600 max-w-xl">
//           Find the perfect beach near you, track live ocean conditions, and save
//           your favorite spots for later.
//         </p>

//         {/* Search */}
//         <form
//           onSubmit={(e) => e.preventDefault()}
//           className="mt-8 w-full max-w-lg"
//         >
//           <input
//             type="text"
//             placeholder="Search beaches near you..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full rounded-full py-4 px-6 bg-white shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//           />
//         </form>

//         {/* CTA buttons */}
//         <div className="mt-6 flex gap-4">
//           <button className="px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
//             Nearby Beaches
//           </button>
//           <button className="px-6 py-3 rounded-full bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition">
//             My Favorites
//           </button>
//         </div>
//       </section>

//       {/* Nearby Beaches */}
//       <main className="flex-1">
//         <section
//           id="nearby"
//           className="max-w-6xl mx-auto px-6 py-16 bg-white rounded-3xl shadow-sm"
//         >
//           <h2 className="text-2xl font-bold mb-8">Top Beaches Near You</h2>
//           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {beaches.map((beach) => (
//               <BeachCard
//                 key={beach.id}
//                 name={beach.name}
//                 conditions={beach.conditions}
//               />
//             ))}
//           </div>
//         </section>

//         {/* Favorites Carousel */}
//         <section id="favorites" className="max-w-6xl mx-auto px-6 py-16">
//           <h2 className="text-2xl font-bold mb-6">Your Favorites</h2>
//           <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
//             {beaches.map((beach) => (
//               <div key={beach.id} className="min-w-[250px] flex-shrink-0">
//                 <BeachCard name={beach.name} conditions={beach.conditions} />
//               </div>
//             ))}
//           </div>
//         </section>
//       </main>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-gray-300 py-10">
//         <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
//           <div>
//             <h3 className="text-white font-bold text-lg">WaveWatch</h3>
//             <p className="mt-2 text-sm">
//               Track surf and beach conditions with ease. Built for surfers,
//               swimmers, and explorers.
//             </p>
//           </div>
//           <div>
//             <h4 className="text-white font-semibold mb-2">Links</h4>
//             <ul className="space-y-1 text-sm">
//               <li>
//                 <a href="#nearby" className="hover:text-white">
//                   Nearby
//                 </a>
//               </li>
//               <li>
//                 <a href="#favorites" className="hover:text-white">
//                   Favorites
//                 </a>
//               </li>
//               <li>
//                 <a href="#about" className="hover:text-white">
//                   About
//                 </a>
//               </li>
//             </ul>
//           </div>
//           <div>
//             <h4 className="text-white font-semibold mb-2">Stay Updated</h4>
//             <form className="flex gap-2">
//               <input
//                 type="email"
//                 placeholder="Your email"
//                 className="flex-1 rounded-md px-3 py-2 text-gray-800 focus:outline-none"
//               />
//               <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
//                 Join
//               </button>
//             </form>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }

// "use client";

import React, { Suspense, useMemo } from "react";
import Link from "next/link";
// import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ThemeToggle from "@/components/general/ThemeToggle";
import VisualFallback from "@/components/visuals/VisualFallback";
import { LazyLoadOceanScene } from "@/components/general/LazyLoad/LazyLoadOceanScene";
import BeachCard from "@/components/general/BeachCard";

import type { Beach } from "@/components/general/BeachCard";
import {
  MapPin,
  Heart,
  Search,
  Star,
  ShieldCheck,
  Zap,
  Waves,
  Compass,
  Sparkles,
  Trophy,
  Map,
  AlignJustify,
} from "lucide-react";
import Footer from "@/components/general/Footer";

// const Canvas = dynamic(
//   () => import("@react-three/fiber").then((m) => m.Canvas),
//   { ssr: false }
// );

const BEACHES: Beach[] = [
  {
    id: "1",
    name: "Ocean Beach",
    region: "San Francisco, CA",
    coords: [37.7599, -122.51],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "3–5 ft, clean",
      wind: "NW 7 mph",
      temp: 57,
      rating: 4.2,
    },
  },
  {
    id: "2",
    name: "Huntington Beach",
    region: "Orange County, CA",
    coords: [33.6595, -117.9988],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–3 ft, glassy",
      wind: "NE 3 mph",
      temp: 66,
      rating: 4.6,
    },
  },
  {
    id: "3",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
  {
    id: "4",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "5",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "6",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
];

const haversineKm = (a: [number, number], b: [number, number]) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const Badge = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 shadow-sm px-3 py-1 text-sm text-foreground/90 backdrop-blur-md">
    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />} {children}
  </span>
);

function StarRating({ value }: { value: number }) {
  const stars = Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < Math.round(value)
          ? "fill-yellow-400 text-yellow-400"
          : "text-foreground/30"
      }`}
      aria-hidden="true"
    />
  ));
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Rating ${stars.length} out of 5`}
    >
      {stars}
    </div>
  );
}

const Home = () => {
  // const prefersReducedMotion = useReducedMotion();
  // const [query, setQuery] = useState("");
  const query = "";
  // const [favorites, setFavorites] = useState<string[]>(["2", "4"]);
  const favorites = ["2", "4"];
  // const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
  //   null
  // );
  // const [useMiles, setUseMiles] = useState(true);

  // useEffect(() => {
  //   if (!navigator?.geolocation) return;
  //   navigator.geolocation.getCurrentPosition(
  //     (pos) =>
  //       setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
  //     () => {},
  //     { enableHighAccuracy: false, maximumAge: 60000, timeout: 6000 }
  //   );
  // }, []);

  const computedBeaches = useMemo(() => {
    const location = { lat: 0, lon: 0 };
    const enriched = BEACHES.map((b) => {
      if (!location) return b;
      const km = haversineKm([location.lat, location.lon], b.coords);
      return { ...b, distanceKm: km } as Beach;
    });
    const filtered = enriched.filter((b) =>
      `${b.name} ${b.region}`.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort(
      (a, z) => (a.distanceKm ?? 9e9) - (z.distanceKm ?? 9e9)
    );
  }, [query]);

  const nearby = computedBeaches.slice(0, 6);
  const saved = computedBeaches.filter((b) => favorites.includes(b.id));

  // const toggleFavorite = (id: string) => {
  //   setFavorites((prev) =>
  //     prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  //   );
  // };

  return (
    <div className="touch-pan-y">
      <header className="fixed top-0 z-40 w-full border-x border-b border-border bg-background/60 backdrop-blur rounded-b-md">
        <div className="mx-auto flex items-center justify-between px-4 py-6 sm:px-6">
          <Link href="#" className="group inline-flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
              <Waves className="h-6 w-6" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
              Waves<span className="ml-[0.9]">&</span>Waders
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground sm:hidden">
              W&W
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              className="text-foreground/80 transition hover:text-foreground"
              href="#nearby"
            >
              Nearby
            </Link>
            <Link
              className="text-foreground/80 transition hover:text-foreground"
              href="#saved"
            >
              Saved
            </Link>
            <Link
              className="text-foreground/80 transition hover:text-foreground"
              href="#why"
            >
              Why Us
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {/* <button
              onClick={() => setUseMiles((p) => !p)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              aria-label="Toggle miles/kilometers"
            >
              {useMiles ? "mi" : "km"}
            </button> */}
            <Link
              href="/"
              className="whitespace-nowrap flex items-center text-md font-medium text-foreground/70 hidden md:flex hover:bg-highlight-3 p-2 rounded-full"
            >
              Sign in
            </Link>
            <Link
              href="#search"
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
            >
              {/* <Search className="h-5 w-5" strokeWidth={3} /> Search */}
              <Search className="h-5 w-5" strokeWidth={3} />
            </Link>
            <ThemeToggle className="p-3 hover:bg-highlight-3 text-foreground hidden md:block" />
            <button
              aria-label="more options"
              className="icon-button p-3 hover:bg-highlight-3 text-foreground md:hidden"
            >
              <AlignJustify className="icon-md" />
            </button>
          </div>
        </div>
      </header>
      <main className="relative min-h-screen bg-background text-foreground selection:bg-cyan-300/40 mt-[5rem]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Waves&Waders",
              url: "https://example.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://example.com/search?q={query}",
                "query-input": "required name=query",
              },
            }),
          }}
        />
        <div className="bg-gradient-to-br from-blue/20 to-blue pb-12 rounded-b-4xl">
          <section className="@container relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:py-15">
            <div className="">
              <h1 className="text-center md:text-start text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-5xl lg:text-7xl text-foreground">
                Know the ocean{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  before you go
                </span>
              </h1>
              <p className="mx-auto sm:mx-40 md:mx-0 text-center md:text-start mt-4 max-w-xl text-md md:text-lg text-foreground/70">
                Live surf conditions, ultra-fast search, and a personalized feed
                of your spots.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex flex-row flex-wrap items-center justify-center md:justify-start w-full gap-2 whitespace-nowrap">
                  <Link
                    href="/beaches#content"
                    className="group inline-flex items-center gap-2 rounded-full bg-foreground border border-border px-4 py-3 font-medium text-background shadow-xl transition hover:shadow-cyan-500/20"
                  >
                    <Compass className="h-4 w-4" /> Explore
                    <span className="hidden md:block md:-ml-1">nearby</span>
                  </Link>
                  <Link
                    href="#search"
                    className="shadow-xl inline-flex items-center gap-2 rounded-full border border-border/40 bg-highlight-1/60 px-4 py-3 font-medium text-foreground/90 backdrop-blur transition hover:shadow-cyan-500/20"
                  >
                    <Heart className="h-4 w-4" /> Saved
                    <span className="hidden md:block md:-ml-1">spots</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* <div className="relative aspect-video w-full md:aspect-[4/3] hidden @min-xs:block max-w-150 lg:max-w-full mx-auto"> */}
            <div className="relative aspect-video w-full md:aspect-[4/3] max-w-150 lg:max-w-full mx-auto shadow-2xl rounded-4xl">
              <div className="absolute inset-0 rounded-4xl border border-white/10 bg-gradient-to-br from-slate-700 to-slate-700/40 p-1 drop-shadow-2xl">
                <div className="h-full w-full overflow-hidden rounded-4xl">
                  {/* <AnimatePresence> */}
                  {/* {!prefersReducedMotion && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full w-full"
                    >
                      {!prefersReducedMotion && (
                        <Suspense fallback={<VisualFallback />}>
                          <LazyLoadOceanScene />
                        </Suspense>
                      )}
                    </motion.div>
                  )} */}
                  <div className="h-full w-full">
                    {/* <Suspense fallback={<VisualFallback />}>
                    <LazyLoadOceanScene />
                  </Suspense> */}
                    <LazyLoadOceanScene />
                  </div>
                  {/* </AnimatePresence> */}
                  {/* {prefersReducedMotion && <VisualFallback />} */}
                </div>
              </div>
            </div>
          </section>

          <section
            id="search"
            className="mx-auto max-w-160 md:max-w-7xl px-4 sm:px-6"
          >
            <div className="rounded-3xl border border-border/50 bg-highlight-2 p-4 backdrop-blur md:p-6 shadow-md">
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:w-2/3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    aria-label="Search for a beach"
                    className="h-12 w-full rounded-xl border border-border/50 bg-background/60 pl-10 pr-4 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    placeholder="Search beaches…"
                    // value={query}
                    // onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 md:w-1/3 md:justify-end">
                  {[
                    { label: "Sandy", value: "Sandy" },
                    { label: "Bathrooms", value: "Bathrooms" },
                    { label: "Fishing", value: "Fishing" },
                  ].map((chip) => (
                    <button
                      key={chip.value}
                      // onClick={() =>
                      //   setQuery((q) =>
                      //     q.includes(chip.value) ? q : `${q} ${chip.value}`.trim()
                      //   )
                      // }
                      className="rounded-full border border-border/10 bg-muted-foreground/20 px-3 py-1 text-sm text-foreground/80 transition hover:bg-foreground/10"
                    >
                      {chip.label}
                    </button>
                  ))}
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
                        href={`#beach-${b.id}`}
                        className="text-cyan-300 hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Badge icon={Zap}>Realtime swell + wind</Badge>
              <Badge icon={ShieldCheck}>Verified buoy sources</Badge>
              <Badge icon={Trophy}>Crowd-rated breaks</Badge>
            </div>
          </section>
        </div>

        <section
          id="nearby"
          className="@container mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10"
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
        </section>

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

        <section id="why" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
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
        </section>
      </main>
      <Footer />
    </div>
  );
};

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-1 mb-6 flex items-start gap-3">
      <div className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-foreground/70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-border/50 bg-foreground/5 p-10 text-center text-foreground/70">
      <Heart className="mb-2 h-6 w-6" />
      Save a beach to find it fast later.
    </div>
  );
}

function WhyItem({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-white/5 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-cyan-500/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-foreground/70">{children}</p>
    </div>
  );
}

export default Home;
