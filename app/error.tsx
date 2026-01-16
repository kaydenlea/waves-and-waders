"use client"; // Error boundaries must be Client Components

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleHelp, Home, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // React.useEffect(() => {
  //   // Log the error to an error reporting service
  //   console.error(error);
  // }, [error]);

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-3xl items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-3xl border border-border/40 bg-highlight-7/70 p-6 shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md sm:p-10">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            Error
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Something went wrong.
          </h1>
          <p className="mt-3 max-w-prose text-pretty text-sm text-muted-foreground sm:text-base">
            The page hit an unexpected issue. Try again, or navigate back to a
            safe page.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none"
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-full border border-border/50 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur transition-colors hover:bg-highlight-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Go back
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-border/50 bg-highlight-1 px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur transition-colors hover:bg-highlight-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none"
            >
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Home
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            If this keeps happening,{" "}
            <Link
              href="/contact?from=error"
              className="inline-flex items-center gap-1 font-semibold text-foreground/90 underline underline-offset-4 hover:text-foreground"
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              report the issue
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
