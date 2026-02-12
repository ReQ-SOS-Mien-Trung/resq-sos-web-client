"use client";

import { cn } from "@/lib/utils";
import LordIcon from "@/components/ui/LordIcon";

interface PageLoadingProps {
  className?: string;
}

const PageLoading = ({ className }: PageLoadingProps) => {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        "bg-linear-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        className,
      )}
    >
      <div className="relative">
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
  );
};

export default PageLoading;
