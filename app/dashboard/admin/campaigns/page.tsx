"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MagnifyingGlass,
  Money,
  Target,
  CalendarBlank,
  MapPin,
  TrendUp,
  Wallet,
  CheckCircle,
  XCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/admin/dashboard";
import { useCampaigns } from "@/services/campaign_disbursement";

/* ── Helpers ──────────────────────────────────────────────── */

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ── Main Page ────────────────────────────────────────────── */

export default function CampaignsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Active" | "Closed"
  >("all");

  const { data, isLoading } = useCampaigns({
    params: { pageNumber: 1, pageSize: 200 },
  });

  const campaigns = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    let result = campaigns;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [campaigns, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === "Active").length,
      closed: campaigns.filter((c) => c.status === "Closed").length,
      totalRaised: campaigns.reduce((s, c) => s + c.totalAmount, 0),
      totalTarget: campaigns.reduce((s, c) => s + c.targetAmount, 0),
    }),
    [campaigns],
  );

  return (
    <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/admin/reports")}
            className="gap-1.5 text-muted-foreground mb-3 -ml-2"
          >
            <ArrowLeft size={14} />
            Quay lại
          </Button>
          <div className="flex items-center gap-2.5 mb-1">
            <Money size={20} weight="bold" className="text-foreground" />
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tài chính
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
            Chiến dịch gây quỹ
          </h1>
          <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
            Danh sách các chiến dịch gây quỹ từ thiện
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Tổng chiến dịch",
              value: stats.total,
              icon: Money,
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: "Đang hoạt động",
              value: stats.active,
              icon: CheckCircle,
              color: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: "Đã đóng",
              value: stats.closed,
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
            },
            {
              label: "Tổng quyên góp",
              value: isLoading ? "—" : formatMoney(stats.totalRaised),
              icon: Wallet,
              color: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
              isText: true,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm tracking-tighter text-muted-foreground font-medium mb-1">
                        {stat.label}
                      </p>
                      <p
                        className={`${
                          "isText" in stat && stat.isText
                            ? "text-lg"
                            : "text-2xl"
                        } tracking-tighter font-bold text-foreground`}
                      >
                        {isLoading && !("isText" in stat && stat.isText)
                          ? "—"
                          : stat.value}
                      </p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                    >
                      <Icon size={24} weight="fill" className={stat.color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-52">
            <Input
              placeholder="Tìm theo tên, vùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
            {(["all", "Active", "Closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium tracking-tighter rounded-md transition-colors ${
                  statusFilter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all"
                  ? "Tất cả"
                  : s === "Active"
                    ? "Đang hoạt động"
                    : "Đã đóng"}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              queryClient.invalidateQueries().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowClockwise size={15} className={isRefreshing ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>

        {/* ── Campaign Cards ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-border/50">
            <CardContent className="p-12 text-center">
              <Money
                size={40}
                className="mx-auto text-muted-foreground/30 mb-3"
              />
              <p className="text-sm text-muted-foreground tracking-tight">
                Không tìm thấy chiến dịch nào
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((campaign) => {
              const progress =
                campaign.targetAmount > 0
                  ? Math.min(
                      (campaign.totalAmount / campaign.targetAmount) * 100,
                      100,
                    )
                  : 0;
              const isActive = campaign.status === "Active";
              return (
                <Card
                  key={campaign.id}
                  className="border border-border/50 hover:border-border transition-colors overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold tracking-tighter text-foreground line-clamp-2 leading-snug">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <MapPin
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <span className="text-xs text-muted-foreground tracking-tighter">
                            {campaign.region}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={`shrink-0 border ${
                          isActive
                            ? "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-500/8 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {isActive ? "Active" : "Closed"}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs tracking-tight mb-1.5">
                        <span className="text-muted-foreground font-medium">
                          Tiến độ
                        </span>
                        <span className="font-semibold">
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isActive ? "bg-emerald-500" : "bg-rose-400"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendUp
                            size={11}
                            className="text-emerald-600"
                          />
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Đã quyên góp
                          </p>
                        </div>
                        <p className="text-sm font-bold tracking-tighter text-emerald-600">
                          {formatMoney(campaign.totalAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <Target
                            size={11}
                            className="text-blue-600"
                          />
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Mục tiêu
                          </p>
                        </div>
                        <p className="text-sm font-bold tracking-tighter text-blue-600">
                          {formatMoney(campaign.targetAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground tracking-tight pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1">
                        <CalendarBlank size={11} />
                        <span>
                          {formatDate(campaign.campaignStartDate)} –{" "}
                          {formatDate(campaign.campaignEndDate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
