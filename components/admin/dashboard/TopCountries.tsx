"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, MoreVertical } from "lucide-react";
import type { TopCountriesData } from "@/types/admin-dashboard";

interface TopCountriesProps {
  data: TopCountriesData;
}

const countryFlags: Record<string, string> = {
  Australia: "🇦🇺",
  Malaysia: "🇲🇾",
  Indonesia: "🇮🇩",
  Singapore: "🇸🇬",
  Thailand: "🇹🇭",
  Vietnam: "🇻🇳",
  Philippines: "🇵🇭",
};

// Animated map component
const AnimatedMap = ({
  countries,
}: {
  countries: typeof TopCountriesData.prototype.countries;
}) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="w-full h-44 bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950/30 dark:to-purple-900/20 rounded-xl flex items-center justify-center relative overflow-hidden group">
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
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
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id="countryGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#9333ea" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Australia */}
        <path
          d="M 80 120 Q 100 100 140 110 Q 180 90 200 120 Q 210 160 180 190 Q 140 210 100 190 Q 60 170 80 120"
          fill={
            countries.find((c) => c.name === "Australia")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Australia"
              ? 1
              : countries.find((c) => c.name === "Australia")
                ? 0.85
                : 0.3
          }
          filter={hoveredCountry === "Australia" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Australia")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Malaysia */}
        <path
          d="M 240 60 Q 260 50 290 55 Q 310 65 300 85 Q 280 95 250 90 Q 230 80 240 60"
          fill={
            countries.find((c) => c.name === "Malaysia")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Malaysia"
              ? 1
              : countries.find((c) => c.name === "Malaysia")
                ? 0.7
                : 0.3
          }
          filter={hoveredCountry === "Malaysia" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Malaysia")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Indonesia */}
        <path
          d="M 220 100 Q 260 90 320 95 Q 360 110 350 140 Q 320 160 260 155 Q 200 145 220 100"
          fill={
            countries.find((c) => c.name === "Indonesia")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer hover:brightness-110"
          opacity={
            hoveredCountry === "Indonesia"
              ? 1
              : countries.find((c) => c.name === "Indonesia")
                ? 0.6
                : 0.3
          }
          filter={hoveredCountry === "Indonesia" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Indonesia")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Singapore */}
        <circle
          cx="275"
          cy="95"
          r="8"
          fill={
            countries.find((c) => c.name === "Singapore")
              ? "url(#countryGradient)"
              : "#e5e7eb"
          }
          className="transition-all duration-500 cursor-pointer"
          opacity={
            hoveredCountry === "Singapore"
              ? 1
              : countries.find((c) => c.name === "Singapore")
                ? 0.5
                : 0.3
          }
          filter={hoveredCountry === "Singapore" ? "url(#countryGlow)" : "none"}
          onMouseEnter={() => setHoveredCountry("Singapore")}
          onMouseLeave={() => setHoveredCountry(null)}
        />

        {/* Animated connection lines */}
        <path
          d="M 140 150 Q 200 120 275 95"
          stroke="#9333ea"
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
          <CardTitle className="text-base font-semibold">Top Country</CardTitle>
          <MoreVertical className="h-4 w-4 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
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
                        index === 0 && "bg-violet-600",
                        index === 1 && "bg-violet-500",
                        index === 2 && "bg-violet-400",
                        index === 3 && "bg-violet-300",
                      )}
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground min-w-[40px] text-right">
                    {country.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full text-sm text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg hover:bg-primary/5 transition-all duration-200 group">
            View more
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
