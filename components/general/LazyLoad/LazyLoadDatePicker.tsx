"use client";

import dynamic from "next/dynamic";

export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse h-27 @min-3xl:h-31 w-full bg-highlight-4 px-2 py-3 rounded-t-xl shadow-even" />
  ),
});
