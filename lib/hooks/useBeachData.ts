import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBeachForecast,
  fetchCurrentConditions,
  fetchBeachTides,
  fetchDailyConditions,
  fetchBeachByIdLoose,
} from "../supabase";

export function useBeachForecast(
  beachId: string | null,
  startWindow: Date,
  endWindow: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["beach-forecast", beachId, startWindow.toISOString(), endWindow.toISOString()],
    queryFn: () => {
      if (!beachId) throw new Error("Beach ID required");
      return fetchBeachForecast(beachId, startWindow, endWindow);
    },
    enabled: enabled && !!beachId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentConditions(beachId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["current-conditions", beachId],
    queryFn: () => {
      if (!beachId) throw new Error("Beach ID required");
      return fetchCurrentConditions(beachId);
    },
    enabled: enabled && !!beachId,
    staleTime: 2 * 60 * 1000, // Current conditions are more time-sensitive
  });
}

export function useBeachTides(
  beachId: string | null,
  startWindow: Date,
  endWindow: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["beach-tides", beachId, startWindow.toISOString(), endWindow.toISOString()],
    queryFn: () => {
      if (!beachId) throw new Error("Beach ID required");
      return fetchBeachTides(beachId, startWindow, endWindow);
    },
    enabled: enabled && !!beachId,
    staleTime: 10 * 60 * 1000, // Tides change slowly
  });
}

export function useDailyConditions(
  county: string | null,
  date?: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["daily-conditions", county, date?.toISOString()],
    queryFn: () => {
      if (!county) throw new Error("County required");
      return fetchDailyConditions(county, date);
    },
    enabled: enabled && !!county,
    staleTime: 30 * 60 * 1000, // Daily data changes infrequently
  });
}

export function useBeachById(beachId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["beach", beachId],
    queryFn: () => {
      if (!beachId) throw new Error("Beach ID required");
      return fetchBeachByIdLoose(beachId);
    },
    enabled: enabled && !!beachId,
    staleTime: 60 * 60 * 1000, // Beach metadata rarely changes
  });
}

// Hook to prefetch adjacent hours
export function usePrefetchAdjacentHours(
  beachId: string | null,
  date: Date | null,
  currentHour: number
) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const prefetchHour = (hour: number) => {
      if (!beachId || !date || hour < 0 || hour > 21) return;

      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const startWindow = d;
      const endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);

      // Prefetch forecast data for this hour
      queryClient.prefetchQuery({
        queryKey: ["beach-forecast", beachId, startWindow.toISOString(), endWindow.toISOString()],
        queryFn: () => fetchBeachForecast(beachId, startWindow, endWindow),
        staleTime: 5 * 60 * 1000,
      });
    };

    // Prefetch previous and next hour slots (in 3-hour increments)
    const adjacentHours = [currentHour - 3, currentHour + 3].filter(
      (h) => h >= 0 && h <= 21
    );

    adjacentHours.forEach((hour) => {
      prefetchHour(hour);
    });
  }, [beachId, date, currentHour, queryClient]);
}

// Hook to prefetch adjacent dates (for faster date switching)
export function usePrefetchAdjacentDates(
  beachId: string | null,
  selectedDate: Date | null
) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!beachId || !selectedDate) return;

    const prefetchDate = (daysOffset: number) => {
      const targetDate = new Date(selectedDate);
      targetDate.setDate(targetDate.getDate() + daysOffset);
      targetDate.setHours(0, 0, 0, 0);

      const startWindow = targetDate;
      const endWindow = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      // Prefetch forecast data for this date
      queryClient.prefetchQuery({
        queryKey: ["beach-forecast", beachId, startWindow.toISOString(), endWindow.toISOString()],
        queryFn: () => fetchBeachForecast(beachId, startWindow, endWindow),
        staleTime: 5 * 60 * 1000,
      });
    };

    // Prefetch ±3 days around the current date
    [-3, -2, -1, 1, 2, 3].forEach((offset) => {
      prefetchDate(offset);
    });
  }, [beachId, selectedDate, queryClient]);
}

