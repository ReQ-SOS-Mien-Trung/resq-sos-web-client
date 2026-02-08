"use client";

import { cn } from "@/lib/utils";
import { PageLoadingProps } from "@/type";
import LordIcon from "@/components/ui/LordIcon";

const PageLoading = ({
  title = "Đang tải dữ liệu",
  subtitle = "Vui lòng chờ trong giây lát…",
  className,
}: PageLoadingProps) => {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        "bg-linear-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        className,
      )}
    >
      <div className="w-full max-w-sm px-6">
        <div className="rounded-2xl border border-border/50 bg-background/70 backdrop-blur p-8 shadow-xl shadow-red-500/10">
          {/* LordIcon Animated Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Glow effect behind icon */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full blur-2xl scale-150" />
              <LordIcon
                src="https://cdn.lordicon.com/mhwzfwxu.json"
                trigger="loop"
                delay={0}
                size={120}
                colors={{
                  primary: "#e83a30",
                  secondary: "#f28621",
                }}
              />
            </div>
          </div>

          {/* Text content */}
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg mb-1">
              {title}
            </p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-linear-to-r from-red-500 to-orange-500 animate-[loading_1.1s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
};

export default PageLoading;
