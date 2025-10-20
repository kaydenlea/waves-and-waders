"use client";

import Link from "next/link";
import Summary from "@/components/visuals/Summary";
import { LazyLoadDashboard } from "@/components/general/LazyLoad/LazyLoadDashboard";
import { MAP_FOCUS_EVENT } from "@/components/general/mapEvents";

import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { use } from "react";

// export const metadata: Metadata = {
//   title: "Surf Daily Forecast | Waves and Waders",
//   description:
//     "Check the daily and hourly surf conditions of your local beaches",
// };

const Page = ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = use(params);

  const handleConfirm = () => {
    // Extract beach ID from the URL parameter
    const beachId = beach.split("--").pop() || beach;

    // Dispatch the map refocus event
    const event = new CustomEvent(MAP_FOCUS_EVENT, {
      detail: { beachId, scroll: true },
    });
    window.dispatchEvent(event);
  };
  return (
    <div id="content" className="@container p-2 mt-[3rem] @min-4xl:mt-0">
      <section
        id="overview-content"
        className="flex flex-col gap-3 w-full mb-2"
      >
        <header className="mx-2 gap-2 flex justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Drag and drop widgets</h2>
            <p className="text-sm text-muted-foreground">
              Customize your dashboard
            </p>
          </div>
          <Link
            href={`/${beach}/overview#overview-content`}
            // onClick={handleConfirm}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
          >
            <CircleCheck size={20} />
            Confirm
          </Link>
        </header>
        <LazyLoadDashboard />
      </section>
    </div>
  );
};

export default Page;
