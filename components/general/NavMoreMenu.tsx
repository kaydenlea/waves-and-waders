"use client";

import React from "react";
import Link from "next/link";
import { AlignJustify, Heart, LogIn, MapPinned } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { useUser } from "@supabase/auth-helpers-react";
import {
  AppMenu,
  AppMenuContent,
  AppMenuItem,
  AppMenuSeparator,
  AppMenuTrigger,
} from "@/components/ui/app-menu";

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
    <AppMenu open={open} onOpenChange={setOpen}>
      <AppMenuTrigger className="icon-button p-3 dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3">
        <AlignJustify className="icon-md" />
      </AppMenuTrigger>
      <AppMenuContent align="end" className="w-72">
        <AppMenuItem
          asChild
          onSelect={() => {
            setOpen(false);
          }}
        >
          <Link href="/beaches">
            <MapPinned className="w-5 h-5 -mt-0.5" /> Browse spots
          </Link>
        </AppMenuItem>
        <AppMenuItem
          asChild
          onSelect={() => {
            setOpen(false);
          }}
        >
          <Link href="/favorites">
            <Heart className="w-5 h-5 -mt-0.5" /> Saved spots
          </Link>
        </AppMenuItem>
        <AppMenuSeparator className="@min-5xl:hidden" />
        <ThemeToggle switchMode />
        {!user && (
          <>
            <AppMenuSeparator
              className={cn(landingPage ? "@min-md:hidden" : "@min-5xl:hidden")}
            />
            <AppMenuItem
              asChild
              className={cn(landingPage ? "@min-md:hidden" : "@min-5xl:hidden")}
              onSelect={() => {
                setOpen(false);
              }}
            >
              <Link href="/login">
                <LogIn className="w-5 h-5 -mt-0.5" /> Sign in
              </Link>
            </AppMenuItem>
          </>
        )}
      </AppMenuContent>
    </AppMenu>
  );
}
