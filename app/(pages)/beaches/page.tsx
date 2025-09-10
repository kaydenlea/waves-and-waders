import type { Metadata } from "next";
import PageTabs from "@/components/general/PageTabs";
import NearbyBeaches from "@/components/beaches/NearbyBeaches";
import { fetchAllBeaches } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Search surf spots | Waves and Waders",
  description: "Find your local surf spots and beaches",
};

export default async function BeachesPage() {
  const beaches = await fetchAllBeaches();
  return (
    <div id="content" className="@container p-2 scroll-mt-25">
      <div className="relative w-full flex flex-col gap-6">
        <PageTabs buttons={false} tabs={["nearby", "saved"]} defaultPage="nearby" />
        <header className="ml-2 mb-4">
          <h1 className="font-semibold text-3xl tracking-tight">Surf spots</h1>
          <span className="text-muted-foreground">Explore nearby beaches on the map</span>
        </header>
      </div>
      <NearbyBeaches beaches={beaches as any} />
    </div>
  );
}

