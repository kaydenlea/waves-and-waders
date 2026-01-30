"use client";

import { useEffect, useState } from "react";
import { getPacificMidnightUTC } from "@/lib/utils";

const HOUR_MS = 60 * 60 * 1000;

const getPacificTodayMs = () => getPacificMidnightUTC(new Date()).getTime();

const getMsUntilNextPacificMidnight = (nowMs: number) => {
  const now = new Date(nowMs);
  const tomorrow = new Date(nowMs + 36 * HOUR_MS);
  const nextMidnightMs = getPacificMidnightUTC(tomorrow).getTime();
  return Math.max(1_000, nextMidnightMs - now.getTime() + 500);
};

export function usePacificTodayMs(): number {
  const [pacificTodayMs, setPacificTodayMs] = useState<number>(() =>
    getPacificTodayMs()
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sync = () => {
      const next = getPacificTodayMs();
      setPacificTodayMs((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      const nowMs = Date.now();
      const delayMs = getMsUntilNextPacificMidnight(nowMs);
      timer = setTimeout(() => {
        sync();
        schedule();
      }, delayMs);
    };

    const onFocus = () => sync();
    const onVisibilityChange = () => {
      if (!document.hidden) sync();
    };

    schedule();
    window.addEventListener("focus", onFocus, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true,
    });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return pacificTodayMs;
}

