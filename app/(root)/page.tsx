import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";
import Hero from "@/components/marketing/Hero";

import { Sparkles, Pencil } from "lucide-react";
import { LazyLoadCardsSection } from "@/components/general/LazyLoad/LazyLoadCardsSection";
import { LazyLoadSpotlightCard } from "@/components/general/LazyLoad/LazyLoadSpotlightCard";
import { Description } from "@/components/visuals/AnimatedCardsSection";
import AnimatedCountSection from "@/components/visuals/AnimatedCountSection";
import FaqSection from "@/components/visuals/FaqSection";
import PersonalizeForecastsSection from "@/components/marketing/PersonalizeForecastsSection";
import AllEssentialsCardsSection from "@/components/marketing/AllEssentialsCardsSection";
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
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Waves and Waders surf forecasts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surf forecasts, maps, and beach features",
    description:
      "Live surf conditions, beach maps, and feature-rich spot guides for coastal breaks.",
    images: ["/twitter-image"],
  },
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 3600; // Revalidate every hour

const Home = () => {
  const baseUrl = getSiteUrl();

  return (
    <div className="touch-pan-y">
      <main className="ww-disable-backdrop relative min-h-screen bg-background text-foreground selection:bg-cyan-300/40">
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
        </div>
        <AllEssentialsCardsSection />
        <AnimatedCountSection />
        <PersonalizeForecastsSection />
        <section
          id="forecast"
          data-ww-section
          data-inview="false"
          className="ww-section relative mx-auto w-full max-w-7xl px-4 sm:px-6 py-16 sm:py-20 overflow-hidden scroll-mt-28"
        >
          <InViewOnce
            rootAttr="data-ww-section"
            rootMargin="0px 0px -15% 0px"
            threshold={0}
          />
          <div
            className="ww-reveal grid grid-cols-1 items-start justify-items-center gap-10 2xl:grid-cols-12 2xl:justify-items-stretch 2xl:gap-12"
            style={{ "--delay": "60ms" } as React.CSSProperties}
          >
            <div className="w-full max-w-xl 2xl:col-span-5 2xl:max-w-none order-1 2xl:order-2">
              <Description />
            </div>
            <div className="w-full max-w-[40rem] 2xl:col-span-7 2xl:max-w-none order-2 2xl:order-1 min-w-0">
              <LazyLoadCardsSection />
            </div>
          </div>
        </section>
        {/* <DonateInlineCallout className="pb-16 sm:pb-20" /> */}
        <DonateSection />
        {/* <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
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
                  Get ahead and access 7 day forecasts of your favorite local
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
        <FaqSection />
      </main>
    </div>
  );
};

export default Home;
