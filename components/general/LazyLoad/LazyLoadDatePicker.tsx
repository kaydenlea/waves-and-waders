"use client";

import dynamic from "next/dynamic";

// Re-export with props passthrough so callers can pass beachId
export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
