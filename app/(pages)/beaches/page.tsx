import type { Metadata } from "next";
import NearbyBeaches from "@/components/beaches/NearbyBeaches";
import { getServerSupabase } from "@/lib/supabaseServer";
import BottomNav from "@/components/general/BottomNav";
import NavBar from "@/components/general/NavBar";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import Footer from "@/components/general/Footer";
import FavoriteIdsHydrator from "@/components/general/FavoriteIdsHydrator";
import { toAbsoluteUrl, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Find surf spots and beaches near you",
  description:
    "Search California beaches by location and amenities. Find surf spots with bathrooms, parking, showers, lifeguards, and more. Filter by county and features.",
  keywords: [
    "California beaches",
    "surf spots California",
    "beaches near me",
    "beach finder",
    "surf map",
    "nearby beaches",
    "beaches with bathrooms",
    "beaches with parking",
    "beaches with showers",
    "Orange County beaches",
    "San Diego beaches",
    "Los Angeles beaches",
    "beach amenities",
    "surf breaks California",
    "coastal spots",
    "beach search",
    "beaches by county",
  ],
  openGraph: {
    title: "Find surf spots and beaches near you",
    description:
      "Search California beaches by location and amenities. Find surf spots with bathrooms, parking, showers, lifeguards, and more.",
    url: "/beaches",
    images: [
      {
        url: toAbsoluteUrl("/logo.png"),
        width: 512,
        height: 512,
        alt: "Waves and Waders logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Find surf spots and beaches near you",
    description:
      "Search California beaches by location and amenities. Find surf spots with bathrooms, parking, showers, lifeguards, and more.",
    images: [toAbsoluteUrl("/logo.png")],
  },
  alternates: {
    canonical: "/beaches",
  },
};

export const revalidate = 300; // Revalidate every 5 minutes

export default async function BeachesPage() {
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

  const baseUrl = getSiteUrl();
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "California Surf Spots and Beaches",
    description:
      "Comprehensive list of California beaches with real-time surf conditions, amenities, and forecasts",
    url: `${baseUrl}/beaches`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <NavBar beachesPage />
      <main
        id="main-content"
        className="touch-pan-y bg-background-2 min-h-[calc(100vh-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4 @min-4xl:pr-3"
      >
        <LazyLoadMap loggedIn={Boolean(user)} />
        <PathStyleWrapper>
          <div className="@container/beaches pb-4 px-2 pt-0 @min-4xl:pt-8 touch-pan-y">
            <FavoriteIdsHydrator favoriteIds={favoriteIds} />
            <div className="relative w-full flex flex-col gap-6">
              {/* <PageTabs
                buttons={false}
                tabs={["nearby", "saved"]}
                defaultPage="nearby"
                beachPage
                loggedIn={Boolean(user)}
              /> */}
              <header
                id="content"
                className="ml-2 mb-2 @min-4xl/main:mb-4 scroll-mt-30"
              >
                <h1 className="font-semibold text-xl @min-4xl/main:text-3xl tracking-tight -mb-1 @min-4xl/main:mb-0">
                  Surf spots
                </h1>
                <span className="text-xs @min-4xl/main:text-sm text-muted-foreground">
                  Explore nearby beaches on the map
                </span>
              </header>
            </div>
            <NearbyBeaches />

            {/* SEO content for feature-specific searches */}
            <section className="sr-only" aria-hidden="true">
              <h2>Find California Beaches by Features and Location</h2>
              <p>
                Search beaches in Orange County, San Diego, Los Angeles, and
                other California counties. Filter by amenities including
                bathrooms, restrooms, parking, showers, lifeguards, picnic
                areas, camping, and more. Get real-time surf forecasts, wave
                heights, swell direction, wind conditions, and tide charts for
                every beach.
              </p>
              <ul>
                <li>Orange County beaches with bathrooms and parking</li>
                <li>San Diego surf spots with lifeguards</li>
                <li>Los Angeles beaches with showers</li>
                <li>Beaches near me with amenities</li>
                <li>California coastal access points</li>
                <li>Family-friendly beaches with facilities</li>
              </ul>
            </section>
          </div>
        </PathStyleWrapper>
      </main>
      <BottomNav />
      <Footer />
    </>
  );
}
