import { cn } from "@/lib/utils";

const Tag = ({
  data,
}: {
  data: { label: string; icon: React.ReactNode; color: string };
}) => {
  return (
    <div
      className={cn(
        // Prevent wrapping inside tag; allow tag to expand horizontally
        "inline-flex flex-none items-center justify-center gap-1 py-2 px-4 rounded-full border border-border/20 whitespace-nowrap",
        data.color
      )}
    >
      {data.icon}
      <span className="text-xs whitespace-nowrap">{data.label}</span>
    </div>
  );
};

export default Tag;
