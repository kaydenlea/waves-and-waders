import ForecastBridge from "@/components/general/ForecastBridge";

import type { Metadata } from "next";
import PageTabs from "@/components/general/PageTabs";
import { fetchBeachByIdLoose, extractBeachId } from "@/lib/supabase";
import { ForecastChartProvider } from "@/components/context/ForecastChartContext";
import { redirect } from "next/navigation";
import BackToMapButton from "@/components/general/BackToMapButton";
import { getServerSupabase } from "@/lib/supabaseServer";

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

  const supabase = await getServerSupabase();
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Failed to load session", sessionError);
  }
  const user = sessionData.session?.user ?? null;

  let isFav = false;
  if (user) {
    const { data: favorite } = await supabase
      .from("user_favorite_beaches")
      .select("beach_id")
      .eq("user_id", user.id)
      .eq("beach_id", beachId)
      .maybeSingle();
    isFav = Boolean(favorite);
  }

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
            beachId={beachId}
            isFavorite={isFav}
          />
          <h1 className="font-semibold text-4xl tracking-tight w-full @min-3xl:w-[calc(100%-300px)]">
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
