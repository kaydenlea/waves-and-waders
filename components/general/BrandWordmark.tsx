import { cn } from "@/lib/utils";

export function BrandWordmark({
  className,
  spacing,
}: {
  className?: string;
  spacing?: string;
}) {
  return (
    <span className={cn("inline-grid leading-none gap-y-0.5", className)}>
      <span className="w-full">
        Waves<span className="ml-[3px] text-[14px] font-medium">&</span>
      </span>
      <span className={cn("w-full tracking-[0.1px]", spacing)}>Waders</span>
    </span>
  );
}
