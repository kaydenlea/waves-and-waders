import Link from "next/link";
import { ArrowRight, Home, MapPin, Search } from "lucide-react";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Page not found",
  description: "This page could not be found.",
  canonicalPath: "/",
  robots: { index: false, follow: false },
});

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-3xl border border-border/40 bg-highlight-7/70 p-6 shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md sm:p-10">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            404
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Page not found.
          </h1>
          <p className="mt-3 max-w-prose text-pretty text-sm text-muted-foreground sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist, or the link has
            moved.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/beaches"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none"
            >
              <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
              Browse beaches
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-border/50 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur transition-colors hover:bg-highlight-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none"
            >
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Home
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground shadow-xs">
            <div className="flex items-start gap-3">
              <Search className="mt-0.5 h-4 w-4 text-foreground/70" aria-hidden="true" />
              <p>
                Looking for a specific spot? Use the search on the{" "}
                <Link className="underline underline-offset-4 hover:text-foreground" href="/beaches">
                  Beaches
                </Link>{" "}
                page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
