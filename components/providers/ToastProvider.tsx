"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  icon?: React.ReactNode;
};

type ToastContextValue = {
  toast: (
    message: string,
    options?: {
      variant?: ToastVariant;
      durationMs?: number;
      icon?: React.ReactNode;
    },
  ) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  return (
    ctx ?? {
      toast: () => {},
    }
  );
}

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastItem, setToastItem] = React.useState<ToastItem | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    (message, options) => {
      const id = makeId();
      const durationMs = options?.durationMs ?? 2600;
      const variant = options?.variant ?? "success";

      const item: ToastItem = {
        id,
        message,
        variant,
        durationMs,
        icon: options?.icon,
      };

      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setToastItem(item);

      timeoutRef.current = window.setTimeout(() => {
        setToastItem((prev) => (prev?.id === id ? null : prev));
        timeoutRef.current = null;
      }, durationMs);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom)+var(--ww-bottom-nav-h,0px))] z-[1000010] flex flex-col items-center gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toastItem ? (
          <div
            key={toastItem.id}
            className={cn(
              "pointer-events-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-lg backdrop-blur bg-background text-foreground border border-2",
              "w-[min(20rem,calc(100vw-2rem))]",
              // toastItem.variant === "success"
              //   ? "border-emerald-500/30"
              //   : "border-rose-500/30"
            )}
          >
            <span className="shrink-0" aria-hidden="true">
              {toastItem.icon ??
                (toastItem.variant === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                ))}
            </span>
            <span>{toastItem.message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
