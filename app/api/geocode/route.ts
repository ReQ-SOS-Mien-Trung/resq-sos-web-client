import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter: q" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "1",
    countrycodes: "vn",
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "Accept-Language": "vi,en",
          "User-Agent": "resq-sos-web-client/1.0 (geocoding)",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Nominatim request failed",
          details: text || res.statusText,
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as NominatimResult[];
    return NextResponse.json({ results: data });
  } catch {
    return NextResponse.json(
      { error: "Geocoding request failed" },
      { status: 500 },
    );
  }
}
