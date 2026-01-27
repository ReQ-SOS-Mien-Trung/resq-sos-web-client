import { NextResponse } from "next/server";

type WeatherApiCurrentResponse = {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    last_updated: string;
    temp_c: number;
    humidity: number;
    wind_degree: number;
    wind_dir: string;
    wind_kph: number;
    precip_mm: number;
    condition: {
      text: string;
      icon: string;
    };
  };
};

const CENTRAL_VN_LOCATIONS: Array<{ name: string; q: string }> = [
  // Using coordinates avoids ambiguity in city/province names.
  { name: "Thừa Thiên Huế", q: "16.4637,107.5909" },
  { name: "Đà Nẵng", q: "16.0544,108.2022" },
  { name: "Quảng Nam", q: "15.5394,108.0191" },
  { name: "Quảng Ngãi", q: "15.1214,108.8044" },
  { name: "Bình Định", q: "13.7765,109.2237" },
];

export async function GET() {
  // Configure locally in `.env.local`:
  // WEATHERAPI_KEY=your_key_here
  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing WEATHERAPI_KEY. Please set WEATHERAPI_KEY in your .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const results = await Promise.all(
    CENTRAL_VN_LOCATIONS.map(async (loc) => {
      try {
        const url = new URL("https://api.weatherapi.com/v1/current.json");
        url.searchParams.set("key", apiKey);
        url.searchParams.set("q", loc.q);
        url.searchParams.set("aqi", "no");

        const res = await fetch(url.toString(), {
          // Cache gently to avoid rate-limit; refresh every 5 minutes.
          next: { revalidate: 300 },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `WeatherAPI error (${res.status}) for ${loc.name}: ${text || res.statusText}`,
          );
        }

        const data = (await res.json()) as WeatherApiCurrentResponse;

        return {
          name: loc.name,
          lat: data.location.lat,
          lon: data.location.lon,
          localtime: data.location.localtime,
          last_updated: data.current.last_updated,
          temp_c: data.current.temp_c,
          humidity: data.current.humidity,
          wind_degree: data.current.wind_degree,
          wind_dir: data.current.wind_dir,
          wind_kph: data.current.wind_kph,
          precip_mm: data.current.precip_mm,
          condition_text: data.current.condition.text,
          condition_icon: data.current.condition.icon,
        };
      } catch (err) {
        return {
          name: loc.name,
          q: loc.q,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  );

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      locations: results,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

