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

const POLYGON_EPSILON = 1e-10;

/**
 * @typedef {[number, number]} LatLngPoint
 */

/**
 * @param {LatLngPoint} a
 * @param {LatLngPoint} b
 * @returns {boolean}
 */
function isSameLatLngPoint(a, b) {
  return (
    Math.abs(a[0] - b[0]) <= POLYGON_EPSILON &&
    Math.abs(a[1] - b[1]) <= POLYGON_EPSILON
  );
}

/**
 * @param {{ coordinates?: Array<{ latitude: number, longitude: number }> | null } | null | undefined} zone
 * @returns {LatLngPoint[]}
 */
function getServiceZonePolygonPoints(zone) {
  const points = (zone?.coordinates ?? [])
    .map((point) => [Number(point.latitude), Number(point.longitude)])
    .filter(
      (point) => Number.isFinite(point[0]) && Number.isFinite(point[1]),
    );

  if (
    points.length > 1 &&
    isSameLatLngPoint(points[0], points[points.length - 1])
  ) {
    points.pop();
  }

  return points;
}

/**
 * @param {LatLngPoint[]} polygon
 * @returns {{ minLat: number, maxLat: number, minLng: number, maxLng: number }}
 */
function getPolygonBounds(polygon) {
  const lats = polygon.map((point) => point[0]);
  const lngs = polygon.map((point) => point[1]);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * @param {LatLngPoint[]} polygon
 * @returns {number}
 */
function getPolygonLngScale(polygon) {
  const averageLat =
    polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length;
  const scale = Math.cos((averageLat * Math.PI) / 180);

  return Number.isFinite(scale) && Math.abs(scale) > 0.2
    ? Math.abs(scale)
    : 0.2;
}

/**
 * @param {LatLngPoint} point
 * @param {LatLngPoint} start
 * @param {LatLngPoint} end
 * @returns {boolean}
 */
function isPointOnPolygonSegment(point, start, end) {
  const pointX = point[1];
  const pointY = point[0];
  const startX = start[1];
  const startY = start[0];
  const endX = end[1];
  const endY = end[0];
  const cross =
    (pointX - startX) * (endY - startY) -
    (pointY - startY) * (endX - startX);
  const tolerance =
    POLYGON_EPSILON *
    Math.max(
      1,
      Math.abs(endX - startX),
      Math.abs(endY - startY),
      Math.abs(pointX - startX),
      Math.abs(pointY - startY),
    );

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  const dot =
    (pointX - startX) * (pointX - endX) +
    (pointY - startY) * (pointY - endY);

  return dot <= tolerance;
}

/**
 * Returns true for points inside the polygon or on its boundary.
 *
 * @param {LatLngPoint} point
 * @param {LatLngPoint[]} polygon
 * @returns {boolean}
 */
export function isPointInsideServiceZonePolygon(point, polygon) {
  if (polygon.length < 3) {
    return false;
  }

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];

    if (isPointOnPolygonSegment(point, current, previous)) {
      return true;
    }

    const [latI, lngI] = current;
    const [latJ, lngJ] = previous;
    const isCrossing =
      latI > lat !== latJ > lat &&
      lng <
        ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;

    if (isCrossing) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * @param {LatLngPoint} point
 * @param {LatLngPoint} start
 * @param {LatLngPoint} end
 * @param {number} lngScale
 * @returns {number}
 */
function getSquaredDistanceToSegment(point, start, end, lngScale) {
  const pointX = point[1] * lngScale;
  const pointY = point[0];
  const startX = start[1] * lngScale;
  const startY = start[0];
  const endX = end[1] * lngScale;
  const endY = end[0];
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= POLYGON_EPSILON) {
    const dx = pointX - startX;
    const dy = pointY - startY;
    return dx * dx + dy * dy;
  }

  const ratio = clamp(
    ((pointX - startX) * segmentX + (pointY - startY) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const projectedX = startX + ratio * segmentX;
  const projectedY = startY + ratio * segmentY;
  const dx = pointX - projectedX;
  const dy = pointY - projectedY;

  return dx * dx + dy * dy;
}

/**
 * @param {LatLngPoint} point
 * @param {LatLngPoint[]} polygon
 * @returns {number}
 */
function getDistanceToPolygonEdge(point, polygon) {
  const lngScale = getPolygonLngScale(polygon);
  let minDistanceSquared = Number.POSITIVE_INFINITY;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    minDistanceSquared = Math.min(
      minDistanceSquared,
      getSquaredDistanceToSegment(point, polygon[j], polygon[i], lngScale),
    );
  }

  return Math.sqrt(minDistanceSquared);
}

/**
 * @param {LatLngPoint[]} polygon
 * @returns {LatLngPoint}
 */
function getAveragePolygonPoint(polygon) {
  return [
    polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
    polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length,
  ];
}

/**
 * @param {LatLngPoint[]} polygon
 * @returns {LatLngPoint}
 */
function getPolygonCentroid(polygon) {
  let twiceArea = 0;
  let latSum = 0;
  let lngSum = 0;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const cross = lngJ * latI - lngI * latJ;

    twiceArea += cross;
    latSum += (latJ + latI) * cross;
    lngSum += (lngJ + lngI) * cross;
  }

  if (Math.abs(twiceArea) <= POLYGON_EPSILON) {
    return getAveragePolygonPoint(polygon);
  }

  return [latSum / (3 * twiceArea), lngSum / (3 * twiceArea)];
}

