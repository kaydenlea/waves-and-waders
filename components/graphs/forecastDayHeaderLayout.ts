"use client";

export type ForecastDayHeaderLayout = {
  left: number;
  width: number;
  columnWidth: number;
  gridTemplateColumns: string;
};

type Params = {
  leftOffsetPx: number;
  dataAreaWidthPx: number;
  totalDays: number;
  domainMinHours: number;
  domainMaxHours: number;
  hoursPerDay?: number;
  includeDomainPaddingInEdgeDays?: boolean;
};

export function getForecastDayHeaderLayout({
  leftOffsetPx,
  dataAreaWidthPx,
  totalDays,
  domainMinHours,
  domainMaxHours,
  hoursPerDay = 24,
  includeDomainPaddingInEdgeDays = false,
}: Params): ForecastDayHeaderLayout {
  const safeDays = Number.isFinite(totalDays) && totalDays > 0 ? totalDays : 1;
  const safeWidth =
    Number.isFinite(dataAreaWidthPx) && dataAreaWidthPx > 0
      ? dataAreaWidthPx
      : 0;

  const span = domainMaxHours - domainMinHours;
  if (!Number.isFinite(span) || span <= 0 || safeWidth <= 0) {
    const fallbackCol = safeDays > 0 ? safeWidth / safeDays : 0;
    return {
      left: leftOffsetPx,
      width: safeWidth,
      columnWidth: fallbackCol,
      gridTemplateColumns: `repeat(${safeDays}, ${fallbackCol}px)`,
    };
  }

  const pxPerHour = safeWidth / span;
  const columnWidth = hoursPerDay * pxPerHour;
  const left = leftOffsetPx + (0 - domainMinHours) * pxPerHour;
  const width = safeDays * columnWidth;

  if (includeDomainPaddingInEdgeDays) {
    const padLeftPx = Math.max(0, (0 - domainMinHours) * pxPerHour);
    const padRightPx = Math.max(
      0,
      (domainMaxHours - safeDays * hoursPerDay) * pxPerHour
    );
    const firstWidth = columnWidth + padLeftPx;
    const lastWidth = columnWidth + padRightPx;

    const gridTemplateColumns =
      safeDays === 1
        ? `${safeWidth}px`
        : [
            `${firstWidth}px`,
            safeDays > 2 ? `repeat(${safeDays - 2}, ${columnWidth}px)` : null,
            `${lastWidth}px`,
          ]
            .filter(Boolean)
            .join(" ");

    return {
      left: leftOffsetPx,
      width: safeWidth,
      columnWidth,
      gridTemplateColumns,
    };
  }

  return {
    left,
    width,
    columnWidth,
    gridTemplateColumns: `repeat(${safeDays}, ${columnWidth}px)`,
  };
}
