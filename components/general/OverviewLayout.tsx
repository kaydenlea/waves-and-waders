"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import Dashboard from "@/components/general/Dashboard";
import { Pencil } from "lucide-react";
import OverviewContent from "./OverviewContent";

const OverviewLayout = () => {
  const [edit, setEdit] = React.useState(false);
  return (
    <section className="flex flex-col gap-2 w-full mb-2">
      <div className="mx-2 flex justify-between">
        <header>
          <h2 className="text-2xl font-semibold">Daily Forecast</h2>
          <p className="text-sm">An insight into the forecast of any day</p>
        </header>
        <Button
          aria-label="edit layout"
          size="icon"
          variant="outline"
          className="border border-border bg-background rounded-full drop-shadow-sm"
          onClick={() => setEdit(!edit)}
        >
          <Pencil />
        </Button>
      </div>
      {edit ? <Dashboard /> : <OverviewContent />}
    </section>
  );
};

export default OverviewLayout;
