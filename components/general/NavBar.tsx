"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import { AlignJustify, Waves } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { UserMenu } from "@/components/auth/UserMenu";

const NavBar = () => {
  return (
    <header className="fixed px-1.5 pt-1.5 @min-4xl:p-0 z-50 w-full @container backdrop-blur-md">
      <nav
        aria-label="primary navigation"
        className="h-23 flex items-center justify-between px-6 shadow-md bg-background rounded-md @min-4xl:rounded-t-none w-full border border-border"
      >
        {/* <Link href="/" className="p-3 icon-button">
          Logo
        </Link> */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 outline-none"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
            <Waves className="h-6 w-6" aria-hidden />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground flex flex-col @min-md:flex-row">
            <span className="-mb-2 @min-md:mb-0">
              Waves<span className="ml-[0.9]">&</span>
            </span>
            <span>Waders</span>
          </span>
        </Link>
        <SearchBar className="max-w-[12rem] sm:max-w-none hidden @min-4xl:flex" />
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex">
            <UserMenu />
          </div>
          <SearchBar className="max-w-[12rem] sm:max-w-none @min-4xl:hidden" />
          <ThemeToggle className="hide-button" />
          <Popover>
            <PopoverTrigger className="icon-button p-3 hover:bg-highlight-5">
              <AlignJustify className="icon-md" />
            </PopoverTrigger>
            <PopoverContent className="z-50 max-w-50 flex flex-col gap-1">
              <Link
                className="hover:bg-highlight-5 px-2 py-0.5 rounded-md"
                href="/beaches"
              >
                Browse beaches
              </Link>
              <Link
                className="hover:bg-highlight-5 px-2 py-0.5 rounded-md"
                href="/favorites"
              >
                Your favorites
              </Link>
              <div className="sm:hidden border-t border-border/40 pt-1.5 mt-1.5 flex">
                <UserMenu />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
