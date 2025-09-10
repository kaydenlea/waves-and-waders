"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = {
  beachId?: string | number;
};

const InteractiveMap = dynamic<React.ComponentProps<any>>(
  () => import("../../visuals/InteractiveMap"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadMap: React.FC<Props> = (props) => {
  return <InteractiveMap {...props} />;
};
