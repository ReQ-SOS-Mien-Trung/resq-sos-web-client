"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
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
  CaretDown,
  Check,
  X,
  Funnel,
  ArrowUp,
  ArrowDown,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/admin/dashboard";
import { useCampaigns, useCampaignStatuses } from "@/services/campaign_disbursement";
import type { CampaignStatus, CampaignEntity } from "@/services/campaign_disbursement";
import { useCampaignTransactions, useCampaignTransactionTypes, useCampaignReferenceTypes, useCampaignDirections } from "@/services/transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<CampaignStatus[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Panel state
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignEntity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [txDirectionFilter, setTxDirectionFilter] = useState("");
  const [txRefTypeFilter, setTxRefTypeFilter] = useState("");

  const openPanel = (campaign: CampaignEntity) => {
    setSelectedCampaign(campaign);
    setTxPage(1);
    setTxTypeFilter("");
    setTxDirectionFilter("");
    setTxRefTypeFilter("");
    setPanelOpen(true);
  };

  const { data, isLoading } = useCampaigns({
    params: { pageNumber: page, pageSize, statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined },
  });
  const { data: campaignStatuses = [] } = useCampaignStatuses();

  // Transactions for selected campaign
  const { data: txData, isLoading: txLoading } = useCampaignTransactions(
    {
      id: selectedCampaign?.id ?? 0,
      pageNumber: txPage,
      pageSize: txPageSize,
      types: txTypeFilter ? [txTypeFilter] : undefined,
      directions: txDirectionFilter ? [txDirectionFilter] : undefined,
      referenceTypes: txRefTypeFilter ? [txRefTypeFilter] : undefined,
    },
    { enabled: !!selectedCampaign },
  );

  const { data: txTypesMeta = [] } = useCampaignTransactionTypes();
  const { data: txRefTypesMeta = [] } = useCampaignReferenceTypes();
  const { data: txDirectionsMeta = [] } = useCampaignDirections();

  const txTypeMap = useMemo(() => Object.fromEntries(txTypesMeta.map((m) => [m.key, m.value])), [txTypesMeta]);
  const txRefTypeMap = useMemo(() => Object.fromEntries(txRefTypesMeta.map((m) => [m.key, m.value])), [txRefTypesMeta]);

  const campaigns = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of campaigns) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return map;
  }, [campaigns]);

  const stats = useMemo(
    () => ({
      total: data?.totalCount ?? campaigns.length,
      active: campaigns.filter((c) => c.status === "Active").length,
      closed: campaigns.filter((c) => c.status === "Closed").length,
      totalRaised: campaigns.reduce((s, c) => s + c.totalAmount, 0),
      totalTarget: campaigns.reduce((s, c) => s + c.targetAmount, 0),
    }),
    [campaigns, data?.totalCount],
  );

  return (
    <>
    <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-normal text-sm"
              >
                <Funnel size={13} />
                Trạng thái
                {selectedStatuses.length > 0 ? (
                  <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1.5" align="start">
              {campaignStatuses.map((s) => {
                const checked = selectedStatuses.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setSelectedStatuses((prev) =>
                        checked ? prev.filter((v) => v !== s.key) : [...prev, s.key],
                      );
                      setPage(1);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span
                      className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {checked && <Check size={11} weight="bold" />}
                    </span>
                    <span className={checked ? "font-medium" : ""}>
                      {s.value}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {statusCounts[s.key] ?? 0}
                    </span>
                  </button>
                );
              })}
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => { setSelectedStatuses([]); setPage(1); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                >
                  <X size={11} />
                  Xóa bộ lọc
                </button>
              )}
            </PopoverContent>
          </Popover>
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
                  onClick={() => openPanel(campaign)}
                  className="border border-border/50 hover:border-border transition-colors overflow-hidden cursor-pointer hover:shadow-sm"
                >
                  <CardContent className="px-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold tracking-tighter text-foreground line-clamp-2 leading-snug">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin
                            size={12}
                            className="text-muted-foreground shrink-0"
                          />
                          <span className="text-sm text-muted-foreground tracking-tighter">
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
                      <div className="flex items-center justify-between text-sm tracking-tight mb-1.5">
                        <span className="tracking-tighter font-medium">
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
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap mb-1">
                          Quyên góp
                        </p>
                        <p className="text-xs font-bold tracking-tighter text-emerald-600 truncate">
                          {formatMoney(campaign.totalAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap mb-1">
                          Mục tiêu
                        </p>
                        <p className="text-xs font-bold tracking-tighter text-blue-600 truncate">
                          {formatMoney(campaign.targetAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap mb-1">
                          Số dư
                        </p>
                        <p className="text-xs font-bold tracking-tighter text-violet-600 truncate">
                          {formatMoney(campaign.currentBalance)}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-3 text-xs font-medium tracking-tighter pt-1 border-t border-border/40">
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

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground tracking-tight">
              Trang {page}/{data?.totalPages ?? 1}
            </p>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-16 h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground tracking-tight">/ trang</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data?.hasPreviousPage}
              className="px-2.5 py-1 text-sm rounded-md border border-border/60 disabled:opacity-40 hover:bg-muted/50 transition-colors"
            >
              Trước
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.hasNextPage}
              className="px-2.5 py-1 text-sm rounded-md border border-border/60 disabled:opacity-40 hover:bg-muted/50 transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>

      {/* ── Transaction Panel ─────────────────────────── */}
      <Sheet
        open={panelOpen}
        onOpenChange={(val) => {
          setPanelOpen(val);
          if (!val) setSelectedCampaign(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto rounded-t-2xl p-6"
        >
          <SheetHeader className="pb-4 border-b mb-4">
            <SheetTitle className="tracking-tighter text-xl line-clamp-2">
              {selectedCampaign?.name}
            </SheetTitle>
            <SheetDescription className="tracking-tight text-sm">
              Lịch sử giao dịch tài chính của chiến dịch
            </SheetDescription>
          </SheetHeader>

          {selectedCampaign && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendUp size={12} className="text-emerald-600" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Đã quyên góp</p>
                  </div>
                  <p className="text-base font-bold tracking-tighter text-emerald-600">
                    {formatMoney(selectedCampaign.totalAmount)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <Target size={12} className="text-blue-600" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mục tiêu</p>
                  </div>
                  <p className="text-base font-bold tracking-tighter text-blue-600">
                    {formatMoney(selectedCampaign.targetAmount)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Transaction list */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                    <ArrowsLeftRight size={20} className="text-muted-foreground" />
                    Giao dịch ({txData?.totalCount ?? 0})
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Type filter */}
                    <Select value={txTypeFilter} onValueChange={(v) => { setTxTypeFilter(v === "__all" ? "" : v); setTxPage(1); }}>
                      <SelectTrigger className="h-7 text-sm w-44">
                        <SelectValue placeholder="Loại giao dịch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả loại</SelectItem>
                        {txTypesMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>{m.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Direction filter */}
                    <Select value={txDirectionFilter} onValueChange={(v) => { setTxDirectionFilter(v === "__all" ? "" : v); setTxPage(1); }}>
                      <SelectTrigger className="h-7 text-sm w-36">
                        <SelectValue placeholder="Hướng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả</SelectItem>
                        {txDirectionsMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>{m.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Reference type filter */}
                    <Select value={txRefTypeFilter} onValueChange={(v) => { setTxRefTypeFilter(v === "__all" ? "" : v); setTxPage(1); }}>
                      <SelectTrigger className="h-7 text-sm w-44">
                        <SelectValue placeholder="Nguồn tham chiếu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả nguồn</SelectItem>
                        {txRefTypesMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>{m.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(txTypeFilter || txDirectionFilter || txRefTypeFilter) && (
                      <button
                        onClick={() => { setTxTypeFilter(""); setTxDirectionFilter(""); setTxRefTypeFilter(""); setTxPage(1); }}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground border border-border/60 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <X size={11} />
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                </div>

                {txLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !txData?.items?.length ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                    <ArrowsLeftRight size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground tracking-tight">Chưa có giao dịch nào</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-10 text-center text-sm">#</TableHead>
                          <TableHead className="text-sm">Loại giao dịch</TableHead>
                          <TableHead className="text-sm">Tham chiếu</TableHead>
                          <TableHead className="text-sm text-right">Số tiền</TableHead>
                          <TableHead className="text-sm text-right">Thời gian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txData.items.map((tx, idx) => {
                          const isIn = tx.direction?.toLowerCase() === "in";
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {(txPage - 1) * txPageSize + idx + 1}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                <span className={`inline-flex items-center gap-1 ${
                                  isIn ? "text-emerald-600" : "text-rose-600"
                                }`}>
                                  {isIn ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
                                  {(txTypeMap[tx.type] ?? tx.type) || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.referenceId != null
                                  ? `${txRefTypeMap[tx.referenceType] ?? tx.referenceType}${tx.referenceId ? ` #${tx.referenceId}` : ""}`
                                  : "—"}
                              </TableCell>
                              <TableCell className={`text-sm font-bold text-right ${
                                isIn ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {isIn ? "+" : "-"}{formatMoney(tx.amount)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground text-right whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleString("vi-VN")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground tracking-tight">
                      Trang {txPage} / {txData?.totalPages ?? 1}
                    </p>
                    <Select value={String(txPageSize)} onValueChange={(v) => { setTxPageSize(Number(v)); setTxPage(1); }}>
                      <SelectTrigger className="w-16 h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground tracking-tight">/ trang</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={!txData?.hasPreviousPage}
                      className="px-2.5 py-1 text-sm rounded-md border border-border/60 disabled:opacity-40 hover:bg-muted/50 transition-colors"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setTxPage((p) => p + 1)}
                      disabled={!txData?.hasNextPage}
                      className="px-2.5 py-1 text-sm rounded-md border border-border/60 disabled:opacity-40 hover:bg-muted/50 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
