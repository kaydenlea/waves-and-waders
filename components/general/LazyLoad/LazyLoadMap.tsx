"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Loading = () => {
  const pathName = usePathname();
  return (
    <div
      className={cn(
        "flex-1 pl-3 pt-3",
        !pathName.endsWith("/beaches") && "max-w-200"
      )}
    >
      Loading...
    </div>
  );
};

export const LazyLoadMap = dynamic(
  () => import("../../visuals/InteractiveMap"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);
