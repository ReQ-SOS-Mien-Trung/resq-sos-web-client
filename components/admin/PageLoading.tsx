"use client";

import { cn } from "@/lib/utils";

type PageLoadingProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function PageLoading({
  title = "Đang tải dữ liệu",
  subtitle = "Vui lòng chờ trong giây lát…",
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        "bg-linear-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        className,
      )}
    >
      <div className="w-full max-w-sm px-6">
        <div className="rounded-2xl border border-border/50 bg-background/70 backdrop-blur p-6 shadow-xl shadow-red-500/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/25" />
              <div className="absolute inset-0 rounded-2xl bg-white/25 animate-pulse" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-56 rounded-full bg-muted/80 animate-pulse" />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-foreground font-semibold text-sm">{title}</p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500/80 animate-bounce [animation-delay:-200ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500/70 animate-bounce [animation-delay:-100ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500/60 animate-bounce" />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>

            <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-linear-to-r from-red-500 to-orange-500 animate-[loading_1.1s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loading {
          0% {
            transform: translateX(-60%);
          }
          100% {
            transform: translateX(260%);
          }
        }
      `}</style>
    </div>
  );
}

