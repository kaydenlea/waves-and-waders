import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ElementType } from "react";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
// Popover handled inside client subcomponent
import { UserMenuServer } from "@/components/auth/UserMenuServer";
import { cn } from "@/lib/utils";
import NavBarActions from "./NavBarActions";
import NavMoreMenu from "./NavMoreMenu";
import MarketingSearchButton from "@/components/general/MarketingSearchButton";
import { HandHeart } from "lucide-react";
import { BrandWordmark } from "@/components/general/BrandWordmark";

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

const NavBar = ({
  landingPage,
  beachesPage,
  variant = "app",
  centerMode = "links",
}: {
  landingPage?: boolean;
  beachesPage?: boolean;
  variant?: "app" | "marketing";
  centerMode?: "links" | "search";
}) => {
  const marketingLinks: { href: string; label: string; icon?: ElementType }[] =
    [
      { href: "/#features", label: "Features" },
      { href: "/#personalize", label: "Personalize" },
      { href: "/#forecast", label: "Forecasts" },
      { href: "/#why", label: "Essentials" },
      { href: "/donate?from=navbar", label: "Donate", icon: HandHeart },
    ];

  const marketingLinksCompact: {
    href: string;
    label: string;
    icon?: ElementType;
  }[] = [
    { href: "/#why", label: "Features" },
    { href: "/#faq", label: "FAQ" },
    { href: "/donate?from=navbar", label: "Donate", icon: HandHeart },
  ];

  const marketingMenuLinks: {
    href: string;
    label: string;
    iconKey: "contact" | "donate" | "privacy" | "terms";
  }[] = [
    { href: "/donate?from=menu", label: "Donate", iconKey: "donate" },
    { href: "/contact?from=menu", label: "Contact", iconKey: "contact" },
    { href: "/privacy", label: "Privacy", iconKey: "privacy" },
    { href: "/terms", label: "Terms", iconKey: "terms" },
  ];

  return (
    <header
      className={cn(
        "fixed @min-4xl:p-0 z-50 w-full @container touch-pan-y",
        beachesPage && "px-1.5 pt-1.5 hidden @min-4xl:block",
      )}
    >
      <nav
        aria-label="primary navigation"
        className={cn(
          "@min-4xl:py-11 @min-4xl:h-27.5 relative flex items-center justify-between rounded-3xl @min-4xl:rounded-2xl @min-4xl:rounded-t-none w-full",
          landingPage
            ? [
                "py-6 @min-md:py-7",
                "bg-transparent",
                "supports-[backdrop-filter]:backdrop-blur-xl",
                "border border-border/1 rounded-t-none rounded-b-lg",
              ]
            : [
                "@min-4xl:bg-background py-3",
                "@min-4xl:border @min-4xl:border-border/70 @min-4xl:shadow-none",
              ],
          beachesPage && "shadow-even",
          !landingPage && !beachesPage ? "px-2 @min-4xl:px-6" : "px-6",
        )}
      >
        {/* <Link href="/" className="p-3 icon-button">
          Logo
        </Link> */}
        <Link
          href="/"
          className={cn(
            "group items-center gap-2 outline-none",
            !landingPage && !beachesPage
              ? "hidden @min-4xl:inline-flex"
              : beachesPage
                ? "hidden @min-xl:inline-flex"
                : "inline-flex",
          )}
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-xl">
            <Image
              src="/logo.png"
              alt="Waves & Waders logo"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <BrandWordmark
            className="text-lg font-semibold tracking-tight text-foreground"
            spacing="-mt-2.5"
          />
        </Link>

        {variant === "marketing" ? (
          centerMode === "search" ? (
            <div className="absolute left-1/2 -translate-x-1/2 w-full hidden @min-3xl:block @min-3xl:max-w-100 @min-4xl:max-w-120 @min-6xl:max-w-150 px-2">
              <SearchBar
                className="justify-center"
                subtitle={"Directory \u00b7 Nearby \u00b7 Saved"}
                showMapButton={false}
                desktopClassName="hidden @min-md:flex w-full max-w-none"
              />
            </div>
          ) : (
            <>
              <div className="hidden @min-2xl:flex @min-6xl:hidden absolute left-1/2 -translate-x-1/2 w-full max-w-[min(32rem,calc(100%-18rem))] items-center justify-center gap-5 text-sm font-medium text-foreground/75 whitespace-nowrap">
                {marketingLinksCompact.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-1 py-1 transition hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
                      item.label === "Donate"
                        ? "inline-flex items-center gap-2"
                        : undefined,
                    )}
                  >
                    {item.icon &&
                      React.createElement(item.icon, {
                        className: "h-4 w-4 text-foreground/70",
                        "aria-hidden": true,
                      })}
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="hidden @min-6xl:flex absolute left-1/2 -translate-x-1/2 w-full max-w-[min(40rem,calc(100%-18rem))] items-center justify-center gap-5 text-sm font-medium text-foreground/75 whitespace-nowrap">
                {marketingLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-1 py-1 transition hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
                      item.label === "Donate"
                        ? "inline-flex items-center gap-2"
                        : undefined,
                    )}
                  >
                    {item.icon &&
                      React.createElement(item.icon, {
                        className: "h-4 w-4 text-foreground/70",
                        "aria-hidden": true,
                      })}
                    {item.label}
                  </Link>
                ))}
              </div>
            </>
          )
        ) : null}

        {variant === "marketing" ? null : <NavBarActions />}
        {/* {landingPage && (
          <div className="gap-10 justify-center mr-8 hidden @min-lg:flex @min-4xl:hidden">
            <Link
              className="text-foreground transition hover:text-foreground"
              href="#"
            >
              Features
            </Link>
            <Link
              className="text-foreground transition hover:text-foreground"
              href="#"
            >
              Personalize
            </Link>
            <Link
              className="text-foreground transition hover:text-foreground"
              href="#"
            >
              Why Us
            </Link>
          </div>
        )} */}
        {/* {beachesPage && <ToggleFilters />} */}
        <div
          className={cn(
            "items-center gap-2",
            landingPage ? "flex" : "hidden @min-4xl:flex",
          )}
        >
          <div
            className={cn(
              // landingPage ? "hidden @min-md:flex" : "hidden @min-5xl:flex"
              landingPage ? "hidden @min-5xl:flex" : "hidden @min-4xl:flex",
            )}
          >
            <UserMenuServer landingPage={landingPage} />
          </div>
          {variant === "marketing" ? (
            <MarketingSearchButton
              className={cn(centerMode === "search" && "@min-3xl:hidden")}
            />
          ) : null}
          {variant === "marketing" ? (
            // Mounted to render the overlay portal when the marketing search button opens it.
            <SearchBar className="hidden" />
          ) : null}
          {variant === "marketing" ? null : (
            <SearchBar className="max-w-[12rem] sm:max-w-none @min-4xl:hidden" />
          )}
          <ThemeToggle className="hidden @min-5xl:flex" />
          <NavMoreMenu
            landingPage={landingPage}
            links={
              variant === "marketing" ? marketingMenuLinks : marketingMenuLinks
            }
          />
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
