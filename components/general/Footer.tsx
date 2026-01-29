import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/components/general/BrandWordmark";

const Footer = ({ className }: { className?: string }) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "touch-pan-y relative z-20 w-full border-t border-border/10 bg-highlight-3 @min-4xl:rounded-t-xl",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12 md:items-start">
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-border/20 bg-background/40 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="Waves and Waders"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </span>
              <BrandWordmark className="font-semibold tracking-tight text-foreground" />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/60">
              Surf forecasts, beach discovery, and planning tools built for
              coastal sessions.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/donate?from=footer"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                Support
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full border border-border/40 bg-background/40 px-4 py-2 text-sm font-medium text-foreground/85 shadow-xs transition hover:bg-background/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Desktop columns */}
          <div className="hidden md:col-span-8 md:grid md:grid-cols-3 md:gap-10 md:justify-items-start md:justify-self-end">
            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-wider text-foreground/70 uppercase">
                Tools
              </div>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/beaches?tab=nearby"
                  >
                    Beaches
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/beaches?tab=saved"
                  >
                    Favorites
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-wider text-foreground/70 uppercase">
                Resources
              </div>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/contact"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/donate?from=footer"
                  >
                    Donate
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/login"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold tracking-wider text-foreground/70 uppercase">
                Legal
              </div>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/privacy"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    className="transition hover:text-foreground"
                    href="/terms"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile/tablet accordions (no JS) */}
          <div className="md:hidden">
            <div className="divide-y divide-border/10 rounded-2xl border border-border/20 bg-background/30">
              <details className="group px-4">
                <summary className="flex list-none cursor-pointer items-center justify-between py-4 text-sm font-semibold text-foreground/80 [&::-webkit-details-marker]:hidden">
                  Product
                  <ChevronDown
                    className="h-4 w-4 text-foreground/50 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-4 text-sm text-foreground/60">
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/beaches?tab=nearby"
                    >
                      Beaches
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/beaches?tab=saved"
                    >
                      Favorites
                    </Link>
                  </li>
                </ul>
              </details>

              <details className="group px-4">
                <summary className="flex list-none cursor-pointer items-center justify-between py-4 text-sm font-semibold text-foreground/80 [&::-webkit-details-marker]:hidden">
                  Resources
                  <ChevronDown
                    className="h-4 w-4 text-foreground/50 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-4 text-sm text-foreground/60">
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/contact"
                    >
                      Contact
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/donate?from=footer"
                    >
                      Donate
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/login"
                    >
                      Sign in
                    </Link>
                  </li>
                </ul>
              </details>

              <details className="group px-4">
                <summary className="flex list-none cursor-pointer items-center justify-between py-4 text-sm font-semibold text-foreground/80 [&::-webkit-details-marker]:hidden">
                  Legal
                  <ChevronDown
                    className="h-4 w-4 text-foreground/50 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-4 text-sm text-foreground/60">
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/privacy"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      className="transition hover:text-foreground"
                      href="/terms"
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/10 pt-6 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/50">
            {/*
            © {year} Waves and Waders
            */}
            © {year} <BrandWordmark variant="inline" />
          </p>
          <p className="text-xs text-foreground/50">
            Forecast data is built from public sources.{" "}
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/privacy"
            >
              Privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
