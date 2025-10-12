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
import { fetchBeachByIdLoose, extractBeachId } from "@/lib/supabase";
import { ForecastChartProvider } from "@/components/context/ForecastChartContext";
import { redirect } from "next/navigation";
import BackToMapButton from "@/components/general/BackToMapButton";

export const metadata: Metadata = {
  title: "Surf Weekly Forecast | Waves and Waders",
  description: "Check the weekly surf conditions of your local beaches",
};

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;

  // Extract beach ID from param (supports "beach-slug/123" or just "123")
  const beachIdOrSlug = extractBeachId(beach);

  // Resolve the beach param (could be UUID, slug, or beach name)
  const resolved = await fetchBeachByIdLoose(beachIdOrSlug);

  if (!resolved) {
    console.error(`Failed to resolve beach: ${beach}`);
    redirect("/beaches");
  }

  const beachId = resolved.id.toString();
  const beachName = resolved.Name;
  return (
    <>
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
          <h1 className="font-semibold text-4xl tracking-tight w-full @min-4xl:max-w-3/5">
            {beachName}
          </h1>
        </header>
        <ForecastChartProvider>
          <ForecastBridge beachId={beachId} />
        </ForecastChartProvider>
      </div>
      <BackToMapButton />
    </>
  );
};

export default Page;
