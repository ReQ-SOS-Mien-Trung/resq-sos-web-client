"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { cn } from "@/lib/utils";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ChartBar,
  CheckCircle,
  Funnel,
  Gear,
  PencilSimple,
  Plus,
  SpinnerGap,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useDeleteMyDepotThreshold,
  useInventoryCategories,
  useMyDepotLowStock,
  useMyDepotThresholds,
  useUpdateMyDepotThreshold,
} from "@/services/inventory/hooks";
import {
  compareLowStockItems,
  getLowStockSeverityRatio,
  getLowStockWarningLabel,
  getLowStockWarningLevel,
  getResolvedThresholdScopeLabel,
  getWarningLevelPriority,
} from "@/services/inventory/utils";
import type {
  DeleteThresholdPayload,
  LowStockItem,
  ThresholdConfig,
  ThresholdScopeType,
  UpdateThresholdPayload,
} from "@/services/inventory/type";

const NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN");

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

const WARNING_LEVEL_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-yellow-100 text-yellow-700",
  OK: "bg-emerald-100 text-emerald-700",
  UNCONFIGURED: "bg-slate-100 text-slate-700",
};

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

function formatDate(iso?: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value?: number | null): string {
  if (value == null) {
    return "—";
  }

  return NUMBER_FORMATTER.format(value);
}

function formatThresholdDisplay(config: ThresholdConfig): string {
  if (config.minimumThreshold != null) {
    return `${formatNumber(config.minimumThreshold)} đơn vị`;
  }

  return "Chưa cấu hình";
}

