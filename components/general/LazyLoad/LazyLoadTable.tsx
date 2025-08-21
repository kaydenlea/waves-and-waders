"use client";

import dynamic from "next/dynamic";

export const LazyLoadTable = dynamic(() => import("../../visuals/StatTable"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
