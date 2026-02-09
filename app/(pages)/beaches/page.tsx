import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import NearbyBeaches from "@/components/beaches/NearbyBeaches";
import { getServerSupabase } from "@/lib/supabaseServer";
import BottomNav from "@/components/general/BottomNav";
import NavBar from "@/components/general/NavBar";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import Footer from "@/components/general/Footer";
import FavoriteIdsHydrator from "@/components/general/FavoriteIdsHydrator";
import PersistBeachesReturn from "@/components/general/PersistBeachesReturn";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { List } from "lucide-react";

const beachesTitle = "Find surf spots and beaches near you";
const beachesDescription =
  "Search California beaches by location and amenities. Find surf spots with bathrooms, parking, showers, lifeguards, and more.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string | string[];
    page?: string | string[];
    search?: string | string[];
  }>;
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const tabValue = resolvedSearchParams?.tab;
  const pageValue = resolvedSearchParams?.page;
  const searchValue = resolvedSearchParams?.search;
  const tab = (Array.isArray(tabValue) ? tabValue[0] : tabValue) ?? null;
  const page = (Array.isArray(pageValue) ? pageValue[0] : pageValue) ?? null;
  const search =
    (Array.isArray(searchValue) ? searchValue[0] : searchValue) ?? null;
  const isDefaultTab = tab === null || tab === "" || tab === "nearby";
  const isDefaultPage = page === null || page === "" || page === "1";
  const isIndexable = isDefaultTab && isDefaultPage && !search;
  const robots = isIndexable ? undefined : { index: false, follow: true };

  return {
    ...buildPageMetadata({
      title: beachesTitle,
      description: beachesDescription,
      canonicalPath: "/beaches",
      ...(robots ? { robots } : {}),
    }),
    keywords: [
      "California beaches",
      "surf spots California",
      "beaches near me",
      "beach finder",
      "surf map",
      "beach amenities",
      "Orange County beaches",
      "San Diego beaches",
      "Los Angeles beaches",
    ],
  };
}

export const revalidate = 300; // Revalidate every 5 minutes

export default async function BeachesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[]; page?: string | string[] }>;
}) {
  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to load user", userError);
  }

  const user = userData.user ?? null;
  const resolvedSearchParams = await searchParams;
  const tabValue = resolvedSearchParams?.tab;
  const tab = (Array.isArray(tabValue) ? tabValue[0] : tabValue) ?? undefined;

  if (!user && tab === "saved") {
    const next = "/beaches?tab=saved";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

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
        className="ww-stable-viewport touch-pan-y overscroll-y-none bg-background-2 min-h-[calc(var(--ww-100vh,100vh)+env(safe-area-inset-top,0px)-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4 @min-4xl:pr-3"
      >
        <LazyLoadMap loggedIn={Boolean(user)} />
        <PathStyleWrapper>
          <div className="@container/beaches pb-4 px-2 pt-0 @min-4xl:pt-8 touch-pan-y">
            <PersistBeachesReturn />
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
                id="beaches-header"
                className="ml-2 mb-2 @min-4xl/main:mb-4 scroll-mt-30"
              >
                <h1 className="font-semibold text-xl @min-4xl/main:text-3xl tracking-tight -mb-1 @min-4xl/main:mb-0">
                  Surf spots
                </h1>
                <span className="text-xs @min-4xl/main:text-sm text-muted-foreground">
                  Explore nearby beaches on the map
                </span>
                <div className="mt-2">
                  <Link
                    href="/beaches/all"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/75 underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                    All spots directory
                  </Link>
                </div>
              </header>
            </div>
            <NearbyBeaches />

            <section className="mt-10 px-2">
              <details className="rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground shadow-xs">
                <summary className="cursor-pointer font-semibold text-foreground/85">
                  About beach search and filters
                </summary>
                <div className="mt-3 space-y-3 leading-relaxed">
                  <p>
                    Browse beaches across California and filter by amenities
                    like bathrooms, parking, showers, lifeguards, and more. Each
                    spot includes surf forecast charts, tides, and a quick
                    summary to help you plan.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tip: Use the map to explore nearby spots, then open a beach
                    page for a full surf forecast.
                  </p>
                </div>
              </details>
            </section>

            <section className="mt-4 px-2">
              <details className="rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground shadow-xs">
                <summary className="cursor-pointer font-semibold text-foreground/85">
                  Prefer a simple directory?
                </summary>
                <p className="mt-3 leading-relaxed">
                  Use the map for nearby discovery, or browse a full list on{" "}
                  <a
                    className="underline underline-offset-4 hover:text-foreground"
                    href="/beaches/all"
                  >
                    All surf spots
                  </a>
                  .
                </p>
              </details>
            </section>

            {/* Mobile bottom-sheet scroll: keep footer reachable inside the sheet. */}
            <div className="min-[912px]:hidden mt-10">
              <Footer />
            </div>
          </div>
        </PathStyleWrapper>
      </main>
      <BottomNav />
      <Footer className="max-[911px]:hidden" />
    </>
  );
}
