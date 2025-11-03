"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

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
      router.refresh();
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    } finally {
      setLoading(false);
    }
  };

  const baseClass =
    variant === "overlay"
      ? "group/button inline-flex items-center rounded-full bg-slate-900/70 p-2 text-white/90 backdrop-blur transition hover:bg-slate-900"
      : "group/button self-center rounded-full bg-highlight-5 backdrop-blur p-2 transition hover:bg-highlight-3";

  const heartClass =
    variant === "overlay"
      ? effectiveIsFav
        ? "fill-rose-500 text-rose-400"
        : "text-white group-hover/button:fill-rose-500 group-hover/button:text-rose-400"
      : effectiveIsFav
      ? "fill-rose-500 text-rose-400 group-hover/button:fill-none group-hover/button:text-foreground"
      : "text-foreground group-hover/button:fill-rose-500 group-hover/button:text-rose-400";

  return (
    <button
      type="button"
      aria-label={effectiveIsFav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        baseClass,
        className,
        overviewPage && "flex gap-2 @min-xl:px-4 @min-xl:py-2"
      )}
      onClick={handleClick}
      disabled={loading}
    >
      {overviewPage && (
        <span className="font-semibold hidden @min-xl:inline-block">Save</span>
      )}
      <Heart
        className={cn(
          "w-6 h-6 transition-colors",
          heartClass,
          loading && "opacity-60"
        )}
      />
    </button>
  );
};

export default SaveButton;
