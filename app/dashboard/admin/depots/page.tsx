"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Warehouse,
  X,
  CheckCircle,
  WarningCircle,
  Spinner,
  MapPin,
  Package,
  ArrowClockwise,
  UserCircle,
  CaretLeft,
  CaretRight,
  ProhibitInset,
  ArrowsLeftRight,
  Scales,
  Eye,
  Phone,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepots,
  useDepotMetadata,
  useDepotStatuses,
  useInitiateDepotClosure,
  useResolveDepotClosure,
  useCancelDepotClosure,
  useDepotClosureMetadata,
} from "@/services/depot/hooks";
import type { DepotEntity, DepotStatus, DepotStatusMetadata } from "@/services/depot/type";
import { AxiosError } from "axios";

/* ── API error helper ────────────────────────────────────────── */
function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}

/* ── Status config ───────────────────────────────────────────── */

type StatusCfgMap = Record<string, { label: string; color: string; bg: string }>;

const STATUS_STYLE: Record<DepotStatus, { color: string; bg: string }> = {
  Available:         { color: "text-white",bg: "bg-emerald-600 border-emerald-400 dark:bg-emerald-700 dark:border-emerald-700" },
  Full:              { color: "text-white",bg: "bg-amber-500  border-amber-400  dark:bg-amber-600  dark:border-amber-600"  },
  PendingAssignment: { color: "text-white",bg: "bg-blue-600   border-blue-400   dark:bg-blue-700   dark:border-blue-700"   },
  Closed:            { color: "text-white",bg: "bg-zinc-500   border-zinc-400   dark:bg-zinc-600   dark:border-zinc-600"   },
  Closing:           { color: "text-white",bg: "bg-red-600    border-red-400    dark:bg-red-700    dark:border-red-700"    },
  UnderMaintenance:  { color: "text-white",bg: "bg-purple-600 border-purple-400 dark:bg-purple-700 dark:border-purple-700" },
};

const STATUS_FALLBACK: Record<DepotStatus, string> = {
  Available:         "Đang hoạt động",
  Full:              "Đã đầy",
  PendingAssignment: "Chưa có quản lý",
  Closed:            "Đã đóng",
  Closing:           "Đang tiến hành đóng kho",
  UnderMaintenance:  "Đang bảo trì",
};

