export function calculateColorIntensity(rating: number | null, min: number, max: number): number {
  if (rating === null) return 0;
  if (min === max) return 0.5;
  return Number(((rating - min) / (max - min)).toFixed(2));
}
