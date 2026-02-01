import { permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  FEATURE_COLUMNS,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  extractBeachId,
  generateBeachUrl,
  getFeatureDisplayName,
} from "@/lib/supabase";
import { getServerSupabase } from "@/lib/supabaseServer";
import OverviewPageClient from "./OverviewPageClient";
import BreadcrumbsJsonLd from "@/components/general/BreadcrumbsJsonLd";
import { computeBeachStatsSnapshot } from "@/lib/beachStats";
import { extractDailySurfWindStats } from "@/lib/beachStatsShared";
import {
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  type WidgetMeta,
  type Row,
  type WidgetId,
} from "@/components/general/dashboardLayout";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/seo";
import NavBar from "@/components/general/NavBar";

const buildFeatureList = (source: Record<string, unknown> | null) => {
  if (!source) return [];
  return FEATURE_COLUMNS.filter(
    (key) => key !== "RSTRCTNS" && Boolean(source[key])
  )
    .map((key) => getFeatureDisplayName(key))
    .filter((label) => Boolean(label));
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ beach: string }>;
}): Promise<Metadata> {
  const { beach } = await params;
  if (!beach || beach === "beach") {
    return {
      title: "Surf forecast",
      description:
        "Check the daily and hourly surf conditions of your local beaches.",
      robots: { index: false, follow: false },
    };
  }

  const beachIdOrSlug = extractBeachId(beach);
  const resolved = await fetchBeachByIdLoose(beachIdOrSlug);
  if (!resolved) {
    return {
      title: "Beach not found",
      description: "The requested beach could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const details = await fetchBeachDetails(String(resolved.id));
  const features = buildFeatureList(details as Record<string, unknown> | null);
  const featureSnippet = features.length
    ? ` Features: ${features.slice(0, 6).join(", ")}.`
    : "";

  const title = `${resolved.Name} surf forecast | ${resolved.COUNTY}`;
  const description = `Surf forecast and conditions for ${resolved.Name} in ${resolved.COUNTY}.${featureSnippet} Check real-time wave height, swell direction, and tide charts.`;
  const canonicalPath = `${generateBeachUrl(resolved.Name, resolved.id)}/overview`;
  const imagePath = `/beach_pictures/${resolved.id}.png`;

  // Build location-specific keywords with features
  const locationKeywords = [
    `${resolved.Name} surf`,
    `${resolved.Name} surf forecast`,
    `${resolved.Name} beach`,
    `${resolved.COUNTY} beaches`,
    `${resolved.COUNTY} surf spots`,
    `beaches in ${resolved.COUNTY}`,
    `surf forecast ${resolved.COUNTY}`,
  ];

  // Add feature-specific keywords for better discoverability
  const featureKeywords = features.flatMap((feature) => [
    `${resolved.COUNTY} beaches with ${feature.toLowerCase()}`,
    `${resolved.Name} ${feature.toLowerCase()}`,
  ]);

  const keywords = [
    ...locationKeywords,
    "surf conditions",
    "wave forecast",
    "swell forecast",
    "tide chart",
    "surf report",
    ...features.slice(0, 5),
    ...featureKeywords.slice(0, 10), // Limit feature keywords
  ].filter(Boolean);

  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 28);

  return {
    title,
    description,
    keywords: uniqueKeywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      images: [
        {
          url: toAbsoluteUrl(imagePath),
          alt: `${resolved.Name} beach map preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [toAbsoluteUrl(imagePath)],
    },
  };
}

const Page = async ({
  params,
}: {
  params: Promise<{ beach: string }>;
}) => {
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
  const canonicalParam = generateBeachUrl(resolved.Name, resolved.id).replace(
    /^\//,
    ""
  );

  if (beach !== canonicalParam) {
    permanentRedirect(`/${canonicalParam}/overview`);
  }

  const beachDetails = await fetchBeachDetails(beachId);
  const featureLabels = buildFeatureList(
    beachDetails as Record<string, unknown> | null
  );
  const initialBeach = (() => {
    const readLooseField = (key: string): unknown => {
      if (!Object.prototype.hasOwnProperty.call(resolved, key))
        return undefined;
      return (resolved as unknown as Record<string, unknown>)[key];
    };

    const latitudeRaw = resolved.LATITUDE ?? readLooseField("latitude") ?? null;
    const longitudeRaw =
      resolved.LONGITUDE ?? readLooseField("longitude") ?? null;

    const latitude =
      typeof latitudeRaw === "number"
        ? latitudeRaw
        : typeof latitudeRaw === "string"
        ? Number(latitudeRaw)
        : Number.NaN;
    const longitude =
      typeof longitudeRaw === "number"
        ? longitudeRaw
        : typeof longitudeRaw === "string"
        ? Number(longitudeRaw)
        : Number.NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const countyRaw = resolved.COUNTY ?? readLooseField("county");
    const county = typeof countyRaw === "string" ? countyRaw : "";

    return {
      id: beachId,
      name: beachName,
      county,
      latitude,
      longitude,
      features: resolved.features ?? undefined,
    };
  })();

  const supabase = await getServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Failed to load user", userError);
  }
  const user = userData.user ?? null;

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

  let initialOverviewMeta: Partial<Record<WidgetId, WidgetMeta>> | null = null;
  let initialOverviewRows: Row[] | null = null;
  let initialForecastMeta: Partial<Record<WidgetId, WidgetMeta>> | null = null;
  let initialForecastRows: Row[] | null = null;

  if (user) {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from("user_dashboard_settings")
        .select("overview_meta, overview_rows, forecast_meta, forecast_rows")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!settingsError && settings) {
        const overviewMeta = normalizeMeta("overview", settings.overview_meta);
        const overviewRows = normalizeRows(
          "overview",
          settings.overview_rows,
          overviewMeta
        );
        initialOverviewMeta = overviewMeta;
        initialOverviewRows = overviewRows;

        const forecastMeta = normalizeMeta("forecast", settings.forecast_meta);
        const forecastRows = normalizeRows(
          "forecast",
          settings.forecast_rows,
          forecastMeta
        );
        initialForecastMeta = forecastMeta;
        initialForecastRows = forecastRows;
      }
    } catch (err) {
      console.warn("Failed to load initial overview layout on server", err);
    }
  }

  // Always provide a concrete initial layout (default) so the page has
  // a stable structure on first paint, even when signed out.
  if (!initialOverviewMeta || !initialOverviewRows) {
    const fallback = getDefaultLayout("overview");
    initialOverviewMeta = fallback.meta;
    initialOverviewRows = fallback.rows;
  }

  if (!initialForecastMeta || !initialForecastRows) {
    const fallback = getDefaultLayout("forecast");
    initialForecastMeta = fallback.meta;
    initialForecastRows = fallback.rows;
  }

  const canonicalPath = `${generateBeachUrl(beachName, beachId)}/overview`;
  const baseUrl = getSiteUrl();
  const statsSnapshot = await computeBeachStatsSnapshot(beachId).catch(
    () => null
  );
  const dailySurfWind = extractDailySurfWindStats(statsSnapshot);
  const seoUpdatedAtIso = statsSnapshot?.current?.timestamp ?? null;
  const waterTemp = (() => {
    const tempStat = statsSnapshot?.summary.find(
      (stat) => stat.type === "temperature"
    );
    return tempStat?.type === "temperature" &&
      typeof tempStat.waterTemp === "number"
      ? Math.round(tempStat.waterTemp)
      : null;
  })();

  const seoSummary = {
    updatedAt: seoUpdatedAtIso,
    surfHeight: dailySurfWind.surfHeight,
    windSpeed:
      typeof dailySurfWind.windSpeed === "number"
        ? Math.round(dailySurfWind.windSpeed)
        : null,
    windDirection:
      typeof dailySurfWind.windDirection === "number"
        ? Math.round(dailySurfWind.windDirection)
        : null,
    waterTemp,
    county: resolved.COUNTY ?? null,
    features: featureLabels,
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Place", "Beach"],
    name: beachName,
    description: `Surf forecast and conditions for ${beachName}${
      resolved.COUNTY ? ` in ${resolved.COUNTY}` : ""
    }.`,
    url: `${baseUrl}${canonicalPath}`,
    geo:
      initialBeach && Number.isFinite(initialBeach.latitude)
        ? {
            "@type": "GeoCoordinates",
            latitude: initialBeach.latitude,
            longitude: initialBeach.longitude,
          }
        : undefined,
    address: resolved.COUNTY
      ? {
          "@type": "PostalAddress",
          addressRegion: resolved.COUNTY,
          addressCountry: "US",
        }
      : undefined,
    image: toAbsoluteUrl(`/beach_pictures/${beachId}.png`),
    amenityFeature: featureLabels.length
      ? featureLabels.map((label) => ({
          "@type": "LocationFeatureSpecification",
          name: label,
          value: true,
        }))
      : undefined,
  };

  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { label: "Beaches", href: "/beaches" },
          { label: beachName, href: `/${canonicalParam}/overview` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <OverviewPageClient
        beachId={beachId}
        beachParam={canonicalParam}
        beachName={beachName}
        loggedIn={Boolean(user)}
        isFavorite={isFav}
        navBar={<NavBar />}
        initialBeach={initialBeach}
        initialOverviewMeta={initialOverviewMeta}
        initialOverviewRows={initialOverviewRows}
        initialForecastMeta={initialForecastMeta}
        initialForecastRows={initialForecastRows}
        seoSummary={seoSummary}
      />
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
