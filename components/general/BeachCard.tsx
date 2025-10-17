"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LazyLoadTidePreview } from "./LazyLoad/LazyLoadTidePreview";
import { generateBeachUrl } from "@/lib/supabase";
import type { ForecastData } from "@/lib/supabase";

import {
  Star,
  Waves,
  Wind,
  MousePointer2 as ArrowIcon,
  Tag as TagIcon,
  Fish,
  Toilet,
  CircleParking,
  Dog,
  Shell,
  LifeBuoy,
} from "lucide-react";
import Tag from "./Tag";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useMapFilters } from "../context/MapFilterContext";
import { scrollToMap } from "./BackToMapButton";
import { cn } from "@/lib/utils";
import SaveButton from "./SaveButton";
import { SwellRings, WindRing } from "../visuals/InteractiveMap";

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
  current: ForecastData;
  image: string;
  coords: [number, number];
  features: { label: string; icon: ReactNode; color: string }[];
};

function StarRating({ value }: { value: number }) {
  const stars = Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`h-3 w-3 ${
        i < Math.round(value)
          ? "fill-yellow-400 text-yellow-400"
          : "text-foreground/30"
      }`}
      aria-hidden="true"
    />
  ));
  return (
    <div
      className="flex items-center gap-1 mt-1"
      role="img"
      aria-label={`Rating ${stars.length} out of 5`}
    >
      {stars}
    </div>
  );
}

const tags = [
  { label: "Fishing", icon: <Fish size={16} />, color: "bg-blue" },
  { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow" },
  {
    label: "Parking",
    icon: <CircleParking size={16} />,
    color: "bg-green",
  },
  { label: "Dogs", icon: <Dog size={16} />, color: "bg-red" },
  { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange" },
  {
    label: "Lifeguard",
    icon: <LifeBuoy size={16} />,
    color: "bg-purple",
  },
];

const BeachCard = ({
  b,
  useMiles = true,
  isFav,
}: {
  b: Beach;
  useMiles?: boolean;
  isFav: boolean;
}) => {
  const { popupData, setPopupData, popupRef, popupId, map } = useMapFilters();
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
  return (
    <article
      onClick={() => {
        if (!map) return;
        map.easeTo({
          center: [b.coords[1], b.coords[0]],
          zoom: 14,
          duration: 300,
        });
        popupId.current = b.id;
        setPopupData(b.id);
        scrollToMap();
      }}
      id={`beach-${b.id}`}
      className="hover:cursor-pointer transition-transform transform translate-y-0 hover:translate-y-0.5 ease-in-out duration-300 hover:bg-highlight-5/40 group flex flex-col overflow-hidden rounded-4xl border border-border/50 bg-highlight-7/50 shadow-md shadow-black/20 backdrop-blur"
    >
      <div className="relative w-full p-3 mx-auto aspect-auto">
        <div className="rounded-4xl h-60 w-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <Image
            src={`/beach_pictures/${b.id}.png`}
            alt={`Map view of ${b.name}`}
            fill
            className="object-cover rounded-4xl p-3"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized // Skip optimization to reduce 404 errors
            onError={(e) => {
              // Fallback if image doesn't exist - hide silently
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="absolute bottom-3 left-3 w-[75%] bg-slate-900/0 p-3 text-black backdrop-blur-none transition rounded-4xl">
          <div className="flex gap-1 truncate">
            <div className={cn("w-1 p-1 rounded-full", color)} />
            <div className="min-w-0">
              <h3 className="truncate text-md font-semibold leading-tight">
                {b.name}
              </h3>
              <p className="truncate text-xs">{b.region}</p>
            </div>
          </div>
          {/* <StarRating value={b.conditions.rating} /> */}
        </div>
        {b.current && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <SwellRings
                directions={{
                  primary: b.current.swell.primary.direction,
                  secondary: b.current.swell.secondary.direction,
                  tertiary: b.current.swell.tertiary.direction,
                }}
                scale={0.55}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {typeof b.current.conditions.windDirection === "number" && (
                <WindRing
                  direction={b.current.conditions.windDirection}
                  scale={0.55}
                />
              )}
            </div>
          </>
        )}
        <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
          {distance != null && (
            <span className="font-semibold text-xs whitespace-nowrap bg-slate-900/70 p-3 text-white/90 backdrop-blur transition rounded-full">
              {Math.round(Number(distance.toFixed(1)))} {useMiles ? "mi" : "km"}
            </span>
          )}
          <SaveButton
            beachId={String(b.id)}
            initialIsFav={isFav}
            variant="overlay"
            stopPropagation
          />
        </div>
      </div>
      <div className="p-2 flex-1 flex flex-col justify-between">
        <div className="flex flex-col">
          <div className="pt-2 pb-2 px-2 flex flex-col gap-3 text-xs">
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1">
                <div className="flex items-center justify-center p-1 bg-blue-100 rounded-full border border-border/40">
                  <Waves className="h-4 w-4 text-blue-500" />
                </div>
                <span className="flex items-baseline gap-0.5">
                  <span className="font-semibold text-xl">
                    {b.conditions.surf}
                  </span>
                  ft
                </span>
              </span>
              {/* <span className="inline-flex items-center gap-1">
                <div className="flex items-center justify-center p-1 bg-blue-100 rounded-full border border-border/40">
                  <Droplets className="h-3 w-3 text-blue-400" />
                </div>
                <span className="flex items-baseline">
                  <span className="font-semibold text-lg">
                    {b.conditions.temp}
                  </span>
                  °F
                </span>
              </span> */}
              <span className="inline-flex items-center gap-1">
                <div className="flex items-center justify-center p-1 bg-gray-50 rounded-full border border-border/40">
                  <Wind className="h-4 w-4 text-gray-700" />
                </div>
                <span className="flex items-baseline gap-0.5">
                  <span className="font-semibold text-xl">
                    {b.conditions.wind}
                  </span>
                  mph
                </span>
                <ArrowIcon
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    display: "inline-block",
                  }}
                  className="ml-1 h-4 w-4 fill-foreground/50 text-foreground/50"
                />
              </span>
            </div>
          </div>
        </div>
        <div className="px-2 pb-2 mt-4 flex items-center justify-between">
          <Popover>
            <PopoverTrigger
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span className="font-semibold text-sm py-2 px-3 rounded-full shadow-even bg-highlight-5 hover:bg-highlight-3 flex gap-1 items-center">
                <TagIcon className="h-4 w-4" />
                Tags
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-80 touch-pan-y">
              {b.features &&
                b.features.map((tag) => (
                  <Tag className="m-1" key={tag.label} data={tag} />
                ))}
            </PopoverContent>
          </Popover>
          {/* <Tag data={tags[0]} /> */}
          <div className="flex items-center gap-2">
            {/* <SaveButton
              beachId={String(b.id)}
              initialIsFav={isFav}
              className="group/button inline-flex items-center rounded-full bg-highlight-5 p-1.5 backdrop-blur transition hover:bg-highlight-3"
              stopPropagation
            /> */}
            <Link
              onClick={(e) => {
                e.stopPropagation();
                popupId.current = null;
                setPopupData(null);
              }}
              href={`${generateBeachUrl(b.name, b.id)}/overview`}
              className="text-center rounded-full bg-highlight-5 shadow-even px-3 py-2 text-sm font-semibold text-foreground/90 transition hover:bg-highlight-3"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BeachCard;