function getWarningBadge(level?: string | null) {
  const normalized = getLowStockWarningLevel({
    warningLevel: level ?? undefined,
    alertLevel: undefined,
  });

  return (
    <Badge
      className={cn(
        "border-0 shadow-none hover:bg-transparent",
        WARNING_LEVEL_COLORS[normalized] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {getLowStockWarningLabel(normalized)}
    </Badge>
  );
}

function getLowStockRowTone(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "bg-red-50 text-red-700";
    case "HIGH":
      return "bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700";
    case "LOW":
      return "bg-yellow-50 text-yellow-700";
    case "OK":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-50 text-slate-700";
  }
}

function getThresholdSourceLabel(item: LowStockItem): string {
  if (item.resolvedThresholdScope === "None") {
    return "Chưa cấu hình";
  }

  return item.isUsingGlobalDefault ? "Mặc định hệ thống" : "Override cục bộ";
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Icon className="mb-3 h-10 w-10 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ThresholdConfigCard({
  config,
  label,
  sublabel,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  config: ThresholdConfig;
  label: string;
  sublabel?: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative py-0 border border-border/60 bg-card transition-shadow hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge
                className={cn(
                  "text-sm tracking-tighter font-medium",
                  SCOPE_COLORS[config.scopeType] ?? "",
                )}
              >
                {SCOPE_LABELS[config.scopeType] ?? config.scopeType}
              </Badge>
              {sublabel ? (
                <span className="truncate text-sm tracking-tighter text-muted-foreground">
                  {sublabel}
                </span>
              ) : null}
            </div>

            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tighter text-foreground">
              {config.minimumThreshold != null
                ? formatNumber(config.minimumThreshold)
                : "—"}
            </p>
            <p className="mt-1 text-sm tracking-tighter text-muted-foreground">
              {config.minimumThreshold != null
                ? "Ngưỡng tối thiểu"
                : formatThresholdDisplay(config)}
            </p>
            <p className="mt-1.5 text-sm tracking-tighter text-muted-foreground">
              {formatDate(config.updatedAt)}
              {config.rowVersion != null ? ` · v${config.rowVersion}` : ""}
            </p>
          </div>

          {canEdit || canDelete ? (
            <div className="flex shrink-0 gap-1">
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                >
                  <PencilSimple className="h-4 w-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ThresholdConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDepotId } = useManagerDepot();
  const prefersReducedMotion = useReducedMotion();

  const [tab, setTab] = useState(() => {
    const current = searchParams.get("tab");
    return current === "history" || current === "lowstock" ? current : "config";
  });

  const {
    data: thresholds,
    isLoading: loadingThresholds,
    refetch: refetchThresholds,
  } = useMyDepotThresholds(
    { depotId: selectedDepotId ?? 0 },
    { enabled: Boolean(selectedDepotId) },
  );
  const { data: categories } = useInventoryCategories();
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories?.forEach((category) => {
      map[Number(category.key)] = category.value;
    });
    return map;
  }, [categories]);

  const [selectedWarningLevel, setSelectedWarningLevel] = useState("all");
  const { data: lowStock, isLoading: loadingLowStock } = useMyDepotLowStock(
    selectedDepotId ? { depotId: selectedDepotId } : undefined,
  );

  const updateMutation = useUpdateMyDepotThreshold();
  const deleteMutation = useDeleteMyDepotThreshold();

  const [editOpen, setEditOpen] = useState(false);
  const [createInlineOpen, setCreateInlineOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<ThresholdConfig | null>(null);
  const [form, setForm] = useState({
    scopeType: "Depot" as ThresholdScopeType,
    categoryId: "",
    itemModelId: "",
    minimumThreshold: "",
    reason: "",
  });

  const openCreate = useCallback(() => {
    setEditConfig(null);
    setForm({
      scopeType: "Depot",
      categoryId: "",
      itemModelId: "",
      minimumThreshold: "",
      reason: "",
    });
    setEditOpen(false);
    setCreateInlineOpen(true);
  }, []);

  const openEdit = useCallback((config: ThresholdConfig) => {
    setCreateInlineOpen(false);
    setEditConfig(config);
    setForm({
      scopeType: config.scopeType,
      categoryId: config.categoryId != null ? String(config.categoryId) : "",
      itemModelId: config.itemModelId != null ? String(config.itemModelId) : "",
      minimumThreshold:
        config.minimumThreshold != null ? String(config.minimumThreshold) : "",
      reason: "",
    });
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const parsedThreshold = Number(form.minimumThreshold);

    if (!form.minimumThreshold.trim()) {
      toast.error("Vui lòng nhập ngưỡng tối thiểu");
      return;
    }

    if (!Number.isInteger(parsedThreshold) || parsedThreshold <= 0) {
      toast.error("Ngưỡng tối thiểu phải là số nguyên lớn hơn 0");
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
      depotId: selectedDepotId ?? 0,
      scopeType: form.scopeType,
      minimumThreshold: parsedThreshold,
      ...(form.scopeType === "DepotCategory"
        ? { categoryId: Number(form.categoryId) }
        : {}),
      ...(form.scopeType === "DepotItem"
        ? { itemModelId: Number(form.itemModelId) }
        : {}),
      ...(editConfig?.rowVersion != null
        ? { rowVersion: editConfig.rowVersion }
        : {}),
      ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
    };

    try {
      await updateMutation.mutateAsync(payload);
      toast.success(
        editConfig
          ? "Đã cập nhật ngưỡng tối thiểu"
          : "Đã tạo cấu hình ngưỡng mới",
      );
      setEditOpen(false);
      setCreateInlineOpen(false);
      refetchThresholds();
    } catch (error: unknown) {
      const responseError = error as { response?: { status?: number } };

      if (responseError.response?.status === 409) {
        toast.error("Dữ liệu đã thay đổi. Đang tải lại...");
        refetchThresholds();
        setEditOpen(false);
        setCreateInlineOpen(false);
        return;
      }

      if (responseError.response?.status === 400) {
        toast.error("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
        return;
      }

      toast.error("Không thể lưu cấu hình ngưỡng.");
    }
  }, [editConfig, form, refetchThresholds, selectedDepotId, updateMutation]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ThresholdConfig | null>(
    null,
  );
  const [deleteReason, setDeleteReason] = useState("");

  const openDelete = useCallback((config: ThresholdConfig) => {
    setDeleteTarget(config);
    setDeleteReason("");
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    const payload: DeleteThresholdPayload = {
      depotId: selectedDepotId ?? 0,
      scopeType: deleteTarget.scopeType,
      ...(deleteTarget.categoryId != null
        ? { categoryId: deleteTarget.categoryId }
        : {}),
      ...(deleteTarget.itemModelId != null
        ? { itemModelId: deleteTarget.itemModelId }
        : {}),
      ...(deleteTarget.rowVersion != null
        ? { rowVersion: deleteTarget.rowVersion }
        : {}),
      ...(deleteReason.trim() ? { reason: deleteReason.trim() } : {}),
    };

    try {
      await deleteMutation.mutateAsync(payload);
      toast.success("Đã reset cấu hình ngưỡng");
      setDeleteOpen(false);
      refetchThresholds();
    } catch {
      toast.error("Không thể reset cấu hình ngưỡng.");
    }
  }, [
    deleteMutation,
    deleteReason,
    deleteTarget,
    refetchThresholds,
    selectedDepotId,
  ]);

  const allConfigs = useMemo(() => {
    if (!thresholds) {
      return [];
    }

    const result: Array<{
      config: ThresholdConfig;
      label: string;
      sublabel?: string;
      canEdit: boolean;
      canDelete: boolean;
    }> = [];

    if (thresholds.global) {
      result.push({
        config: thresholds.global,
        label: "Ngưỡng toàn hệ thống",
        sublabel: "Admin quản lý",
        canEdit: false,
        canDelete: false,
      });
    }

    if (thresholds.depot) {
      result.push({
        config: thresholds.depot,
        label: "Ngưỡng mức kho",
        canEdit: true,
        canDelete: true,
      });
    }

    thresholds.depotCategories?.forEach((config) => {
      result.push({
        config,
        label:
          categoryMap[config.categoryId ?? -1] ??
          `Danh mục #${config.categoryId}`,
        sublabel:
          config.categoryId != null ? `ID: ${config.categoryId}` : undefined,
        canEdit: true,
        canDelete: true,
      });
    });

    thresholds.depotItems?.forEach((config) => {
      result.push({
        config,
        label: `Vật phẩm #${config.itemModelId}`,
        sublabel:
          config.itemModelId != null ? `ID: ${config.itemModelId}` : undefined,
        canEdit: true,
        canDelete: true,
      });
    });

    return result;
  }, [categoryMap, thresholds]);

  const lowStockItems = useMemo(() => {
    const items = lowStock?.items ?? [];
    return items
      .filter((item) => getLowStockWarningLevel(item) !== "OK")
      .sort(compareLowStockItems);
  }, [lowStock]);

  const availableWarningLevels = useMemo<string[]>(() => {
    return Array.from(
      new Set(lowStockItems.map((item) => getLowStockWarningLevel(item))),
    ).sort(
      (left, right) =>
        getWarningLevelPriority(left) - getWarningLevelPriority(right),
    );
  }, [lowStockItems]);

  const warningLevelCounts = useMemo(() => {
    return lowStockItems.reduce<Record<string, number>>((acc, item) => {
      const level = getLowStockWarningLevel(item);
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    }, {});
  }, [lowStockItems]);

  const filteredLowStockItems = useMemo(() => {
    if (selectedWarningLevel === "all") {
      return lowStockItems;
    }

    return lowStockItems.filter(
      (item) => getLowStockWarningLevel(item) === selectedWarningLevel,
    );
  }, [lowStockItems, selectedWarningLevel]);

  const entranceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: MOTION_EASE };
  const tabTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: MOTION_EASE };
  const cardTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: MOTION_EASE };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <motion.header
        className="border-b bg-background px-6 py-3.5"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={entranceTransition}
      >
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
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Cấu hình ngưỡng tồn kho
              </h1>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Quản lý ngưỡng theo hệ thống, kho, danh mục và vật phẩm
              </p>
            </div>
          </div>
          {tab === "config" ? (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Thêm ngưỡng
            </Button>
          ) : null}
        </div>
      </motion.header>

      <motion.div
        className="flex-1 px-6 py-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          ...entranceTransition,
          delay: prefersReducedMotion ? 0 : 0.06,
        }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              ...tabTransition,
              delay: prefersReducedMotion ? 0 : 0.1,
            }}
          >
            <TabsList className="mb-4 h-auto w-fit gap-1 rounded-lg bg-muted/40 p-1">
              <TabsTrigger
                value="config"
                className="gap-1.5 rounded-md px-4 py-2 text-sm font-medium tracking-tighter text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Gear size={18} />
                Cấu hình
              </TabsTrigger>
              <TabsTrigger
                value="lowstock"
                className="gap-1.5 rounded-md px-4 py-2 text-sm font-medium tracking-tighter text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <ChartBar size={18} />
                Sắp hết hàng
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="config" className="mt-0">
            <motion.div
              key="threshold-config-tab"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tabTransition}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm tracking-tighter text-muted-foreground">
                  Thứ tự áp dụng: Vật phẩm → Danh mục → Kho → Toàn hệ thống
                </p>
              </div>

              {createInlineOpen ? (
                <Card className="mb-4 border border-border/60">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold tracking-tighter">
                        Thêm ngưỡng mới
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateInlineOpen(false)}
                        className="h-8 px-2 text-sm tracking-tighter"
                      >
                        Đóng
                      </Button>
                    </div>

                    <div className="space-y-4 py-1">
                      <div className="space-y-1.5">
                        <Label>Phạm vi áp dụng</Label>
                        <Select
                          value={form.scopeType}
                          onValueChange={(value) =>
                            setForm((previous) => ({
                              ...previous,
                              scopeType: value as ThresholdScopeType,
                              categoryId:
                                value === "DepotCategory"
                                  ? previous.categoryId
                                  : "",
                              itemModelId:
                                value === "DepotItem"
                                  ? previous.itemModelId
                                  : "",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Depot">Kho (Depot)</SelectItem>
                            <SelectItem value="DepotCategory">
                              Theo danh mục (DepotCategory)
                            </SelectItem>
                            <SelectItem value="DepotItem">
                              Theo vật phẩm (DepotItem)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {form.scopeType === "DepotCategory" ? (
                        <div className="space-y-1.5">
                          <Label>Danh mục</Label>
                          <Select
                            value={form.categoryId || undefined}
                            onValueChange={(value) =>
                              setForm((previous) => ({
                                ...previous,
                                categoryId: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn danh mục" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem
                                  key={category.key}
                                  value={String(Number(category.key))}
                                >
                                  {category.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      {form.scopeType === "DepotItem" ? (
                        <div className="space-y-1.5">
                          <Label>Vật phẩm (Item Model ID)</Label>
                          <Input
                            type="number"
                            placeholder="VD: 101"
                            value={form.itemModelId}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                itemModelId: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        <Label>
                          Ngưỡng tối thiểu
                          <span className="ml-1 text-sm tracking-tighter text-muted-foreground">
                            số nguyên &gt; 0
                          </span>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="VD: 80"
                          value={form.minimumThreshold}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              minimumThreshold: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Lý do (tùy chọn)</Label>
                        <Textarea
                          placeholder="VD: Vật phẩm y tế cần dự trữ cao hơn"
                          value={form.reason}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              reason: event.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCreateInlineOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="gap-1.5"
                      >
                        {updateMutation.isPending ? (
                          <SpinnerGap className="h-4 w-4 animate-spin" />
                        ) : null}
                        Tạo mới
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {loadingThresholds ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                      <CardContent className="space-y-2 p-3">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-7 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : allConfigs.length === 0 ? (
                <EmptyState
                  icon={Gear}
                  text={
                    'Chưa có cấu hình ngưỡng nào. Nhấn "Thêm ngưỡng" để bắt đầu.'
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {allConfigs.map(
                    (
                      { config, label, sublabel, canEdit, canDelete },
                      index,
                    ) => (
                      <motion.div
                        key={`${config.scopeType}-${config.itemModelId ?? config.categoryId ?? "base"}`}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          ...cardTransition,
                          delay: prefersReducedMotion ? 0 : index * 0.04,
                        }}
                      >
                        <ThresholdConfigCard
                          config={config}
                          label={label}
                          sublabel={sublabel}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onEdit={() => openEdit(config)}
                          onDelete={() => openDelete(config)}
                        />
                      </motion.div>
                    ),
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="lowstock" className="mt-0">
            <motion.div
              key="threshold-lowstock-tab"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={tabTransition}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Funnel className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedWarningLevel}
                    onValueChange={setSelectedWarningLevel}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả mức</SelectItem>
                      {availableWarningLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {getLowStockWarningLabel(level)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm tracking-tighter text-muted-foreground">
                    Severity ratio = khả dụng / ngưỡng tối thiểu
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableWarningLevels.map((level) => (
                    <Badge
                      key={level}
                      className={cn(
                        "border-0 shadow-none",
                        WARNING_LEVEL_COLORS[level] ??
                          "bg-slate-100 text-slate-700",
                      )}
                    >
                      {getLowStockWarningLabel(level)}:{" "}
                      {warningLevelCounts[level] ?? 0}
                    </Badge>
                  ))}
                </div>
              </div>

              {loadingLowStock ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : !filteredLowStockItems.length ? (
                <EmptyState
                  icon={CheckCircle}
                  text="Không có vật phẩm nào đang dưới ngưỡng tối thiểu."
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12.5">#</TableHead>
                        <TableHead>Vật phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead>Kho</TableHead>
                        <TableHead className="text-right">Khả dụng</TableHead>
                        <TableHead className="text-right">
                          Ngưỡng tối thiểu
                        </TableHead>
                        <TableHead className="text-right">Severity</TableHead>
                        <TableHead>Mức cảnh báo</TableHead>
                        <TableHead>Phạm vi áp dụng</TableHead>
                        <TableHead>Nguồn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLowStockItems.map((item, index) => {
                        const level = getLowStockWarningLevel(item);
                        const severity = getLowStockSeverityRatio(item);

                        return (
                          <TableRow
                            key={`${item.depotId ?? "my"}-${item.itemModelId}`}
                          >
                            <TableCell className="text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.itemModelName}
                            </TableCell>
                            <TableCell>{item.categoryName ?? "—"}</TableCell>
                            <TableCell>
                              {item.depotName ?? "Kho hiện tại"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.availableQuantity)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.minimumThreshold)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {item.minimumThreshold != null
                                ? severity.toFixed(2)
                                : "—"}
                            </TableCell>
                            <TableCell>{getWarningBadge(level)}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-0 shadow-none",
                                  getLowStockRowTone(level),
                                )}
                              >
                                {getResolvedThresholdScopeLabel(
                                  item.resolvedThresholdScope,
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {getThresholdSourceLabel(item)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle>
              {editConfig ? "Chỉnh sửa ngưỡng" : "Thêm ngưỡng mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Phạm vi áp dụng</Label>
              <Select
                value={form.scopeType}
                onValueChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    scopeType: value as ThresholdScopeType,
                    categoryId:
                      value === "DepotCategory" ? previous.categoryId : "",
                    itemModelId:
                      value === "DepotItem" ? previous.itemModelId : "",
                  }))
                }
                disabled={!!editConfig}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Depot">Kho (Depot)</SelectItem>
                  <SelectItem value="DepotCategory">
                    Theo danh mục (DepotCategory)
                  </SelectItem>
                  <SelectItem value="DepotItem">
                    Theo vật phẩm (DepotItem)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Global threshold và warning band do admin quản lý.
              </p>
            </div>

            {form.scopeType === "DepotCategory" ? (
              <div className="space-y-1.5">
                <Label>Danh mục</Label>
                <Select
                  value={form.categoryId || undefined}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      categoryId: value,
                    }))
                  }
                  disabled={!!editConfig}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem
                        key={category.key}
                        value={String(Number(category.key))}
                      >
                        {category.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {form.scopeType === "DepotItem" ? (
              <div className="space-y-1.5">
                <Label>Vật phẩm (Item Model ID)</Label>
                <Input
                  type="number"
                  placeholder="VD: 101"
                  value={form.itemModelId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      itemModelId: event.target.value,
                    }))
                  }
                  disabled={!!editConfig}
                />
              </div>
            ) : null}

            <Separator />

            <div className="space-y-1.5">
              <Label>
                Ngưỡng tối thiểu
                <span className="ml-1 text-sm tracking-tighter text-muted-foreground">
                  số nguyên &gt; 0
                </span>
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="VD: 80"
                value={form.minimumThreshold}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    minimumThreshold: event.target.value,
                  }))
                }
              />
            </div>

            {form.minimumThreshold ? (
              <Card className="bg-muted/30">
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Minh họa tính severity ratio
                  </p>
                  <p className="text-muted-foreground">
                    Severity ratio = Số lượng khả dụng /{" "}
                    <span className="font-medium text-foreground">
                      {formatNumber(Number(form.minimumThreshold))}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Backend sẽ so sánh ratio này với warning band hiện hành để
                    xác định mức cảnh báo.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-1.5">
              <Label>Lý do (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Vật phẩm y tế cần dự trữ cao hơn"
                value={form.reason}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    reason: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-1.5"
            >
              {updateMutation.isPending ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : null}
              {editConfig ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Hành động này sẽ gỡ override hiện tại và fallback về scope cao hơn
              trong chuỗi DepotItem → DepotCategory → Depot → Global.
            </p>

            {deleteTarget ? (
              <Card>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-sm tracking-tighter",
                        SCOPE_COLORS[deleteTarget.scopeType] ?? "",
                      )}
                    >
                      {SCOPE_LABELS[deleteTarget.scopeType] ??
                        deleteTarget.scopeType}
                    </Badge>
                    <span>{formatThresholdDisplay(deleteTarget)}</span>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-1.5">
              <Label>Lý do reset (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Không cần override riêng nữa"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
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
              {deleteMutation.isPending ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : null}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
