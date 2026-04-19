"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Warehouse,
  X,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CaretDown,
  Eye,
  MagnifyingGlass,
  Check,
  Plus,
  MapPin,
  Users,
  ImageSquare,
} from "@phosphor-icons/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  useCreateDepot,
  useDepotAvailableManagers,
  useDepots,
  useDepotStatuses,
} from "@/services/depot/hooks";
import { uploadImageToCloudinary } from "@/utils/uploadFile";
import type {
  CreateDepotRequest,
  DepotEntity,
  DepotStatus,
  DepotStatusMetadata,
} from "@/services/depot/type";

const LocationPickerMap = dynamic(
  () => import("@/components/admin/assembly-points/LocationPickerMap"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-64 rounded-lg" />,
  },
);

function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}

/* ── Status config ───────────────────────────────────────────── */

type StatusCfgMap = Record<
  string,
  { label: string; color: string; bg: string }
>;

const STATUS_STYLE: Record<DepotStatus, { color: string; bg: string }> = {
  Created: {
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-500/10",
  },
  Available: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  Unavailable: {
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  Full: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  PendingAssignment: {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  Closed: {
    color: "text-zinc-700 dark:text-zinc-400",
    bg: "bg-zinc-500/10",
  },
  Closing: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  UnderMaintenance: {
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
};

const STATUS_FALLBACK: Record<DepotStatus, string> = {
  Created: "Vừa tạo, chưa có quản lý",
  Available: "Đang hoạt động",
  Unavailable: "Ngưng hoạt động",
  Full: "Đã đầy",
  PendingAssignment: "Chưa có quản lý",
  Closed: "Đã đóng",
  Closing: "Đang tiến hành đóng kho",
  UnderMaintenance: "Đang bảo trì",
};

function buildStatusCfg(apiStatuses?: DepotStatusMetadata[]): StatusCfgMap {
  const result: StatusCfgMap = {};
  const keys: DepotStatus[] = [
    "Created",
    "Available",
    "Unavailable",
    "Full",
    "PendingAssignment",
    "Closed",
    "Closing",
    "UnderMaintenance",
  ];
  for (const key of keys) {
    const apiLabel = apiStatuses?.find((s) => s.key === key)?.value;
    const style = STATUS_STYLE[key] ?? STATUS_STYLE.Closed;
    result[key] = { label: apiLabel ?? STATUS_FALLBACK[key] ?? key, ...style };
  }
  return result;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const CAPACITY_PRESETS = [1000000, 2000000, 5000000];

function formatAmountWithDot(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* ── Small util bar (used in table only) ─────────────────────── */

function UtilBar({
  used,
  cap,
  className,
}: {
  used: number;
  cap: number;
  className?: string;
}) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct > 80
              ? "bg-red-500"
              : pct > 50
                ? "bg-orange-500"
                : "bg-emerald-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums shrink-0 w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

/* ── Table skeleton ──────────────────────────────────────────── */

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          <td className="py-3.5 px-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </td>
          <td className="py-3.5 px-4 hidden md:table-cell">
            <Skeleton className="h-4 w-44" />
          </td>
          <td className="py-3.5 px-4 hidden lg:table-cell">
            <Skeleton className="h-3 w-32" />
          </td>
          <td className="py-3.5 px-4">
            <Skeleton className="h-6 w-20 rounded-full" />
          </td>
          <td className="py-3.5 px-4">
            <Skeleton className="h-8 w-8 rounded-md ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* ── Table ───────────────────────────────────────────────────── */

function DepotTable({
  items,
  isLoading,
  onDetail,
  emptyText,
  skeletonRows,
  statusCfg,
}: {
  items: DepotEntity[];
  isLoading: boolean;
  onDetail: (d: DepotEntity) => void;
  emptyText?: string;
  skeletonRows?: number;
  statusCfg: StatusCfgMap;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter ">
              Kho hàng
            </th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter hidden md:table-cell">
              Địa chỉ
            </th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter hidden lg:table-cell">
              Tồn kho
            </th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter">
              Trạng thái
            </th>
            <th className="py-3 px-4 w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={skeletonRows} />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-16 text-center">
                <Warehouse
                  size={36}
                  className="mx-auto text-muted-foreground/30 mb-3"
                />
                <p className="text-sm text-muted-foreground tracking-tighter">
                  {emptyText ?? "Không có dữ liệu"}
                </p>
              </td>
            </tr>
          ) : (
            items.map((depot) => {
              const cfg = statusCfg[depot.status] ?? {
                label: depot.status,
                color: "text-muted-foreground",
                bg: "bg-muted",
              };
              return (
                <tr
                  key={depot.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onDetail(depot)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tighter max-w-60">
                          {depot.name}
                        </p>
                        <p className="text-sm text-muted-foreground tracking-tighter">
                          Kho số {depot.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 hidden md:table-cell max-w-55">
                    <div className="flex items-start">
                      <span className="text-sm tracking-tighter line-clamp-2">
                        {depot.address}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="space-y-1 w-36">
                      <UtilBar
                        used={depot.currentUtilization}
                        cap={depot.capacity}
                      />
                      {/* <p className="text-sm text-muted-foreground tracking-tight">
                        {depot.currentUtilization}/{depot.capacity}
                      </p> */}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge
                      className={cn(
                        "text-[13px] font-semibold tracking-tighter shrink-0",
                        cfg.bg,
                        cfg.color,
                      )}
                    >
                      {depot.status === "Closing" && (
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      )}
                      {cfg.label}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDetail(depot);
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
  );
}

/* ── Main Page ───────────────────────────────────────────────── */

export default function DepotsPage() {
  const router = useRouter();

  /* ── Filter / search state ── */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<DepotStatus[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [newDepot, setNewDepot] = useState({
    name: "",
    address: "",
    capacity: "",
    latitude: "",
    longitude: "",
    managerId: "",
    imagePreviewUrl: "",
  });

  /* ── Data ── */
  const createDepotMutation = useCreateDepot();
  const { data: allData, refetch: refetchAll } = useDepots({
    params: { pageNumber: 1, pageSize: 200 },
  });
  const {
    data: tableData,
    isLoading,
    refetch: refetchTable,
  } = useDepots({
    params: {
      pageNumber: page,
      pageSize,
      search: debouncedSearch || undefined,
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
    },
  });
  const { data: availableManagers = [] } = useDepotAvailableManagers({
    enabled: createOpen,
  });

  const allDepots = allData?.items ?? [];
  const { data: statusMetadata } = useDepotStatuses();
  const statusCfg = buildStatusCfg(statusMetadata);
  const statusFilterKeys =
    statusMetadata?.length && statusMetadata.length > 0
      ? statusMetadata.map((status) => status.key)
      : ([
          "Created",
          "PendingAssignment",
          "Available",
          "Unavailable",
          "Closed",
        ] satisfies DepotStatus[]);

  const tableItems = tableData?.items ?? [];
  const totalCount = tableData?.totalCount ?? 0;
  const totalPages = tableData?.totalPages ?? 1;

  const STATUS_CARD_STYLE: Partial<
    Record<
      DepotStatus,
      { color: string; bg: string; Icon: typeof CheckCircle | string }
    >
  > = {
    Created: {
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
      Icon: "tabler:plus",
    },
    PendingAssignment: {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      Icon: "fa7-solid:user-clock",
    },
    Available: {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      Icon: CheckCircle,
    },
    Unavailable: {
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      Icon: "uiw:stop",
    },
    Closed: {
      color: "text-zinc-500 dark:text-zinc-400",
      bg: "bg-zinc-50 dark:bg-zinc-950/30",
      Icon: "mingcute:lock-fill",
    },
    Closing: {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      Icon: "ic:round-close",
    },
  };

  const statsList = statusFilterKeys.map((status) => {
    const cardStyle = STATUS_CARD_STYLE[status] ?? {
      color: "text-muted-foreground",
      bg: "bg-muted",
      Icon: Warehouse,
    };

    return {
      key: status,
      label: statusCfg[status]?.label ?? STATUS_FALLBACK[status] ?? status,
      value: allDepots.filter((d) => d.status === status).length,
      ...cardStyle,
    };
  });

  function toggleStatus(s: DepotStatus) {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function openDetail(depot: DepotEntity) {
    router.push(`/dashboard/admin/depots/${depot.id}`);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([refetchAll(), refetchTable()]).finally(() =>
      setIsRefreshing(false),
    );
  }

  function changePageSize(val: string) {
    setPageSize(Number(val));
    setPage(1);
  }

  const hasFilters = debouncedSearch || selectedStatuses.length > 0;

  async function resolveAddressFromPickedPoint(lat: number, lng: number) {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("reverse geocode failed");
      const json = (await res.json()) as {
        result?: { display_name?: string };
      };
      const displayName = json.result?.display_name?.trim();
      setNewDepot((prev) => ({
        ...prev,
        address: displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));
    } catch {
      setNewDepot((prev) => ({
        ...prev,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));
      toast.error("Không đọc được địa chỉ từ OpenStreetMap.");
    } finally {
      setIsResolvingAddress(false);
    }
  }

  function handleMapPick(lat: number, lng: number) {
    setNewDepot((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    void resolveAddressFromPickedPoint(lat, lng);
  }

  function handleImageFileChange(file?: File) {
    if (newDepot.imagePreviewUrl) {
      URL.revokeObjectURL(newDepot.imagePreviewUrl);
    }
    setShowImagePreview(false);
    if (!file) {
      setSelectedImageFile(null);
      setNewDepot((prev) => ({ ...prev, imagePreviewUrl: "" }));
      return;
    }
    setSelectedImageFile(file);
    setNewDepot((prev) => ({
      ...prev,
      imagePreviewUrl: URL.createObjectURL(file),
    }));
  }

  function resetCreateForm() {
    if (newDepot.imagePreviewUrl) {
      URL.revokeObjectURL(newDepot.imagePreviewUrl);
    }
    setNewDepot({
      name: "",
      address: "",
      capacity: "",
      latitude: "",
      longitude: "",
      managerId: "",
      imagePreviewUrl: "",
    });
    setSelectedImageFile(null);
    setIsResolvingAddress(false);
    setIsUploadingImage(false);
    setShowImagePreview(false);
  }

  async function handleCreateDepot() {
    const name = newDepot.name.trim();
    const address = newDepot.address.trim();
    const capacity = Number(newDepot.capacity.replaceAll(".", ""));
    const latitude = Number(newDepot.latitude);
    const longitude = Number(newDepot.longitude);

    if (!name || !address) {
      toast.error("Vui lòng nhập đầy đủ tên kho và địa chỉ.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      toast.error("Sức chứa phải lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      toast.error("Vĩ độ không hợp lệ.");
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Kinh độ không hợp lệ.");
      return;
    }

    let imageUrl: string | undefined;
    if (selectedImageFile) {
      try {
        setIsUploadingImage(true);
        imageUrl = await uploadImageToCloudinary(
          selectedImageFile,
          "depot_img",
          "depot_img",
        );
      } catch {
        toast.error("Upload ảnh Cloudinary thất bại.");
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const basePayload: CreateDepotRequest = {
      name,
      address,
      capacity,
      latitude,
      longitude,
      ...(newDepot.managerId ? { managerId: newDepot.managerId } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };

    const payload = basePayload;

    createDepotMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Tạo kho mới thành công.");
        setCreateOpen(false);
        resetCreateForm();
        handleRefresh();
      },
      onError: (err) => {
        toast.error(getApiError(err, "Tạo kho thất bại."));
      },
    });
  }

  /* ── Render ── */
  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Warehouse size={22} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý kho hàng
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Kho hàng
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Tìm kiếm và lọc theo trạng thái kho
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              className="gap-2 tracking-tighter bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25"
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              <Plus size={16} />
              Tạo kho mới
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {statsList.map(({ key, label, value, color, bg, Icon: StatIcon }) => (
            <Card key={key} className="border border-border/50">
              <CardContent className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm tracking-tighter text-muted-foreground font-medium mb-0.5 truncate">
                      {label}
                    </p>
                    <p className="text-2xl tracking-tighter font-bold text-foreground">
                      {!allData ? "—" : value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      bg,
                    )}
                  >
                    {typeof StatIcon === "string" ? (
                      <IconifyIcon
                        icon={StatIcon}
                        width={17}
                        height={17}
                        className={color}
                      />
                    ) : (
                      <StatIcon size={17} weight="fill" className={color} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-48">
            <Input
              placeholder="Tìm theo tên kho, họ tên quản lý..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 h-8 text-sm tracking-tighter"
            />
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status dropdown */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-normal"
              >
                Trạng thái
                {selectedStatuses.length > 0 ? (
                  <Badge className="h-5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 max-h-72 overflow-y-auto p-1"
              align="end"
              side="bottom"
              sideOffset={4}
            >
              {statusFilterKeys.map((s) => {
                const checked = selectedStatuses.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-sm rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}
                    >
                      {checked && (
                        <Check
                          size={10}
                          weight="bold"
                          className="text-primary-foreground"
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-left leading-tight tracking-tighter text-black dark:text-white",
                        checked ? "font-medium" : "text-muted-foreground",
                      )}
                    >
                      {statusCfg[s]?.label ?? s}
                    </span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setSelectedStatuses([]);
                setPage(1);
              }}
              className="text-muted-foreground gap-1"
            >
              <X size={14} />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* ── Table ── */}
        <Card className="border border-border/50 overflow-hidden py-0">
          <DepotTable
            items={tableItems}
            isLoading={isLoading}
            onDetail={openDetail}
            emptyText={
              hasFilters
                ? "Không tìm thấy kho nào khớp bộ lọc"
                : "Chưa có kho nào"
            }
            skeletonRows={pageSize}
            statusCfg={statusCfg}
          />

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tracking-tighter">
                Hiển thị
              </span>
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger className="h-8 w-16 text-sm tracking-tighter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      className="text-sm tracking-tighter"
                    >
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground tracking-tighter">
                / {totalCount} kho
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tracking-tighter">
                Trang {page}/{totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <CaretLeft size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <CaretRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="tracking-tighter text-2xl">
              Tạo kho mới
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 py-1">
            <div className="space-y-3 lg:col-span-2">
              <Label className="tracking-tighter flex items-center gap-1.5">
                <MapPin size={14} className="text-red-500" />
                Vui lòng chọn vị trí trên map
              </Label>
              <LocationPickerMap
                lat={newDepot.latitude ? Number(newDepot.latitude) : undefined}
                lng={
                  newDepot.longitude ? Number(newDepot.longitude) : undefined
                }
                onPick={handleMapPick}
                height={310}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="tracking-tighter">Vĩ độ</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newDepot.latitude}
                    onChange={(e) =>
                      setNewDepot((p) => ({ ...p, latitude: e.target.value }))
                    }
                    placeholder="16.047079"
                    className="tracking-tighter font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="tracking-tighter">Kinh độ</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newDepot.longitude}
                    onChange={(e) =>
                      setNewDepot((p) => ({ ...p, longitude: e.target.value }))
                    }
                    placeholder="108.20623"
                    className="tracking-tighter font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="tracking-tighter">Tên kho</Label>
                <Input
                  value={newDepot.name}
                  onChange={(e) =>
                    setNewDepot((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nhập tên kho"
                  className="tracking-tighter"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="tracking-tighter">Địa chỉ</Label>
                <Input
                  value={newDepot.address}
                  onChange={(e) =>
                    setNewDepot((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Chọn điểm trên bản đồ để lấy địa chỉ"
                  className="tracking-tighter"
                />
                {isResolvingAddress && (
                  <p className="text-xs text-muted-foreground tracking-tighter">
                    Đang đọc địa chỉ từ map...
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="tracking-tighter flex items-center gap-1.5">
                  <Users size={14} className="text-blue-500" />
                  Mức tồn kho tối đa
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CAPACITY_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={
                        newDepot.capacity.replaceAll(".", "") === String(preset)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-8 text-sm tracking-tighter"
                      onClick={() =>
                        setNewDepot((p) => ({
                          ...p,
                          capacity: formatAmountWithDot(String(preset)),
                        }))
                      }
                    >
                      {formatAmountWithDot(String(preset))}
                    </Button>
                  ))}
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newDepot.capacity}
                  onChange={(e) =>
                    setNewDepot((p) => ({
                      ...p,
                      capacity: formatAmountWithDot(e.target.value),
                    }))
                  }
                  placeholder="Ví dụ: 1.000.000"
                  className="tracking-tighter"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="tracking-tighter">Quản kho</Label>
                <Select
                  value={newDepot.managerId || "__none"}
                  onValueChange={(value) =>
                    setNewDepot((p) => ({
                      ...p,
                      managerId: value === "__none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="tracking-tighter">
                    <SelectValue placeholder="Chọn manager từ metadata" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="z-10010 w-[--radix-select-trigger-width]"
                  >
                    <SelectItem value="__none">Chọn quản kho</SelectItem>
                    {availableManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.fullName} - {manager.phone} - Đang quản lý{" "}
                        {manager.assignedDepotsCount} kho
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="tracking-tighter flex items-center gap-1.5">
                  <ImageSquare size={14} className="text-violet-500" />
                  Hình ảnh kho
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e.target.files?.[0])}
                    className="tracking-tighter"
                  />
                  {newDepot.imagePreviewUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setShowImagePreview((prev) => !prev)}
                    >
                      <Eye size={16} />
                    </Button>
                  ) : null}
                </div>
                {newDepot.imagePreviewUrl && showImagePreview ? (
                  <div
                    className="h-32 rounded-md border border-border/60 bg-center bg-cover"
                    style={{
                      backgroundImage: `url(${newDepot.imagePreviewUrl})`,
                    }}
                  />
                ) : null}
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
              className="tracking-tighter"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateDepot}
              disabled={createDepotMutation.isPending || isUploadingImage}
              className="tracking-tighter"
            >
              {createDepotMutation.isPending || isUploadingImage
                ? "Đang tạo..."
                : "Tạo kho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
