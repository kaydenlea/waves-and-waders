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
        "animate-pulse h-34 @min-3xl:h-31 w-full bg-highlight-4 px-2 py-3 rounded-t-xl shadow-even",
        forecastPage && "rounded-x-xl rounded-b-xl"
      )}
    />
  );
};

// Re-export with props passthrough so callers can pass beachId
export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => <Loading />,
});
