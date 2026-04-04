"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  FloppyDisk,
  Warehouse,
  ClockCountdown,
  CheckCircle,
  XCircle,
  Receipt,
  CurrencyDollar,
  CalendarBlank,
  CaretDown,
  Check,
  X,
  FileText,
  Package,
  Spinner,
  Eye,
  Money,
  Storefront,
  ArrowClockwise,
  PiggyBankIcon,
  ArrowDown,
  ArrowUp,
  List,
  HandCoinsIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  useFundingRequests,
  useFundingRequestItems,
  useFundingRequestStatuses,
  useApproveFundingRequest,
  useRejectFundingRequest,
} from "@/services/funding_request";
import type {
  FundingRequestEntity,
  FundingRequestStatus,
} from "@/services/funding_request";
import { useDepotMetadata, useDepotFunds, useUpdateDepotAdvanceLimit } from "@/services/depot/hooks";
import type { DepotFund } from "@/services/depot/type";
import { useInventoryCategories } from "@/services/inventory/hooks";
import { useCampaigns, useAllocateDisbursement } from "@/services/campaign_disbursement";
import {
  useDepotFundTransactions,
  useDepotFundTransactionTypes,
  useDepotFundReferenceTypes,
} from "@/services/transaction";
import { useQueryClient } from "@tanstack/react-query";

/* ── Status configs ───────────────────────────────────────── */

const statusConfig: Record<
  FundingRequestStatus,
  { label: string; className: string; dotColor: string }
> = {
  Pending: {
    label: "Chờ duyệt",
    className:
      "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  Approved: {
    label: "Đã duyệt",
    className:
      "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
  },
  Rejected: {
    label: "Đã từ chối",
    className:
      "bg-rose-500/8 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    dotColor: "bg-rose-500",
  },
};

const STATUS_LABEL_MAP: Record<string, string> = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Đã từ chối",
};

const PANEL_WIDTH = 480;

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

/* ── Advance Limit Section ───────────────────────────────── */

