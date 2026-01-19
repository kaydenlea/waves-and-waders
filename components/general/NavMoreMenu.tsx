"use client";

import React from "react";
import Link from "next/link";
import {
  AlignJustify,
  HandHeart,
  Heart,
  Home,
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
  bottomNavMode = false,
}: {
  landingPage?: boolean;
  links?: MenuLink[];
  bottomNavMode?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const user = useUser();
  const savedSpotsHref = user
    ? "/beaches?tab=saved"
    : `/login?next=${encodeURIComponent("/beaches?tab=saved")}`;
  React.useEffect(() => {
    const onResize = () => setOpen(false);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <AppMenu open={open} onOpenChange={setOpen}>
      <AppMenuTrigger
        id={bottomNavMode ? "nav-more-trigger-bottom" : "nav-more-trigger-top"}
        className={
          bottomNavMode
            ? "text-foreground/80 font-medium hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
            : "icon-button p-3 dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3"
        }
        aria-label="more options"
      >
        <AlignJustify
          className={
            bottomNavMode
              ? "w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5"
              : "icon-md"
          }
        />
        {bottomNavMode ? (
          <span className="text-xs sr-only @min-[350px]:not-sr-only">More</span>
        ) : null}
      </AppMenuTrigger>
      <AppMenuContent
        align="end"
        sideOffset={bottomNavMode ? 10 : undefined}
        className="w-72"
      >
        {bottomNavMode ? (
          <AppMenuItem
            asChild
            onSelect={() => {
              setOpen(false);
            }}
          >
            <Link href="/">
              <Home className="w-5 h-5 -mt-0.5" /> Home
            </Link>
          </AppMenuItem>
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
          <Link href="/beaches?tab=nearby">
            <MapPinned className="w-5 h-5 -mt-0.5" /> Browse spots
          </Link>
        </AppMenuItem>
        <AppMenuItem
          asChild
          onSelect={() => {
            try {
              if (user && typeof window !== "undefined") {
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
        {!user && (
          <>
            <AppMenuSeparator
              className={cn(
                landingPage ? "@min-5xl:hidden" : "@min-5xl:hidden"
              )}
            />
            <AppMenuItem
              asChild
              className={cn(
                landingPage ? "@min-5xl:hidden" : "@min-5xl:hidden"
              )}
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
        {links?.length ? (
          <>
            <AppMenuSeparator />
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
          </>
        ) : null}
      </AppMenuContent>
    </AppMenu>
  );
}
