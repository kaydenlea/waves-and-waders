let cachedTrackGradient: string | null = null;

export function getCachedHourSliderTrackGradient(): string | null {
  return cachedTrackGradient;
}

export function setCachedHourSliderTrackGradient(value: string | null): void {
  cachedTrackGradient = value;
}

export function clearCachedHourSliderTrackGradient(): void {
  cachedTrackGradient = null;
}

