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
  const [hydrated, setHydrated] = React.useState(false);
  const [smallScreen, setSmallScreen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 911;
  });
  const hideOnEditPage = !embedded && pathName.includes("edit");

  React.useEffect(() => {
    if (hideOnEditPage) return;
    setHydrated(true);
  }, [hideOnEditPage]);

  React.useEffect(() => {
    if (hideOnEditPage) return;
    if (typeof window === "undefined") return;
    const onResize = () => setSmallScreen(window.innerWidth < 911);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [hideOnEditPage]);

  if (hideOnEditPage) return null;

  const mobileViewportHeight =
    "calc(var(--ww-100vh, 100dvh) + env(safe-area-inset-top, 0px) - 4.25rem - max(env(safe-area-inset-bottom, 0px), var(--ww-bottom-ui, 0px)))";
  const desktopViewportHeight =
    "calc(var(--ww-100vh, 100dvh) - 8rem - max(env(safe-area-inset-bottom, 0px), var(--ww-bottom-ui, 0px)))";
  const wrapperHeight = embedded
    ? undefined
    : smallScreen
      ? {
          minHeight: mobileViewportHeight,
          height: mobileViewportHeight,
        }
      : {
          minHeight: `min(28rem, ${desktopViewportHeight})`,
          height: desktopViewportHeight,
          maxHeight: desktopViewportHeight,
        };

  return (
    <aside
      id="map-container"
      className={
        embedded
          ? "relative flex h-full w-full"
          : cn(
              "touch-none overscroll-none fixed z-0 w-full mx-auto max-w-screen pr-[var(--ww-scroll-lock-pad-right)] transition-[transform,opacity] duration-300",
              "max-[911px]:min-h-[calc(var(--ww-100vh,100dvh)+env(safe-area-inset-top,0px)-4.25rem-max(env(safe-area-inset-bottom,0px),var(--ww-bottom-ui,0px)))] max-[911px]:h-[calc(var(--ww-100vh,100dvh)+env(safe-area-inset-top,0px)-4.25rem-max(env(safe-area-inset-bottom,0px),var(--ww-bottom-ui,0px)))]",
              "@min-4xl:box-border @min-4xl:sticky @min-4xl:top-[7.5rem] @min-4xl:flex-1 @min-4xl:py-3 @min-4xl:pl-5 @min-4xl:pr-3 @min-4xl:h-[calc(var(--ww-100vh,100dvh)-8rem-max(env(safe-area-inset-bottom,0px),var(--ww-bottom-ui,0px)))] flex"
            )
      }
      style={hydrated ? wrapperHeight : undefined}
    >
      <div
        className={cn(
          "flex w-full h-full items-center justify-center text-sm text-muted-foreground animate-pulse overflow-hidden bg-highlight-5",
          embedded ? "rounded-none" : "rounded-none min-[911px]:rounded-[18px]",
          "min-h-0"
        )}
        style={{
          boxShadow: embedded ? "none" : "0px 0px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        Preparing map…
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
