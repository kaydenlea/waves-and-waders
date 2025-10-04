import Link from "next/link";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadForecastSurf } from "@/components/general/LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadForecastWaveEnergy } from "@/components/general/LazyLoad/LazyLoadForecastWaveEnergy";
import { LazyLoadForecastWind } from "@/components/general/LazyLoad/LazyLoadForecastWind";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import ForecastBridge from "@/components/general/ForecastBridge";

import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import PageTabs from "@/components/general/PageTabs";
import { fetchBeachByIdLoose } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Surf Weekly Forecast | Waves and Waders",
  description: "Check the weekly surf conditions of your local beaches",
};

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;
  const resolved = await fetchBeachByIdLoose(beach);
  const beachId = (resolved?.id ?? beach).toString();
  const beachName = resolved?.Name ?? beach;
  return (
    <>
      <div className="block @min-3xl:hidden flex justify-center pt-5 pb-7">
        <div className="bg-gray-300 w-16 h-1.5 rounded-full" />
      </div>
      <div className="@container p-2">
        <header
          id="content"
          className="relative w-full flex flex-col gap-6 px-2 scroll-mt-30"
        >
          <PageTabs
            defaultPage="forecast"
            beach={beach}
            tabs={["overview", "forecast"]}
          />
          <h1 className="font-semibold text-4xl tracking-tight">
            Huntington Beach
          </h1>
        </header>
        <ForecastBridge beachId={beachId} />
        <section className="flex flex-col gap-4 mb-2">
          <VisualWrapper label="Wave Energy" unit="kJ">
            <LazyLoadForecastWaveEnergy beachId={beachId} />
          </VisualWrapper>
          <div className="flex flex-col @min-3xl:flex-row gap-3">
            <VisualWrapper label="Surf" unit="ft">
              <LazyLoadForecastSurf beachId={beachId} />
            </VisualWrapper>
            <VisualWrapper label="Wind" unit="mph">
              <LazyLoadForecastWind beachId={beachId} />
            </VisualWrapper>
          </div>
          {/* <figure className="relative h-full bg-highlight-4 border border-border/40 p-2 rounded-2xl shadow-sm">
          <header className="mx-3 mt-3 mb-2">
            <h3 className="leading-none font-semibold">Weekly Statistics</h3>
            <span className="text-muted-foreground text-sm">
              Hourly stats for the week
            </span>
          </header>
          <header className="absolute top-0 left-0 rounded-t-2xl flex gap-1 items-center p-5 bg-highlight-5 w-full shadow-md">
            <h3 className="leading-none font-semibold text-xl">Hourly Stats</h3>
          </header>
          <div className="mt-1">
            <LazyLoadTable numHours={3} numDays={7} header />
          </div>
        </figure> */}
        </section>
      </div>
    </>
  );
};

export default Page;