/**
 * Finds a point that is inside the polygon and far from its edges, which keeps
 * labels from falling into neighboring service zones for concave polygons.
 *
 * @param {LatLngPoint[]} polygon
 * @returns {LatLngPoint}
 */
function findBestInteriorPolygonPoint(polygon) {
  const bounds = getPolygonBounds(polygon);
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const centroid = getPolygonCentroid(polygon);
  const average = getAveragePolygonPoint(polygon);
  const boxCenter = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLng + bounds.maxLng) / 2,
  ];
  /** @type {LatLngPoint | null} */
  let bestPoint = null;
  let bestDistance = Number.NEGATIVE_INFINITY;

  /**
   * @param {LatLngPoint} candidate
   */
  const consider = (candidate) => {
    if (
      !Number.isFinite(candidate[0]) ||
      !Number.isFinite(candidate[1]) ||
      !isPointInsideServiceZonePolygon(candidate, polygon)
    ) {
      return;
    }

    const distance = getDistanceToPolygonEdge(candidate, polygon);

    if (distance > bestDistance) {
      bestDistance = distance;
      bestPoint = candidate;
    }
  };

  consider(centroid);
  consider(average);
  consider(boxCenter);

  const latSteps = 18;
  const lngSteps = 18;
  const safeLatSpan = latSpan || 0.000001;
  const safeLngSpan = lngSpan || 0.000001;

  for (let latIndex = 0; latIndex <= latSteps; latIndex++) {
    const lat = bounds.minLat + (safeLatSpan * latIndex) / latSteps;

    for (let lngIndex = 0; lngIndex <= lngSteps; lngIndex++) {
      consider([
        lat,
        bounds.minLng + (safeLngSpan * lngIndex) / lngSteps,
      ]);
    }
  }

  if (bestPoint) {
    let latStep = safeLatSpan / latSteps;
    let lngStep = safeLngSpan / lngSteps;

    for (let level = 0; level < 6; level++) {
      const currentBest = bestPoint;

      for (let latOffset = -2; latOffset <= 2; latOffset++) {
        for (let lngOffset = -2; lngOffset <= 2; lngOffset++) {
          consider([
            currentBest[0] + latOffset * latStep,
            currentBest[1] + lngOffset * lngStep,
          ]);
        }
      }

      latStep /= 2;
      lngStep /= 2;
    }

    return bestPoint;
  }

  for (const vertex of polygon) {
    consider([
      vertex[0] + (centroid[0] - vertex[0]) * 0.5,
      vertex[1] + (centroid[1] - vertex[1]) * 0.5,
    ]);
  }

  return bestPoint ?? polygon[0];
}

/**
 * @param {LatLngPoint[]} polygon
 * @param {LatLngPoint} anchor
 * @param {LatLngPoint} target
 * @returns {LatLngPoint}
 */
function findInteriorPointTowardTarget(polygon, anchor, target) {
  const anchorDistance = getDistanceToPolygonEdge(anchor, polygon);
  const minimumDistance = anchorDistance * 0.35;
  /** @type {LatLngPoint} */
  let bestPoint = anchor;
  let bestDistance = anchorDistance;

  for (const ratio of [1, 0.9, 0.8, 0.68, 0.56, 0.44, 0.32, 0.2]) {
    const candidate = [
      anchor[0] + (target[0] - anchor[0]) * ratio,
      anchor[1] + (target[1] - anchor[1]) * ratio,
    ];

    if (!isPointInsideServiceZonePolygon(candidate, polygon)) {
      continue;
    }

    const distance = getDistanceToPolygonEdge(candidate, polygon);

    if (distance >= minimumDistance) {
      return candidate;
    }

    if (distance > bestDistance) {
      bestDistance = distance;
      bestPoint = candidate;
    }
  }

  return bestPoint;
}

/**
 * @param {{ coordinates?: Array<{ latitude: number, longitude: number }> | null } | null | undefined} zone
 * @returns {[number, number] | null}
 */
export function getServiceZoneLabelPosition(zone) {
  const polygon = getServiceZonePolygonPoints(zone);

  if (polygon.length < 3) {
    return null;
  }

  return findBestInteriorPolygonPoint(polygon);
}

/**
 * @param {{ coordinates?: Array<{ latitude: number, longitude: number }> | null } | null | undefined} zone
 * @returns {{ nw: LatLngPoint, ne: LatLngPoint, sw: LatLngPoint, se: LatLngPoint } | null}
 */
export function getServiceZoneStatBadgePositions(zone) {
  const polygon = getServiceZonePolygonPoints(zone);

  if (polygon.length < 3) {
    return null;
  }

  const bounds = getPolygonBounds(polygon);
  const anchor = findBestInteriorPolygonPoint(polygon);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0003);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.0003);
  const latOffset = latSpan * 0.18;
  const lngOffset = lngSpan * 0.18;

  const getBadgePosition = (latDirection, lngDirection) =>
    findInteriorPointTowardTarget(polygon, anchor, [
      anchor[0] + latDirection * latOffset,
      anchor[1] + lngDirection * lngOffset,
    ]);

  return {
    nw: getBadgePosition(1, -1),
    ne: getBadgePosition(1, 1),
    sw: getBadgePosition(-1, -1),
    se: getBadgePosition(-1, 1),
  };
}
