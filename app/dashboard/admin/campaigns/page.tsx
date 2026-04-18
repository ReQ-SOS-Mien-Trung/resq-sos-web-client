"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Plus,
  PiggyBankIcon,
  ChartBarHorizontal,
} from "@phosphor-icons/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/admin/dashboard";
import { toast } from "sonner";
import {
  useCampaigns,
  useCampaignStatuses,
  useCreateCampaign,
  useUpdateCampaignInfo,
  useExtendCampaign,
  useUpdateCampaignTarget,
  useUpdateCampaignStatus,
  useCampaignFundFlowChart,
} from "@/services/campaign_disbursement";
import type {
  CampaignStatus,
  CampaignEntity,
} from "@/services/campaign_disbursement";
import {
  useCampaignTransactions,
  useCampaignTransactionTypes,
  useCampaignReferenceTypes,
  useCampaignDirections,
} from "@/services/transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProvinceItem = {
  code: number;
  name: string;
};

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

function parseYmdToDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatAmountWithDot(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* ── Campaign Fund Flow Chart ─────────────────────────────── */

function CampaignFundFlowChart() {
  const { data: campaignsData, isLoading: loadingCampaigns } = useCampaigns({
    params: { pageSize: 10, statuses: ["Active"] },
  });
  const firstCampaign = campaignsData?.items?.[0];
  const { data, isLoading } = useCampaignFundFlowChart(
    firstCampaign?.id,
    undefined,
    { enabled: !!firstCampaign },
  );

  const chartData = useMemo(() => {
    if (!data) return null;
    return {
      labels: data.dataPoints.map((p) => p.periodLabel),
      datasets: [
        {
          label: "Thu (VND)",
          data: data.dataPoints.map((p) => p.totalIn),
          backgroundColor: "rgba(34,197,94,0.75)",
          borderColor: "rgb(34,197,94)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Chi (VND)",
          data: data.dataPoints.map((p) => p.totalOut),
          backgroundColor: "rgba(239,68,68,0.75)",
          borderColor: "rgb(239,68,68)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Số dư ròng (VND)",
          data: data.dataPoints.map((p) => p.netBalance),
          backgroundColor: "rgba(59,130,246,0.75)",
          borderColor: "rgb(59,130,246)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data]);

  const title = firstCampaign
    ? `Quỹ chiến dịch: ${firstCampaign.name}`
    : "Biến động quỹ chiến dịch";

  return (
    <Card className="border border-border/50 py-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <ChartBarHorizontal className="h-4 w-4" weight="fill" />
          </div>
          <p className="text-base font-semibold tracking-tighter">{title}</p>
        </div>
        {isLoading || loadingCampaigns ? (
          <div className="h-52 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : chartData ? (
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: {
                  position: "top",
                  labels: { font: { size: 11 }, boxWidth: 12 },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}`,
                  },
                },
              },
              scales: {
                x: { ticks: { font: { size: 11 } } },
                y: {
                  ticks: {
                    font: { size: 10 },
                    callback: (v) => formatMoney(Number(v)),
                  },
                  beginAtZero: true,
                },
              },
            }}
          />
        ) : !loadingCampaigns && !firstCampaign ? (
          <p className="text-sm text-muted-foreground tracking-tighter">
            Không có chiến dịch đang hoạt động
          </p>
        ) : (
          <p className="text-sm text-muted-foreground tracking-tighter">
            Không có dữ liệu
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main Page ────────────────────────────────────────────── */

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<CampaignStatus[]>(
    [],
  );
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [createProvinceOpen, setCreateProvinceOpen] = useState(false);
  const [editProvinceOpen, setEditProvinceOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    region: "",
    campaignStartDate: "",
    campaignEndDate: "",
    targetAmount: "",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Panel state
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignEntity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [txDirectionFilter, setTxDirectionFilter] = useState("");
  const [txRefTypeFilter, setTxRefTypeFilter] = useState("");

  const updateInfoMutation = useUpdateCampaignInfo();
  const extendDeadlineMutation = useExtendCampaign();
  const updateTargetMutation = useUpdateCampaignTarget();
  const updateStatusMutation = useUpdateCampaignStatus();

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editInfoForm, setEditInfoForm] = useState({ name: "", region: "" });

  const [extendOpen, setExtendOpen] = useState(false);
  const [extendForm, setExtendForm] = useState({ endDate: "" });

  const [targetOpen, setTargetOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({ targetAmount: "" });

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "Active" as CampaignStatus,
    reason: "",
  });

  const [confirmAction, setConfirmAction] = useState<{
    action: "Archived";
    title: string;
    description: string;
  } | null>(null);

  const handleUpdateStatus = (newStatus: CampaignStatus, reason?: string) => {
    if (!selectedCampaign) return;
    const toastId = toast.loading("Đang cập nhật trạng thái...");
    updateStatusMutation.mutate(
      { id: selectedCampaign.id, payload: { newStatus, reason } },
      {
        onSuccess: () => {
          toast.success("Cập nhật thành công", { id: toastId });
          setStatusOpen(false);
          setSelectedCampaign((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        },
        onError: () => toast.error("Cập nhật thất bại", { id: toastId }),
      },
    );
  };

  const openPanel = (campaign: CampaignEntity) => {
    setSelectedCampaign(campaign);
    setTxPage(1);
    setTxTypeFilter("");
    setTxDirectionFilter("");
    setTxRefTypeFilter("");
    setPanelOpen(true);
  };

  const { data, isLoading } = useCampaigns({
    params: {
      pageNumber: page,
      pageSize,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    },
  });
  const createCampaignMutation = useCreateCampaign();
  const { data: campaignStatuses = [] } = useCampaignStatuses();

  function ensureProvincesLoaded() {
    if (provinces.length > 0 || loadingProvinces) return;
    setLoadingProvinces(true);
    fetch("https://provinces.open-api.vn/api/v2/")
      .then((res) => res.json())
      .then((data: ProvinceItem[]) => {
        setProvinces(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error("Không tải được danh sách tỉnh/thành"))
      .finally(() => setLoadingProvinces(false));
  }

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

  const txTypeMap = useMemo(
    () => Object.fromEntries(txTypesMeta.map((m) => [m.key, m.value])),
    [txTypesMeta],
  );
  const txRefTypeMap = useMemo(
    () => Object.fromEntries(txRefTypesMeta.map((m) => [m.key, m.value])),
    [txRefTypesMeta],
  );
  const incomingDirectionTokens = useMemo(() => {
    const set = new Set<string>([
      "in",
      "incoming",
      "credit",
      "tiền vào",
      "tien vao",
    ]);

    for (const item of txDirectionsMeta) {
      if (item.key) set.add(item.key.trim().toLowerCase());
      if (item.value) set.add(item.value.trim().toLowerCase());
    }

    return set;
  }, [txDirectionsMeta]);

  const campaigns = useMemo(() => data?.items ?? [], [data]);

  const createProvinceOptions = useMemo(() => {
    const keyword = normalizeText(createForm.region.trim());
    if (!keyword) return provinces;
    return provinces.filter((p) => normalizeText(p.name).includes(keyword));
  }, [provinces, createForm.region]);

  const editProvinceOptions = useMemo(() => {
    const keyword = normalizeText(editInfoForm.region.trim());
    if (!keyword) return provinces;
    return provinces.filter((p) => normalizeText(p.name).includes(keyword));
  }, [provinces, editInfoForm.region]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q),
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

  function resetCreateForm() {
    setCreateForm({
      name: "",
      region: "",
      campaignStartDate: "",
      campaignEndDate: "",
      targetAmount: "",
    });
    setCreateProvinceOpen(false);
    setStartDateOpen(false);
    setEndDateOpen(false);
  }

  function handleCreateCampaign() {
    const name = createForm.name.trim();
    const region = createForm.region.trim();
    const campaignStartDate = createForm.campaignStartDate;
    const campaignEndDate = createForm.campaignEndDate;
    const targetAmount = Number(createForm.targetAmount.replaceAll(".", ""));

    if (!name || !region || !campaignStartDate || !campaignEndDate) {
      toast.error("Vui lòng nhập đủ thông tin bắt buộc");
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Mục tiêu gây quỹ phải lớn hơn 0");
      return;
    }
    if (new Date(campaignEndDate) < new Date(campaignStartDate)) {
      toast.error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
      return;
    }

    createCampaignMutation.mutate(
      {
        name,
        region,
        campaignStartDate,
        campaignEndDate,
        targetAmount,
      },
      {
        onSuccess: () => {
          toast.success("Tạo chiến dịch thành công");
          setCreateOpen(false);
          resetCreateForm();
          setIsRefreshing(true);
          queryClient.invalidateQueries().finally(() => setIsRefreshing(false));
        },
        onError: () => {
          toast.error("Tạo chiến dịch thất bại");
        },
      },
    );
  }

  return (
    <>
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <div className="space-y-6">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                className="gap-2 tracking-tight bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25"
                onClick={() => {
                  setCreateOpen(true);
                  ensureProvincesLoaded();
                }}
              >
                <Plus size={16} />
                Tạo chiến dịch
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRefreshing(true);
                  queryClient
                    .invalidateQueries()
                    .finally(() => setIsRefreshing(false));
                }}
                disabled={isRefreshing}
                className="gap-1.5 text-muted-foreground"
              >
                <ArrowClockwise
                  size={15}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                Làm mới
              </Button>
            </div>
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
                icon: PiggyBankIcon,
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

          {/* ── Campaign Fund Flow Chart ── */}
          <CampaignFundFlowChart />

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-52">
              <Input
                placeholder="Tìm theo tên, vùng..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
              <PopoverContent
                className="w-56 max-h-72 overflow-y-auto p-1.5"
                align="end"
                side="bottom"
                sideOffset={4}
              >
                {campaignStatuses.map((s) => {
                  const checked = selectedStatuses.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          checked
                            ? prev.filter((v) => v !== s.key)
                            : [...prev, s.key],
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
                    onClick={() => {
                      setSelectedStatuses([]);
                      setPage(1);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                  >
                    <X size={11} />
                    Xóa bộ lọc
                  </button>
                )}
              </PopoverContent>
            </Popover>
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
                          <h3 className="text-2xl font-bold tracking-tighter text-foreground line-clamp-2 leading-snug">
                            {campaign.name}
                          </h3>
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
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-semibold tracking-tighter">
                            Đã quyên góp
                          </p>
                          <p className="text-sm font-bold tracking-tighter text-emerald-600">
                            {formatMoney(campaign.totalAmount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-semibold tracking-tighter">
                            Mục tiêu
                          </p>
                          <p className="text-sm font-bold tracking-tighter text-rose-600">
                            {formatMoney(campaign.targetAmount)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-semibold tracking-tighter">
                            Số dư hiện tại
                          </p>
                          <p className="text-sm font-bold tracking-tighter text-blue-600">
                            {formatMoney(campaign.currentBalance)}
                          </p>
                        </div>
                      </div>

                      {/* Dates and Region */}
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground tracking-tighter pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          <CalendarBlank size={13} />
                          <span>
                            {formatDate(campaign.campaignStartDate)} –{" "}
                            {formatDate(campaign.campaignEndDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <MapPin size={13} />
                          <span className="truncate">{campaign.region}</span>
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
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
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
              <span className="text-sm text-muted-foreground tracking-tight">
                / trang
              </span>
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (open) ensureProvincesLoaded();
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Money size={24} weight="fill" className="text-blue-600" />
              Tạo chiến dịch gây quỹ mới
            </DialogTitle>
            <DialogDescription>
              Góp gió thành bão, tạo quỹ ngay để hiện thực hóa ước mơ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Tên chiến dịch</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Nhập tên chiến dịch"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tỉnh/Thành phố</Label>
                <div className="relative">
                  <Input
                    className="h-12"
                    value={createForm.region}
                    onFocus={() => {
                      ensureProvincesLoaded();
                      setCreateProvinceOpen(true);
                    }}
                    onBlur={() =>
                      window.setTimeout(() => setCreateProvinceOpen(false), 120)
                    }
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, region: e.target.value }));
                      setCreateProvinceOpen(true);
                    }}
                    placeholder={
                      loadingProvinces
                        ? "Đang tải tỉnh/thành..."
                        : "Chọn hoặc nhập tỉnh/thành"
                    }
                    autoComplete="off"
                  />
                  {createProvinceOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-auto">
                      {createProvinceOptions.length > 0 ? (
                        createProvinceOptions.map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCreateForm((prev) => ({
                                ...prev,
                                region: p.name,
                              }));
                              setCreateProvinceOpen(false);
                            }}
                          >
                            {p.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Không tìm thấy tỉnh/thành
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mục tiêu gây quỹ</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="h-12"
                  value={createForm.targetAmount}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      targetAmount: formatAmountWithDot(e.target.value),
                    }))
                  }
                  placeholder="Ví dụ: 500.000.000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ngày bắt đầu</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-between font-normal"
                    >
                      {createForm.campaignStartDate
                        ? parseYmdToDate(
                            createForm.campaignStartDate,
                          )?.toLocaleDateString("vi-VN")
                        : "dd/mm/yyyy"}
                      <CalendarBlank
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-10010 w-auto p-0"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    avoidCollisions={false}
                  >
                    <Calendar
                      mode="single"
                      selected={parseYmdToDate(createForm.campaignStartDate)}
                      onSelect={(date) => {
                        setCreateForm((p) => ({
                          ...p,
                          campaignStartDate: date ? formatDateToYmd(date) : "",
                        }));
                        setStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Ngày kết thúc</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-between font-normal"
                    >
                      {createForm.campaignEndDate
                        ? parseYmdToDate(
                            createForm.campaignEndDate,
                          )?.toLocaleDateString("vi-VN")
                        : "dd/mm/yyyy"}
                      <CalendarBlank
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-10010 w-auto p-0"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    avoidCollisions={false}
                  >
                    <Calendar
                      mode="single"
                      selected={parseYmdToDate(createForm.campaignEndDate)}
                      onSelect={(date) => {
                        setCreateForm((p) => ({
                          ...p,
                          campaignEndDate: date ? formatDateToYmd(date) : "",
                        }));
                        setEndDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending
                ? "Đang tạo..."
                : "Tạo chiến dịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3 pr-8">
              {!editInfoOpen ? (
                <div>
                  <SheetTitle className="tracking-tighter text-xl line-clamp-2">
                    {selectedCampaign?.name}
                  </SheetTitle>
                  <SheetDescription className="tracking-tight text-sm mt-1">
                    Lịch sử giao dịch tài chính - {selectedCampaign?.region}
                  </SheetDescription>
                </div>
              ) : (
                <div className="flex-1 space-y-2 max-w-xl">
                  <Input
                    className="h-9 font-bold text-lg px-2 w-full"
                    value={editInfoForm.name}
                    onChange={(e) =>
                      setEditInfoForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Tên chiến dịch"
                  />
                  <div className="relative">
                    <Input
                      className="h-8 px-2 text-sm bg-background border-input"
                      value={editInfoForm.region}
                      onFocus={() => {
                        ensureProvincesLoaded();
                        setEditProvinceOpen(true);
                      }}
                      onBlur={() =>
                        window.setTimeout(() => setEditProvinceOpen(false), 120)
                      }
                      onChange={(e) => {
                        setEditInfoForm((p) => ({
                          ...p,
                          region: e.target.value,
                        }));
                        setEditProvinceOpen(true);
                      }}
                      placeholder={
                        loadingProvinces
                          ? "Đang tải tỉnh/thành..."
                          : "Chọn hoặc nhập tỉnh/thành"
                      }
                      autoComplete="off"
                    />
                    {editProvinceOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-auto">
                        {editProvinceOptions.length > 0 ? (
                          editProvinceOptions.map((p) => (
                            <button
                              key={p.code}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setEditInfoForm((prev) => ({
                                  ...prev,
                                  region: p.name,
                                }));
                                setEditProvinceOpen(false);
                              }}
                            >
                              {p.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Không tìm thấy tỉnh/thành
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCampaign && (
                <div className="flex flex-wrap items-center gap-2 mt-3 xl:mt-0 xl:ml-auto">
                  {statusOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-8 w-64 px-2 text-sm bg-background border-input"
                        autoFocus
                        placeholder={`Lý do ${statusForm.status === "Suspended" ? "tạm dừng" : statusForm.status}...`}
                        value={statusForm.reason}
                        onChange={(e) =>
                          setStatusForm((p) => ({
                            ...p,
                            reason: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={
                          !statusForm.reason || updateStatusMutation.isPending
                        }
                        onClick={() =>
                          handleUpdateStatus(
                            statusForm.status,
                            statusForm.reason,
                          )
                        }
                      >
                        {updateStatusMutation.isPending
                          ? "Đang xử lý..."
                          : "Xác nhận"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setStatusOpen(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : editInfoOpen ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditInfoOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        disabled={
                          !editInfoForm.name ||
                          !editInfoForm.region ||
                          updateInfoMutation.isPending
                        }
                        onClick={() => {
                          if (!selectedCampaign) return;
                          const toastId = toast.loading("Đang cập nhật...");
                          updateInfoMutation.mutate(
                            { id: selectedCampaign.id, payload: editInfoForm },
                            {
                              onSuccess: () => {
                                toast.success("Đã cập nhật thông tin", {
                                  id: toastId,
                                });
                                setEditInfoOpen(false);
                                setSelectedCampaign((p) =>
                                  p ? { ...p, ...editInfoForm } : null,
                                );
                                queryClient.invalidateQueries({
                                  queryKey: ["campaigns"],
                                });
                              },
                              onError: () =>
                                toast.error("Cập nhật thất bại", {
                                  id: toastId,
                                }),
                            },
                          );
                        }}
                      >
                        {updateInfoMutation.isPending ? "Đang lưu..." : "Lưu"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Cập nhật thông tin */}
                      {!["Archived", "Closed"].includes(
                        selectedCampaign.status,
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            ensureProvincesLoaded();
                            setEditInfoForm({
                              name: selectedCampaign.name,
                              region: selectedCampaign.region,
                            });
                            setEditInfoOpen(true);
                          }}
                        >
                          Sửa thông tin
                        </Button>
                      )}
                      {/* Gia hạn */}
                      {!["Archived", "Closed"].includes(
                        selectedCampaign.status,
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExtendForm({
                              endDate:
                                selectedCampaign.campaignEndDate.split("T")[0],
                            });
                            setExtendOpen(true);
                          }}
                        >
                          Gia hạn thời gian
                        </Button>
                      )}
                      {/* Sửa mục tiêu */}
                      {selectedCampaign.status === "Draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetForm({
                              targetAmount: formatAmountWithDot(
                                selectedCampaign.targetAmount.toString(),
                              ),
                            });
                            setTargetOpen(true);
                          }}
                        >
                          Sửa mục tiêu quỹ
                        </Button>
                      )}
                      {/* Trạng thái */}
                      {selectedCampaign.status === "Draft" && (
                        <Button
                          className="gap-2 tracking-tight bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
                          onClick={() => handleUpdateStatus("Active")}
                        >
                          Kích hoạt sử dụng quỹ
                        </Button>
                      )}
                      {selectedCampaign.status === "Suspended" && (
                        <>
                          <Button
                            className="gap-2 tracking-tight bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                            onClick={() => handleUpdateStatus("Active")}
                          >
                            Khôi phục lại quỹ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus("Closed")}
                          >
                            Đóng quỹ
                          </Button>
                        </>
                      )}
                      {selectedCampaign.status === "Active" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => {
                              setStatusForm({
                                status: "Suspended",
                                reason: "",
                              });
                              setStatusOpen(true);
                            }}
                          >
                            Tạm dừng quỹ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus("Closed")}
                          >
                            Đóng quỹ
                          </Button>
                        </>
                      )}
                      {selectedCampaign.status === "Closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                          onClick={() => {
                            setConfirmAction({
                              action: "Archived",
                              title: "Lưu trữ quỹ (Vĩnh viễn)",
                              description:
                                "Bạn có chắc chắn muốn lưu trữ quỹ vĩnh viễn? Hành động này không thể hoàn tác.",
                            });
                          }}
                        >
                          Lưu trữ quỹ (Vĩnh viễn)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          {selectedCampaign && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendUp size={12} className="text-emerald-600" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Đã quyên góp
                    </p>
                  </div>
                  <p className="text-base font-bold tracking-tighter text-emerald-600">
                    {formatMoney(selectedCampaign.totalAmount)}
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1 mb-1">
                    <Target size={12} className="text-blue-600" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Mục tiêu
                    </p>
                  </div>
                  {targetOpen ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-8 flex-1 px-2 text-sm bg-background border-input"
                        value={targetForm.targetAmount}
                        onChange={(e) =>
                          setTargetForm({
                            targetAmount: formatAmountWithDot(e.target.value),
                          })
                        }
                        autoFocus
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-blue-600 hover:bg-blue-700 shrink-0 text-white"
                        disabled={
                          !targetForm.targetAmount ||
                          Number(targetForm.targetAmount.replace(/\D/g, "")) <=
                            0 ||
                          updateTargetMutation.isPending
                        }
                        onClick={() => {
                          if (!selectedCampaign) return;
                          const parsedTarget = Number(
                            targetForm.targetAmount.replace(/\D/g, ""),
                          );
                          const toastId = toast.loading("Đang cập nhật...");
                          updateTargetMutation.mutate(
                            {
                              id: selectedCampaign.id,
                              payload: { newTarget: parsedTarget },
                            },
                            {
                              onSuccess: () => {
                                toast.success("Đã cập nhật mục tiêu", {
                                  id: toastId,
                                });
                                setTargetOpen(false);
                                setSelectedCampaign((p) =>
                                  p
                                    ? { ...p, targetAmount: parsedTarget }
                                    : null,
                                );
                                queryClient.invalidateQueries({
                                  queryKey: ["campaigns"],
                                });
                              },
                              onError: () =>
                                toast.error("Cập nhật thất bại", {
                                  id: toastId,
                                }),
                            },
                          );
                        }}
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0 border-border/60"
                        onClick={() => setTargetOpen(false)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-base font-bold tracking-tighter text-blue-600">
                      {formatMoney(selectedCampaign.targetAmount)}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1 mb-1">
                    <CalendarBlank size={12} className="text-amber-600" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Hạn chót
                    </p>
                  </div>
                  {extendOpen ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-8 flex-1 px-2 text-sm justify-between font-normal bg-background"
                          >
                            {extendForm.endDate
                              ? parseYmdToDate(
                                  extendForm.endDate,
                                )?.toLocaleDateString("vi-VN")
                              : "dd/mm/yyyy"}
                            <CalendarBlank
                              size={14}
                              className="text-muted-foreground"
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="z-10010 w-auto p-0"
                          side="bottom"
                          align="start"
                          sideOffset={6}
                          avoidCollisions={false}
                        >
                          <Calendar
                            mode="single"
                            selected={parseYmdToDate(extendForm.endDate)}
                            onSelect={(date) => {
                              if (date) {
                                setExtendForm((p) => ({
                                  ...p,
                                  endDate: formatDateToYmd(date),
                                }));
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-amber-600 hover:bg-amber-700 shrink-0 text-white"
                        disabled={
                          !extendForm.endDate ||
                          extendDeadlineMutation.isPending
                        }
                        onClick={() => {
                          if (!selectedCampaign) return;
                          const toastId = toast.loading("Đang cập nhật...");
                          extendDeadlineMutation.mutate(
                            {
                              id: selectedCampaign.id,
                              payload: { newEndDate: extendForm.endDate },
                            },
                            {
                              onSuccess: () => {
                                toast.success("Đã gia hạn", { id: toastId });
                                setExtendOpen(false);
                                setSelectedCampaign((p) =>
                                  p
                                    ? {
                                        ...p,
                                        campaignEndDate: extendForm.endDate,
                                      }
                                    : null,
                                );
                                queryClient.invalidateQueries({
                                  queryKey: ["campaigns"],
                                });
                              },
                              onError: () =>
                                toast.error("Gia hạn thất bại", {
                                  id: toastId,
                                }),
                            },
                          );
                        }}
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0 border-border/60"
                        onClick={() => setExtendOpen(false)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-base font-bold tracking-tighter text-amber-600">
                      {new Date(
                        selectedCampaign.campaignEndDate,
                      ).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Transaction list */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                    <ArrowsLeftRight
                      size={20}
                      className="text-muted-foreground"
                    />
                    Giao dịch ({txData?.totalCount ?? 0})
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Type filter */}
                    <Select
                      value={txTypeFilter}
                      onValueChange={(v) => {
                        setTxTypeFilter(v === "__all" ? "" : v);
                        setTxPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 text-sm w-44">
                        <SelectValue placeholder="Loại giao dịch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả loại</SelectItem>
                        {txTypesMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Direction filter */}
                    <Select
                      value={txDirectionFilter}
                      onValueChange={(v) => {
                        setTxDirectionFilter(v === "__all" ? "" : v);
                        setTxPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 text-sm w-36">
                        <SelectValue placeholder="Hướng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả</SelectItem>
                        {txDirectionsMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Reference type filter */}
                    <Select
                      value={txRefTypeFilter}
                      onValueChange={(v) => {
                        setTxRefTypeFilter(v === "__all" ? "" : v);
                        setTxPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 text-sm w-44">
                        <SelectValue placeholder="Nguồn tham chiếu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Tất cả nguồn</SelectItem>
                        {txRefTypesMeta.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(txTypeFilter || txDirectionFilter || txRefTypeFilter) && (
                      <button
                        onClick={() => {
                          setTxTypeFilter("");
                          setTxDirectionFilter("");
                          setTxRefTypeFilter("");
                          setTxPage(1);
                        }}
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
                    <ArrowsLeftRight
                      size={28}
                      className="mx-auto text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground tracking-tight">
                      Chưa có giao dịch nào
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-10 text-center text-sm">
                            #
                          </TableHead>
                          <TableHead className="text-sm">
                            Loại giao dịch
                          </TableHead>
                          <TableHead className="text-sm">Tham chiếu</TableHead>
                          <TableHead className="text-sm text-right">
                            Số tiền
                          </TableHead>
                          <TableHead className="text-sm text-right">
                            Thời gian
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txData.items.map((tx, idx) => {
                          const normalizedDirection =
                            tx.direction?.trim().toLowerCase() ?? "";
                          const isIn =
                            incomingDirectionTokens.has(normalizedDirection) ||
                            normalizedDirection.includes("vào") ||
                            normalizedDirection.includes("vao");
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {(txPage - 1) * txPageSize + idx + 1}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    isIn ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {isIn ? (
                                    <ArrowUp size={12} weight="bold" />
                                  ) : (
                                    <ArrowDown size={12} weight="bold" />
                                  )}
                                  {(txTypeMap[tx.type] ?? tx.type) || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.referenceId != null
                                  ? `${txRefTypeMap[tx.referenceType] ?? tx.referenceType}${tx.referenceId ? ` #${tx.referenceId}` : ""}`
                                  : "—"}
                              </TableCell>
                              <TableCell
                                className={`text-sm font-bold text-right ${
                                  isIn ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {formatMoney(tx.amount)}
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
                    <Select
                      value={String(txPageSize)}
                      onValueChange={(v) => {
                        setTxPageSize(Number(v));
                        setTxPage(1);
                      }}
                    >
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
                    <span className="text-sm text-muted-foreground tracking-tight">
                      / trang
                    </span>
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

      {/* ── Action Dialogs ─────────── */}

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-sm border-rose-100 shadow-rose-500/10 dark:border-rose-900/50">
          <DialogHeader>
            <DialogTitle className="text-rose-600 dark:text-rose-400">
              {confirmAction?.title}
            </DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (confirmAction) {
                  handleUpdateStatus(confirmAction.action);
                  setConfirmAction(null);
                }
              }}
            >
              {updateStatusMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
