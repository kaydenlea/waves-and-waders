import Link from "next/link";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import { LazyLoadForecastSurf } from "@/components/general/LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadForecastWaveEnergy } from "@/components/general/LazyLoad/LazyLoadForecastWaveEnergy";
import { LazyLoadForecastWind } from "@/components/general/LazyLoad/LazyLoadForecastWind";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";

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
    <div id="content" className="@container p-2 scroll-mt-30">
      <header className="relative w-full flex flex-col gap-6 px-2">
        <PageTabs
          defaultPage="forecast"
          beach={beach}
          tabs={["overview", "forecast"]}
        />
        <h1 className="font-semibold text-4xl tracking-tight">{beachName}</h1>
      </header>
      <section className="flex flex-col gap-4 mb-2">
        <section>
          <h2 className="ml-2 text-muted-foreground text-lg">
            Weekly Forecast
          </h2>
          <LazyLoadDatePicker beachId={beachId} className="rounded-b-xl mt-4 mb-4" />
        </section>
        <section id="forecast-content" className="scroll-mt-25">
          <header className="mx-2 flex gap-12 justify-between">
            <div>
              <h2 className="leading-none font-semibold text-2xl">
                Mon, Aug 14 - Sun, Aug 20
              </h2>
              <span className="text-sm text-muted-foreground">
                Local time: 8:30 PM, PDT
              </span>
            </div>
            <Link
              href={`/${beach}/forecast/edit#forecast-content`}
              className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            >
              <Pencil size={16} />
              Edit
            </Link>
          </header>
        </section>
        <VisualWrapper label="Tide" unit="ft">
          <LazyLoadForecastTide beachId={beachId} />
        </VisualWrapper>
        <VisualWrapper label="Surf" unit="ft">
          <LazyLoadForecastSurf beachId={beachId} />
        </VisualWrapper>
        <VisualWrapper label="Wind" unit="mph">
          <LazyLoadForecastWind beachId={beachId} />
        </VisualWrapper>
        <VisualWrapper label="Wave Energy" unit="kJ">
          <LazyLoadForecastWaveEnergy beachId={beachId} />
        </VisualWrapper>
        <VisualWrapper label="Hourly Stats">
          <LazyLoadTable beachId={beachId} numHours={3} numDays={7} header />
        </VisualWrapper>
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
  );
};

export default Page;
