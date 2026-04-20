/**
 * Shared helpers for coordinator map buffering, bounds queries, and service-zone totals.
 */

/**
 * @typedef {Object} MapBounds
 * @property {number} south
 * @property {number} north
 * @property {number} west
 * @property {number} east
 */

/**
 * @typedef {Object} ServiceZoneCountsLike
 * @property {number} [pendingSosRequestCount]
 * @property {number} [incidentSosRequestCount]
 * @property {number} [teamIncidentCount]
 * @property {number} [assemblyPointCount]
 * @property {number} [depotCount]
 */

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * @param {MapBounds} bounds
 * @returns {MapBounds}
 */
export function normalizeMapBounds(bounds) {
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);

  return {
    south: clamp(south, LAT_MIN, LAT_MAX),
    north: clamp(north, LAT_MIN, LAT_MAX),
    west: clamp(west, LNG_MIN, LNG_MAX),
    east: clamp(east, LNG_MIN, LNG_MAX),
  };
}

/**
 * Converts a Leaflet bounds instance into plain API-ready bounds.
 *
 * @param {{
 *   getSouth?: () => number,
 *   getNorth?: () => number,
 *   getWest?: () => number,
 *   getEast?: () => number,
 *   south?: number,
 *   north?: number,
 *   west?: number,
 *   east?: number
 * } | null | undefined} leafletBounds
 * @returns {MapBounds | null}
 */
export function leafletBoundsToMapBounds(leafletBounds) {
  if (!leafletBounds) {
    return null;
  }

  const south =
    typeof leafletBounds.getSouth === "function"
      ? leafletBounds.getSouth()
      : leafletBounds.south;
  const north =
    typeof leafletBounds.getNorth === "function"
      ? leafletBounds.getNorth()
      : leafletBounds.north;
  const west =
    typeof leafletBounds.getWest === "function"
      ? leafletBounds.getWest()
      : leafletBounds.west;
  const east =
    typeof leafletBounds.getEast === "function"
      ? leafletBounds.getEast()
      : leafletBounds.east;

  if (![south, north, west, east].every(Number.isFinite)) {
    return null;
  }

  return normalizeMapBounds({ south, north, west, east });
}

/**
 * Expands the visible bounds to a larger buffered window centered on the same point.
 *
 * @param {MapBounds} bounds
 * @param {number} [multiplier=2]
 * @returns {MapBounds}
 */
export function expandMapBounds(bounds, multiplier = 2) {
  const normalizedBounds = normalizeMapBounds(bounds);
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0
    ? multiplier
    : 2;

  const centerLat = (normalizedBounds.south + normalizedBounds.north) / 2;
  const centerLng = (normalizedBounds.west + normalizedBounds.east) / 2;
  const halfHeight = (normalizedBounds.north - normalizedBounds.south) / 2;
  const halfWidth = (normalizedBounds.east - normalizedBounds.west) / 2;
  const expandedHalfHeight = halfHeight * safeMultiplier;
  const expandedHalfWidth = halfWidth * safeMultiplier;

  return normalizeMapBounds({
    south: centerLat - expandedHalfHeight,
    north: centerLat + expandedHalfHeight,
    west: centerLng - expandedHalfWidth,
    east: centerLng + expandedHalfWidth,
  });
}

/**
 * Returns true when the visible bounds are fully covered by the cached buffered bounds.
 *
 * @param {MapBounds | null | undefined} visibleBounds
 * @param {MapBounds | null | undefined} bufferedBounds
 * @returns {boolean}
 */
export function isMapBoundsWithinBuffer(visibleBounds, bufferedBounds) {
  if (!visibleBounds || !bufferedBounds) {
    return false;
  }

  const visible = normalizeMapBounds(visibleBounds);
  const buffered = normalizeMapBounds(bufferedBounds);

  return (
    visible.south >= buffered.south &&
    visible.north <= buffered.north &&
    visible.west >= buffered.west &&
    visible.east <= buffered.east
  );
}

/**
 * @param {MapBounds | null | undefined} bounds
 * @returns {{
 *   MinLat: number,
 *   MaxLat: number,
 *   MinLng: number,
 *   MaxLng: number
 * } | undefined}
 */
export function mapBoundsToSOSRequestParams(bounds) {
  if (!bounds) {
    return undefined;
  }

  const normalizedBounds = normalizeMapBounds(bounds);
  return {
    MinLat: normalizedBounds.south,
    MaxLat: normalizedBounds.north,
    MinLng: normalizedBounds.west,
    MaxLng: normalizedBounds.east,
  };
}

/**
 * @param {MapBounds | null | undefined} bounds
 * @param {number} [precision=6]
 * @returns {string}
 */
export function getMapBoundsCacheKey(bounds, precision = 6) {
  if (!bounds) {
    return "none";
  }

  const normalizedBounds = normalizeMapBounds(bounds);
  return [
    normalizedBounds.south.toFixed(precision),
    normalizedBounds.north.toFixed(precision),
    normalizedBounds.west.toFixed(precision),
    normalizedBounds.east.toFixed(precision),
  ].join(":");
}

/**
 * @param {ServiceZoneCountsLike | null | undefined} counts
 * @returns {number}
 */
export function getServiceZoneDisplayTotal(counts) {
  return (
    Number(counts?.pendingSosRequestCount ?? 0) +
    Number(counts?.incidentSosRequestCount ?? 0) +
    Number(counts?.teamIncidentCount ?? 0) +
    Number(counts?.assemblyPointCount ?? 0) +
    Number(counts?.depotCount ?? 0)
  );
}

/**
 * @param {{ coordinates?: Array<{ latitude: number, longitude: number }> | null } | null | undefined} zone
 * @returns {[number, number] | null}
 */
export function getServiceZoneLabelPosition(zone) {
  const coordinates = zone?.coordinates ?? [];
  if (coordinates.length === 0) {
    return null;
  }

  const latitudes = coordinates
    .map((point) => Number(point.latitude))
    .filter(Number.isFinite);
  const longitudes = coordinates
    .map((point) => Number(point.longitude))
    .filter(Number.isFinite);

  if (latitudes.length === 0 || longitudes.length === 0) {
    return null;
  }

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}
