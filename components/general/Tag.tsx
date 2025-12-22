import React from "react";
import { cn } from "@/lib/utils";

const Tag = ({
  data,
  className,
}: {
  data: { label: string; icon: React.ReactNode; color: string };
  className?: string;
}) => {
  const iconNode = React.isValidElement<{ className?: string }>(data.icon)
    ? React.cloneElement(data.icon, {
        className: cn("h-4 w-4 text-inherit", data.icon.props.className),
      })
    : data.icon;

  return (
    <div
      className={cn(
        "shrink-0 inline-flex flex-none items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium",
        "bg-background/60 text-foreground/90 shadow-even backdrop-blur-sm",
        "dark:bg-foreground/5 dark:text-foreground/90",
        className
      )}
    >
      <span
        className={cn(
          "grid place-items-center size-6 rounded-full border border-border/25",
          "text-slate-900/80",
          data.color
        )}
        aria-hidden="true"
      >
        <span className="flex items-center text-inherit [&>svg]:text-inherit">
          {iconNode}
        </span>
      </span>
      <span className="leading-tight text-inherit whitespace-nowrap">
        {data.label}
      </span>
    </div>
  );
};

export default Tag;
