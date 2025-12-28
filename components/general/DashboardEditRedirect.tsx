"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { DashboardType } from "@/components/general/dashboardLayout";
import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";

type Props = {
  beachParam: string;
  type: DashboardType;
};

export default function DashboardEditRedirect({ beachParam, type }: Props) {
  const router = useRouter();
  const { enterEdit } = useDashboardEditMode();

  React.useEffect(() => {
    enterEdit(type);
    const href =
      type === "forecast"
        ? `/${beachParam}/overview?tab=forecast`
        : `/${beachParam}/overview`;
    router.replace(href);
  }, [beachParam, enterEdit, router, type]);

  return (
    <div className="mx-auto mt-10 w-full max-w-xl rounded-2xl border border-border/40 bg-highlight-4 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-highlight-5 border-t-transparent animate-spin" />
        <div className="space-y-1">
          <div className="text-sm font-semibold">Opening editor…</div>
          <div className="text-sm text-muted-foreground">
            Redirecting to the overview editor.
          </div>
        </div>
      </div>
    </div>
  );
}

