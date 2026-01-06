"use client";

import * as React from "react";
import Link from "next/link";
import {
  HandHeart,
  MessageSquareHeart,
  Square,
  SquareStop,
} from "lucide-react";

import { cn } from "@/lib/utils";

const AMOUNTS = [1, 3, 5] as const;
type Amount = (typeof AMOUNTS)[number] | "custom";

export default function DonateOptionsCard({
  className,
}: {
  className?: string;
}) {
  const [amount, setAmount] = React.useState<Amount>(3);

  const donateHref =
    amount === "custom"
      ? "/donate?from=section"
      : `/donate?from=section&amount=${amount}`;

  return (
    <div
      className={cn(
        "ww-reveal rounded-3xl border border-border/50 bg-background/60 p-5 shadow-lg shadow-black/10 ring-1 ring-black/5",
        "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full border border-border/50 bg-background/60"
            >
              <SquareStop className="h-4 w-4" />
            </span>
            Donate with Square
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Pick an amount (or choose custom).
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-highlight-5/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/80">
          Secure
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold tracking-wide text-foreground/65 dark:text-foreground/75">
          Suggested
        </div>
        <div className="mt-2 flex flex-wrap gap-2" role="list">
          {AMOUNTS.map((value) => {
            const selected = amount === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm",
                  "transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-border/70 bg-foreground text-background"
                    : "border-border/50 bg-background/50 text-foreground/80 hover:bg-background/70"
                )}
                aria-pressed={selected}
              >
                ${value}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAmount("custom")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              amount === "custom"
                ? "border-border/70 bg-foreground text-background"
                : "border-border/50 bg-background/50 text-foreground/70 hover:bg-background/70"
            )}
            aria-pressed={amount === "custom"}
          >
            Custom
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={donateHref}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-sm",
            "transition-opacity duration-200 motion-reduce:transition-none hover:opacity-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        >
          <HandHeart className="h-4 w-4" aria-hidden="true" />
          Donate
        </Link>
        <Link
          href="/contact?from=donate-section"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full border border-border/50 bg-background/50 px-5 py-3 text-sm font-medium text-foreground shadow-sm",
            "transition-colors duration-200 motion-reduce:transition-none hover:bg-background/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        >
          <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
          Feedback
        </Link>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Donations are voluntary and not a purchase.
      </p>
    </div>
  );
}
