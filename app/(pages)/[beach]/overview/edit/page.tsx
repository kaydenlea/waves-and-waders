import Link from "next/link";
import Summary from "@/components/visuals/Summary";
import { LazyLoadDashboard } from "@/components/general/LazyLoad/LazyLoadDashboard";

import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

const chartData = [
  { hour: 0, tide: 5, isPeak: 5 },
  { hour: 1, tide: 4.5 },
  { hour: 2, tide: 4.3 },
  { hour: 3, tide: 4.1 },
  { hour: 4, tide: 3 },
  { hour: 5, tide: 2 },
  { hour: 6, tide: 1, isPeak: 1 },
  { hour: 7, tide: 2 },
  { hour: 8, tide: 2.5 },
  { hour: 9, tide: 2.8 },
  { hour: 10, tide: 3 },
  { hour: 11, tide: 4.5 },
  { hour: 12, tide: 5 },
  { hour: 13, tide: 5.1 },
  { hour: 14, tide: 5.2 },
  { hour: 15, tide: 5.3 },
  { hour: 16, tide: 5.5 },
  { hour: 17, tide: 5.3 },
  { hour: 18, tide: 5.5, isPeak: 5.5 },
  { hour: 19, tide: 5 },
  { hour: 20, tide: 4.5 },
  { hour: 21, tide: 4.3 },
  { hour: 22, tide: 3 },
  { hour: 23, tide: 2 },
  { hour: 24, tide: 1, isPeak: 1 },
];

// export const metadata: Metadata = {
//   title: "Surf Daily Forecast | Waves and Waders",
//   description:
//     "Check the daily and hourly surf conditions of your local beaches",
// };

const Page = async ({ params }: { params: Promise<{ beach: string }> }) => {
  const { beach } = await params;
  return (
    <div id="content" className="@container p-2 mt-[5rem] @min-4xl:mt-0">
      {/* <header className="ml-2">
        <h1 className="font-semibold text-4xl tracking-tight">
          Huntington Beach
        </h1>
      </header>
      <section className="mb-8">
        <h2 className="mb-2 ml-2 text-muted-foreground text-lg">
          Thursday, Aug 14
        </h2>
        <Summary />
      </section> */}
      <section className="flex flex-col gap-3 w-full mb-2">
        <header
          id="overview-content"
          className="mx-2 flex justify-between scroll-mt-30"
        >
          <div>
            <h2 className="text-2xl font-semibold">Drag and drop widgets</h2>
            <p className="text-sm text-muted-foreground">
              Customize your dashboard
            </p>
          </div>
          <Link
            href={`/${beach}/overview#overview-content`}
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
