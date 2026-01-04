import type { ForecastData } from "./supabase";

export type TidePeak = {
  kind: "high" | "low";
  time: Date;
  level: number | null;
};

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

export type DailySurfWindStats = {
  surfHeight: string | null;
  surfIntensity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
};

export const extractDailySurfWindStats = (
  snapshot: BeachStatsSnapshot | null
): DailySurfWindStats => {
  if (!snapshot) {
    return {
      surfHeight: null,
      surfIntensity: null,
      windSpeed: null,
      windDirection: null,
    };
  }

  const surfStat = snapshot.summary.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf"
  );
  const windStat = snapshot.summary.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind"
  );

  return {
    surfHeight: surfStat?.surf.height ?? null,
    surfIntensity:
      typeof surfStat?.surf.intensity === "number"
        ? surfStat.surf.intensity
        : null,
    windSpeed:
      typeof windStat?.wind.speed === "number" ? windStat.wind.speed : null,
    windDirection:
      typeof windStat?.wind.direction === "number"
        ? windStat.wind.direction
        : null,
  };
};

export type BeachConditionsLike = {
  surf: string;
  wind: string;
  windDir: number;
  temp: number;
  rating: number;
};

export const mergeDailyStatsIntoConditions = (
  base: BeachConditionsLike,
  stats: DailySurfWindStats | null
): BeachConditionsLike => {
  if (!stats) {
    return base;
  }
  const resolvedWind =
    stats.windSpeed != null ? String(Math.round(stats.windSpeed)) : base.wind;
  return {
    ...base,
    surf: stats.surfHeight ?? base.surf,
    wind: resolvedWind,
    windDir:
      typeof stats.windDirection === "number"
        ? stats.windDirection
        : base.windDir,
    rating:
      typeof stats.surfIntensity === "number"
        ? stats.surfIntensity
        : base.rating,
  };
};
