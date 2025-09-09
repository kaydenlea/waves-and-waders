import Link from "next/link";

import type { Metadata } from "next";
import type { Beach } from "@/components/general/BeachCard";
import BeachCard from "@/components/general/BeachCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTabs from "@/components/general/PageTabs";

export const metadata: Metadata = {
  title: "Search surf spots | Waves and Waders",
  description: "Find your local surf spots and beaches",
};

const BEACHES: Beach[] = [
  {
    id: "1",
    name: "Ocean Beach",
    region: "San Francisco, CA",
    coords: [37.7599, -122.51],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "3–5 ft, clean",
      wind: "NW 7 mph",
      temp: 57,
      rating: 4.2,
    },
  },
  {
    id: "2",
    name: "Huntington Beach",
    region: "Orange County, CA",
    coords: [33.6595, -117.9988],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–3 ft, glassy",
      wind: "NE 3 mph",
      temp: 66,
      rating: 4.6,
    },
  },
  {
    id: "3",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
  {
    id: "4",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "5",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "6",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
  {
    id: "7",
    name: "Ocean Beach",
    region: "San Francisco, CA",
    coords: [37.7599, -122.51],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "3–5 ft, clean",
      wind: "NW 7 mph",
      temp: 57,
      rating: 4.2,
    },
  },
  {
    id: "8",
    name: "Huntington Beach",
    region: "Orange County, CA",
    coords: [33.6595, -117.9988],
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–3 ft, glassy",
      wind: "NE 3 mph",
      temp: 66,
      rating: 4.6,
    },
  },
  {
    id: "9",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
  {
    id: "10",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "11",
    name: "La Jolla Shores",
    region: "San Diego, CA",
    coords: [32.8575, -117.256],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "2–4 ft, clean",
      wind: "SE 4 mph",
      temp: 68,
      rating: 4.7,
    },
  },
  {
    id: "12",
    name: "Malibu Surfrider",
    region: "Malibu, CA",
    coords: [34.033, -118.6786],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    conditions: {
      surf: "1–2 ft, fair",
      wind: "W 5 mph",
      temp: 64,
      rating: 4.3,
    },
  },
];

const page = () => {
  const favorites = ["2", "4"];
  return (
    <div className="@container p-2">
      <div className="relative w-full flex flex-col gap-6">
        {/* <Tabs
          defaultValue="nearby"
          className="mx-auto @min-lg:absolute @min-lg:right-0"
        >
          <TabsList>
            <TabsTrigger value="nearby">
              <span className="p-5">Nearby</span>
            </TabsTrigger>
            <TabsTrigger value="saved">
              <span className="p-5">Saved</span>
            </TabsTrigger>
          </TabsList>
        </Tabs> */}
        <PageTabs
          buttons={false}
          tabs={["nearby", "saved"]}
          defaultPage="nearby"
        />
        <header id="content" className="ml-2 mb-4 scroll-mt-30">
          <h1 className="font-semibold text-3xl tracking-tight">Surf spots</h1>
          <span className="text-muted-foreground">
            Explore nearby beaches on the map
          </span>
        </header>
      </div>
      <section className="grid grid-cols-1 gap-3 @min-md:grid-cols-2 mb-2">
        {BEACHES.map((b) => (
          <BeachCard
            key={b.id}
            b={b}
            // useMiles={useMiles}
            // onToggleFavorite={toggleFavorite}
            isFav={favorites.includes(b.id)}
          />
        ))}
      </section>
    </div>
  );
};

export default page;
