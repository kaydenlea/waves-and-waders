"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useMapUI } from "../context/MapFilterContext";

export default function PathStyleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { showMap } = useMapUI();
  const beachPage = pathname.endsWith("/beaches");
  const editPage = pathname.endsWith("/edit");
  const overviewPage = pathname.includes("/overview");
  const effectiveEditPage = editPage;

  const cls = useMemo(() => {
    if (beachPage) {
      return "w-full @min-4xl:w-90 @min-[1400px]:min-w-180";
    }
    return "@min-4xl:flex-1 max-w-320 @min-[1450px]:min-w-235 @min-[1700px]:min-w-265 @min-[1850px]:min-w-300";
  }, [beachPage]);

  return (
    <>
      <div
        className={
          effectiveEditPage
            ? "h-0"
            : // Match the fixed map height on small screens to avoid scroll/viewport jumps
              // that can briefly reveal the map under the content during loading/dragging.
              "h-[100dvh] max-[911px]:h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom,0px))] @min-4xl:h-0"
        }
      />
      <article
        id="content"
        className={cn(
          "relative touch-pan-y w-full px-2 relative @min-4xl:pt-4 bg-background border-t border-x border-border/70 @min-4xl:border-none mx-auto",
          // Keep drag overlays / floating edit controls above the footer.
          effectiveEditPage ? "z-auto" : "z-30",
          cls,
          !effectiveEditPage
            ? "rounded-t-4xl @min-4xl:rounded-t-none pt-10"
            : "pt-10",
          overviewPage && "ww-disable-backdrop",
          showMap && "@min-4xl:pr-3"
        )}
      >
        {!effectiveEditPage && (
          <div className="block @min-4xl:hidden absolute top-5 left-1/2 transform -translate-x-1/2 h-2 w-20 bg-muted-foreground/50 rounded-full" />
        )}
        {children}
      </article>
    </>
  );
}
