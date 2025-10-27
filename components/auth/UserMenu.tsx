"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { LogIn, LogOut, User, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const UserMenu = ({
  landingPage = false,
}: {
  landingPage?: boolean;
}) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  if (!user) {
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

  const displayEmail = user.email ?? "Account";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="icon-button inline-flex items-center gap-2 rounded-full dark:bg-highlight-5 p-2.5 text-sm font-medium outline-none ring-offset-background transition hover:bg-highlight-3 dark:hover:bg-highlight-3 focus-visible:ring-2 focus-visible:ring-primary/50">
        <UserCircle2 className="h-6 w-6" />
        {/* <span className="hidden sm:inline">{displayEmail}</span> */}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {displayEmail}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/favorites">Favorite beaches</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
