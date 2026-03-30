"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── UI primitives ───
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Icons ───
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Plus,
  SpinnerGap,
  WarningCircle,
  CheckCircle,
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  ChartBar,
  ClockCounterClockwise,
  Gear,
  Funnel,
} from "@phosphor-icons/react";

// ─── Hooks & Types ───
import {
  useMyDepotThresholds,
  useMyDepotThresholdsHistory,
  useUpdateMyDepotThreshold,
  useDeleteMyDepotThreshold,
  useMyDepotLowStock,
  useInventoryCategories,
} from "@/services/inventory/hooks";
import type {
  ThresholdConfig,
  ThresholdScopeType,
  GetThresholdsHistoryParams,
  GetLowStockParams,
  LowStockLevel,
  UpdateThresholdPayload,
  DeleteThresholdPayload,
} from "@/services/inventory/type";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const SCOPE_LABELS: Record<ThresholdScopeType, string> = {
  Global: "Toàn hệ thống",
  Depot: "Kho",
  DepotCategory: "Theo danh mục",
  DepotItem: "Theo vật phẩm",
};

const SCOPE_COLORS: Record<string, string> = {
  Global: "bg-purple-100 text-purple-700",
  Depot: "bg-blue-100 text-blue-700",
  DepotCategory: "bg-amber-100 text-amber-700",
  DepotItem: "bg-emerald-100 text-emerald-700",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function alertBadge(level: string) {
  if (level === "Danger")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Nguy hiểm</Badge>;
  if (level === "Warning")
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Cảnh báo</Badge>;
  return <Badge variant="secondary">{level}</Badge>;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Single threshold config card */
function ThresholdConfigCard({
  config,
  label,
  sublabel,
  onEdit,
  onDelete,
}: {
  config: ThresholdConfig;
  label: string;
  sublabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn("text-xs font-medium", SCOPE_COLORS[config.scopeType] ?? "")}>
                {SCOPE_LABELS[config.scopeType as ThresholdScopeType] ?? config.scopeType}
              </Badge>
              {sublabel && (
                <span className="text-xs text-muted-foreground truncate">{sublabel}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="font-medium">{config.dangerPercent}%</span>
                      <span className="text-muted-foreground">nguy hiểm</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Khi tồn kho khả dụng ≤ {config.dangerPercent}% → mức nguy hiểm
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="font-medium">{config.warningPercent}%</span>
                      <span className="text-muted-foreground">cảnh báo</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Khi tồn kho khả dụng ≤ {config.warningPercent}% → mức cảnh báo
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cập nhật: {formatDate(config.updatedAt)} · v{config.rowVersion}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <PencilSimple className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Empty state placeholder */
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function ThresholdConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ═══ Tab state ═══
  const [tab, setTab] = useState(() => {
    const t = searchParams.get("tab");
    return t === "history" || t === "lowstock" ? t : "config";
  });

  // ═══ GET /my-depot/thresholds ═══
  const { data: thresholds, isLoading: loadingThresholds, refetch: refetchThresholds } = useMyDepotThresholds();

  // ═══ Categories for label mapping ═══
  const { data: categories } = useInventoryCategories();
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories?.forEach((c) => {
      // c.key could be number-like ID or code — try both
      map[Number(c.key)] = c.value;
    });
    return map;
  }, [categories]);

  // ═══ History state + query ═══
  const [historyParams, setHistoryParams] = useState<GetThresholdsHistoryParams>({
    pageNumber: 1,
    pageSize: 10,
  });
  const { data: historyData, isLoading: loadingHistory } = useMyDepotThresholdsHistory(historyParams);

  // ═══ Low-stock state + query ═══
  const [lowStockLevel, setLowStockLevel] = useState<LowStockLevel | undefined>(undefined);
  const lowStockParams = useMemo<GetLowStockParams | undefined>(
    () => (lowStockLevel ? { level: lowStockLevel } : undefined),
    [lowStockLevel],
  );
  const { data: lowStock, isLoading: loadingLowStock } = useMyDepotLowStock(lowStockParams);

  // ═══ Mutations ═══
  const updateMutation = useUpdateMyDepotThreshold();
  const deleteMutation = useDeleteMyDepotThreshold();

  // ═══ Edit / Create dialog ═══
  const [editOpen, setEditOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<ThresholdConfig | null>(null); // null = create new
  const [form, setForm] = useState({
    scopeType: "Depot" as ThresholdScopeType,
    categoryId: "",
    itemModelId: "",
    dangerPercent: "",
    warningPercent: "",
    reason: "",
  });

  const openCreate = useCallback(() => {
    setEditConfig(null);
    setForm({
      scopeType: "Depot",
      categoryId: "",
      itemModelId: "",
      dangerPercent: "",
      warningPercent: "",
      reason: "",
    });
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((cfg: ThresholdConfig) => {
    setEditConfig(cfg);
    setForm({
      scopeType: cfg.scopeType as ThresholdScopeType,
      categoryId: cfg.categoryId ? String(cfg.categoryId) : "",
      itemModelId: cfg.itemModelId ? String(cfg.itemModelId) : "",
      dangerPercent: String(cfg.dangerPercent),
      warningPercent: String(cfg.warningPercent),
      reason: "",
    });
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const danger = Number(form.dangerPercent);
    const warning = Number(form.warningPercent);

    // Client-side validation
    if (!danger || !warning) {
      toast.error("Vui lòng nhập ngưỡng nguy hiểm và cảnh báo");
      return;
    }
    if (danger < 1) {
      toast.error("Ngưỡng nguy hiểm phải ≥ 1%");
      return;
    }
    if (warning < 5) {
      toast.error("Ngưỡng cảnh báo phải ≥ 5%");
      return;
    }
    if (danger >= warning) {
      toast.error("Ngưỡng nguy hiểm phải nhỏ hơn ngưỡng cảnh báo");
      return;
    }
    if (warning > 100) {
      toast.error("Ngưỡng cảnh báo phải ≤ 100%");
      return;
    }
    if (form.scopeType === "DepotCategory" && !form.categoryId) {
      toast.error("Vui lòng chọn danh mục");
      return;
    }
    if (form.scopeType === "DepotItem" && !form.itemModelId) {
      toast.error("Vui lòng nhập ID vật phẩm");
      return;
    }

    const payload: UpdateThresholdPayload = {
      scopeType: form.scopeType,
      dangerPercent: danger,
      warningPercent: warning,
      ...(form.scopeType === "DepotCategory" && { categoryId: Number(form.categoryId) }),
      ...(form.scopeType === "DepotItem" && { itemModelId: Number(form.itemModelId) }),
      ...(editConfig && { rowVersion: editConfig.rowVersion }),
      ...(form.reason && { reason: form.reason }),
    };

    try {
      await updateMutation.mutateAsync(payload);
      toast.success(editConfig ? "Đã cập nhật ngưỡng tồn kho" : "Đã tạo ngưỡng tồn kho mới");
      setEditOpen(false);
      refetchThresholds();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 409) {
        toast.error("Dữ liệu đã thay đổi. Đang tải lại...");
        refetchThresholds();
        setEditOpen(false);
      } else if (error.response?.status === 400) {
        toast.error("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
      } else if (error.response?.status === 404) {
        toast.error("Không tìm thấy kho hoặc danh mục/vật phẩm.");
      } else {
        toast.error("Lỗi khi lưu cấu hình ngưỡng.");
      }
    }
  }, [form, editConfig, updateMutation, refetchThresholds]);

  // ═══ Delete / Reset dialog ═══
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ThresholdConfig | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const openDelete = useCallback((cfg: ThresholdConfig) => {
    setDeleteTarget(cfg);
    setDeleteReason("");
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const payload: DeleteThresholdPayload = {
      scopeType: deleteTarget.scopeType as ThresholdScopeType,
      ...(deleteTarget.categoryId && { categoryId: deleteTarget.categoryId }),
      ...(deleteTarget.itemModelId && { itemModelId: deleteTarget.itemModelId }),
      ...(deleteTarget.rowVersion && { rowVersion: deleteTarget.rowVersion }),
      ...(deleteReason && { reason: deleteReason }),
    };

    try {
      await deleteMutation.mutateAsync(payload);
      toast.success("Đã reset cấu hình ngưỡng");
      setDeleteOpen(false);
      refetchThresholds();
    } catch {
      toast.error("Lỗi khi reset cấu hình.");
    }
  }, [deleteTarget, deleteReason, deleteMutation, refetchThresholds]);

  // ═══ Collect all configs into a flat list for Config tab ═══
  const allConfigs = useMemo(() => {
    if (!thresholds) return [];
    const result: { config: ThresholdConfig; label: string; sublabel?: string }[] = [];
    if (thresholds.global) {
      result.push({ config: thresholds.global, label: "Ngưỡng toàn hệ thống (chỉ xem)" });
    }
    if (thresholds.depot) {
      result.push({ config: thresholds.depot, label: "Ngưỡng mức kho" });
    }
    thresholds.depotCategories?.forEach((c) => {
      result.push({
        config: c,
        label: categoryMap[c.categoryId] ?? `Danh mục #${c.categoryId}`,
        sublabel: `ID: ${c.categoryId}`,
      });
    });
    thresholds.depotItems?.forEach((c) => {
      result.push({
        config: c,
        label: `Vật phẩm #${c.itemModelId}`,
        sublabel: `ID: ${c.itemModelId}`,
      });
    });
    return result;
  }, [thresholds, categoryMap]);

  // ═══ Render ═══
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl tracking-tighter font-bold text-foreground">
                Cấu hình ngưỡng tồn kho
              </h1>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Quản lý ngưỡng cảnh báo & nguy hiểm theo kho, danh mục, hoặc vật phẩm
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex-1 px-6 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="config" className="gap-1.5">
              <Gear className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <ClockCounterClockwise className="h-4 w-4" />
              Lịch sử thay đổi
            </TabsTrigger>
            <TabsTrigger value="lowstock" className="gap-1.5">
              <ChartBar className="h-4 w-4" />
              Sắp hết hàng
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════
              TAB 1: CẤU HÌNH (Config)
              ════════════════════════════════════════ */}
          <TabsContent value="config">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Ngưỡng được áp dụng theo thứ tự ưu tiên:{" "}
                <span className="font-medium text-foreground">Vật phẩm → Danh mục → Kho → Toàn hệ thống</span>
              </p>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Thêm ngưỡng
              </Button>
            </div>

            {loadingThresholds ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : allConfigs.length === 0 ? (
              <EmptyState icon={Gear} text="Chưa có cấu hình ngưỡng nào. Nhấn &quot;Thêm ngưỡng&quot; để bắt đầu." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {allConfigs.map(({ config, label, sublabel }) => (
                  <ThresholdConfigCard
                    key={`${config.scopeType}-${config.id}`}
                    config={config}
                    label={label}
                    sublabel={sublabel}
                    onEdit={() => openEdit(config)}
                    onDelete={() => openDelete(config)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB 2: LỊCH SỬ THAY ĐỔI (History)
              ════════════════════════════════════════ */}
          <TabsContent value="history">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Scope</Label>
                <Select
                  value={historyParams.scopeType ?? "all"}
                  onValueChange={(v) =>
                    setHistoryParams((p) => ({
                      ...p,
                      scopeType: v === "all" ? undefined : (v as ThresholdScopeType),
                      pageNumber: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="Global">Toàn hệ thống</SelectItem>
                    <SelectItem value="Depot">Kho</SelectItem>
                    <SelectItem value="DepotCategory">Danh mục</SelectItem>
                    <SelectItem value="DepotItem">Vật phẩm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category ID</Label>
                <Input
                  type="number"
                  className="w-30"
                  placeholder="—"
                  value={historyParams.categoryId ?? ""}
                  onChange={(e) =>
                    setHistoryParams((p) => ({
                      ...p,
                      categoryId: e.target.value ? Number(e.target.value) : undefined,
                      pageNumber: 1,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Item Model ID</Label>
                <Input
                  type="number"
                  className="w-30"
                  placeholder="—"
                  value={historyParams.itemModelId ?? ""}
                  onChange={(e) =>
                    setHistoryParams((p) => ({
                      ...p,
                      itemModelId: e.target.value ? Number(e.target.value) : undefined,
                      pageNumber: 1,
                    }))
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setHistoryParams({ pageNumber: 1, pageSize: 10 })}
              >
                <ArrowCounterClockwise className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>

            {/* History table */}
            {loadingHistory ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !historyData?.items?.length ? (
              <EmptyState icon={ClockCounterClockwise} text="Không có lịch sử thay đổi." />
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12.5">#</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Hành động</TableHead>
                        <TableHead className="text-right">Danger cũ</TableHead>
                        <TableHead className="text-right">Warning cũ</TableHead>
                        <TableHead className="text-right">Danger mới</TableHead>
                        <TableHead className="text-right">Warning mới</TableHead>
                        <TableHead>Lý do</TableHead>
                        <TableHead>Thời điểm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.items.map((h, idx) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-muted-foreground">
                            {((historyParams.pageNumber ?? 1) - 1) * (historyParams.pageSize ?? 10) + idx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", SCOPE_COLORS[h.scopeType] ?? "")}>
                              {SCOPE_LABELS[h.scopeType as ThresholdScopeType] ?? h.scopeType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={h.action === "RESET" ? "destructive" : "default"}>
                              {h.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{h.oldDangerPercent}%</TableCell>
                          <TableCell className="text-right font-mono">{h.oldWarningPercent}%</TableCell>
                          <TableCell className="text-right font-mono">{h.newDangerPercent}%</TableCell>
                          <TableCell className="text-right font-mono">{h.newWarningPercent}%</TableCell>
                          <TableCell className="max-w-50 truncate text-muted-foreground">
                            {h.changeReason || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(h.changedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {historyData.pageNumber} / {historyData.totalPages} · Tổng {historyData.totalCount} bản ghi
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!historyData.hasPreviousPage}
                      onClick={() => setHistoryParams((p) => ({ ...p, pageNumber: (p.pageNumber ?? 1) - 1 }))}
                    >
                      <CaretLeft className="h-4 w-4 mr-1" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!historyData.hasNextPage}
                      onClick={() => setHistoryParams((p) => ({ ...p, pageNumber: (p.pageNumber ?? 1) + 1 }))}
                    >
                      Sau
                      <CaretRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB 3: SẮP HẾT HÀNG (Low Stock)
              ════════════════════════════════════════ */}
          <TabsContent value="lowstock">
            {/* Filter + Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Funnel className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={lowStockLevel ?? "all"}
                  onValueChange={(v) => setLowStockLevel(v === "all" ? undefined : (v as LowStockLevel))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả mức</SelectItem>
                    <SelectItem value="Warning">Cảnh báo</SelectItem>
                    <SelectItem value="Danger">Nguy hiểm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {lowStock?.summary && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="font-medium">{lowStock.summary.dangerCount}</span>
                    <span className="text-muted-foreground">nguy hiểm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-medium">{lowStock.summary.warningCount}</span>
                    <span className="text-muted-foreground">cảnh báo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{lowStock.summary.totalCount}</span>
                    <span className="text-muted-foreground">tổng</span>
                  </div>
                </div>
              )}
            </div>

            {/* Charts row: byDepot + byCategory */}
            {lowStock && (lowStock.byDepot?.length > 0 || lowStock.byCategory?.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                {/* By Depot */}
                {lowStock.byDepot?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Theo kho</h3>
                      <div className="space-y-2">
                        {lowStock.byDepot.map((d) => (
                          <div key={d.depotId} className="flex items-center justify-between text-sm">
                            <span className="truncate">{d.depotName}</span>
                            <div className="flex gap-3 shrink-0">
                              <span className="text-red-600 font-medium">{d.dangerCount} nguy hiểm</span>
                              <span className="text-amber-600 font-medium">{d.warningCount} cảnh báo</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* By Category */}
                {lowStock.byCategory?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Theo danh mục</h3>
                      <div className="space-y-2">
                        {lowStock.byCategory.map((c) => (
                          <div key={c.categoryId} className="flex items-center justify-between text-sm">
                            <span className="truncate">{c.categoryName}</span>
                            <div className="flex gap-3 shrink-0">
                              <span className="text-red-600 font-medium">{c.dangerCount} nguy hiểm</span>
                              <span className="text-amber-600 font-medium">{c.warningCount} cảnh báo</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Items table */}
            {loadingLowStock ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !lowStock?.items?.length ? (
              <EmptyState icon={CheckCircle} text="Không có vật phẩm nào sắp hết hàng 🎉" />
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12.5">#</TableHead>
                      <TableHead>Vật phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Đối tượng</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead className="text-right">Tổng SL</TableHead>
                      <TableHead className="text-right">Đã giữ</TableHead>
                      <TableHead className="text-right">Khả dụng</TableHead>
                      <TableHead className="text-right">Tỷ lệ</TableHead>
                      <TableHead>Mức cảnh báo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.items.map((item, idx) => (
                      <TableRow key={`${item.depotId}-${item.itemModelId}`}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.itemModelName}</TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>{item.targetGroup}</TableCell>
                        <TableCell>{item.depotName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.reservedQuantity}</TableCell>
                        <TableCell className="text-right font-mono">{item.availableQuantity}</TableCell>
                        <TableCell className="text-right font-mono">
                          {(item.availableRatio * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>{alertBadge(item.alertLevel)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ════════════════════════════════════════
          DIALOG: Tạo / Sửa ngưỡng (PUT)
          ════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle>{editConfig ? "Chỉnh sửa ngưỡng" : "Thêm ngưỡng mới"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Scope type */}
            <div className="space-y-1.5">
              <Label>Phạm vi áp dụng</Label>
              <Select
                value={form.scopeType}
                onValueChange={(v) => setForm((f) => ({ ...f, scopeType: v as ThresholdScopeType }))}
                disabled={!!editConfig} // Can't change scope when editing
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Depot">Kho (Depot)</SelectItem>
                  <SelectItem value="DepotCategory">Theo danh mục (DepotCategory)</SelectItem>
                  <SelectItem value="DepotItem">Theo vật phẩm (DepotItem)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Manager không thể chỉnh Global — chỉ admin có quyền.
              </p>
            </div>

            {/* Category ID — only for DepotCategory */}
            {form.scopeType === "DepotCategory" && (
              <div className="space-y-1.5">
                <Label>Danh mục (Category ID)</Label>
                <Input
                  type="number"
                  placeholder="VD: 2"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  disabled={!!editConfig}
                />
              </div>
            )}

            {/* Item Model ID — only for DepotItem */}
            {form.scopeType === "DepotItem" && (
              <div className="space-y-1.5">
                <Label>Vật phẩm (Item Model ID)</Label>
                <Input
                  type="number"
                  placeholder="VD: 101"
                  value={form.itemModelId}
                  onChange={(e) => setForm((f) => ({ ...f, itemModelId: e.target.value }))}
                  disabled={!!editConfig}
                />
              </div>
            )}

            <Separator />

            {/* Danger percent */}
            <div className="space-y-1.5">
              <Label>
                Ngưỡng nguy hiểm (%)
                <span className="text-xs text-muted-foreground ml-1">≥ 1</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  placeholder="VD: 20"
                  value={form.dangerPercent}
                  onChange={(e) => setForm((f) => ({ ...f, dangerPercent: e.target.value }))}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</div>
              </div>
            </div>

            {/* Warning percent */}
            <div className="space-y-1.5">
              <Label>
                Ngưỡng cảnh báo (%)
                <span className="text-xs text-muted-foreground ml-1">≥ 5, &gt; ngưỡng nguy hiểm</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  placeholder="VD: 40"
                  value={form.warningPercent}
                  onChange={(e) => setForm((f) => ({ ...f, warningPercent: e.target.value }))}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</div>
              </div>
            </div>

            {/* Visual preview */}
            {form.dangerPercent && form.warningPercent && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Minh họa ngưỡng:</p>
                <div className="relative h-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-red-400/70"
                    style={{ width: `${Number(form.dangerPercent)}%` }}
                  />
                  <div
                    className="absolute left-0 top-0 h-full bg-amber-400/50"
                    style={{ width: `${Number(form.warningPercent)}%` }}
                  />
                  <div
                    className="absolute left-0 top-0 h-full bg-red-500/70"
                    style={{ width: `${Number(form.dangerPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span className="text-red-600">{form.dangerPercent}% nguy hiểm</span>
                  <span className="text-amber-600">{form.warningPercent}% cảnh báo</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Lý do (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Điều chỉnh theo năng lực kho"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-1.5">
              {updateMutation.isPending && <SpinnerGap className="h-4 w-4 animate-spin" />}
              {editConfig ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════
          DIALOG: Reset / Xóa ngưỡng (DELETE)
          ════════════════════════════════════════ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-105">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <WarningCircle className="h-5 w-5" />
              Reset cấu hình ngưỡng
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Hành động này sẽ <span className="font-medium text-foreground">vô hiệu hóa</span> cấu hình ngưỡng (soft reset).
              Tồn kho sẽ fallback về ngưỡng scope cao hơn (Depot → Global).
            </p>

            {deleteTarget && (
              <Card>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", SCOPE_COLORS[deleteTarget.scopeType] ?? "")}>
                      {SCOPE_LABELS[deleteTarget.scopeType as ThresholdScopeType] ?? deleteTarget.scopeType}
                    </Badge>
                    <span>
                      Danger: {deleteTarget.dangerPercent}% · Warning: {deleteTarget.warningPercent}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label>Lý do reset (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Không cần override item nữa"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending && <SpinnerGap className="h-4 w-4 animate-spin" />}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
