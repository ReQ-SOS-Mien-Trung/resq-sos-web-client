import { CENTRAL_VN_LOCATIONS } from "@/lib/locations";
import { WeatherApiCurrentResponse } from "@/type";
import { NextResponse } from "next/server";

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
