"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Loading = () => {
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);

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

  const isDesktop = smallScreen === false;
  const wrapperHeight = smallScreen
    ? {
        minHeight: "calc(100dvh)",
        height: "calc(100dvh)",
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
};

const LeafletMap = dynamic<React.ComponentProps<any>>(
  () => import("../../visuals/LeafletMap"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

export const LazyLoadMap: React.FC<Props> = (props) => {
  return <LeafletMap {...props} />;
};
