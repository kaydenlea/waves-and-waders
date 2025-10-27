"use client";

import React from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AlignJustify, Heart, MapPinned } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/UserMenu";
import { useUser } from "@supabase/auth-helpers-react";

export default function NavMoreMenu({
  landingPage = false,
}: {
  landingPage?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const user = useUser();
  React.useEffect(() => {
    const onResize = () => setOpen(false);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="icon-button p-3 dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3">
        <AlignJustify className="icon-md" />
      </PopoverTrigger>
      <PopoverContent align="end" className="z-50 max-w-50 flex flex-col gap-1">
        <Link
          className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex items-center gap-2"
          href="/beaches"
        >
          <MapPinned className="w-5 h-5 -mt-0.5" /> Browse spots
        </Link>
        <Link
          className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex items-center gap-2"
          href="/favorites"
        >
          <Heart className="w-5 h-5 -mt-0.5" /> Saved spots
        </Link>
        <div className="@min-5xl:hidden border-t border-border/40 my-1" />
        <ThemeToggle switchMode />
        {!user && (
          <div
            className={cn(
              "border-t border-border/40 pt-1.5 mt-1.5 flex",
              landingPage ? "@min-md:hidden" : "@min-5xl:hidden"
            )}
          >
            <UserMenu />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
