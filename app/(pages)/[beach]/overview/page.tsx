import DateSummaryBridge from "@/components/general/DateSummaryBridge";
import PageTabs from "@/components/general/PageTabs";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchBeachByIdLoose, extractBeachId } from "@/lib/supabase";
import { getServerSupabase } from "@/lib/supabaseServer";
import BottomNav from "@/components/general/BottomNav";
import NavBar from "@/components/general/NavBar";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import Footer from "@/components/general/Footer";

export const metadata: Metadata = {
  title: "Surf Daily Forecast | Waves and Waders",
  description:
    "Check the daily and hourly surf conditions of your local beaches",
};

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;
  // If user visits /beach/overview (literal "beach"), send them to selector
  if (beach === "beach") {
    redirect("/beaches");
  }

  // Extract beach ID from param (supports "beach-slug/123" or just "123")
  const beachIdOrSlug = extractBeachId(beach);

  // Resolve the beach param (could be UUID, slug, or beach name)
  const resolved = await fetchBeachByIdLoose(beachIdOrSlug);

  if (!resolved) {
    console.error(`Failed to resolve beach: ${beach}`);
    // Redirect to beaches page if beach not found
    redirect("/beaches");
  }

  const beachId = resolved.id.toString();
  const beachName = resolved.Name;

  const supabase = await getServerSupabase();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
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
      <NavBar />
      <main
        id="main-content"
        className="bg-background-2 min-h-[calc(100vh-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4 @min-4xl:pr-3"
      >
        <LazyLoadMap />
        <PathStyleWrapper>
          <div className="@container pb-3 pt-8 px-1 @min-md:px-3">
            <header
              id="content"
              className="relative w-full flex flex-col gap-6 p-2 pb-0 scroll-mt-30"
            >
              <PageTabs
                defaultPage="overview"
                beach={beach}
                tabs={["overview", "forecast"]}
                beachId={beachId}
                isFavorite={isFav}
                overviewPage
              />
              <h1 className="font-semibold text-4xl tracking-tight w-full @min-3xl:w-[calc(100%-400px)]">
                {beachName} Summary
              </h1>
            </header>

            <DateSummaryBridge beachId={beachId} />
          </div>
        </PathStyleWrapper>
      </main>
      <BottomNav />
      <Footer />
    </>
  );
};

export default Page;

// import Highlights from "@/components/visuals/Highlights";
// import Summary from "@/components/visuals/Summary";
// import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
// import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
// import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
// import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
// import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
// import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";

// import type { Metadata } from "next";
// import TideSun from "@/components/general/Stats/TideSun";

// // export const metadata: Metadata = {
//   title: "Surf Daily Forecast | Waves and Waders",
//   description:
//     "Check the daily and hourly surf conditions of your local beaches",
// };

// import React from "react";
// import Dashboard from "@/components/general/Dashboard";

// const Page = ({ params }: { params: { beach: string } }) => {
//   // const { beach } = params;
//   return (
//     <div className="mx-auto max-w-6xl px-4">
//       <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
//           <p className="mt-1 text-sm text-gray-600">
//             Customize which widgets are visible, drag entire rows, or reorder
//             widgets inside a row.
//           </p>
//         </div>
//       </header>

//       {/* Client interactive part */}
//       <Dashboard />
//     </div>
//   );
// };

// export default Page;