function AdvanceLimitSection() {
  const { data: depotMetadata = [], isLoading: loadingMeta } = useDepotMetadata();
  const { data: depotFunds = [], isLoading: loadingFunds } = useDepotFunds();
  const updateLimit = useUpdateDepotAdvanceLimit();
  const [selectedDepotId, setSelectedDepotId] = useState<string>("");
  const [limitInput, setLimitInput] = useState<string>("");

  const currentFund = useMemo(
    () => depotFunds.find((f) => f.depotId === Number(selectedDepotId)),
    [depotFunds, selectedDepotId],
  );

  const handleSelectDepot = (val: string) => {
    setSelectedDepotId(val);
    const fund = depotFunds.find((f) => f.depotId === Number(val));
    setLimitInput(fund ? String(fund.maxAdvanceLimit) : "");
  };

  const handleSaveLimit = () => {
    const id = Number(selectedDepotId);
    const limit = Number(limitInput);
    if (!id) { toast.error("Vui lòng chọn kho"); return; }
    if (isNaN(limit) || limit < 0) { toast.error("Hạn mức phải là số ≥ 0"); return; }
    const toastId = toast.loading("Đang cập nhật...");
    updateLimit.mutate(
      { depotId: id, maxAdvanceLimit: limit },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("Cập nhật hạn mức thành công");
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error("Không thể cập nhật hạn mức");
        },
      },
    );
  };

  return (
    <div className="max-w-lg">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-[16px] tracking-tighter flex items-center gap-1.5">
            <Warehouse size={16} />
            Cấu hình hạn mức ứng trước
          </CardTitle>
          <CardDescription className="tracking-tighter text-[14px]">
            Hạn mức ứng trước là số tiền tối đa kho được phép âm (chi trước khi chưa có quỹ)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm tracking-tighter">Kho</Label>
            <Select
              value={selectedDepotId}
              onValueChange={handleSelectDepot}
              disabled={loadingMeta || loadingFunds}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn kho..." />
              </SelectTrigger>
              <SelectContent>
                {depotMetadata.map((d) => (
                  <SelectItem key={d.key} value={String(d.key)}>
                    {d.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDepotId && currentFund && (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm tracking-tighter space-y-0.5">
              <p className="text-muted-foreground">
                Số dư hiện tại:{" "}
                <span className={currentFund.balance < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                  {currentFund.balance.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                </span>
              </p>
              <p className="text-muted-foreground">
                Hạn mức hiện tại:{" "}
                <span className="font-semibold">
                  {currentFund.maxAdvanceLimit.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm tracking-tighter">
              Hạn mức ứng trước mới (VNĐ)
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="VD: 10000000"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground tracking-tighter">
              Kho sẽ được phép nhập mua khi số dư quỹ ≥ −{Number(limitInput || 0).toLocaleString("vi-VN")} VNĐ
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSaveLimit}
            disabled={updateLimit.isPending || !selectedDepotId}
            className="w-full"
          >
            <FloppyDisk size={14} className="mr-1.5" />
            Lưu hạn mức
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */

export default function FundingRequestsPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedDepots, setSelectedDepots] = useState<number[]>([]);
  const [depotFilterOpen, setDepotFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail panel
  const [selectedItem, setSelectedItem] =
    useState<FundingRequestEntity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Depot fund transaction panel
  const [selectedDepotFund, setSelectedDepotFund] = useState<DepotFund | null>(null);
  const [depotTxPanelOpen, setDepotTxPanelOpen] = useState(false);
  const [depotTxPage, setDepotTxPage] = useState(1);
  const [depotTxPageSize, setDepotTxPageSize] = useState(10);

  // Review dialogs
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    item: FundingRequestEntity | null;
  }>({ open: false, item: null });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    item: FundingRequestEntity | null;
  }>({ open: false, item: null });
  const [campaignId, setCampaignId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Allocate modal
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateCampaignId, setAllocateCampaignId] = useState("");
  const [allocateDepotId, setAllocateDepotId] = useState("");
  const [allocateAmount, setAllocateAmount] = useState("");
  const [allocatePurpose, setAllocatePurpose] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "advance-limit">("requests");

  // API
  const { data, isLoading } = useFundingRequests({
    params: { pageNumber: 1, pageSize: 500 },
  });
  const { data: statusOptions = [] } = useFundingRequestStatuses();
  const { data: depotOptions = [] } = useDepotMetadata();
  const { data: depotFunds = [], isLoading: loadingFunds } = useDepotFunds();
  const { data: campaignsData } = useCampaigns();
  const activeCampaigns = useMemo(
    () => campaignsData?.items ?? [],
    [campaignsData],
  );
  const { data: categoriesData } = useInventoryCategories();
  const { data: depotTxData, isLoading: loadingDepotTx } = useDepotFundTransactions(
    { depotId: selectedDepotFund?.depotId ?? 0, pageNumber: depotTxPage, pageSize: depotTxPageSize },
  );
  const { data: txTypesMeta = [] } = useDepotFundTransactionTypes();
  const { data: refTypesMeta = [] } = useDepotFundReferenceTypes();
  const txTypeMap = useMemo(
    () => Object.fromEntries(txTypesMeta.map((m) => [m.key, m.value])),
    [txTypesMeta],
  );
  const refTypeMap = useMemo(
    () => Object.fromEntries(refTypesMeta.map((m) => [m.key, m.value])),
    [refTypesMeta],
  );
  const categoryMap = useMemo(
    () =>
      Object.fromEntries(
        (categoriesData ?? []).map((c) => [c.key, c.value]),
      ) as Record<string, string>,
    [categoriesData],
  );
  const { mutate: approve, isPending: isApproving } =
    useApproveFundingRequest();
  const { mutate: reject, isPending: isRejecting } =
    useRejectFundingRequest();
  const { mutate: allocate, isPending: isAllocating } =
    useAllocateDisbursement();

  const { data: selectedItemsData, isLoading: loadingSelectedItems } =
    useFundingRequestItems({
      fundingRequestId: selectedItem?.id,
      params: { pageNumber: 1, pageSize: 200 },
      enabled: panelOpen && !!selectedItem?.id,
    });

  const items = useMemo(() => data?.items ?? [], [data]);
  const selectedRequestItems = useMemo(
    () => selectedItemsData?.items ?? selectedItem?.items ?? [],
    [selectedItemsData, selectedItem],
  );

  // Push content when panel opens
  const handlePanelChange = useCallback(
    (open: boolean) => {
      if (contentRef.current) {
        contentRef.current.style.marginRight = open
          ? `${PANEL_WIDTH}px`
          : "0px";
        contentRef.current.style.transition =
          "margin-right 300ms cubic-bezier(0.32,0.72,0,1)";
      }
    },
    [],
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === "Pending").length,
      approved: items.filter((i) => i.status === "Approved").length,
      rejected: items.filter((i) => i.status === "Rejected").length,
    }),
    [items],
  );

  // Filter + search
  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.depotName.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.requestedByUserName.toLowerCase().includes(q),
      );
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((i) => selectedStatuses.includes(i.status));
    }
    if (selectedDepots.length > 0) {
      result = result.filter((i) => selectedDepots.includes(i.depotId));
    }
    return result;
  }, [items, search, selectedStatuses, selectedDepots]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const startItem =
    filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const toggleStatus = (val: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
    setPage(1);
  };

  const toggleDepot = (val: number) => {
    setSelectedDepots((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val],
    );
    setPage(1);
  };

  // Allocate handler
  const isAllocateValid =
    allocateCampaignId.trim() !== "" &&
    allocateDepotId !== "" &&
    allocateAmount.trim() !== "" &&
    Number(allocateAmount) > 0 &&
    allocatePurpose.trim() !== "";

  const handleAllocate = () => {
    if (!isAllocateValid) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    allocate(
      {
        fundCampaignId: Number(allocateCampaignId),
        depotId: Number(allocateDepotId),
        amount: Number(allocateAmount),
        purpose: allocatePurpose.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Cấp quỹ thành công!");
          setAllocateOpen(false);
          setAllocateCampaignId("");
          setAllocateDepotId("");
          setAllocateAmount("");
          setAllocatePurpose("");
        },
        onError: () => toast.error("Cấp quỹ thất bại. Vui lòng thử lại."),
      },
    );
  };

  const hasFilters =
    search.trim() !== "" ||
    selectedStatuses.length > 0 ||
    selectedDepots.length > 0;
  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedDepots([]);
    setPage(1);
  };

  // Open detail panel
  const openDetail = (item: FundingRequestEntity) => {
    setSelectedItem(item);
    setPanelOpen(true);
    if (depotTxPanelOpen) { setDepotTxPanelOpen(false); }
    handlePanelChange(true);
  };

  // Open depot fund transaction panel
  const openDepotFundPanel = (fund: DepotFund) => {
    setSelectedDepotFund(fund);
    setDepotTxPage(1);
    if (panelOpen) { setPanelOpen(false); setSelectedItem(null); handlePanelChange(false); }
    setDepotTxPanelOpen(true);
  };

  // Approve handler
  const handleApprove = () => {
    if (!approveDialog.item || !campaignId.trim()) {
      toast.error("Vui lòng nhập Campaign ID");
      return;
    }
    approve(
      {
        id: approveDialog.item.id,
        payload: { campaignId: Number(campaignId) },
      },
      {
        onSuccess: () => {
          toast.success("Duyệt yêu cầu thành công!");
          setApproveDialog({ open: false, item: null });
          setCampaignId("");
          setPanelOpen(false);
          handlePanelChange(false);
          setSelectedItem(null);
        },
        onError: () => toast.error("Duyệt thất bại. Vui lòng thử lại."),
      },
    );
  };

  // Reject handler
  const handleReject = () => {
    if (!rejectDialog.item || !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    reject(
      {
        id: rejectDialog.item.id,
        payload: { reason: rejectReason.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Từ chối yêu cầu thành công!");
          setRejectDialog({ open: false, item: null });
          setRejectReason("");
          setPanelOpen(false);
          handlePanelChange(false);
          setSelectedItem(null);
        },
        onError: () => toast.error("Từ chối thất bại. Vui lòng thử lại."),
      },
    );
  };

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div ref={contentRef} className="space-y-6">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <PiggyBankIcon size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Tài chính
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Phân bổ quỹ từ thiện
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Xem xét yêu cầu cấp quỹ từ các kho và phân bổ ngân sách
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              onClick={() => setAllocateOpen(true)}
              className="gap-2 tracking-tight bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
            >
              <Money size={16} weight="bold" />
              Cấp quỹ cho kho
            </Button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-border/50">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2.5 text-sm font-medium tracking-tighter transition-colors border-b-2 -mb-px ${
              activeTab === "requests"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Yêu cầu cấp quỹ
          </button>
          <button
            onClick={() => setActiveTab("advance-limit")}
            className={`px-4 py-2.5 text-sm font-medium tracking-tighter transition-colors border-b-2 -mb-px ${
              activeTab === "advance-limit"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Cấu hình hạn mức ứng trước
          </button>
        </div>

        {activeTab === "requests" && (<>
        {/* ── Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Tổng yêu cầu",
              value: stats.total,
              icon: Receipt,
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: "Chờ duyệt",
              value: stats.pending,
              icon: ClockCountdown,
              color: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
            },
            {
              label: "Đã duyệt",
              value: stats.approved,
              icon: CheckCircle,
              color: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: "Đã từ chối",
              value: stats.rejected,
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
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
                      <p className="text-2xl tracking-tighter font-bold text-foreground">
                        {isLoading ? "—" : stat.value}
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

        {/* ── Depot Funds ──────────────────────────────── */}
        <Card className="border border-border/50">
          <CardContent className="px-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-tighter flex items-center gap-1.5">
                <Storefront size={15} className="text-primary" />
                Quỹ các kho ({depotFunds.length})
              </h3>
              <p className="text-xs text-muted-foreground tracking-tighter">
                Tổng:{" "}
                <span className="font-bold text-emerald-600 text-sm">
                  {formatMoney(depotFunds.reduce((s, d) => s + d.balance, 0))}
                </span>
              </p>
            </div>
            {loadingFunds ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : depotFunds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 tracking-tighter">
                Chưa có dữ liệu quỹ
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {depotFunds.map((fund) => (
                  <div
                    key={fund.depotId}
                    onClick={() => openDepotFundPanel(fund)}
                    className={`rounded-xl border bg-background p-3.5 cursor-pointer transition-all active:scale-[0.97] ${
                      selectedDepotFund?.depotId === fund.depotId && depotTxPanelOpen
                        ? "border-primary ring-1 ring-primary/30 shadow-sm"
                        : "border-border/60 hover:bg-muted/30 hover:border-border"
                    }`}
                  >
                    <p className="text-sm font-semibold tracking-tighter text-muted-foreground truncate mb-1.5">
                      {fund.depotName}
                    </p>
                    <p className={`text-lg font-bold tracking-tighter ${
                      fund.balance < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {formatMoney(fund.balance)}
                    </p>
                    {fund.balance < 0 && (
                      <p className="text-xs text-red-500 tracking-tight font-medium mt-0.5">
                        Ứng trước • Hạn mức: {formatMoney(fund.maxAdvanceLimit)}
                      </p>
                    )}
                    {fund.balance >= 0 && (
                      <p className="text-xs text-muted-foreground tracking-tight mt-0.5">
                        Hạn ứng: {formatMoney(fund.maxAdvanceLimit)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground tracking-tight mt-1">
                      Cập nhật: {new Date(fund.lastUpdatedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Table Card ─────────────────────────────────── */}
        <Card className="border border-border/50">
          <CardContent>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/40">
              <div className="relative flex-1 min-w-52">
                <Input
                  placeholder="Tìm theo kho, mô tả, người gửi..."
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

              {/* Status filter */}
              <Popover
                open={statusFilterOpen}
                onOpenChange={setStatusFilterOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 font-normal text-sm"
                  >
                    Trạng thái
                    {selectedStatuses.length > 0 ? (
                      <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                        {selectedStatuses.length}
                      </Badge>
                    ) : (
                      <CaretDown
                        size={13}
                        className="text-muted-foreground"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="start">
                  {statusOptions.map((value) => {
                    const checked = selectedStatuses.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleStatus(value)}
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
                          {STATUS_LABEL_MAP[value] ?? value}
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
                      Xóa lọc
                    </button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Depot filter */}
              <Popover
                open={depotFilterOpen}
                onOpenChange={setDepotFilterOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 font-normal text-sm"
                  >
                    <Storefront size={13} />
                    Kho
                    {selectedDepots.length > 0 ? (
                      <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                        {selectedDepots.length}
                      </Badge>
                    ) : (
                      <CaretDown
                        size={13}
                        className="text-muted-foreground"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1.5 max-h-64 overflow-y-auto" align="start">
                  {depotOptions.map((depot) => {
                    const checked = selectedDepots.includes(depot.key);
                    return (
                      <button
                        key={depot.key}
                        onClick={() => toggleDepot(depot.key)}
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
                        <span className={`truncate ${checked ? "font-medium" : ""}`}>
                          {depot.value}
                        </span>
                      </button>
                    );
                  })}
                  {selectedDepots.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedDepots([]);
                        setPage(1);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                    >
                      <X size={11} />
                      Xóa lọc
                    </button>
                  )}
                </PopoverContent>
              </Popover>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-muted-foreground gap-1 text-sm"
                >
                  <X size={13} />
                  Xóa bộ lọc
                </Button>
              )}

              <div className="ml-auto text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
                {hasFilters
                  ? `${filtered.length} / ${items.length} yêu cầu`
                  : `${items.length} yêu cầu`}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Kho yêu cầu
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Người gửi
                    </th>
                    <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Tổng tiền
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Trạng thái
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Ngày gửi
                    </th>
                    <th className="text-center p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Xem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="p-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-10 text-center tracking-tighter text-muted-foreground text-sm"
                      >
                        Không tìm thấy yêu cầu nào
                      </td>
                    </tr>
                  ) : (
                    paged.map((item) => {
                      const st = statusConfig[item.status];
                      return (
                        <tr
                          key={item.id}
                          onClick={() => openDetail(item)}
                          className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <td className="p-3">
                            <div className="text-sm tracking-tighter font-medium text-foreground">
                              {item.depotName}
                            </div>
                          </td>
                          <td className="p-3 text-sm tracking-tighter text-foreground/70">
                            {item.requestedByUserName}
                          </td>
                          <td className="p-3 text-sm tracking-tighter text-right font-semibold text-foreground">
                            {formatMoney(item.totalAmount)}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`${st.className} border gap-1`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`}
                              />
                              {st.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm tracking-tighter text-foreground/60">
                            {new Date(item.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(item);
                              }}
                            >
                              <Eye size={15} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm tracking-tighter text-muted-foreground">
                    Hiển thị {startItem}–{endItem} trong {filtered.length} yêu cầu
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-16 h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground tracking-tighter">/ trang</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>)}

        {activeTab === "advance-limit" && <AdvanceLimitSection />}
      </div>

      {/* ── Detail Panel ─────────────────────────────────── */}
      <Sheet
        open={panelOpen}
        onOpenChange={(val) => {
          setPanelOpen(val);
          handlePanelChange(val);
          if (!val) setSelectedItem(null);
        }}
      >
        <SheetContent
          side="right"
          showOverlay={false}
          className="w-full sm:max-w-120 h-dvh overflow-y-auto p-6"
        >
          <SheetHeader className="pb-4 border-b mb-4">
            <SheetTitle className="tracking-tighter text-xl">
              Chi tiết yêu cầu cấp quỹ
            </SheetTitle>
            <SheetDescription className="tracking-tight text-sm">
              Xem chi tiết và duyệt yêu cầu cấp quỹ từ kho
            </SheetDescription>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-5">
              {/* Info header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tighter">
                      {selectedItem.depotName}
                    </h3>
                    <p className="text-sm text-muted-foreground tracking-tight">
                      Gửi bởi: {selectedItem.requestedByUserName}
                    </p>
                  </div>
                  <Badge
                    className={`${statusConfig[selectedItem.status].className} border`}
                  >
                    {statusConfig[selectedItem.status].label}
                  </Badge>
                </div>

                {/* Meta cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                    <p className="text-sm text-muted-foreground tracking-tight flex items-center gap-2 mb-1">
                      <HandCoinsIcon size={16} />
                      Tổng tiền
                    </p>
                    <p className="text-base font-bold tracking-tight text-emerald-600">
                      {formatMoney(selectedItem.totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                    <p className="text-sm text-muted-foreground tracking-tight flex items-center gap-2 mb-1">
                      <CalendarBlank size={16} />
                      Ngày gửi
                    </p>
                    <p className="text-base tracking-tight">
                      {new Date(selectedItem.createdAt).toLocaleString(
                        "vi-VN",
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-sm text-muted-foreground tracking-tight flex items-center gap-2 mb-1">
                    <FileText size={16} />
                    Mô tả
                  </p>
                  <p className="text-base tracking-tight">
                    {selectedItem.description || "Không có mô tả"}
                  </p>
                </div>

                {/* Attachment */}
                {selectedItem.attachmentUrl && (
                  <a
                    href={selectedItem.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline tracking-tight"
                  >
                    <FileText size={14} />
                    Xem tài liệu đính kèm
                  </a>
                )}

                {/* Approved info */}
                {selectedItem.status === "Approved" &&
                  selectedItem.approvedCampaignName && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-2.5">
                      <p className="text-xs text-emerald-600 tracking-tight font-medium mb-1">
                        Quỹ được duyệt từ
                      </p>
                      <p className="text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                        {selectedItem.approvedCampaignName}
                      </p>
                      {selectedItem.reviewedByUserName && (
                        <p className="text-xs text-emerald-600/70 tracking-tight mt-1">
                          Duyệt bởi: {selectedItem.reviewedByUserName} ·{" "}
                          {selectedItem.reviewedAt
                            ? new Date(
                                selectedItem.reviewedAt,
                              ).toLocaleString("vi-VN")
                            : ""}
                        </p>
                      )}
                    </div>
                  )}

                {/* Rejection info */}
                {selectedItem.status === "Rejected" &&
                  selectedItem.rejectionReason && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800 p-2.5">
                      <p className="text-xs text-rose-600 tracking-tight font-medium mb-1">
                        Lý do từ chối
                      </p>
                      <p className="text-sm tracking-tight text-rose-700 dark:text-rose-400">
                        {selectedItem.rejectionReason}
                      </p>
                      {selectedItem.reviewedByUserName && (
                        <p className="text-xs text-rose-600/70 tracking-tight mt-1">
                          Từ chối bởi: {selectedItem.reviewedByUserName}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Items list */}
              <div>
                <h4 className="text-base font-semibold tracking-tighter mb-3 flex items-center gap-1.5">
                  <Package size={15} className="text-primary" />
                  Danh sách vật tư ({selectedRequestItems.length})
                </h4>
                {loadingSelectedItems ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-18 w-full rounded-xl" />
                    ))}
                  </div>
                ) : selectedRequestItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
                    <Package
                      size={28}
                      className="mx-auto text-muted-foreground/40 mb-2"
                    />
                    <p className="text-sm text-muted-foreground tracking-tight">
                      Không có danh sách vật tư
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                    {selectedRequestItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-border/60 bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-base font-semibold tracking-tighter">
                            {item.itemName}
                          </p>
                          <span className="text-base tracking-tighter font-bold text-emerald-600 shrink-0">
                            {formatMoney(item.totalPrice ?? item.quantity * item.unitPrice)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tracking-tighter">
                          <span>
                            SL: {item.quantity} {item.unit}
                          </span>
                          <span>
                            Đơn giá: {formatMoney(item.unitPrice)}
                          </span>
                          <span>Danh mục: {categoryMap[item.categoryCode] ?? item.categoryCode}</span>
                          {(item.notes || item.description) && (
                            <span>Ghi chú: {item.notes ?? item.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedItem.status === "Pending" && (
                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={() =>
                      setApproveDialog({ open: true, item: selectedItem })
                    }
                  >
                    
                    Phê duyệt
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
                    onClick={() =>
                      setRejectDialog({ open: true, item: selectedItem })
                    }
                  >
                    
                    Từ chối
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Depot Fund Transaction Panel ─────────────────── */}
      <Sheet
        open={depotTxPanelOpen}
        onOpenChange={(val) => {
          setDepotTxPanelOpen(val);
          if (!val) setSelectedDepotFund(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto rounded-t-2xl p-6"
        >
          <SheetHeader className="pb-4 border-b mb-4">
            <SheetTitle className="tracking-tighter text-xl flex items-center gap-2">
              <List size={18} className="text-primary" />
              Lịch sử giao dịch quỹ kho
            </SheetTitle>
            <SheetDescription className="tracking-tight text-sm">
              {selectedDepotFund?.depotName}
            </SheetDescription>
          </SheetHeader>

          {selectedDepotFund && (
            <div className="space-y-4">
              {/* Fund summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight mb-1">Số dư hiện tại</p>
                  <p className={`text-sm font-bold tracking-tight ${
                    selectedDepotFund.balance < 0 ? "text-red-600" : "text-emerald-600"
                  }`}>
                    {formatMoney(selectedDepotFund.balance)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight mb-1">Hạn mức ứng</p>
                  <p className="text-sm font-bold tracking-tight">
                    {formatMoney(selectedDepotFund.maxAdvanceLimit)}
                  </p>
                </div>
              </div>

              {/* Transaction list */}
              <div>
                <h4 className="text-sm font-semibold tracking-tighter mb-3 flex items-center gap-1.5">
                  <Receipt size={14} className="text-primary" />
                  Giao dịch ({depotTxData?.totalCount ?? 0})
                </h4>

                {loadingDepotTx ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/40 p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                            <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                          </div>
                          <div className="h-4 bg-muted rounded animate-pulse w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (depotTxData?.items ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                    <Receipt size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground tracking-tight">Chưa có giao dịch</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-10 text-center text-sm">#</TableHead>
                          <TableHead className="text-sm">Loại giao dịch</TableHead>
                          <TableHead className="text-sm">Nguồn tham chiếu</TableHead>
                          <TableHead className="text-sm min-w-36">Ghi chú</TableHead>
                          <TableHead className="text-sm text-right">Số tiền</TableHead>
                          <TableHead className="text-sm text-right">Thời gian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(depotTxData?.items ?? []).map((tx, idx) => {
                          const isIn = tx.amount >= 0;
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {(depotTxPage - 1) * depotTxPageSize + idx + 1}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                <span className={`inline-flex items-center gap-1 ${
                                  isIn ? "text-emerald-600" : "text-rose-600"
                                }`}>
                                  {isIn
                                    ? <ArrowUp size={12} weight="bold" />
                                    : <ArrowDown size={12} weight="bold" />}
                                  {txTypeMap[tx.transactionType] ?? tx.transactionType}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.referenceType
                                  ? `${refTypeMap[tx.referenceType] ?? tx.referenceType}${tx.referenceId ? ` #${tx.referenceId}` : ""}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                {tx.note || "—"}
                              </TableCell>
                              <TableCell className={`text-sm font-bold text-right ${
                                isIn ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {isIn ? "+" : ""}{tx.amount.toLocaleString("vi-VN")}đ
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
                <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground tracking-tight">
                      Trang {depotTxPage}/{depotTxData?.totalPages ?? 1}
                    </p>
                    <Select value={String(depotTxPageSize)} onValueChange={(v) => { setDepotTxPageSize(Number(v)); setDepotTxPage(1); }}>
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
                      onClick={() => setDepotTxPage((p) => Math.max(1, p - 1))}
                      disabled={!depotTxData?.hasPreviousPage}
                      className="px-2.5 py-1 text-sm rounded-md border border-border/60 disabled:opacity-40 hover:bg-muted/50 transition-colors"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setDepotTxPage((p) => p + 1)}
                      disabled={!depotTxData?.hasNextPage}
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

      {/* ── Approve Dialog ───────────────────────────────── */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setApproveDialog({ open: false, item: null });
            setCampaignId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle size={22} weight="bold" />
              </div>
              <div>
                <DialogTitle className="tracking-tighter">
                  Phê duyệt yêu cầu
                </DialogTitle>
                <DialogDescription className="tracking-tight">
                  {approveDialog.item?.depotName} —{" "}
                  {approveDialog.item
                    ? formatMoney(approveDialog.item.totalAmount)
                    : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Chọn quỹ để rút tiền
              </label>
              <Select
                value={campaignId}
                onValueChange={(val) => setCampaignId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chiến dịch quỹ..." />
                </SelectTrigger>
                <SelectContent disablePortal position="popper" className="w-[--radix-select-trigger-width]">
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="truncate">{c.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status !== "Active" && (
                            <span className="text-xs text-muted-foreground">[{c.status}]</span>
                          )}
                          <span className="text-sm font-semibold text-emerald-600">
                            {c.totalAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {activeCampaigns.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Không có chiến dịch quỹ nào
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialog({ open: false, item: null });
                setCampaignId("");
              }}
            >
              Hủy
            </Button>
            <Button
              disabled={isApproving}
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isApproving ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-1.5" weight="bold" />
                  Xác nhận duyệt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ────────────────────────────────── */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, item: null });
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                <XCircle size={22} weight="bold" />
              </div>
              <div>
                <DialogTitle className="tracking-tighter">
                  Từ chối yêu cầu
                </DialogTitle>
                <DialogDescription className="tracking-tight">
                  {rejectDialog.item?.depotName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Lý do từ chối
              </label>
              <Textarea
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRejectReason(e.target.value)
                }
                className="min-h-25 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, item: null });
                setRejectReason("");
              }}
            >
              Hủy
            </Button>
            <Button
              disabled={isRejecting}
              onClick={handleReject}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isRejecting ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <>
                  <XCircle size={16} className="mr-1.5" weight="bold" />
                  Xác nhận từ chối
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Allocate Dialog ──────────────────────────────── */}
      <Dialog
        open={allocateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAllocateOpen(false);
            setAllocateCampaignId("");
            setAllocateDepotId("");
            setAllocateAmount("");
            setAllocatePurpose("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Money size={22} weight="bold" />
              </div>
              <div>
                <DialogTitle className="tracking-tighter">Cấp quỹ cho kho</DialogTitle>
                <DialogDescription className="tracking-tight">
                  Phân bổ ngân sách từ chiến dịch quỹ cho các kho
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Campaign */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PiggyBankIcon size={16} weight="bold" />
                Chiến dịch quỹ (nguồn rút tiền)
              </label>
              <Select
                value={allocateCampaignId}
                onValueChange={setAllocateCampaignId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chiến dịch quỹ..." />
                </SelectTrigger>
                <SelectContent disablePortal position="popper" className="w-[--radix-select-trigger-width] z-200">
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="truncate">{c.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status !== "Active" && (
                            <span className="text-xs text-muted-foreground">[{c.status}]</span>
                          )}
                          <span className="text-sm font-semibold text-emerald-600">
                            {c.totalAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {activeCampaigns.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Không có chiến dịch quỹ nào
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Depot */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Storefront size={16} weight="bold" />
                Kho nhận quỹ
              </label>
              <Select
                value={allocateDepotId}
                onValueChange={setAllocateDepotId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn kho..." />
                </SelectTrigger>
                <SelectContent disablePortal position="popper" className="w-[--radix-select-trigger-width] z-200">
                  {depotOptions.map((d) => (
                    <SelectItem key={d.key} value={String(d.key)}>
                      {d.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Money size={16} weight="bold" />
                Số tiền (VNĐ)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Nhập số tiền cấp quỹ..."
                value={
                  allocateAmount
                    ? Number(allocateAmount).toLocaleString("vi-VN")
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setAllocateAmount(raw);
                }}
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={16} weight="bold" />
                Mục đích
              </label>
              <Textarea
                placeholder="Mô tả mục đích cấp quỹ cho kho..."
                value={allocatePurpose}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAllocatePurpose(e.target.value)
                }
                className="min-h-24 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setAllocateOpen(false);
                setAllocateCampaignId("");
                setAllocateDepotId("");
                setAllocateAmount("");
                setAllocatePurpose("");
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={!isAllocateValid || isAllocating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isAllocating ? (
                <span className="flex items-center gap-2">
                  <Spinner size={14} className="animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <>
                  <CheckCircle size={16} weight="bold" />
                  Xác nhận cấp quỹ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
