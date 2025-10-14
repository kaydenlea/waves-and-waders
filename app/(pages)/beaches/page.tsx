import type { Metadata } from "next";
import PageTabs from "@/components/general/PageTabs";
import NearbyBeaches from "@/components/beaches/NearbyBeaches";
import { fetchAllBeaches } from "@/lib/supabase";
import BackToMapButton from "@/components/general/BackToMapButton";
import { getServerSupabase } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Search surf spots | Waves and Waders",
  description: "Find your local surf spots and beaches",
};

export default async function BeachesPage() {
  const beaches = await fetchAllBeaches();

  const supabase = await getServerSupabase();
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Failed to load session", sessionError);
  }

  const user = sessionData.session?.user ?? null;
  let favoriteIds: string[] = [];

  if (user) {
    const { data } = await supabase
      .from("user_favorite_beaches")
      .select("beach_id")
      .eq("user_id", user.id);
    favoriteIds = (data ?? []).map((row) => String(row.beach_id));
  }

  return (
    <>
      <div className="@container p-2 touch-pan-y">
        <div className="relative w-full flex flex-col gap-6">
          <PageTabs
            buttons={false}
            tabs={["nearby", "saved"]}
            defaultPage="nearby"
          />
          <header id="content" className="ml-2 mb-4 scroll-mt-30">
            <h1 className="font-semibold text-3xl tracking-tight">
              Surf spots
            </h1>
            <span className="text-muted-foreground">
              Explore nearby beaches on the map
            </span>
          </header>
        </div>
        <NearbyBeaches beaches={beaches as any} favoriteIds={favoriteIds} />
      </div>
      <BackToMapButton />
    </>
  );
}
