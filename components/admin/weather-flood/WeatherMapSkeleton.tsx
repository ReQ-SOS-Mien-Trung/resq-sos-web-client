"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export function WeatherMapSkeleton() {
  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            Bản đồ thời tiết & Lũ lụt
          </span>
          <span className="hidden sm:flex items-center gap-2">
            <span className="h-8 w-20 rounded-full bg-muted animate-pulse" />
            <span className="h-8 w-24 rounded-full bg-muted animate-pulse" />
            <span className="h-8 w-24 rounded-full bg-muted animate-pulse" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] rounded-lg bg-muted overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-sky-100/40 to-slate-100/40 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 animate-pulse" />
          <div className="absolute inset-4 border border-border/40 rounded-xl" />
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <span className="h-4 w-32 rounded-full bg-background/70 shadow-sm animate-pulse" />
            <span className="h-3 w-40 rounded-full bg-background/60 shadow-sm animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

