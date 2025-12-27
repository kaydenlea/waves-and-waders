"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// Shared, premium dropdown/menu surface used by top/bottom nav actions.
// Standardized on Radix DropdownMenu (positioning + keyboard semantics), with `modal={false}` by default to avoid blocking map gestures.
const APP_MENU_CONTENT_CLASS = cn(
  "z-[90] min-w-[14rem] max-w-[min(22rem,calc(100vw-1.25rem))] overflow-hidden",
  "rounded-[16px] border border-border/50",
  "bg-background dark:bg-highlight-4",
  "shadow-[0_18px_55px_rgba(2,6,23,0.14),0_10px_28px_rgba(2,6,23,0.10),0_1px_0_rgba(255,255,255,0.06)]",
  "p-1",
  "origin-(--radix-dropdown-menu-content-transform-origin)",
  "outline-hidden",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  "duration-200 motion-reduce:duration-0"
);

const APP_MENU_ITEM_CLASS = cn(
  "relative flex min-h-11 select-none items-center gap-2 rounded-[12px] px-3 py-2 text-sm",
  "text-foreground/90",
  "outline-hidden",
  "cursor-pointer",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "data-[highlighted]:bg-foreground/5 data-[highlighted]:text-foreground",
  "active:bg-foreground/8",
  "focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-foreground/65"
);

const APP_MENU_LABEL_CLASS = cn(
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
  "select-none"
);

const APP_MENU_SEPARATOR_CLASS = cn("my-1 h-px bg-border/25");

function AppMenu({
  modal = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root modal={modal} {...props} />;
}

function AppMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>
) {
  return <DropdownMenuPrimitive.Trigger {...props} />;
}

const AppMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
    sideOffset?: number;
    collisionPadding?: number;
  }
>(
  (
    {
      className,
      sideOffset = 8,
      collisionPadding = 10,
      align = "end",
      ...props
    },
    ref
  ) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          APP_MENU_CONTENT_CLASS,
          "max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto overflow-x-hidden",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
);
AppMenuContent.displayName = "AppMenuContent";

function AppMenuGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>
) {
  return <DropdownMenuPrimitive.Group {...props} />;
}

function AppMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(APP_MENU_LABEL_CLASS, className)}
      {...props}
    />
  );
}

function AppMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn(APP_MENU_SEPARATOR_CLASS, className)}
      {...props}
    />
  );
}

function AppMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-variant={variant}
      className={cn(
        APP_MENU_ITEM_CLASS,
        variant === "destructive" &&
          "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:text-destructive/80",
        className
      )}
      {...props}
    />
  );
}

function AppMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(APP_MENU_ITEM_CLASS, "pl-10", className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function AppMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>
) {
  return <DropdownMenuPrimitive.RadioGroup {...props} />;
}

function AppMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(APP_MENU_ITEM_CLASS, "pl-10", className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function AppMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tabular-nums tracking-wider text-muted-foreground/80",
        className
      )}
      {...props}
    />
  );
}

function AppMenuSub(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>
) {
  return <DropdownMenuPrimitive.Sub {...props} />;
}

function AppMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(APP_MENU_ITEM_CLASS, className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4 text-foreground/50" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

const AppMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentProps<typeof DropdownMenuPrimitive.SubContent> & {
    sideOffset?: number;
    collisionPadding?: number;
  }
>(
  (
    {
      className,
      sideOffset = 10,
      collisionPadding = 10,
      alignOffset = -4,
      ...props
    },
    ref
  ) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      alignOffset={alignOffset}
      className={cn(APP_MENU_CONTENT_CLASS, className)}
      {...props}
    />
  )
);
AppMenuSubContent.displayName = "AppMenuSubContent";

function AppMenuHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        {icon ? (
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/5 ring-1 ring-border/25">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>
          {subtitle ? (
            <div className="truncate text-xs text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export {
  AppMenu,
  AppMenuTrigger,
  AppMenuContent,
  AppMenuGroup,
  AppMenuLabel,
  AppMenuSeparator,
  AppMenuItem,
  AppMenuCheckboxItem,
  AppMenuRadioGroup,
  AppMenuRadioItem,
  AppMenuShortcut,
  AppMenuSub,
  AppMenuSubTrigger,
  AppMenuSubContent,
  AppMenuHeader,
};
