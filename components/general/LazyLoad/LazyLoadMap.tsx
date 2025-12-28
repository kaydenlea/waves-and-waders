"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { BeachPoint } from "@/components/context/MapFilterContext";

const Loading = () => {
  const readIsSmallScreen = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    const container = document.querySelector("#main-content") as HTMLElement | null;
    const measured = container?.clientWidth ?? 0;
    const width = measured > 0 ? measured : window.innerWidth;
    return width < 896;
  }, []);

  // Initialize immediately to avoid the initial 28rem -> full-height jump on refresh.
  const [smallScreen, setSmallScreen] = React.useState<boolean>(() =>
    readIsSmallScreen()
  );

  React.useEffect(() => {
    const handleResize = () => {
      setSmallScreen(readIsSmallScreen());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [readIsSmallScreen]);

  const isDesktop = !smallScreen;
  const wrapperHeight = smallScreen
    ? {
        minHeight: "calc(100svh)",
        height: "calc(100svh)",
      }
    : {
        minHeight: "28rem",
      };

  const pathName = usePathname() ?? "";
  if (pathName.endsWith("/edit")) return null;

  return (
    <aside
      id="map-container"
      className={cn(
        "fixed w-full mx-auto max-w-screen transition-all duration-300",
        "max-[895px]:min-h-[100svh] max-[895px]:h-[100svh]",
        "@min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(100vh-8rem)] flex"
      )}
      style={isDesktop ? undefined : wrapperHeight}
    >
      <div
        className="relative w-full h-full animate-pulse bg-highlight-5"
        style={{
          ...wrapperHeight,
          borderRadius: !smallScreen ? "18px" : "0px",
          boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      />
    </aside>
  );
};

type Props = {
  beachId?: string | number;
  loggedIn?: boolean;
  initialBeach?: BeachPoint | null;
};

const LeafletMap = dynamic<Props>(
  () => import("../../visuals/LeafletMap"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

export const LazyLoadMap: React.FC<Props> = (props) => {
  return <LeafletMap {...props} />;
};
