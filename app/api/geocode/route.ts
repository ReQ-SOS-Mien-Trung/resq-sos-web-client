import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type NominatimReverseResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const lat = request.nextUrl.searchParams.get("lat")?.trim();
  const lng = request.nextUrl.searchParams.get("lng")?.trim();
  const goongApiKey =
    process.env.GOONG_API_KEY ||
    process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY ||
    "";

  if (lat && lng) {
    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (
      Number.isNaN(latNumber) ||
      Number.isNaN(lngNumber) ||
      latNumber < -90 ||
      latNumber > 90 ||
      lngNumber < -180 ||
      lngNumber > 180
    ) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    }

    try {
      const reverseRes = await fetch(
        `https://rsapi.goong.io/Geocode?latlng=${latNumber},${lngNumber}&api_key=${goongApiKey}`,
        { cache: "no-store" },
      );

      if (!reverseRes.ok) {
        const text = await reverseRes.text().catch(() => "");
        return NextResponse.json(
          {
            error: "Goong reverse request failed",
            details: text || reverseRes.statusText,
          },
          { status: 502 },
        );
      }

      const data = await reverseRes.json();
      // Map Goong result to something similar to what the app expects
      // Goong reverse returns { results: [{ formatted_address, ... }] }
      const firstResult = data.results?.[0];
      return NextResponse.json({
        result: {
          display_name: firstResult?.formatted_address || "Unknown location",
          lat: latNumber.toString(),
          lon: lngNumber.toString(),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Reverse geocoding request failed" },
        { status: 500 },
      );
    }
  }

  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter: q" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://rsapi.goong.io/geocode?address=${encodeURIComponent(q)}&api_key=${goongApiKey}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Goong request failed",
          details: text || res.statusText,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    // Goong geocode returns { results: [{ formatted_address, geometry: { location: { lat, lng } }, ... }] }
    const results = (data.results || []).map((item: any) => ({
      display_name: item.formatted_address,
      lat: String(item.geometry.location.lat),
      lon: String(item.geometry.location.lng),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Geocoding request failed" },
      { status: 500 },
    );
  }
}
