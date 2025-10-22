import type { Metadata } from "next";
import PageTabs from "@/components/general/PageTabs";
import NearbyBeaches from "@/components/beaches/NearbyBeaches";
import { fetchAllBeaches } from "@/lib/supabase";
import BackToMapButton from "@/components/general/BackToMapButton";
import { getServerSupabase } from "@/lib/supabaseServer";
import BottomNav from "@/components/general/BottomNav";
import NavBar from "@/components/general/NavBar";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import Footer from "@/components/general/Footer";

export const metadata: Metadata = {
  title: "Search surf spots | Waves and Waders",
  description: "Find your local surf spots and beaches",
};

export default async function BeachesPage() {
  const beaches = await fetchAllBeaches();

  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to load user", userError);
  }

  const user = userData.user ?? null;
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
      <NavBar beachesPage />
      <main
        id="main-content"
        className="bg-background-2 min-h-[calc(100vh-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4"
      >
        <LazyLoadMap />
        <PathStyleWrapper>
          <div className="@container px-2 py-6 touch-pan-y">
            <div className="relative w-full flex flex-col gap-6">
              <PageTabs
                buttons={false}
                tabs={["nearby", "saved"]}
                defaultPage="nearby"
                beachPage
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
        </PathStyleWrapper>
      </main>
      <BottomNav />
      <Footer />
    </>
  );
}
