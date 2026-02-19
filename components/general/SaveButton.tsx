"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useSessionContext,
  useSupabaseClient,
} from "@/lib/supabaseAuth";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

type SaveButtonProps = {
  beachId: string;
  className?: string;
  initialIsFav?: boolean;
  isFav?: boolean;
  variant?: "default" | "overlay";
  stopPropagation?: boolean;
  onChange?: (isFav: boolean) => void;
};

const SaveButton = ({
  beachId,
  className,
  initialIsFav = false,
  isFav: controlledIsFav,
  variant = "default",
  stopPropagation = false,
  onChange,
}: SaveButtonProps) => {
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const overviewPage = pathname.endsWith("/overview");

  const [localIsFav, setLocalIsFav] = useState(initialIsFav);
  const [loading, setLoading] = useState(false);

  const effectiveIsFav =
    controlledIsFav !== undefined ? controlledIsFav : localIsFav;

  useEffect(() => {
    if (controlledIsFav !== undefined) {
      setLocalIsFav(controlledIsFav);
    }
  }, [controlledIsFav]);

  const redirectPath = useMemo(() => {
    const search = searchParams?.toString();
    const current = `${pathname}${search ? `?${search}` : ""}`;
    return `/login?next=${encodeURIComponent(current)}`;
  }, [pathname, searchParams]);

  const handleClick = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    event.preventDefault();
    if (loading) return;
    if (!session) {
      router.push(redirectPath);
      return;
    }

    const nextIsFav = !effectiveIsFav;
    setLoading(true);

    try {
      if (nextIsFav) {
        const { error } = await supabase.from("user_favorite_beaches").upsert(
          {
            user_id: session.user.id,
            beach_id: beachId,
          },
          { onConflict: "user_id, beach_id" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_favorite_beaches")
          .delete()
          .eq("user_id", session.user.id)
          .eq("beach_id", beachId);
        if (error) throw error;
      }

      if (controlledIsFav === undefined) {
        setLocalIsFav(nextIsFav);
      }
      onChange?.(nextIsFav);
      toast(nextIsFav ? "Added to favorites" : "Removed from favorites", {
        icon: (
          <Heart
            className={cn(
              "h-4 w-4",
              nextIsFav
                ? "fill-rose-500 text-rose-400"
                : "text-muted-foreground"
            )}
          />
        ),
      });
      router.refresh();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to toggle favorite", error);
      }
      toast("Could not update favorite. Try again.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const baseClass =
    variant === "overlay"
      ? "group/button inline-flex items-center rounded-full bg-slate-900/70 p-2 text-white/90 backdrop-blur transition hover:bg-slate-900"
      : "group/button self-center inline-flex items-center rounded-full border border-border/25 bg-highlight-7 p-2 shadow-even supports-[backdrop-filter]:backdrop-blur-md transition-colors duration-200 motion-reduce:transition-none hover:bg-highlight-6/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0";

  const heartClass =
    variant === "overlay"
      ? effectiveIsFav
        ? "fill-rose-500 text-rose-400"
        : "text-white"
      : effectiveIsFav
      ? "fill-rose-500 text-rose-400"
      : "text-foreground";

  return (
    <button
      type="button"
      aria-label={effectiveIsFav ? "Remove from favorites" : "Add to favorites"}
      title={effectiveIsFav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        baseClass,
        className,
        overviewPage && "flex gap-1.5 @min-2xl:px-4 @min-2xl:py-2.5"
      )}
      onClick={handleClick}
      disabled={loading}
    >
      <Heart
        className={cn(
          "w-6 h-6 -mt-[1px] transition-colors",
          heartClass,
          loading && "opacity-60"
        )}
      />
      {overviewPage && (
        <span className="font-medium hidden @min-2xl:inline-block">
          Save <span className="hidden @min-4xl:inline-block">spot</span>
        </span>
      )}
    </button>
  );
};

export default SaveButton;
