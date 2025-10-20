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

export const UserMenu = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  if (!user) {
    return (
      <Link
        className="px-2 flex-1 rounded-md sm:rounded-full hover:bg-highlight-5 py-1.5 sm:py-3 w-full sm:w-18 text-left sm:text-center flex items-center gap-2"
        href="/login"
      >
        <LogIn className="w-5 h-5 -mt-0.5 block sm:hidden" />
        <span className="text-base font-normal sm:font-medium">Sign in</span>
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
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm outline-none ring-offset-background transition hover:bg-highlight-3 focus-visible:ring-2 focus-visible:ring-primary/50">
        <UserCircle2 className="h-5 w-5" />
        <span className="hidden sm:inline">{displayEmail}</span>
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
