"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Loading = () => {
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);
  const mobileMapHeight = "calc(100dvh)";

  // 3xl - 768px

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#main-content");
      const width = container ? container.clientWidth : 0;
      if (width < 768) {
        setSmallScreen(true);
      } else {
        setSmallScreen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pathName = usePathname() ?? "";
  if (pathName.endsWith("/edit")) return;

  const isDesktop = smallScreen === false;

  return (
    // <div
    //   className={cn(
    //     "pl-3 py-3 w-full h-full @min-3xl:h-[calc(100vh-5.5rem)]",
    //     !pathName.endsWith("/beaches") && "max-w-200"
    //   )}
    // >
    //   <div
    //     className={cn(
    //       "fixed @min-3xl:sticky w-full h-full @min-3xl:h-[calc(100vh-5.5rem)] animate-pulse bg-highlight-5 rounded-2xl"
    //     )}
    //   />
    // </div>
    // <div
    //   className={cn(
    //     "fixed @min-3xl:sticky @min-3xl:flex-1 h-full w-full @min-3xl:h-[calc(100vh-7rem)] @min-3xl:mt-3 animate-pulse bg-highlight-5 @min-3xl:rounded-2xl",
    //     !pathName.endsWith("/beaches") && "max-w-200"
    //   )}
    // />
    <div
      className={cn(
        "relative w-full min-h-[calc(100dvh-6.25rem)] @min-3xl:flex-1 @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:h-[calc(100vh-5.5rem)] @min-3xl:pl-3 @min-3xl:pt-3 bg-highlight-5 animate-pulse rounded-none @min-3xl:rounded-2xl transition-all duration-300",
        !(pathName.endsWith("/beaches") || pathName.endsWith("/overview")) &&
          "@min-3xl:max-w-200"
      )}
      style={
        isDesktop
          ? undefined
          : {
              minHeight: mobileMapHeight,
              height: mobileMapHeight,
            }
      }
    />
    // <div
    //   className={cn(
    //     "relative w-full h-[320px] sm:h-[380px] @min-3xl:flex-1 @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:h-[calc(100vh-5.5rem)] @min-3xl:pl-3 @min-3xl:pt-3 bg-highlight-5 animate-pulse rounded-2xl transition-all duration-300",
    //     !(pathName.endsWith("/beaches") || pathName.endsWith("/overview")) &&
    //       "@min-3xl:max-w-200"
    //   )}
    // />
  );
};

type Props = {
  beachId?: string | number;
};

const InteractiveMap = dynamic<React.ComponentProps<any>>(
  () => import("../../visuals/InteractiveMap"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

export const LazyLoadMap: React.FC<Props> = (props) => {
  return <InteractiveMap {...props} />;
};
