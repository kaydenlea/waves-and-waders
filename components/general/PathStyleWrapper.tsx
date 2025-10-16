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

  const cls = useMemo(() => {
    if (beachPage) {
      return "w-full @min-4xl:w-100 @min-7xl:w-170";
    }
    return "@min-4xl:flex-1 max-w-320";
  }, [beachPage]);

  return (
    <article
      id="content"
      className={cn(
        "touch-pan-y bg-background-2 w-full px-2 relative pt-10 @min-4xl:pt-4 z-1 rounded-t-none @min-4xl:rounded-t-none border border-border @min-4xl:border-none mx-auto",
        cls
      )}
    >
      {children}
    </article>
  );
}
