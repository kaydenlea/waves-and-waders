export type SharedSunSegments = {
  dayAreas: { x1: number; x2: number }[];
  nightAreas: { x1: number; x2?: number }[];
  sunrise: string | null;
  sunset: string | null;
  baseDate?: Date | null;
};
