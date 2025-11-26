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

type SunFetcher = (
  date: Date
) => Promise<{ sunrise?: string | null; sunset?: string | null } | null>;

const snapHour = (value: number, step: number) =>
  step > 0 ? Math.round(value / step) * step : value;

/**
 * Build day/night areas for a multi-day forecast window, snapping to a given hour step.
 * This runs fetches in parallel so charts can render sun shading immediately.
 */
export const buildSunSegmentsForRange = async (options: {
  fetchSun: SunFetcher;
  startDate: Date;
  days: number;
  hourSnap?: number;
}) => {
  const { fetchSun, startDate, days, hourSnap = 3 } = options;
  const totalDays = Math.max(1, Math.floor(days));
  const HOURS_PER_DAY = 24;
  const targets = Array.from({ length: totalDays }, (_, i) => {
    return new Date(startDate.getTime() + i * HOURS_PER_DAY * 60 * 60 * 1000);
  });

  const results = await Promise.all(
    targets.map(async (date) => {
      try {
        return await fetchSun(date);
      } catch {
        return null;
      }
    })
  );

  const dayAreas: SunArea[] = [];
  const nightAreas: { x1: number; x2?: number }[] = [];
  let nightStart = 0;

  results.forEach((sun, idx) => {
    const rise = parseSunTimeToHour(sun?.sunrise ?? null);
    const setv = parseSunTimeToHour(sun?.sunset ?? null);

    if (rise == null || setv == null) {
      // Fallback: mark the whole day as daylight to avoid gaps
      dayAreas.push({ x1: idx * HOURS_PER_DAY, x2: (idx + 1) * HOURS_PER_DAY });
      nightAreas.push({ x1: nightStart, x2: idx * HOURS_PER_DAY });
      nightStart = (idx + 1) * HOURS_PER_DAY;
      return;
    }

    const offset = idx * HOURS_PER_DAY;
    const dayStart = offset + Math.max(0, Math.min(HOURS_PER_DAY, Math.min(rise, setv)));
    const dayEnd = offset + Math.max(0, Math.min(HOURS_PER_DAY, Math.max(rise, setv)));

    const snappedStart = snapHour(dayStart, hourSnap);
    const snappedEnd = snapHour(dayEnd, hourSnap);
    const snappedNightStart = snapHour(nightStart, hourSnap);

    dayAreas.push({ x1: snappedStart, x2: snappedEnd });
    nightAreas.push({ x1: snappedNightStart, x2: snappedStart });
    nightStart = snappedEnd;
  });

  nightAreas.push({ x1: snapHour(nightStart, hourSnap) });

  const totalHours = totalDays * HOURS_PER_DAY;
  return {
    dayAreas,
    nightAreas: nightAreas.length ? nightAreas : [{ x1: 0, x2: totalHours }],
  };
};
