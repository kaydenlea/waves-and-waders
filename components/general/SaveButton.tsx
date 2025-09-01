import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

const SaveButton = ({
  isFav,
  className,
}: {
  isFav?: boolean;
  className?: string;
}) => {
  return (
    <button
      // onClick={() => onToggleFavorite(b.id)}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "group/button self-center rounded-full bg-highlight-5 backdrop-blur p-2 transition hover:bg-highlight-3",
        className
      )}
    >
      <Heart
        className={`w-5 h-5 @min-sm:w-6 @min-sm:h-6 ${
          isFav
            ? "fill-rose-500 text-rose-400 group-hover/button:fill-none group-hover/button:text-foreground"
            : "text-foreground group-hover/button:fill-rose-500 group-hover/button:text-rose-400"
        }`}
      />
    </button>
  );
};

export default SaveButton;
