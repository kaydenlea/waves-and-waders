import Link from "next/link";
import {
  Compass,
  Heart,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import type React from "react";

import type { Beach } from "@/components/general/BeachCard";
import { SunDataProvider } from "@/components/context/SunDataContext";
import HeroVisualDeck from "@/components/marketing/HeroVisualDeck";
import type { ForecastData } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const noiseSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity=".35"/>
  </svg>
`);

const heroNoiseUrl = `data:image/svg+xml,${noiseSvg}`;

const previewForecast: ForecastData = {
  timestamp: new Date().toISOString(),
  swell: {
    primary: { height: 4.5, period: 12, direction: 292 },
    secondary: { height: 2.5, period: 9, direction: 248 },
    tertiary: { height: 1.5, period: 7, direction: 210 },
  },
  surf: { heightMin: 3, heightMax: 6, waveEnergy: 62 },
  conditions: {
    waterTemp: 58,
    tideLevel: 1.8,
    windSpeed: 7,
    windGust: 11,
    windDirection: 308,
    airTemp: 62,
    pressure: 30.02,
    weather: 1,
  },
};

const previewBeach: Beach = {
  id: "03e3944c-7828-4e97-bf8f-f2488c93ceb2",
  name: "Ocean Beach",
  region: "San Francisco, CA",
  coords: [37.7599, -122.51],
  image: "",
  conditions: {
    surf: "3–6",
    wind: "7",
    windDir: 308,
    temp: 58,
    rating: 4,
  },
  current: previewForecast,
  features: [],
};

const Badge = ({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-sm text-foreground/90 shadow-sm",
      "supports-[backdrop-filter]:bg-background/45 supports-[backdrop-filter]:backdrop-blur-md",
      className
    )}
  >
    {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    {children}
  </span>
);

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden min-h-[100svh]">
      <div aria-hidden className="absolute inset-0 [contain:paint]">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-2 to-background" />

        <div className="absolute -top-56 left-1/2 h-[720px] w-[1220px] -translate-x-1/2 rounded-full bg-cyan-500/14 blur-3xl ww-hero-blob-1" />
        <div className="absolute -bottom-72 -left-44 h-[760px] w-[760px] rounded-full bg-indigo-500/12 blur-3xl ww-hero-blob-2" />
        <div className="absolute -bottom-64 -right-44 h-[760px] w-[760px] rounded-full bg-sky-500/12 blur-3xl ww-hero-blob-3" />

        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_0%,rgba(34,211,238,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_15%_20%,rgba(99,102,241,0.14),transparent_60%)]" />

        <div
          className="ww-hero-noise absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url('${heroNoiseUrl}')` }}
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-26 pb-0 sm:pt-30 sm:pb-20">
        <div className="grid grid-cols-1 items-center lg:gap-12 lg:grid-cols-2">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-center">
            <div
              className="ww-hero-reveal motion-reduce:animate-none"
              style={{ animationDelay: "80ms" }}
            >
              <Badge icon={Sparkles}>All-in-one forecasts</Badge>
            </div>

            <h1
              id="hero-title"
              className="mt-5 text-balance text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl"
            >
              <span
                className="ww-hero-reveal motion-reduce:animate-none block"
                style={{ animationDelay: "140ms" }}
              >
                Know the ocean
              </span>
              <span
                className="ww-hero-reveal motion-reduce:animate-none block pb-2 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent"
                style={{ animationDelay: "200ms" }}
              >
                before you go
              </span>
            </h1>

            <p
              className="mt-4 max-w-md mx-auto text-pretty text-base text-muted-foreground sm:text-lg ww-hero-reveal motion-reduce:animate-none"
              style={{ animationDelay: "260ms" }}
            >
              Live surf conditions. Easy search. Personalized forecast.
            </p>

            <div
              className="mt-7 mx-4 flex flex-wrap items-center justify-center gap-3 lg:justify-center ww-hero-reveal motion-reduce:animate-none"
              style={{ animationDelay: "320ms" }}
            >
              <Link
                href="/beaches?tab=nearby"
                className={cn(
                  "min-w-50 justify-center group inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2.5 font-medium",
                  "bg-foreground text-background shadow-xl transition",
                  "hover:shadow-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                )}
              >
                <Compass className="h-5 w-5" aria-hidden="true" />
                Explore beaches
              </Link>
              <Link
                href="/beaches?tab=saved"
                className={cn(
                  "min-w-50 justify-center inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-3 font-medium",
                  "bg-background/60 text-foreground shadow-sm transition",
                  "supports-[backdrop-filter]:bg-background/45 supports-[backdrop-filter]:backdrop-blur-md",
                  "hover:bg-highlight-6/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
                )}
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
                Saved spots
              </Link>
            </div>
          </div>

          <div
            className="mx-auto w-full max-w-[480px] lg:mx-0 ww-hero-reveal motion-reduce:animate-none"
            style={{ animationDelay: "380ms" }}
          >
            <SunDataProvider>
              <HeroVisualDeck
                previewBeach={previewBeach}
                previewForecast={previewForecast}
              />
            </SunDataProvider>
          </div>
        </div>
      </div>
    </section>
  );
}
