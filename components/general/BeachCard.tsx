import Link from "next/link";
import { LazyLoadTidePreview } from "./LazyLoad/LazyLoadTidePreview";

import {
  Droplets,
  Heart,
  Star,
  Sun,
  Waves,
  Wind,
  MousePointer2 as ArrowIcon,
  Tag as TagIcon,
  Fish,
} from "lucide-react";
import Tag from "./Tag";

export type Beach = {
  id: string;
  name: string;
  region: string;
  distanceKm?: number;
  conditions: {
    surf: string;
    wind: string;
    temp: number;
    rating: number;
  };
  image: string;
  coords: [number, number];
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
  // { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow" },
  // {
  //   label: "Parking",
  //   icon: <CircleParking size={16} />,
  //   color: "bg-green",
  // },
  // { label: "Dogs", icon: <Dog size={16} />, color: "bg-red" },
  // { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange" },
  // {
  //   label: "Lifeguard",
  //   icon: <LifeBuoy size={16} />,
  //   color: "bg-purple",
  // },
];

const BeachCard = ({
  b,
  useMiles = true,
  onToggleFavorite,
  isFav,
}: {
  b: Beach;
  useMiles?: boolean;
  onToggleFavorite?: (id: string) => void;
  isFav: boolean;
}) => {
  const distance =
    b.distanceKm != null
      ? useMiles
        ? b.distanceKm * 0.621371
        : b.distanceKm
      : null;
  return (
    <article
      id={`beach-${b.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-highlight-4 shadow-md shadow-black/20 backdrop-blur"
    >
      <div className="relative flex-1">
        {/* <img
          src={b.image}
          alt={`${b.name} – ${b.region}`}
          className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        /> */}
        {/* <div className="bg-muted-foreground h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> */}
        {/* <button
          // onClick={() => onToggleFavorite(b.id)}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-900/70 p-2 text-white/90 backdrop-blur transition hover:bg-slate-900"
        >
          <Heart
            className={`h-5 w-5 ${
              isFav ? "fill-rose-500 text-rose-400" : "text-white"
            }`}
          />
        </button>
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white/90 backdrop-blur">
          <Waves className="h-4 w-4" /> {b.conditions.surf}
        </div> */}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-1">
              <div className="w-1 bg-green-300 p-1 rounded-full" />
              <div className="min-w-0">
                <h3 className="truncate text-md font-semibold leading-tight text-foreground">
                  {b.name}
                </h3>
                <p className="truncate text-xs text-foreground/70">
                  {b.region}
                </p>
              </div>
            </div>
            <div className="text-foreground/70 text-sm">
              {distance != null ? (
                <span>
                  {Math.round(Number(distance.toFixed(1)))}{" "}
                  {useMiles ? "mi" : "km"}
                </span>
              ) : (
                // <span className="italic text-xs">
                //   Turn on location for distance
                // </span>
                <span>5 mi</span>
              )}
            </div>
            {/* <StarRating value={b.conditions.rating} /> */}
          </div>
          <div>
            {/* <span className="text-sm font-medium">{b.conditions.surf}</span> */}
            <LazyLoadTidePreview />
          </div>
          <div className="-mt-2 flex flex-col gap-3 text-xs">
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1">
                <div className="flex items-center justify-center p-1 bg-blue-100 rounded-full border border-border/40">
                  <Waves className="h-4 w-4 text-blue-500" />
                </div>
                <span className="flex items-baseline gap-0.5">
                  <span className="font-semibold text-xl">2-3</span>ft
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
                  <span className="font-semibold text-xl">5</span>mph
                </span>
                <ArrowIcon
                  className="h-4 w-4"
                  color="#ff6a34ff"
                  fill="#ff6a34ff"
                />
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm py-1 px-3 rounded-full bg-highlight-5 hover:bg-highlight-3 flex gap-1 items-center">
            <TagIcon className="h-4 w-4" />
            Tags
          </span>
          {/* <Tag data={tags[0]} /> */}
          <div className="flex items-center gap-2">
            <button
              // onClick={() => onToggleFavorite(b.id)}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              className="group/button inline-flex items-center rounded-full bg-highlight-5 p-2 backdrop-blur transition hover:bg-highlight-3"
            >
              <Heart
                className={`h-4.5 w-4.5 ${
                  isFav
                    ? "fill-rose-500 text-rose-400 group-hover/button:fill-none group-hover/button:text-foreground"
                    : "text-foreground group-hover/button:fill-rose-500 group-hover/button:text-rose-400"
                }`}
              />
            </button>
            <Link
              href={`/${b.name}/overview#content`}
              className="text-center rounded-full bg-highlight-5 px-3 py-1.5 text-sm text-foreground/90 transition hover:bg-highlight-3"
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

// const BeachCard = ({
//   b,
//   useMiles,
//   onToggleFavorite,
//   isFav,
// }: {
//   b: Beach;
//   useMiles?: boolean;
//   onToggleFavorite?: (id: string) => void;
//   isFav: boolean;
// }) => {
//   const distance =
//     b.distanceKm != null
//       ? useMiles
//         ? b.distanceKm * 0.621371
//         : b.distanceKm
//       : null;
//   return (
//     <article
//       id={`beach-${b.id}`}
//       className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-highlight-4 shadow-md shadow-black/20 backdrop-blur"
//     >
//       <div className="relative flex-1">
//         {/* <img
//           src={b.image}
//           alt={`${b.name} – ${b.region}`}
//           className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
//           loading="lazy"
//         /> */}
//         <div className="bg-muted-foreground h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
//         <button
//           // onClick={() => onToggleFavorite(b.id)}
//           aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
//           className="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-900/70 p-2 text-white/90 backdrop-blur transition hover:bg-slate-900"
//         >
//           <Heart
//             className={`h-5 w-5 ${
//               isFav ? "fill-rose-500 text-rose-400" : "text-white"
//             }`}
//           />
//         </button>
//         <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white/90 backdrop-blur">
//           <Waves className="h-4 w-4" /> {b.conditions.surf}
//         </div>
//       </div>
//       <div className="p-4 flex-1 flex flex-col justify-between">
//         <div>
//           <div className="flex items-start justify-between gap-3">
//             <div className="min-w-0">
//               <h3 className="truncate text-md font-semibold leading-tight text-foreground">
//                 {b.name}
//               </h3>
//               <p className="truncate text-xs text-foreground/70">{b.region}</p>
//             </div>
//             <StarRating value={b.conditions.rating} />
//           </div>
//           <div className="mt-3 flex flex-col gap-3 text-sm font-medium text-foreground/70">
//             <div className="flex gap-3">
//               {/* <span className="inline-flex items-center gap-1">
//                 <Waves className="h-4 w-4" /> {b.conditions.surf}
//               </span> */}
//               <div className="flex gap-3">
//                 <span className="inline-flex items-center gap-1">
//                   <Droplets className="h-4 w-4" /> {b.conditions.temp}°F
//                 </span>
//                 {/* <span className="inline-flex items-center gap-1">
//                   <Sun className="h-4 w-4" /> {b.conditions.temp}°F
//                 </span> */}
//               </div>
//               <span className="inline-flex items-center gap-1">
//                 <Wind className="h-4 w-4" /> {b.conditions.wind}
//               </span>
//             </div>
//             {/* <div className="flex gap-3">
//               <span className="inline-flex items-center gap-1">
//                 <Droplets className="h-4 w-4" /> {b.conditions.temp}°F
//               </span>
//               <span className="inline-flex items-center gap-1">
//                 <Sun className="h-4 w-4" /> {b.conditions.temp}°F
//               </span>
//             </div> */}
//           </div>
//         </div>
//         <div className="mt-4 flex items-center justify-between gap-4">
//           <div className="text-foreground/70 text-sm">
//             {distance != null ? (
//               <span>
//                 {distance.toFixed(1)} {useMiles ? "mi" : "km"} away
//               </span>
//             ) : (
//               <span className="italic text-xs">
//                 Turn on location for distance
//               </span>
//             )}
//           </div>
//           <Link
//             href={`/${b.name}/overview#content`}
//             className="text-center rounded-full border border-border/50 bg-highlight-2 px-3 py-1.5 text-sm text-foreground/90 transition hover:bg-highlight-2/20"
//           >
//             View
//           </Link>
//         </div>
//       </div>
//     </article>
//   );
// };
