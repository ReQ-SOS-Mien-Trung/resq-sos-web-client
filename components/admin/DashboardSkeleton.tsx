"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
  /**
   * Kiểu skeleton layout phù hợp với từng trang
   * - "dashboard": Trang tổng quan (cards + chart + widgets)
   * - "table": Trang danh sách (stats + filters + table)
   * - "cards": Trang dạng grid cards
   * - "editor": Trang có editor panel
   */
  variant?: "dashboard" | "table" | "cards" | "editor";
}

/**
 * Skeleton loading component cho content area trong DashboardLayout.
 * Dùng khi chuyển tab giữa các trang trong dashboard — nhẹ và nhanh hơn PageLoading.
 */
const DashboardSkeleton = ({
  variant = "dashboard",
}: DashboardSkeletonProps) => {
  if (variant === "table") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page Header */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Table Header */}
          <div className="border-b p-4 flex gap-6">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Table Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border-b last:border-0 p-4 flex gap-6 items-center"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "editor") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>

          {/* Right Panel */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: "dashboard" variant
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Updated Indicator */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 rounded-full" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main Grid: Chart + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Skeleton */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Calendar Skeleton */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Second Row: 3 Equal Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
