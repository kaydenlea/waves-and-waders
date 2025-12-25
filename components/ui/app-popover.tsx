"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

function AppPopover(
  props: React.ComponentProps<typeof PopoverPrimitive.Root>
) {
  return <PopoverPrimitive.Root {...props} />;
}

function AppPopoverTrigger(
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>
) {
  return <PopoverPrimitive.Trigger {...props} />;
}

const AppPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentProps<typeof PopoverPrimitive.Content> & {
    collisionPadding?: number;
  }
>(
  (
    {
      className,
      align = "end",
      sideOffset = 8,
      collisionPadding = 10,
      ...props
    },
    ref
  ) => {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "z-[90] w-72 max-w-[min(22rem,calc(100vw-1.25rem))]",
            "rounded-[16px] border border-border/25",
            "bg-background/92 dark:bg-highlight-5/92",
            "shadow-[0_18px_55px_rgba(2,6,23,0.14),0_10px_28px_rgba(2,6,23,0.10),0_1px_0_rgba(255,255,255,0.06)]",
            "p-1",
            "origin-(--radix-popover-content-transform-origin)",
            "outline-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "duration-200 motion-reduce:duration-0",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  }
);
AppPopoverContent.displayName = "AppPopoverContent";

function AppPopoverAnchor(
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>
) {
  return <PopoverPrimitive.Anchor {...props} />;
}

export { AppPopover, AppPopoverTrigger, AppPopoverContent, AppPopoverAnchor };
