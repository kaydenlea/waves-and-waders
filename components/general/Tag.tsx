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
        className: cn("h-3.5 w-3.5 text-inherit", data.icon.props.className),
      })
    : data.icon;

  return (
    <div
      className={cn(
        "shrink-0 inline-flex flex-none items-center gap-2 rounded-full border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors",
        "backdrop-blur-sm dark:border-border/30 dark:text-background",
        data.color,
        className
      )}
    >
      <span className="flex items-center text-inherit [&>svg]:text-inherit">
        {iconNode}
      </span>
      <span className="leading-tight text-inherit">{data.label}</span>
    </div>
  );
};

export default Tag;