function buildStatusCfg(apiStatuses?: DepotStatusMetadata[]): StatusCfgMap {
  const result: StatusCfgMap = {};
  const keys: DepotStatus[] = ["Available", "Full", "PendingAssignment", "Closed", "Closing", "UnderMaintenance"];
  for (const key of keys) {
    const apiLabel = apiStatuses?.find((s) => s.key === key)?.value;
    const style = STATUS_STYLE[key] ?? STATUS_STYLE.Closed;
    result[key] = { label: apiLabel ?? STATUS_FALLBACK[key] ?? key, ...style };
  }
  return result;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/* ── Detail Sheet ────────────────────────────────────────────── */

function DepotDetailSheet({
  depot,
  open,
  onOpenChange,
  knownClosureIds,
  onInitiateClose,
  onResolve,
  onCancelClose,
  statusCfg,
}: {
  depot: DepotEntity | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  knownClosureIds: Record<number, number>;
  onInitiateClose: (d: DepotEntity) => void;
  onResolve: (d: DepotEntity) => void;
  onCancelClose: (d: DepotEntity) => void;
  statusCfg: StatusCfgMap;
}) {
  if (!depot) return null;
  const cfg = statusCfg[depot.status] ?? { label: depot.status, color: "text-muted-foreground", bg: "bg-muted" };
  const pct = depot.capacity > 0 ? Math.min(100, Math.round((depot.currentUtilization / depot.capacity) * 100)) : 0;
  const barColor = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
  const pctColor = pct > 80 ? "text-red-600 dark:text-red-400" : pct > 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto h-dvh bg-background p-0 gap-0" side="right">

        {/* ── Hero image ── */}
        {depot.imageUrl ? (
          <div className="relative h-48 w-full overflow-hidden shrink-0">
            <Image src={depot.imageUrl} alt={depot.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-bold text-lg tracking-tighter leading-tight drop-shadow-sm line-clamp-2">{depot.name}</p>
                  <p className="text-white/60 text-sm tracking-tight mt-0.5">ID #{depot.id}</p>
                </div>
                <Badge className={cn("shrink-0 text-sm font-semibold tracking-tight px-2.5 py-1 border", cfg.bg, cfg.color)}>
                  {depot.status === "Closing" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
                  {cfg.label}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-28 w-full bg-muted/50 flex items-center justify-center border-b border-border/40 shrink-0">
            <Warehouse size={40} className="text-muted-foreground/20" />
          </div>
        )}

        {/* ── Title block (no image) ── */}
        {!depot.imageUrl && (
          <div className="px-5 pt-5 pb-4 border-b border-border/50">
            <SheetHeader className="p-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-xl font-bold tracking-tighter leading-tight">{depot.name}</SheetTitle>
                <Badge variant="outline" className={cn("shrink-0 text-sm font-semibold tracking-tight px-2.5 py-1", cfg.bg, cfg.color)}>
                  {depot.status === "Closing" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground tracking-tight">ID #{depot.id}</p>
            </SheetHeader>
          </div>
        )}

        <div className="p-5 space-y-5">

          {/* ── Utilization card ── */}
        
            <p className="text-xl font-bold mb-2 tracking-tighter uppercase">Tình trạng tồn kho</p>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl tracking-tighter font-bold tabular-nums">{depot.currentUtilization.toLocaleString("vi-VN")}</span>
                <span className="text-base text-muted-foreground tracking-tight">/ {depot.capacity.toLocaleString("vi-VN")}</span>
              </div>
              <span className={cn("text-2xl font-bold tabular-nums tracking-tighter", pctColor)}>{pct}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full transition-all rounded-full", barColor)} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-sm tracking-tight">
              <span className="text-muted-foreground">Còn trống</span>
              <span className="font-semibold">{Math.max(0, depot.capacity - depot.currentUtilization).toLocaleString("vi-VN")}</span>
            </div>
          

          {/* ── Location ── */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xl font-bold tracking-tighter uppercase shrink-0">Vị trí</p>
            <div className="flex items-center gap-2">
              <MapPin size={15} weight="fill" className="text-red-500 shrink-0" />
              <p className="text-sm font-medium tracking-tight text-right">{depot.address}</p>
            </div>
          </div>

          <Separator />

          {/* ── Manager ── */}
          <div className="space-y-3">
            <p className="text-xl font-bold tracking-tighter uppercase">Quản lý kho</p>
            {depot.manager ? (
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircle size={26} weight="fill" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold tracking-tight">{depot.manager.lastName} {depot.manager.firstName}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {depot.manager.email && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tight">
                        <EnvelopeSimple size={12} className="shrink-0" />
                        <span className="truncate">{depot.manager.email}</span>
                      </p>
                    )}
                    {depot.manager.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tight">
                        <Phone size={12} className="shrink-0" />
                        {depot.manager.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserCircle size={26} className="text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground/60 tracking-tight">Chưa phân công quản lý</p>
              </div>
            )}
          </div>

          {/* <Separator /> */}

          {/* ── Last updated ── */}
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-medium tracking-tight">
            
            <span>Cập nhật lần cuối:</span>
            <span className="ml-auto font-medium text-foreground">{new Date(depot.lastUpdatedAt).toLocaleString("vi-VN")}</span>
          </div>

          {/* ── Actions ── */}
          {depot.status !== "Closed" ? (
            <>
              <Separator />
              <div className="space-y-2.5">
                {["Available", "Full", "PendingAssignment"].includes(depot.status) && (
                  <Button
                    variant="outline"
                    className="w-full h-10 gap-2 text-sm tracking-tight font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                    onClick={() => onInitiateClose(depot)}
                  >
                    <ProhibitInset size={15} />
                    Đóng kho
                  </Button>
                )}
                {depot.status === "Closing" && (
                  <>
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                      <WarningCircle size={16} className="text-red-500 shrink-0" weight="fill" />
                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 tracking-tight">Chờ xử lý tồn kho</p>
                        {knownClosureIds[depot.id] && (
                          <p className="text-sm text-red-500/80 tracking-tight">Closure #{knownClosureIds[depot.id]}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button className="h-10 gap-1.5 text-sm tracking-tight font-semibold" onClick={() => onResolve(depot)}>
                        <Scales size={15} />
                        Giải quyết
                      </Button>
                      <Button variant="outline" className="h-10 gap-1.5 text-sm tracking-tight font-semibold" onClick={() => onCancelClose(depot)}>
                        <X size={15} />
                        Hủy đóng
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full h-10 gap-2 text-sm tracking-tight font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                onClick={() => onCancelClose(depot)}
              >
                <ArrowClockwise size={15} />
                Mở lại kho
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Small util bar (used in table only) ─────────────────────── */

function UtilBar({ used, cap, className }: { used: number; cap: number; className?: string }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-red-500" : pct > 50 ? "bg-orange-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums shrink-0 w-9 text-right">{pct}%</span>
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
          <td className="py-3.5 px-4 hidden md:table-cell"><Skeleton className="h-4 w-44" /></td>
          <td className="py-3.5 px-4 hidden lg:table-cell"><Skeleton className="h-3 w-32" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
          <td className="py-3.5 px-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>
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
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter ">Kho hàng</th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter hidden md:table-cell">Địa chỉ</th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter hidden lg:table-cell">Tồn kho</th>
            <th className="py-3 px-4 text-left text-sm font-semibold tracking-tighter">Trạng thái</th>
            <th className="py-3 px-4 w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={skeletonRows} />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-16 text-center">
                <Warehouse size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground tracking-tight">{emptyText ?? "Không có dữ liệu"}</p>
              </td>
            </tr>
          ) : (
            items.map((depot) => {
              const cfg = statusCfg[depot.status] ?? { label: depot.status, color: "text-muted-foreground", bg: "bg-muted" };
              return (
                <tr
                  key={depot.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onDetail(depot)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tighter max-w-60">{depot.name}</p>
                        <p className="text-sm text-muted-foreground tracking-tight">Kho số {depot.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 hidden md:table-cell max-w-55">
                    <div className="flex items-start">
                      
                      <span className="text-sm tracking-tight line-clamp-2">{depot.address}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="space-y-1 w-36">
                      <UtilBar used={depot.currentUtilization} cap={depot.capacity} />
                      {/* <p className="text-sm text-muted-foreground tracking-tight">
                        {depot.currentUtilization}/{depot.capacity}
                      </p> */}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge variant="outline" className={cn("text-sm font-medium tracking-tight shrink-0", cfg.bg, cfg.color)}>
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
                      onClick={(e) => { e.stopPropagation(); onDetail(depot); }}
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
  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Detail sheet */
  const [detailDepot, setDetailDepot] = useState<DepotEntity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* Closure tracked IDs */
  const [knownClosureIds, setKnownClosureIds] = useState<Record<number, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* Initiate dialog */
  const [initiateTarget, setInitiateTarget] = useState<DepotEntity | null>(null);
  const [initiateReason, setInitiateReason] = useState("");

  /* Resolve dialog */
  const [resolveTarget, setResolveTarget] = useState<DepotEntity | null>(null);
  const [resolveClosureId, setResolveClosureId] = useState("");
  const [resolutionType, setResolutionType] = useState<"TransferToDepot" | "ExternalResolution">("TransferToDepot");
  const [targetDepotId, setTargetDepotId] = useState("");
  const [externalNote, setExternalNote] = useState("");

  /* Cancel dialog */
  const [cancelTarget, setCancelTarget] = useState<DepotEntity | null>(null);
  const [cancelClosureId, setCancelClosureId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  /* ── Data ── */
  // All depots (large fetch) for stats + closing tab
  const { data: allData, refetch: refetchAll } = useDepots({ params: { pageNumber: 1, pageSize: 200 } });
  // Paginated for main table
  const { data: tableData, isLoading, refetch: refetchTable } = useDepots({ params: { pageNumber: page, pageSize } });

  const { data: depotOptions = [] } = useDepotMetadata();
  const { data: statusMetadata } = useDepotStatuses();
  const { data: closureMeta } = useDepotClosureMetadata();
  const statusCfg = buildStatusCfg(statusMetadata);

  const initiateMutation = useInitiateDepotClosure();
  const resolveMutation = useResolveDepotClosure();
  const cancelMutation = useCancelDepotClosure();

  const allDepots = allData?.items ?? [];
  const closingDepots = allDepots.filter((d) => d.status === "Closing");
  const tableItems = tableData?.items ?? [];
  const totalCount = tableData?.totalCount ?? 0;
  const totalPages = tableData?.totalPages ?? 1;

  const resolutionTypes = closureMeta?.resolutionTypes ?? [
    { key: "TransferToDepot", value: "Chuyển toàn bộ hàng sang kho khác" },
    { key: "ExternalResolution", value: "Tự xử lý bên ngoài (admin ghi chú cách xử lý)" },
  ];

  /* Stats */
  const statsList = [
    { label: statusCfg["Available"]?.label         ?? STATUS_FALLBACK["Available"],         value: allDepots.filter((d) => d.status === "Available").length,         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", Icon: CheckCircle },
    { label: statusCfg["Full"]?.label              ?? STATUS_FALLBACK["Full"],              value: allDepots.filter((d) => d.status === "Full").length,              color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30",  Icon: Package },
    { label: statusCfg["PendingAssignment"]?.label ?? STATUS_FALLBACK["PendingAssignment"], value: allDepots.filter((d) => d.status === "PendingAssignment").length, color: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-50 dark:bg-sky-950/30",       Icon: WarningCircle },
    { label: statusCfg["UnderMaintenance"]?.label  ?? STATUS_FALLBACK["UnderMaintenance"],  value: allDepots.filter((d) => d.status === "UnderMaintenance").length,  color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", Icon: Spinner },
    { label: statusCfg["Closing"]?.label           ?? STATUS_FALLBACK["Closing"],           value: closingDepots.length,                                           color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/30",      Icon: ProhibitInset },
    { label: statusCfg["Closed"]?.label            ?? STATUS_FALLBACK["Closed"],            value: allDepots.filter((d) => d.status === "Closed").length,            color: "text-zinc-500 dark:text-zinc-400",   bg: "bg-zinc-50 dark:bg-zinc-950/30",    Icon: X },
  ];

  function openDetail(depot: DepotEntity) {
    setDetailDepot(depot);
    setDetailOpen(true);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([refetchAll(), refetchTable()]).finally(() => setIsRefreshing(false));
  }

  function changePageSize(val: string) {
    setPageSize(Number(val));
    setPage(1);
  }

  /* Handlers: Initiate */
  function openInitiateDialog(depot: DepotEntity) {
    setInitiateTarget(depot);
    setInitiateReason("");
  }

  function handleInitiate() {
    if (!initiateTarget || !initiateReason.trim()) return;
    initiateMutation.mutate(
      { id: initiateTarget.id, reason: initiateReason.trim() },
      {
        onSuccess: (res) => {
          if (res.closureId) {
            setKnownClosureIds((prev) => ({ ...prev, [initiateTarget.id]: res.closureId }));
            toast.success('Kho còn hàng — đã chuyển sang Đang đóng.');
          } else {
            toast.success("Kho trống — đã đóng thành công!");
          }
          setInitiateTarget(null);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Không thể khởi tạo đóng kho. Vui lòng thử lại.")),
      },
    );
  }

  /* Handlers: Resolve */
  function openResolveDialog(depot: DepotEntity) {
    setResolveTarget(depot);
    setResolveClosureId(String(knownClosureIds[depot.id] ?? ""));
    setResolutionType("TransferToDepot");
    setTargetDepotId("");
    setExternalNote("");
  }

  function handleResolve() {
    if (!resolveTarget) return;
    const closureId = knownClosureIds[resolveTarget.id] ?? Number(resolveClosureId);
    if (!closureId) return;
    resolveMutation.mutate(
      {
        id: resolveTarget.id, closureId, resolutionType,
        targetDepotId: resolutionType === "TransferToDepot" ? Number(targetDepotId) : undefined,
        externalNote: resolutionType === "ExternalResolution" ? externalNote.trim() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Đã xử lý tồn kho — kho sẽ được đóng chính thức.");
          setResolveTarget(null);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Giải quyết thất bại. Vui lòng thử lại.")),
      },
    );
  }

  /* Handlers: Cancel */
  function openCancelDialog(depot: DepotEntity) {
    setCancelTarget(depot);
    setCancelClosureId(String(knownClosureIds[depot.id] ?? ""));
    setCancelReason("");
  }

  function handleCancel() {
    if (!cancelTarget) return;
    const closureId = knownClosureIds[cancelTarget.id] ?? Number(cancelClosureId);
    if (!closureId) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, closureId, cancellationReason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.success("Đã hủy quy trình đóng kho.");
          setCancelTarget(null);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Hủy thất bại. Vui lòng thử lại.")),
      },
    );
  }

  /* ── Render ── */
  return (
    <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Warehouse size={22} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quản lý</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">Kho hàng</h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">Danh sách kho và luồng đóng kho</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-muted-foreground self-start sm:self-auto"
          >
            <ArrowClockwise size={15} className={isRefreshing ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {statsList.map(({ label, value, color, bg, Icon }) => (
            <Card key={label} className="border border-border/50">
              <CardContent className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm tracking-tight text-muted-foreground font-medium mb-0.5 truncate">{label}</p>
                    <p className="text-xl tracking-tighter font-bold text-foreground">
                      {!allData ? "—" : value}
                    </p>
                  </div>
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                    <Icon size={17} weight="fill" className={color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="all" onValueChange={() => setPage(1)}>
          <TabsList>
            <TabsTrigger value="all" className="text-sm tracking-tight">
              Tất cả kho
              {allData && (
                <span className="ml-1.5 text-sm bg-muted px-1.5 py-0.5 rounded-full">
                  {allData.totalCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="closing" className="text-sm tracking-tight">
              Đang đóng
              {closingDepots.length > 0 && (
                <span className="ml-1.5 text-sm bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                  {closingDepots.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: all ── */}
          <TabsContent value="all" className="mt-4">
            <Card className="border border-border/50 overflow-hidden py-0">
              <DepotTable
                items={tableItems}
                isLoading={isLoading}
                onDetail={openDetail}
                emptyText="Chưa có kho nào"
                skeletonRows={pageSize}
                statusCfg={statusCfg}
              />

              {/* ── Pagination footer ── */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tracking-tight">Hiển thị</span>
                  <Select value={String(pageSize)} onValueChange={changePageSize}>
                    <SelectTrigger className="h-8 w-16 text-sm tracking-tight">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-sm tracking-tight">{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground tracking-tight">
                    / {totalCount} kho
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tracking-tight">
                    Trang {page}/{totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline" size="sm" className="h-8 w-8 p-0"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <CaretLeft size={13} />
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-8 w-8 p-0"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <CaretRight size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── Tab: closing ── */}
          <TabsContent value="closing" className="mt-4">
            {closingDepots.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 mb-4">
                <WarningCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400 tracking-tight leading-relaxed">
                  Các kho bên dưới đang chờ xử lý tồn kho trước khi đóng chính thức.
                  Bấm <strong>xem chi tiết</strong> để chọn phương án <strong>Giải quyết</strong> hoặc{" "}
                  <strong>Hủy đóng</strong>.
                </p>
              </div>
            )}
            <Card className="border border-border/50 overflow-hidden py-0">
              <DepotTable
                items={closingDepots}
                isLoading={!allData}
                onDetail={openDetail}
                emptyText="Không có kho nào đang chờ xử lý đóng"
                skeletonRows={3}
                statusCfg={statusCfg}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═════════════════════════════════════
          Detail Sheet
      ═════════════════════════════════════ */}
      <DepotDetailSheet
        depot={detailDepot}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        knownClosureIds={knownClosureIds}
        onInitiateClose={openInitiateDialog}
        onResolve={openResolveDialog}
        onCancelClose={openCancelDialog}
        statusCfg={statusCfg}
      />

      {/* ═════════════════════════════════════
          Dialog: Initiate Closure
      ═════════════════════════════════════ */}
      <Dialog open={!!initiateTarget} onOpenChange={(o) => !o && setInitiateTarget(null)}>
        <DialogContent className="gap-2 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl tracking-tighter">
              Xác nhận đóng kho
            </DialogTitle>
            <DialogDescription className="tracking-tighter text-base">
              Kho: <span className="text-primary font-semibold">{initiateTarget?.name}</span>
              <br />
              <span className="text-black text-sm">(Nếu kho còn hàng, trạng thái sẽ chuyển sang <em>Đang đóng</em> và chờ admin xử lý tồn kho)</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {initiateTarget && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-muted-foreground" />
                  <span className="text-sm tracking-tight text-muted-foreground">Tồn kho hiện tại</span>
                </div>
                <span className="text-sm font-semibold tracking-tighter">
                  {initiateTarget.currentUtilization} / {initiateTarget.capacity}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="initiate-reason" className="text-smtracking-tight">
                Lý do đóng kho <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="initiate-reason"
                placeholder="Nhập lý do đóng kho..."
                value={initiateReason}
                onChange={(e) => setInitiateReason(e.target.value)}
                rows={3}
                className="text-sm tracking-tight resize-none mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="tracking-tight" onClick={() => setInitiateTarget(null)}>Hủy</Button>
            <Button
              variant="destructive"
              className="tracking-tight gap-1.5"
              disabled={!initiateReason.trim() || initiateMutation.isPending}
              onClick={handleInitiate}
            >
              {initiateMutation.isPending && <Spinner size={13} className="animate-spin" />}
              Xác nhận đóng kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════
          Dialog: Resolve Closure
      ═════════════════════════════════════ */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tighter">
              <Scales size={18} className="text-blue-500" />
              Xử lý tồn kho
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Kho: <strong>{resolveTarget?.name}</strong> — chọn phương án xử lý hàng trước khi đóng kho chính thức.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {!knownClosureIds[resolveTarget?.id ?? -1] ? (
              <div className="space-y-1.5">
                <Label htmlFor="resolve-cid" className="text-sm tracking-tight">
                  Closure ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="resolve-cid"
                  type="number"
                  placeholder="Nhập closureId từ bước khởi tạo..."
                  value={resolveClosureId}
                  onChange={(e) => setResolveClosureId(e.target.value)}
                  className="text-sm tracking-tight"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-sm text-muted-foreground tracking-tight">Closure ID</span>
                <span className="text-sm font-semibold tabular-nums tracking-tighter">
                  #{knownClosureIds[resolveTarget?.id ?? -1]}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm tracking-tight">
                Phương án xử lý <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2">
                {resolutionTypes.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setResolutionType(opt.key as typeof resolutionType)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                      resolutionType === opt.key
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/60 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", resolutionType === opt.key ? "bg-primary/10" : "bg-muted")}>
                      {opt.key === "TransferToDepot"
                        ? <ArrowsLeftRight size={16} className={resolutionType === opt.key ? "text-primary" : "text-muted-foreground"} />
                        : <Scales size={16} className={resolutionType === opt.key ? "text-primary" : "text-muted-foreground"} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{opt.value}</p>
                      <p className="text-sm text-muted-foreground tracking-tight mt-0.5">
                        {opt.key === "TransferToDepot" ? "Chuyển toàn bộ sang kho đích" : "Admin ghi lại cách xử lý bên ngoài"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {resolutionType === "TransferToDepot" && (
              <div className="space-y-1.5">
                <Label className="text-sm tracking-tight">
                  Kho nhận hàng <span className="text-red-500">*</span>
                </Label>
                <Select value={targetDepotId} onValueChange={setTargetDepotId}>
                  <SelectTrigger className="text-sm tracking-tight"><SelectValue placeholder="Chọn kho nhận hàng..." /></SelectTrigger>
                  <SelectContent>
                    {depotOptions.filter((d) => d.key !== resolveTarget?.id).map((d) => (
                      <SelectItem key={d.key} value={String(d.key)} className="text-sm tracking-tight">{d.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {resolutionType === "ExternalResolution" && (
              <div className="space-y-1.5">
                <Label htmlFor="ext-note" className="text-sm tracking-tight">
                  Ghi chú cách xử lý <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="ext-note"
                  placeholder="Mô tả cách xử lý tồn kho bên ngoài..."
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  rows={3}
                  className="text-sm tracking-tight resize-none"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="tracking-tight" onClick={() => setResolveTarget(null)}>Hủy</Button>
            <Button
              className="tracking-tight gap-1.5"
              disabled={
                resolveMutation.isPending ||
                (!knownClosureIds[resolveTarget?.id ?? -1] && !resolveClosureId) ||
                (resolutionType === "TransferToDepot" && !targetDepotId) ||
                (resolutionType === "ExternalResolution" && !externalNote.trim())
              }
              onClick={handleResolve}
            >
              {resolveMutation.isPending && <Spinner size={13} className="animate-spin" />}
              Xác nhận xử lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════
          Dialog: Cancel Closure
      ═════════════════════════════════════ */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tighter">
              <X size={18} className="text-amber-500" />
              Hủy đóng kho
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Kho: <strong>{cancelTarget?.name}</strong>
              <br />
              Kho sẽ quay về trạng thái <strong>Available</strong> hoặc <strong>Full</strong> tùy lượng tồn kho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {!knownClosureIds[cancelTarget?.id ?? -1] ? (
              <div className="space-y-1.5">
                <Label htmlFor="cancel-cid" className="text-sm tracking-tight">
                  Closure ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cancel-cid"
                  type="number"
                  placeholder="Nhập closureId từ bước khởi tạo..."
                  value={cancelClosureId}
                  onChange={(e) => setCancelClosureId(e.target.value)}
                  className="text-sm tracking-tight"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-sm text-muted-foreground tracking-tight">Closure ID</span>
                <span className="text-sm font-semibold tabular-nums tracking-tighter">
                  #{knownClosureIds[cancelTarget?.id ?? -1]}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-sm tracking-tight">
                Lý do hủy <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Nhập lý do hủy quy trình đóng kho..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="text-sm tracking-tight resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="tracking-tight" onClick={() => setCancelTarget(null)}>Đóng</Button>
            <Button
              className="tracking-tight gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={
                cancelMutation.isPending ||
                (!knownClosureIds[cancelTarget?.id ?? -1] && !cancelClosureId) ||
                !cancelReason.trim()
              }
              onClick={handleCancel}
            >
              {cancelMutation.isPending && <Spinner size={13} className="animate-spin" />}
              Xác nhận hủy đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
