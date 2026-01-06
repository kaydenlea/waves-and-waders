"use client";

import React from "react";
import Link from "next/link";
import {
  AlignJustify,
  HandHeart,
  Heart,
  LogIn,
  Mail,
  MapPinned,
  ScrollText,
  Shield,
} from "lucide-react";
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

type MenuLink = {
  href: string;
  label: string;
  iconKey?: "contact" | "donate" | "privacy" | "terms";
};

const iconMap: Record<NonNullable<MenuLink["iconKey"]>, React.ElementType> = {
  contact: Mail,
  donate: HandHeart,
  privacy: Shield,
  terms: ScrollText,
};

export default function NavMoreMenu({
  landingPage = false,
  links,
}: {
  landingPage?: boolean;
  links?: MenuLink[];
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const user = useUser();
  const effectiveUser = mounted ? user : null;
  const savedSpotsHref = effectiveUser
    ? "/beaches?tab=saved"
    : `/login?next=${encodeURIComponent("/beaches?tab=saved")}`;
  React.useEffect(() => {
    setMounted(true);
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
        {links?.length ? (
          <>
            {links.map((item) => (
              <AppMenuItem
                key={item.href}
                asChild
                onSelect={() => {
                  setOpen(false);
                }}
              >
                <Link href={item.href}>
                  {item.iconKey &&
                    React.createElement(iconMap[item.iconKey], {
                      className: "w-5 h-5 -mt-0.5",
                    })}
                  {item.label}
                </Link>
              </AppMenuItem>
            ))}
            <AppMenuSeparator />
          </>
        ) : null}
        <AppMenuItem
          asChild
          onSelect={() => {
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("tab:/beaches", "nearby");
              }
            } catch {}
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
            try {
              if (effectiveUser && typeof window !== "undefined") {
                window.localStorage.setItem("tab:/beaches", "saved");
              }
            } catch {}
            setOpen(false);
          }}
        >
          <Link href={savedSpotsHref}>
            <Heart className="w-5 h-5 -mt-0.5" /> Saved spots
          </Link>
        </AppMenuItem>
        <AppMenuSeparator className="@min-5xl:hidden" />
        <ThemeToggle switchMode />
        {!effectiveUser && (
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
