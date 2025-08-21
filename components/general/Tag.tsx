import { cn } from "@/lib/utils";

const Tag = ({
  data,
}: {
  data: { label: string; icon: React.ReactNode; color: string };
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 py-1.5 px-4 rounded-md border border-border",
        data.color
      )}
    >
      {data.icon}
      <span className="text-xs">{data.label}</span>
    </div>
  );
};

export default Tag;
