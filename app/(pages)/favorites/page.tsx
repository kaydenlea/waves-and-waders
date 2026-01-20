import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Favorites",
  description: "Your saved beaches.",
  canonicalPath: "/beaches",
  robots: { index: false, follow: false },
});

export default async function FavoritesPage() {
  redirect("/beaches?tab=saved");
}
