"use client";

import dynamic from "next/dynamic";

export const LazyLoadTable = dynamic(() => import("../../visuals/StatTable"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-border bg-highlight-2 p-4">
      <ul>
        {Array.from({ length: 8 }).map((_, rowIdx) => (
          <li key={rowIdx} className="p-2">
            <div className="h-10 w-full rounded bg-highlight-3" />
          </li>
        ))}
      </ul>
    </div>
  ),
});
