"use client";

import React, { type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { generateBeachUrl } from "@/lib/supabase";
import type { ForecastData } from "@/lib/supabase";
import { Waves, Wind, MousePointer2 as ArrowIcon, Info } from "lucide-react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import SaveButton from "./SaveButton";
import { SwellRings, WindRing } from "../visuals/DirectionRings";
import { useMapData } from "../context/MapFilterContext";

export type Beach = {
  id: string;
  name: string;
  region: string;
  distanceKm?: number;
  conditions: {
    surf: string;
    wind: string;
    windDir: number;
    temp: number;
    rating: number;
  };
  current?: ForecastData;
  image: string;
  coords: [number, number];
  features: { label: string; icon: ReactNode; color: string }[];
  preview?: boolean;
};

type BeachCardProps = {
  b: Beach;
  useMiles?: boolean;
  isFav: boolean;
  map?: MaplibreMap;
  setHoverCardId?: (id: string | null) => void;
  loadingStats?: boolean;
  priorityImage?: boolean;
  preview?: boolean;
};

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNkYmVhZmUiLz48L3N2Zz4=";

const BeachCard = React.memo(
  ({
    b,
    useMiles = true,
    isFav,
    map,
    setHoverCardId = () => {},
    loadingStats = false,
    priorityImage = false,
    preview,
  }: BeachCardProps) => {
    const tagsRowRef = React.useRef<HTMLDivElement | null>(null);
    const hoveringRef = React.useRef(false);
    const [, setFitCount] = React.useState<number>(0);
    const measureTagRefs = React.useRef<Array<HTMLDivElement | null>>([]);
    const moreMeasureRef = React.useRef<HTMLDivElement | null>(null);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    React.useEffect(() => {
      setImageLoaded(false);
    }, [b.image]);

    React.useEffect(() => {
      return () => {
        if (hoveringRef.current) {
          setHoverCardId(null);
        }
      };
    }, [setHoverCardId]);

    const distance =
      b.distanceKm != null
        ? useMiles
          ? b.distanceKm * 0.621371
          : b.distanceKm
        : null;
    const maxRounded =
      b.conditions.rating != null ? Math.round(b.conditions.rating) : null;
    const color = !b.conditions.rating
      ? "bg-highlight-3"
      : maxRounded! >= 6
      ? "bg-red-400"
      : maxRounded! >= 3
      ? "bg-orange-300"
      : "bg-green-300";
    const rotation =
      typeof b.conditions.windDir === "number" ? b.conditions.windDir - 315 : 0;

    const beachUrl = `${generateBeachUrl(b.name, b.id)}/overview`;

    // Compute how many tags fit in the visible row; others go under a +N popover
    React.useEffect(() => {
      if (!Array.isArray(b.features) || b.features.length === 0) {
        setFitCount(0);
        return;
      }
      const row = tagsRowRef.current;
      if (!row) return;

      const compute = () => {
        const containerWidth = row.clientWidth || 0;
        if (containerWidth <= 0) {
          setFitCount(0);
          return;
        }
        // Approximate horizontal gap between tags (gap-1 => 0.25rem)
        const gapPx = 4;
        const widths = measureTagRefs.current
          .slice(0, b.features.length)
          .map((el) => (el ? el.getBoundingClientRect().width : 0));
        const moreWidth = moreMeasureRef.current
          ? moreMeasureRef.current.getBoundingClientRect().width
          : 36; // reasonable default
        let used = 0;
        let count = 0;
        for (let i = 0; i < widths.length; i++) {
          const w = widths[i] + (i > 0 ? gapPx : 0);
          // Check if we need to reserve space for the more button
          const needMore = i < widths.length - 1; // if we can't fit all, reserve
          const reserve = needMore ? gapPx + moreWidth : 0;
          if (used + w + reserve <= containerWidth) {
            used += w;
            count++;
          } else {
            break;
          }
        }
        setFitCount(count);
      };

      const ro = new ResizeObserver(() => compute());
      ro.observe(row);
      // slight delay to ensure measurers mounted
      const id = requestAnimationFrame(compute);
      return () => {
        ro.disconnect();
        cancelAnimationFrame(id);
      };
    }, [b.features]);

    const handleMouseEnter = React.useCallback(() => {
      hoveringRef.current = true;
      setHoverCardId(b.id);
      if (!map) return;
      try {
        const coord: [number, number] = [b.coords[1], b.coords[0]];
        const pt = map.project(coord);
        const pad = 6;
        if (map?.getLayer?.("unclustered-point")) {
          map.queryRenderedFeatures(
            [
              [pt.x - pad, pt.y - pad],
              [pt.x + pad, pt.y + pad],
            ],
            { layers: ["unclustered-point"] }
          );
        }
      } catch {}
    }, [b.coords, b.id, map, setHoverCardId]);

    const handleMouseLeave = React.useCallback(() => {
      hoveringRef.current = false;
      setHoverCardId(null);
    }, [setHoverCardId]);

    return (
      <article
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        id={`beach-${b.id}`}
        className="relative block hover:cursor-pointer transition-all duration-300 p-1.5 ease-out hover:translate-y-0.5 hover:bg-highlight-5/40 group overflow-hidden rounded-3xl border border-border/50 bg-highlight-7/60 shadow-even hover:shadow-lg backdrop-blur"
        aria-busy={loadingStats}
      >
        <Link
          href={beachUrl}
          aria-label={`Open ${b.name} overview`}
          className="absolute inset-0 z-0 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400"
        />
        <div className="relative z-10 pointer-events-none">
          <section className="rounded-2xl relative w-full p-3 aspect-auto bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="rounded-2xl h-35 w-full">
              <Image
                src={`/beach_pictures/${b.id}.png`}
                alt={`Map view of ${b.name}`}
                fill
                className="object-cover rounded-2xl"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={IMAGE_PLACEHOLDER}
                priority={priorityImage}
                loading={priorityImage ? "eager" : undefined}
                onLoadingComplete={() => setImageLoaded(true)}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  setImageLoaded(true);
                }}
              />
            </div>
            {!imageLoaded && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-background/40 backdrop-blur-sm transition-opacity duration-200" />
            )}
            <header className="flex gap-1 truncate absolute top-0.5 left-1 w-[73%] bg-slate-900/0 p-2 text-black backdrop-blur-none transition rounded-4xl">
              <div className={cn("min-w-1.5 rounded-full", color)} />
              <div className="min-w-0">
                <h2 className="truncate text-md font-semibold leading-tight -mb-0.5">
                  {b.name}
                </h2>
                <p className="truncate text-[0.7rem]">{b.region}</p>
              </div>
            </header>
            <div className="flex flex-col text-[0.6rem] gap-0 absolute bottom-2 left-2 text-black">
              <span className="inline-flex items-center gap-1">
                <span className="flex items-center justify-center p-0.5 bg-blue-100 rounded-full border border-black/10">
                  <Waves className="h-3 w-3 text-blue-500" />
                </span>
                <span className="flex items-baseline gap-0.5">
                  <span className="font-semibold text-[0.9rem]">
                    {b.conditions.surf}
                  </span>
                  ft
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="flex items-center justify-center p-0.5 bg-gray-50 rounded-full border border-black/10">
                  <Wind className="h-3 w-3 text-gray-700" />
                </span>
                <span className="flex items-baseline gap-0.5">
                  <span className="font-semibold text-[0.9rem]">
                    {b.conditions.wind}
                  </span>
                  mph
                </span>
                <ArrowIcon
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    display: "inline-block",
                  }}
                  className="h-3 w-3 fill-black/50 text-black/50"
                />
              </span>
            </div>
            <Popover>
              <PopoverTrigger
                asChild
                className={cn(preview && "pointer-events-none")}
              >
                <button
                  type="button"
                  aria-label={`More details about ${b.name}`}
                  className="pointer-events-auto text-white absolute bottom-3 right-3 z-50 p-1.5 rounded-full bg-black/60 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Info className="w-4 h-4" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                className="w-80 touch-pan-y max-w-[150px]"
              >
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Direction Rings
                </span>
                <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
                    <span>Primary swell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
                    <span>Secondary swell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22d3ee]" />
                    <span>Tertiary swell</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                    <span>Wind direction</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {distance != null && (
              <span className="absolute right-11 bottom-[12px] z-10 font-semibold text-[0.7rem] whitespace-nowrap bg-slate-900/70 px-2 py-[5px] text-white/90 backdrop-blur transition rounded-full">
                {Math.round(Number(distance.toFixed(1)))}{" "}
                {useMiles ? "mi" : "km"}
              </span>
            )}
            {b.current && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <SwellRings
                    directions={{
                      primary: b.current.swell.primary.direction,
                      secondary: b.current.swell.secondary.direction,
                      tertiary: b.current.swell.tertiary.direction,
                    }}
                    scale={0.35}
                    variant="preview"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <WindRing
                    direction={b.current.conditions.windDirection}
                    scale={0.35}
                    variant="preview"
                  />
                </div>
              </>
            )}
            <div
              className={cn(
                "pointer-events-auto absolute right-2 top-2 z-10",
                preview && "pointer-events-none"
              )}
            >
              <SaveButton
                beachId={String(b.id)}
                initialIsFav={isFav}
                variant="overlay"
                stopPropagation
              />
            </div>
            {loadingStats && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-background/40 backdrop-blur-[2px]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-2xl" />
              </div>
            )}
          </section>
        </div>
      </article>
    );

    // return (
    //   <article
    //     onMouseEnter={() => {
    //       setHoverCardId(b.id);
    //       if (!map) return;
    //       try {
    //         const coord: [number, number] = [b.coords[1], b.coords[0]]; // lon, lat
    //         const pt = (map as any).project(coord);
    //         const pad = 6;
    //         (map as any).queryRenderedFeatures(
    //           [
    //             [pt.x - pad, pt.y - pad],
    //             [pt.x + pad, pt.y + pad],
    //           ],
    //           { layers: ["unclustered-point"] }
    //         );
    //       } catch {}
    //     }}
    //     onMouseLeave={() => {
    //       setHoverCardId(null);
    //     }}
    //     onClick={goToOverview}
    //     onKeyDown={(e) => {
    //       if (e.key === "Enter" || e.key === " ") {
    //         e.preventDefault();
    //         goToOverview();
    //       }
    //     }}
    //     role="link"
    //     tabIndex={0}
    //     id={`beach-${b.id}`}
    //     className="hover:cursor-pointer transition-colors duration-200 ease-out hover:bg-highlight-5/40 group flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-highlight-7/60 shadow-even hover:shadow-lg backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400"
    //   >
    //     <div className="relative w-full p-3 mx-auto aspect-auto">
    //       <div className="rounded-4xl h-53 w-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
    //         <Image
    //           src={`/beach_pictures/${b.id}.png`}
    //           alt={`Map view of ${b.name}`}
    //           fill
    //           className="object-cover rounded-4xl p-3"
    //           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    //           unoptimized
    //           onError={(e) => {
    //             e.currentTarget.style.display = "none";
    //           }}
    //         />
    //       </div>
    //       <Popover>
    //         <PopoverTrigger
    //           asChild
    //           onClick={(e) => {
    //             e.stopPropagation();
    //           }}
    //         >
    //           <span className="text-white absolute bottom-5 right-5 z-50 p-1.5 rounded-full bg-black/60 hover:bg-black/90">
    //             <Info className="w-4 h-4" />
    //           </span>
    //         </PopoverTrigger>
    //         <PopoverContent
    //           side="bottom"
    //           align="end"
    //           sideOffset={8}
    //           className="w-80 touch-pan-y max-w-[150px]"
    //         >
    //           <span className="text-[11px] font-semibold uppercase text-muted-foreground">
    //             Direction Rings
    //           </span>
    //           <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground">
    //             <div className="flex items-center gap-2">
    //               <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
    //               <span>Primary swell</span>
    //             </div>
    //             <div className="flex items-center gap-2">
    //               <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
    //               <span>Secondary swell</span>
    //             </div>
    //             <div className="flex items-center gap-2">
    //               <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22d3ee]" />
    //               <span>Tertiary swell</span>
    //             </div>
    //             <div className="flex items-center gap-2">
    //               <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
    //               <span>Wind direction</span>
    //             </div>
    //           </div>
    //         </PopoverContent>
    //       </Popover>
    //       <div className="absolute bottom-3 left-3 w-[75%] bg-slate-900/0 p-2 text-black backdrop-blur-none transition rounded-4xl">
    //         <div className="flex gap-1 truncate">
    //           <div className={cn("w-1 p-1 rounded-full", color)} />
    //           <div className="min-w-0">
    //             <h3 className="truncate text-md font-semibold leading-tight">
    //               {b.name}
    //             </h3>
    //             <p className="truncate text-xs">{b.region}</p>
    //           </div>
    //         </div>
    //       </div>
    //       {b.current && (
    //         <>
    //           <div className="absolute inset-0 flex items-center justify-center">
    //             <SwellRings
    //               directions={{
    //                 primary: b.current.swell.primary.direction,
    //                 secondary: b.current.swell.secondary.direction,
    //                 tertiary: b.current.swell.tertiary.direction,
    //               }}
    //               scale={0.5}
    //               variant="preview"
    //             />
    //           </div>
    //           <div className="absolute inset-0 flex items-center justify-center">
    //             <WindRing
    //               direction={b.current.conditions.windDirection}
    //               scale={0.5}
    //               variant="preview"
    //             />
    //           </div>
    //         </>
    //       )}
    //       <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
    //         {distance != null && (
    //           <span className="font-semibold text-xs whitespace-nowrap bg-slate-900/70 p-3 text-white/90 backdrop-blur transition rounded-full">
    //             {Math.round(Number(distance.toFixed(1)))} {useMiles ? "mi" : "km"}
    //           </span>
    //         )}
    //         <SaveButton
    //           beachId={String(b.id)}
    //           initialIsFav={isFav}
    //           variant="overlay"
    //           stopPropagation
    //         />
    //       </div>
    //     </div>

    //     <div className="px-2 flex-1 flex flex-col justify-between">
    //       <div className="flex flex-col gap-2">
    //         {Array.isArray(b.features) && b.features.length > 0 && (
    //           <>
    //             {/* visible row */}
    //             <div
    //               ref={tagsRowRef}
    //               className="px-2 pt-1 pb-1 flex items-center gap-1"
    //             >
    //               {b.features.slice(0, fitCount).map((t) => (
    //                 <Tag
    //                   key={t.label}
    //                   data={t}
    //                   className="px-2 py-1 text-[11px]"
    //                 />
    //               ))}
    //               {fitCount < b.features.length && (
    //                 <Popover>
    //                   <PopoverTrigger
    //                     onClick={(e) => e.stopPropagation()}
    //                     className="inline-flex items-center px-2 py-1 rounded-full bg-highlight-5/70 hover:bg-highlight-3 hover:cursor-pointer border border-border/50 text-[11px] text-foreground/80"
    //                     aria-label="Show all tags"
    //                   >
    //                     +{b.features.length - fitCount}
    //                   </PopoverTrigger>
    //                   <PopoverContent className="w-80 touch-pan-y">
    //                     <div className="flex flex-wrap gap-2">
    //                       {b.features.slice(fitCount).map((t) => (
    //                         <Tag key={t.label} data={t} />
    //                       ))}
    //                     </div>
    //                   </PopoverContent>
    //                 </Popover>
    //               )}
    //             </div>
    //             {/* hidden measurer row */}
    //             <div className="absolute -z-50 opacity-0 pointer-events-none fixed -top-[9999px] left-0">
    //               <div className="flex items-center gap-1">
    //                 {b.features.map((t, idx) => (
    //                   <div
    //                     key={`m-${t.label}`}
    //                     ref={(el) => {
    //                       measureTagRefs.current[idx] = el;
    //                     }}
    //                   >
    //                     <Tag data={t} className="px-2 py-1 text-[11px]" />
    //                   </div>
    //                 ))}
    //                 <div
    //                   ref={moreMeasureRef}
    //                   className="inline-flex items-center px-2 py-1 rounded-full bg-highlight-5/70 border border-border/50 text-[11px] text-foreground/80"
    //                 >
    //                   +99
    //                 </div>
    //               </div>
    //             </div>
    //           </>
    //         )}

    //         <div className="pt-1 pb-1 px-2 flex flex-col gap-3 text-xs">
    //           <div className="flex gap-3">
    //             <span className="inline-flex items-center gap-1">
    //               <div className="flex items-center justify-center p-1 bg-blue-100 rounded-full border border-border/40">
    //                 <Waves className="h-4 w-4 text-blue-500" />
    //               </div>
    //               <span className="flex items-baseline gap-0.5">
    //                 <span className="font-semibold text-xl">
    //                   {b.conditions.surf}
    //                 </span>
    //                 ft
    //               </span>
    //             </span>
    //             <span className="inline-flex items-center gap-1">
    //               <div className="flex items-center justify-center p-1 bg-gray-50 rounded-full border border-border/40">
    //                 <Wind className="h-4 w-4 text-gray-700" />
    //               </div>
    //               <span className="flex items-baseline gap-0.5">
    //                 <span className="font-semibold text-xl">
    //                   {b.conditions.wind}
    //                 </span>
    //                 mph
    //               </span>
    //               <ArrowIcon
    //                 style={{
    //                   transform: `rotate(${rotation}deg)`,
    //                   display: "inline-block",
    //                 }}
    //                 className="ml-1 h-4 w-4 fill-foreground/50 text-foreground/50"
    //               />
    //             </span>
    //           </div>
    //         </div>
    //       </div>
    //       <div className="px-2 pb-2 mt-2" />
    //     </div>
    //   </article>
    // );
  },
  (prev, next) =>
    prev.b === next.b &&
    prev.useMiles === next.useMiles &&
    prev.isFav === next.isFav &&
    prev.map === next.map &&
    prev.setHoverCardId === next.setHoverCardId
);

BeachCard.displayName = "BeachCard";

const BeachCardWithContext = ({
  b,
  useMiles,
  isFav,
  loadingStats,
  preview,
}: Omit<BeachCardProps, "map" | "setHoverCardId">) => {
  const { map, setHoverCardId } = useMapData();
  return (
    <BeachCard
      b={b}
      useMiles={useMiles}
      isFav={isFav}
      map={map}
      setHoverCardId={setHoverCardId}
      loadingStats={loadingStats}
      preview={preview}
    />
  );
};

export default BeachCardWithContext;