// Custom hook for swell directions used in InteractiveMap
export function useSwellDirections(
  beachId: string | null,
  selectedDate: Date | null,
  selectedHour: number | null
) {
  const { startWindow, endWindow } = React.useMemo(() => {
    const now = new Date();
    let start = now;
    let end = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const selectedDateObj =
      selectedDate instanceof Date
        ? new Date(selectedDate.getTime())
        : selectedDate
        ? new Date(selectedDate)
        : null;

    if (selectedDateObj && !Number.isNaN(selectedDateObj.getTime())) {
      selectedDateObj.setHours(0, 0, 0, 0);
      start = selectedDateObj;
      end = new Date(selectedDateObj.getTime() + 24 * 60 * 60 * 1000);
    }

    return { startWindow: start, endWindow: end };
  }, [selectedDate]);

  const { data: beach } = useBeachById(beachId);
  const resolvedId = beach?.id ? String(beach.id) : beachId ? String(beachId) : null;

  const { data: forecast = [] } = useBeachForecast(
    resolvedId,
    startWindow,
    endWindow,
    !!beachId
  );

  const result = React.useMemo(() => {
    if (!Array.isArray(forecast) || !forecast.length) {
      return { swellDirections: null, windDirection: null };
    }

    const normalizedHour = (h: number) => ((h % 24) + 24) % 24;
    const now = new Date();
    const selectedDateObj =
      selectedDate instanceof Date
        ? new Date(selectedDate.getTime())
        : selectedDate
        ? new Date(selectedDate)
        : null;

    const targetHour = (() => {
      if (typeof selectedHour === "number")
        return normalizedHour(selectedHour);
      if (selectedDateObj) return 12;
      return normalizedHour(now.getHours());
    })();

    const baseRow = forecast.reduce((best, row) => {
      const rowHour = normalizedHour(new Date(row.timestamp).getHours());
      let diff = Math.abs(rowHour - targetHour);
      if (diff > 12) diff = 24 - diff;

      const bestRowHour = normalizedHour(new Date(best.timestamp).getHours());
      let bestDiff = Math.abs(bestRowHour - targetHour);
      if (bestDiff > 12) bestDiff = 24 - bestDiff;

      return diff < bestDiff ? row : best;
    }, forecast[0]);

    const swellDirections = baseRow?.swell
      ? {
          primary: baseRow.swell.primary?.direction ?? null,
          secondary: baseRow.swell.secondary?.direction ?? null,
          tertiary: baseRow.swell.tertiary?.direction ?? null,
        }
      : null;

    const windDirection = baseRow?.conditions?.windDirection ?? null;

    // Provide overlay label values (strings) for use on rings
    const fmtHeight = (n: number | null | undefined, precision: number) =>
      n == null ? null : `${Number(n).toFixed(precision)} ft`;
    const fmtPeriod = (n: number | null | undefined) =>
      n == null ? null : `${Math.round(Number(n))} s`;
    const fmtWind = (n: number | null | undefined) =>
      n == null ? null : `${Math.round(Number(n))} mph`;

    const joinParts = (parts: Array<string | null | undefined>) =>
      parts.filter(Boolean).join(" · ");

    const primaryLabelParts: Array<string | null> = [];
    const h1 = fmtHeight(baseRow?.swell?.primary?.height ?? null, 1);
    const p1 = fmtPeriod(baseRow?.swell?.primary?.period ?? null);
    if (h1) primaryLabelParts.push(h1);
    if (p1) primaryLabelParts.push(p1);

    const secondaryLabelParts: Array<string | null> = [];
    const h2 = fmtHeight(baseRow?.swell?.secondary?.height ?? null, 1);
    const p2 = fmtPeriod(baseRow?.swell?.secondary?.period ?? null);
    if (h2) secondaryLabelParts.push(h2);
    if (p2) secondaryLabelParts.push(p2);

    const tertiaryLabelParts: Array<string | null> = [];
    const h3 = fmtHeight(baseRow?.swell?.tertiary?.height ?? null, 1);
    const p3 = fmtPeriod(baseRow?.swell?.tertiary?.period ?? null);
    if (h3) tertiaryLabelParts.push(h3);
    if (p3) tertiaryLabelParts.push(p3);

    const windLabel = fmtWind(baseRow?.conditions?.windSpeed ?? null);

    const overlayLabels = {
      primary: joinParts(primaryLabelParts) || null,
      secondary: joinParts(secondaryLabelParts) || null,
      tertiary: joinParts(tertiaryLabelParts) || null,
      wind: windLabel ?? null,
    };

    return { swellDirections, windDirection, overlayLabels };
  }, [forecast, selectedHour, selectedDate]);

  return result;
}
