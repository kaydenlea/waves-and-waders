"use client";

import * as React from "react";
import { AttributionControl, Map } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeftFromLine, ArrowRightFromLine } from "lucide-react";
import { usePathname } from "next/navigation";

const InteractiveMap = () => {
  const [showMap, setShowMap] = React.useState(true);
  const [smallScreen, setSmallScreen] = React.useState<boolean | null>(null);
  const pathName = usePathname();
  const fullMapPage = !pathName.endsWith("/beaches");
  const editPage = pathName.includes("edit");
  const forecastPage = pathName.includes("forecast");

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

  // if (!showMap && !smallScreen) {
  //   return (
  //     // <div className="relative">
  //     //   <button
  //     //     aria-label="maximize map"
  //     //     className="absolute top-2 right-2 bg-background rounded-full p-2 shadow-lg border border-border hover:bg-highlight-3"
  //     //     onClick={() => setShowMap(!showMap)}
  //     //   >
  //     //     <Maximize2 className="w-5 h-5" />
  //     //   </button>
  //     // </div>
  //     // <aside
  //     //   className={cn(
  //     //     "flex items-center justify-center fixed bg-foreground/10 rounded-r-xl @min-3xl:sticky @min-3xl:top-[6.2rem] @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 w-full h-full @min-3xl:h-[calc(100vh-7rem)]",
  //     //     fullMapPage && "@min-3xl:max-w-20"
  //     //   )}
  //     // >
  //     //   <button
  //     //     aria-label="minimize map"
  //     //     className="bg-background rounded-full p-2 shadow-lg border border-border hover:bg-highlight-3"
  //     //     onClick={() => setShowMap(!showMap)}
  //     //   >
  //     //     <ArrowRightFromLine className="w-5 h-5" />
  //     //   </button>
  //     // </aside>
  //     <aside
  //       className={cn(
  //         "fixed @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 w-full h-full @min-3xl:h-[calc(100vh-5.5rem)]",
  //         fullMapPage && "@min-3xl:max-w-20"
  //       )}
  //     >
  //       <Map
  //         reuseMaps
  //         initialViewState={{
  //           longitude: -122.4,
  //           latitude: 37.8,
  //           zoom: 8,
  //         }}
  //         style={{ width: "100%", height: "100%", borderRadius: "12px" }}
  //         mapStyle="https://demotiles.maplibre.org/style.json"
  //         // mapStyle="https://tiles.openfreemap.org/styles/liberty"
  //         attributionControl={false}
  //       >
  //         <div className="absolute bg-foreground/50 h-full w-full" />
  //         {fullMapPage && (
  //           <button
  //             aria-label="minimize map"
  //             className="absolute top-[50%] right-2 bg-background rounded-full p-2 shadow-lg border border-border hover:bg-highlight-3"
  //             onClick={() => setShowMap(!showMap)}
  //           >
  //             <ArrowRightFromLine className="w-5 h-5" />
  //           </button>
  //         )}
  //         <AttributionControl compact={true} />
  //       </Map>
  //     </aside>
  //   );
  // }
  if (editPage || (forecastPage && !smallScreen)) {
    return <></>;
  }
  return (
    <aside
      className={cn(
        "fixed @min-3xl:sticky @min-3xl:top-[5.5rem] @min-3xl:flex-1 @min-3xl:py-3 @min-3xl:pl-3 w-full h-full @min-3xl:h-[calc(100vh-5.5rem)]",
        !smallScreen && fullMapPage && showMap && "@min-3xl:max-w-200",
        !smallScreen && fullMapPage && !showMap && "@min-3xl:max-w-20"
      )}
    >
      <Map
        reuseMaps
        initialViewState={{
          longitude: -122.4,
          latitude: 37.8,
          zoom: 8,
        }}
        style={{ width: "100%", height: "100%", borderRadius: "12px" }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        // mapStyle="https://tiles.openfreemap.org/styles/liberty"
        attributionControl={false}
      >
        {!showMap && fullMapPage && !smallScreen && (
          <div className="absolute bg-black/70 h-full w-full" />
        )}
        {fullMapPage && !smallScreen && (
          <button
            aria-label={`${showMap ? "Minimize" : "Maximize"} map`}
            className={cn(
              "absolute right-2 bg-background rounded-full p-2 shadow-lg border border-border hover:bg-highlight-3",
              showMap ? "top-2" : "top-[50%]"
            )}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? (
              <ArrowLeftFromLine className="w-5 h-5" />
            ) : (
              <ArrowRightFromLine className="w-5 h-5" />
            )}
          </button>
        )}
        <AttributionControl compact={true} />
      </Map>
    </aside>
  );
};

export default InteractiveMap;
