"use client";

import dynamic from "next/dynamic";

export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
