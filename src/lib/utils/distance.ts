/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

/**
 * Get color class for distance.
 * Green: 0-15km, Yellow: 15-50km, Red: 50km+
 */
export function getDistanceColor(km: number): string {
  if (km <= 15) return "text-emerald-600 dark:text-emerald-400";
  if (km <= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}
