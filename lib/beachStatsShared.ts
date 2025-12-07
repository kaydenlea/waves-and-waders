import type { ForecastData } from "./supabase";

export type TidePeak = { kind: "high" | "low"; time: Date; level: number | null };

export type SummaryStat =
  | {
      type: "temperature";
      waterTemp?: number;
      airTemp?: number;
      waterTempPercent?: number;
      airTempPercent?: number;
      weatherCode?: number | null;
    }
  | {
      type: "tide";
      currentHeight?: number;
      peaks: TidePeak[];
      sunrise?: string;
      sunset?: string;
    }
  | {
      type: "wind";
      wind: {
        direction?: number;
        speed: number;
        loc?: string;
        gust?: number;
        intensity: number;
      };
    }
  | {
      type: "surf";
      surf: { height: string; period: number; intensity: number };
    };

export type BeachStatsSnapshot = {
  summary: SummaryStat[];
  current: ForecastData | null;
};

export const normalizeHour = (value: number) => ((value % 24) + 24) % 24;

export const reviveBeachStatsSnapshot = (
  snapshot: BeachStatsSnapshot | null
): BeachStatsSnapshot | null => {
  if (!snapshot) return snapshot;
  const revived: BeachStatsSnapshot = {
    current: snapshot.current,
    summary: snapshot.summary.map((stat) => {
      if (stat.type !== "tide") {
        return stat;
      }
      return {
        ...stat,
        peaks: stat.peaks.map((peak) => ({
          ...peak,
          time: peak.time instanceof Date ? peak.time : new Date(peak.time),
        })),
      };
    }),
  };
  return revived;
};

export const reviveStatsMap = (
  data?: Record<string, BeachStatsSnapshot | null> | null
) => {
  if (!data) return {};
  const result: Record<string, BeachStatsSnapshot | null> = {};
  Object.entries(data).forEach(([key, snapshot]) => {
    result[key] = reviveBeachStatsSnapshot(snapshot);
  });
  return result;
};
