import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get midnight UTC timestamp for a given date in Pacific timezone (DST-aware)
 * @param date - The date to get midnight for (defaults to current date)
 * @returns UTC timestamp for midnight in Pacific timezone
 */
export function getPacificMidnightUTC(date: Date = new Date()): Date {
  // Get Pacific timezone date components using Intl API (DST-aware)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  // Calculate UTC timestamp for Pacific midnight using offset at noon (avoids DST edge cases)
  const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
  const noonDate = new Date(noonUTC);
  const noonFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
  const offsetHours = pacificNoonHour - 12;

  return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
}

/**
 * Get the hour (0-23) for a date in Pacific timezone (DST-aware)
 * @param date - The date to get the hour from
 * @returns Hour in Pacific timezone (0-23)
 */
export function getPacificHour(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const hourStr = formatter.format(d);
  const hour = parseInt(hourStr);
  return Number.isFinite(hour) ? hour : 0;
}

/**
 * Get the minute (0-59) for a date in Pacific timezone (DST-aware)
 * @param date - The date to get the minute from
 * @returns Minute in Pacific timezone (0-59)
 */
export function getPacificMinute(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    minute: "2-digit",
  });
  const minuteStr = formatter.format(d);
  const minute = parseInt(minuteStr);
  return Number.isFinite(minute) ? minute : 0;
}

/**
 * Get Pacific midnight UTC, but shift to the prior day if before cutoff time.
 * Useful for holding last-known-good data until a daily refresh completes.
 */
export function getPacificMidnightUTCWithCutoff(
  date: Date = new Date(),
  cutoffHour = 1,
  cutoffMinute = 30
): Date {
  const baseMidnight = getPacificMidnightUTC(date);
  const hour = getPacificHour(date);
  const minute = getPacificMinute(date);
  const beforeCutoff =
    hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute);
  if (!beforeCutoff) return baseMidnight;
  return new Date(baseMidnight.getTime() - 24 * 60 * 60 * 1000);
}

export function getPacificDayRange(date?: Date, hours = 24) {
  const start = getPacificMidnightUTC(date ?? new Date());
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start, end };
}
