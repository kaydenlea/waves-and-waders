import Link from "next/link";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import { AlignJustify, Heart, MapPinned, Waves } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { UserMenu } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";

{
  /* <div className="mx-auto flex items-center justify-between px-4 py-5.5 sm:px-6">
  <Link href="#" className="group inline-flex items-center gap-2 outline-none">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-foreground shadow-lg shadow-cyan-500/20">
      <Waves className="h-6 w-6" aria-hidden />
    </div>
    <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
      Waves<span className="ml-[0.9]">&</span>Waders
    </span>
    <span className="text-lg font-semibold tracking-tight text-foreground sm:hidden">
      W&W
    </span>
  </Link>
  <nav className="text-lg hidden items-center gap-6 md:flex">
    <Link
      className="text-foreground transition hover:text-foreground"
      href="#nearby"
    >
      Nearby
    </Link>
    <Link
      className="text-foreground transition hover:text-foreground"
      href="#saved"
    >
      Saved
    </Link>
    <Link
      className="text-foreground transition hover:text-foreground"
      href="#why"
    >
      Why Us
    </Link>
  </nav>
  <div className="flex items-center gap-2.5">
    <button
      onClick={() => setUseMiles((p) => !p)}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
      aria-label="Toggle miles/kilometers"
    >
      {useMiles ? "mi" : "km"}
    </button>
    <Link
      href="/"
      className="whitespace-nowrap flex items-center font-medium text-foreground hidden md:flex hover:bg-highlight-3 px-2.5 py-3 rounded-full"
    >
      Sign in
    </Link>
    <Link
      href="#search"
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
    >
      <Search className="h-5 w-5" strokeWidth={3} />
    </Link>
    <ThemeToggle className="p-3 hover:bg-highlight-3 text-foreground hidden md:block" />
    <button
      aria-label="more options"
      className="icon-button p-3 hover:bg-highlight-3 text-foreground md:hidden"
    >
      <AlignJustify className="icon-md" />
    </button>
  </div>
</div>; */
}

const NavBar = ({ landingPage = false }: { landingPage?: boolean }) => {
  return (
    <header
      className={cn(
        "fixed @min-4xl:p-0 z-50 w-full @container backdrop-blur-md",
        !landingPage && "px-1.5 pt-1.5"
      )}
    >
      <nav
        aria-label="primary navigation"
        className={cn(
          "h-23 flex items-center justify-between px-6 bg-background rounded-md @min-4xl:rounded-t-none w-full",
          !landingPage && "border border-border shadow-md"
        )}
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
            <PopoverContent className="z-50 max-w-50 flex flex-col">
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
                <Heart className="w-5 h-5 -mt-0.5" />
                Saved spots
              </Link>
              <ThemeToggle switchMode />
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
