"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function PathStyleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const beachPage = pathname.endsWith("/beaches");
  const editPage = pathname.endsWith("/edit");

  const cls = useMemo(() => {
    if (beachPage) {
      return "w-full @min-4xl:w-90 @min-[1400px]:min-w-180";
    }
    return "@min-4xl:flex-1 max-w-320 @min-[1450px]:min-w-210 @min-[1700px]:min-w-265";
  }, [beachPage]);

  return (
    <>
      <div className={editPage ? "h-0" : "h-[100vh] @min-4xl:h-0"} />
      <article
        id="content"
        className={cn(
          "relative touch-pan-y w-full px-2 relative @min-4xl:pt-4 z-1 bg-background border-t border-x border-border/70 @min-4xl:border-none mx-auto",
          cls,
          !editPage ? "rounded-t-4xl @min-4xl:rounded-t-none pt-10" : "pt-10"
        )}
      >
        {!editPage && (
          <div className="block @min-4xl:hidden absolute top-5 left-1/2 transform -translate-x-1/2 h-2 w-20 bg-muted-foreground/50 rounded-full" />
        )}
        {children}
      </article>
    </>
  );
}
