import { cn } from "@/lib/utils";

export function BrandWordmark({
  className,
  spacing,
  variant = "stacked",
}: {
  className?: string;
  spacing?: string;
  variant?: "stacked" | "inline";
}) {
  if (variant === "inline") {
    return (
      <span
        className={cn("inline-flex items-baseline leading-none", className)}
      >
        <span>Waves</span>
        <span className="mx-[3px] text-[12px] font-normal">&</span>
        <span className={cn("tracking-[0.1px]", spacing)}>Waders</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-grid leading-none gap-y-0.5", className)}>
      <span className="w-full">
        Waves<span className="ml-[3px] text-[14px] font-medium">&</span>
      </span>
      <span className={cn("w-full tracking-[0.1px]", spacing)}>Waders</span>
    </span>
  );
}
