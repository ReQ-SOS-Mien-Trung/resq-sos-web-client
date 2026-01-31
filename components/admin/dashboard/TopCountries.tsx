"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, DotsThreeVertical } from "@phosphor-icons/react";
import type { TopCountriesData, CountryData } from "@/types/admin-dashboard";

interface TopCountriesProps {
  data: TopCountriesData;
}

const countryFlags: Record<string, string> = {
  "Đà Nẵng": "🇲",
  "Quảng Nam": "🇲",
  "Thừa Thiên Huế": "🇲",
  "Quảng Ngãi": "🇲",
  "Quảng Bình": "🇲",
  "Quảng Trị": "🇲",
};

// Pre-generated random positions for dots to avoid impure function calls during render
const DOT_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 17 + 5) % 100}%`,
  top: `${(i * 23 + 10) % 100}%`,
  animationDelay: `${(i * 0.15) % 2}s`,
  animationDuration: `${2 + ((i * 0.2) % 2)}s`,
}));

// Animated map component for Central Vietnam
const AnimatedMap = ({ countries }: { countries: CountryData[] }) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="w-full h-44 bg-linear-to-br from-red-50 to-orange-100 dark:from-red-950/30 dark:to-orange-900/20 rounded-xl flex items-center justify-center relative overflow-hidden group">
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-30">
        {DOT_POSITIONS.map((pos, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-red-400 rounded-full animate-pulse"
            style={pos}
          />
        ))}
      </div>

      <svg
        viewBox="0 0 400 250"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="countryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <filter id="countryGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#ef4444" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Đà Nẵng */}
        <path
          d="M 180 80 Q 200 70 220 80 Q 230 100 210 120 Q 180 125 170 100 Q 165 85 180 80"
          fill={
            countries.find((c) => c.name === "Đà Nẵng")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Đà Nẵng"
              ? 1
              : countries.find((c) => c.name === "Đà Nẵng")
                ? 0.85
                : 0.3
          }
          filter={hoveredCountry === "Đà Nẵng" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Đà Nẵng")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Quảng Nam */}
        <path
          d="M 190 120 Q 220 110 250 120 Q 270 140 250 160 Q 210 170 180 155 Q 165 140 190 120"
          fill={
            countries.find((c) => c.name === "Quảng Nam")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Quảng Nam"
              ? 1
              : countries.find((c) => c.name === "Quảng Nam")
                ? 0.7
                : 0.3
          }
          filter={hoveredCountry === "Quảng Nam" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Quảng Nam")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Thừa Thiên Huế */}
        <path
          d="M 140 50 Q 170 40 190 55 Q 200 75 175 85 Q 145 90 130 70 Q 125 55 140 50"
          fill={
            countries.find((c) => c.name === "Thừa Thiên Huế")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Thừa Thiên Huế"
              ? 1
              : countries.find((c) => c.name === "Thừa Thiên Huế")
                ? 0.6
                : 0.3
          }
          filter={
            hoveredCountry === "Thừa Thiên Huế" ? "url(#countryGlow)" : "none"
          }
          onMouseEnter={() => setHoveredCountry("Thừa Thiên Huế")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Quảng Ngãi */}
        <path
          d="M 220 160 Q 250 150 280 165 Q 290 185 265 200 Q 230 210 210 190 Q 200 175 220 160"
          fill={
            countries.find((c) => c.name === "Quảng Ngãi")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer"
          opacity={
            hoveredCountry === "Quảng Ngãi"
              ? 1
              : countries.find((c) => c.name === "Quảng Ngãi")
                ? 0.5
                : 0.3
          }
          filter={
            hoveredCountry === "Quảng Ngãi" ? "url(#countryGlow)" : "none"
          }
          onMouseEnter={() => setHoveredCountry("Quảng Ngãi")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Animated connection lines */}
        <path
          d="M 160 70 Q 180 90 200 100"
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="4 4"
          fill="none"
          opacity="0.3"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};

export function TopCountries({ data }: TopCountriesProps) {
  const sortedCountries = [...data.countries].sort(
    (a, b) => b.percentage - a.percentage,
  );

  return (
    <Card className="border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Khu vực cứu hộ
          </CardTitle>
          <DotsThreeVertical
            size={16}
            className="text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AnimatedMap countries={data.countries} />
          <div className="space-y-2">
            {sortedCountries.map((country, index) => (
              <div
                key={country.name}
                className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-right-4"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{index + 1}</span>
                  <span className="text-xl">
                    {countryFlags[country.name] || "🏳️"}
                  </span>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {country.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        index === 0 && "bg-red-600",
                        index === 1 && "bg-red-500",
                        index === 2 && "bg-orange-500",
                        index === 3 && "bg-orange-400",
                      )}
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground min-w-10 text-right">
                    {country.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full text-sm text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg hover:bg-primary/5 transition-all duration-200 group">
            Xem thêm
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
