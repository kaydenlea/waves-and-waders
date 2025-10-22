"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Loading = () => {
  const pathName = usePathname() ?? "";
  const forecastPage = pathName.endsWith("/forecast");
  return (
    <div
      className={cn(
        "animate-pulse w-full bg-highlight-4 px-2 py-10.5 rounded-full shadow-even border border-border"
      )}
    />
  );
};

// Re-export with props passthrough so callers can pass beachId
export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => <Loading />,
});
