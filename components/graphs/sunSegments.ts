"use client";

export type SunArea = { x1: number; x2: number };

const clamp = (value: number, hours: number) =>
  Math.max(0, Math.min(hours, value));

export const parseSunTimeToHour = (value: string | null): number | null => {
  if (!value) return null;
  const match =
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i.exec(value.trim());
  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if ([hour, minutes, seconds].some((n) => !Number.isFinite(n))) {
    return null;
  }

  const suffix = match[4]?.toUpperCase();
  if (suffix) {
    hour = hour % 12;
    if (suffix === "PM") {
      hour += 12;
    }
  }

  return hour + minutes / 60 + seconds / 3600;
};

export const buildSunSegments = (
  hours: number,
  sunrise: string | null,
  sunset: string | null
): { dayAreas: SunArea[]; nightAreas: SunArea[] } => {
  const sunriseHour = parseSunTimeToHour(sunrise);
  const sunsetHour = parseSunTimeToHour(sunset);
  if (sunriseHour == null || sunsetHour == null) {
    return {
      dayAreas: [],
      nightAreas: [{ x1: 0, x2: hours }],
    };
  }

  const start = clamp(sunriseHour, hours);
  const end = clamp(sunsetHour, hours);
  const x1 = Math.min(start, end);
  const x2 = Math.max(start, end);

  const dayAreas: SunArea[] = x2 > x1 ? [{ x1, x2 }] : [];
  const nightAreas: SunArea[] = [];
  if (x1 > 0) nightAreas.push({ x1: 0, x2: x1 });
  if (x2 < hours) nightAreas.push({ x1: x2, x2: hours });

  return {
    dayAreas,
    nightAreas: nightAreas.length ? nightAreas : [{ x1: 0, x2: hours }],
  };
};
