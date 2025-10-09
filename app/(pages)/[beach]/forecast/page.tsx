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
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Surf Weekly Forecast | Waves and Waders",
  description: "Check the weekly surf conditions of your local beaches",
};

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;

  // Resolve the beach param (could be UUID, slug, or beach name)
  const resolved = await fetchBeachByIdLoose(beach);

  if (!resolved) {
    console.error(`Failed to resolve beach: ${beach}`);
    redirect("/beaches");
  }

  const beachId = resolved.id.toString();
  const beachName = resolved.Name;
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
      </div>
    </>
  );
};

export default Page;
