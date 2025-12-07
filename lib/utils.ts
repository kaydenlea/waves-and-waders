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

export function getPacificDayRange(date?: Date, hours = 24) {
  const start = getPacificMidnightUTC(date ?? new Date());
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start, end };
}
