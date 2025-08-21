"use client";

import dynamic from "next/dynamic";

export const LazyLoadMap = dynamic(
  () => import("../../visuals/InteractiveMap"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
