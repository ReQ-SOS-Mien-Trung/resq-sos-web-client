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

    const reverseParams = new URLSearchParams({
      lat: latNumber.toString(),
      lon: lngNumber.toString(),
      format: "json",
      addressdetails: "1",
      zoom: "18",
    });

    try {
      const reverseRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${reverseParams.toString()}`,
        {
          headers: {
            "Accept-Language": "vi,en",
            "User-Agent": "resq-sos-web-client/1.0 (geocoding)",
          },
          cache: "no-store",
        },
      );

      if (!reverseRes.ok) {
        const text = await reverseRes.text().catch(() => "");
        return NextResponse.json(
          {
            error: "Nominatim reverse request failed",
            details: text || reverseRes.statusText,
          },
          { status: 502 },
        );
      }

      const data = (await reverseRes.json()) as NominatimReverseResult;
      return NextResponse.json({ result: data });
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
