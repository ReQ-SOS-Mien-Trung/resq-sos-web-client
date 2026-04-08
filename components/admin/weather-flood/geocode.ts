export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export interface ReverseGeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

interface GeocodeApiResponse {
  results?: Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
}

export async function geocodeCity(
  query: string,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
  if (!response.ok) {
    throw new Error("Geocode request failed");
  }

  const payload = (await response.json()) as GeocodeApiResponse;
  const first = payload.results?.[0];
  if (!first) return null;

  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    displayName: first.display_name,
  };
}

interface ReverseGeocodeApiResponse {
  result?: {
    lat: string;
    lon: string;
    display_name: string;
  };
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const response = await fetch(
    `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}`,
  );
  if (!response.ok) {
    throw new Error("Reverse geocode request failed");
  }

  const payload = (await response.json()) as ReverseGeocodeApiResponse;
  const result = payload.result;
  if (!result) return null;

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    displayName: result.display_name,
  };
}
