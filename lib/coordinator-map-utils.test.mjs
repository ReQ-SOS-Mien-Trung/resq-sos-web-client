import test from "node:test";
import assert from "node:assert/strict";

import {
  expandMapBounds,
  getServiceZoneDisplayTotal,
  isMapBoundsWithinBuffer,
  leafletBoundsToMapBounds,
  mapBoundsToSOSRequestParams,
} from "./coordinator-map-utils.js";

test("leafletBoundsToMapBounds converts a Leaflet-like object", () => {
  const bounds = leafletBoundsToMapBounds({
    getSouth: () => 10,
    getNorth: () => 20,
    getWest: () => 100,
    getEast: () => 110,
  });

  assert.deepEqual(bounds, {
    south: 10,
    north: 20,
    west: 100,
    east: 110,
  });
});

test("expandMapBounds doubles width and height for a 2x buffer", () => {
  const expandedBounds = expandMapBounds(
    {
      south: 10,
      north: 20,
      west: 100,
      east: 110,
    },
    2,
  );

  assert.deepEqual(expandedBounds, {
    south: 5,
    north: 25,
    west: 95,
    east: 115,
  });
});

test("isMapBoundsWithinBuffer stays true while the viewport remains inside the 2x buffer", () => {
  const visibleBounds = {
    south: 11,
    north: 19,
    west: 101,
    east: 109,
  };
  const bufferedBounds = {
    south: 5,
    north: 25,
    west: 95,
    east: 115,
  };

  assert.equal(isMapBoundsWithinBuffer(visibleBounds, bufferedBounds), true);
  assert.equal(
    isMapBoundsWithinBuffer(
      {
        south: 11,
        north: 19,
        west: 94.9,
        east: 109,
      },
      bufferedBounds,
    ),
    false,
  );
});

test("mapBoundsToSOSRequestParams returns the backend query contract", () => {
  assert.deepEqual(
    mapBoundsToSOSRequestParams({
      south: 10,
      north: 20,
      west: 100,
      east: 110,
    }),
    {
      MinLat: 10,
      MaxLat: 20,
      MinLng: 100,
      MaxLng: 110,
    },
  );
});

test("getServiceZoneDisplayTotal sums all backend count fields", () => {
  assert.equal(
    getServiceZoneDisplayTotal({
      pendingSosRequestCount: 10,
      incidentSosRequestCount: 2,
      teamIncidentCount: 3,
      assemblyPointCount: 4,
      depotCount: 5,
    }),
    24,
  );
});
