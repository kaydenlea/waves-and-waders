"use client";

import { useEffect, useState } from "react";
import { getPacificMidnightUTC } from "@/lib/utils";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

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
    let intervalId: ReturnType<typeof setInterval> | null = null;

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
    
    // Safety net: periodic sync every 5 minutes in case device sleeps through
    // the scheduled timer (timers can be delayed on mobile/sleeping devices)
    intervalId = setInterval(sync, 5 * MINUTE_MS);
    
    window.addEventListener("focus", onFocus, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true,
    });

    return () => {
      if (timer) clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return pacificTodayMs;
}

