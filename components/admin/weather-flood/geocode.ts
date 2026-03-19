export interface GeocodeResult {
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
