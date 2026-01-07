"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { BeachPoint } from "@/components/context/MapFilterContext";

type Props = {
  beachId?: string | number;
  loggedIn?: boolean;
  initialBeach?: BeachPoint | null;
  variant?: "page" | "embed";
  ui?: "full" | "preview";
};

const MapLoadingShell: React.FC<Pick<Props, "variant" | "ui">> = ({
  variant,
}) => {
  const pathName = usePathname() ?? "";
  const embedded = variant === "embed";
  if (!embedded && pathName.includes("edit")) return null;

  return (
    <aside
      id="map-container"
      className={
        embedded
          ? "relative flex h-full w-full"
          : cn(
              "touch-none overscroll-none fixed w-full mx-auto max-w-screen transition-all duration-300",
              "max-[895px]:min-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom,0px))] max-[895px]:h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom,0px))]",
              "@min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(100vh-8rem)] flex"
            )
      }
    >
      <div
        className={cn(
          "flex w-full h-full items-center justify-center text-sm text-muted-foreground animate-pulse overflow-hidden bg-highlight-5",
          embedded ? "rounded-none" : "rounded-none min-[896px]:rounded-[18px]",
          "min-h-[28rem]"
        )}
        style={{
          boxShadow: embedded ? "none" : "0px 0px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        Preparing map.
      </div>
    </aside>
  );
};

export const LazyLoadMap: React.FC<Props> = (props) => {
  const LeafletMap = React.useMemo(
    () =>
      dynamic<Props>(() => import("../../visuals/LeafletMap"), {
        ssr: false,
        loading: () => (
          <MapLoadingShell variant={props.variant} ui={props.ui} />
        ),
      }),
    [props.ui, props.variant]
  );

  return <LeafletMap {...props} />;
};
