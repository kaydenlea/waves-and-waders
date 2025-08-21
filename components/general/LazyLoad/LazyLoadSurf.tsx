"use client";

import dynamic from "next/dynamic";

export const LazyLoadSurf = dynamic(() => import("../../graphs/SurfChart"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
