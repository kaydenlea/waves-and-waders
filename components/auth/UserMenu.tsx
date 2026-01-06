"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { LogIn, LogOut, User, UserCircle2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import {
  AppMenu,
  AppMenuContent,
  AppMenuHeader,
  AppMenuItem,
  AppMenuSeparator,
  AppMenuTrigger,
} from "@/components/ui/app-menu";

export const UserMenu = ({
  landingPage = false,
}: {
  landingPage?: boolean;
}) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const onResize = () => setOpen(false);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize, { passive: true });
      return () => window.removeEventListener("resize", onResize);
    }
  }, []);

  const effectiveUser = mounted ? user : null;

  if (!effectiveUser) {
    return (
      <Link
        className={cn(
          "px-2 flex-1 rounded-md hover:bg-highlight-5 py-1.5 w-full text-left flex items-center gap-2",
          landingPage
            ? "@min-md:text-center @min-md:pl-[13px] @min-md:rounded-full @min-md:py-3 @min-md:w-20"
            : "@min-5xl:text-center @min-5xl:pl-[13px] @min-5xl:rounded-full @min-5xl:py-3 @min-5xl:w-20"
        )}
        href="/login"
      >
        <LogIn
          className={cn(
            "w-5 h-5 -mt-0.5 block",
            landingPage ? "@min-md:hidden" : "@min-5xl:hidden"
          )}
        />
        <span
          className={cn(
            "text-base font-normal",
            landingPage ? "@min-md:font-medium" : "@min-5xl:font-medium"
          )}
        >
          Sign in
        </span>
      </Link>
    );
  }

  const displayEmail = effectiveUser.email ?? "Account";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const UserMenuPopover = () => {
    return (
      <AppMenu open={open} onOpenChange={setOpen}>
        <AppMenuTrigger className="icon-button p-2.5 dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3 rounded-full">
          <UserCircle2 className="h-6 w-6" />
        </AppMenuTrigger>
        <AppMenuContent align="end" className="w-72">
          <AppMenuHeader
            title="Account"
            subtitle={displayEmail}
            icon={<User className="h-4 w-4" />}
          />
          <AppMenuSeparator />
          <AppMenuItem
            asChild
            onSelect={() => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("tab:/beaches", "saved");
                }
              } catch {}
              setOpen(false);
            }}
          >
            <Link href="/beaches?tab=saved">
              <Heart className="w-5 h-5 -mt-0.5" /> Saved spots
            </Link>
          </AppMenuItem>
          <AppMenuSeparator />
          <AppMenuItem
            variant="destructive"
            onSelect={() => {
              setOpen(false);
              void handleSignOut();
            }}
          >
            <LogOut className="h-5 w-5" /> Sign out
          </AppMenuItem>
        </AppMenuContent>
      </AppMenu>
    );
  };

  return <UserMenuPopover />;
};
