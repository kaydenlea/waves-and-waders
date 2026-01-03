import type { MetadataRoute } from "next";
import { fetchAllBeaches, generateBeachUrl } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/beaches`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const beaches = await fetchAllBeaches();
  const beachRoutes = beaches.map((beach) => ({
    url: `${base}${generateBeachUrl(beach.Name, beach.id)}/overview`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...beachRoutes];
}
