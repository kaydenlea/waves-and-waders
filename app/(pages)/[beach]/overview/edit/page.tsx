"use client";

import Link from "next/link";
import Summary from "@/components/visuals/Summary";
import { LazyLoadDashboard } from "@/components/general/LazyLoad/LazyLoadDashboard";
import { MAP_FOCUS_EVENT } from "@/components/general/mapEvents";

import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { use } from "react";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import { useRouter } from "next/navigation";

// export const metadata: Metadata = {
//   title: "Surf Daily Forecast | Waves and Waders",
//   description:
//     "Check the daily and hourly surf conditions of your local beaches",
// };

const Page = ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = use(params);
  const router = useRouter();

  const handleConfirm = () => {
    router.push(`/${beach}/overview#overview-content`);
  };
  return (
    <PathStyleWrapper>
      <div id="content" className="@container py-0 @min-4xl:py-5 p-5 mt-0">
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
            <button
              onClick={handleConfirm}
              className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            >
              <CircleCheck size={20} />
              Confirm
            </button>
          </header>
          <LazyLoadDashboard />
        </section>
      </div>
    </PathStyleWrapper>
  );
};

export default Page;
