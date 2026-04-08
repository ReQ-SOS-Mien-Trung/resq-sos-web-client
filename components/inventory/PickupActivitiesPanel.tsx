"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowsClockwise,
  ClipboardText,
  Clock,
  CheckCircle,
  X,
  Package,
  Users,
  CalendarBlank,
  ArrowDown,
  Warning,
  Shield,
  Flag,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  ArrowsDownUp,
  DotsSixVertical,
} from "@phosphor-icons/react";
import {
  useMyDepotUpcomingPickups,
  useMyDepotPickupHistory,
} from "@/services/inventory/hooks";
import type {
  UpcomingPickupEntity,
  PickupHistoryEntity,
} from "@/services/inventory/type";

// ── Constants ─────────────────────────────────────────────────────────────────

type TabType = "upcoming" | "history";

const MIN_PANEL_HEIGHT = 260;
const DEFAULT_PANEL_HEIGHT = 560;

const PRIORITY_MAP: Record<
  string,
  { label: string; cls: string; dot: string; icon: React.ReactNode }
> = {
  Critical: {
    label: "Khẩn cấp",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
    dot: "bg-red-500",
    icon: <Shield className="h-3 w-3" weight="fill" />,
  },
  High: {
    label: "Cao",
    cls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
    dot: "bg-orange-500",
    icon: <Warning className="h-3 w-3" weight="fill" />,
  },
  Medium: {
    label: "Trung bình",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: <Flag className="h-3 w-3" weight="fill" />,
  },
  Low: {
    label: "Thấp",
    cls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400",
    dot: "bg-green-500",
    icon: <ArrowDown className="h-3 w-3" weight="bold" />,
  },
};

const MISSION_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Active: {
    label: "Đang hoạt động",
    cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  },
  Pending: {
    label: "Chờ xử lý",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-700 border-red-200" },
  InProgress: {
    label: "Đang tiến hành",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

const ACTIVITY_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Pending: {
    label: "Chờ lấy hàng",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Assigned: {
    label: "Đã phân công",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
  InProgress: {
    label: "Đang thực hiện",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  Completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  Cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-700 border-red-200" },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_MAP[priority] ?? {
    label: priority,
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    icon: null,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
        cfg.cls,
      )}
    >
      {cfg.icon}
      {priority}
    </span>
  );
}

function StatusBadge({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; cls: string }>;
}) {
  const cfg = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
        cfg.cls,
      )}
    >
      {status}
    </span>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/40">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ── Sort ─────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | null;

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  currentDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 group hover:text-foreground transition-colors whitespace-nowrap"
    >
      <span>{label}</span>
      {isActive && currentDir === "asc" ? (
        <CaretUp className="h-3 w-3 text-primary shrink-0" weight="fill" />
      ) : isActive && currentDir === "desc" ? (
        <CaretDown className="h-3 w-3 text-primary shrink-0" weight="fill" />
      ) : (
        <ArrowsDownUp className="h-3 w-3 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground/70 transition-colors" />
      )}
    </button>
  );
}

// ── DatePickerButton ──────────────────────────────────────────────────────────

function DatePickerButton({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-36 justify-start text-sm tracking-tighter font-normal gap-2",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── InfoCard ──────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200/60 dark:border-blue-800/40",
    bar: "bg-blue-500",
    icon: "text-blue-500",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200/60 dark:border-violet-800/40",
    bar: "bg-violet-500",
    icon: "text-violet-500",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    bar: "bg-emerald-500",
    icon: "text-emerald-500",
  },
} as const;

function InfoCard({
  title,
  color,
  icon,
  children,
}: {
  title: string;
  color: keyof typeof COLOR_MAP;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-2.5 relative overflow-hidden",
        c.bg,
        c.border,
      )}
    >
      <div
        className={cn("absolute left-0 inset-y-0 w-1 rounded-l-xl", c.bar)}
      />
      <div className={cn("flex items-center gap-1.5 pl-2", c.icon)}>
        {icon}
        <span className="text-xl font-bold tracking-tight">{title}</span>
      </div>
      <div className="space-y-2 pl-2">{children}</div>
    </div>
  );
}

function InfoKV({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-muted-foreground tracking-tighter shrink-0 pt-px">
        {label}
      </span>
      <span
        className={cn(
          "text-sm tracking-tighter text-right",
          bold ? "font-semibold" : "font-medium",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: UpcomingPickupEntity | PickupHistoryEntity | null;
  open: boolean;
  onClose: () => void;
  mode: TabType;
}

function DetailPanel({ item, open, onClose, mode }: DetailPanelProps) {
  const isHistory = mode === "history";
  const hist = isHistory ? (item as PickupHistoryEntity) : null;

  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragStartY.current = e.clientY;
      dragStartHeight.current = panelHeight;
      isDragging.current = true;

      const maxH =
        typeof window !== "undefined" ? window.innerHeight * 0.93 : 900;

      const onMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const delta = dragStartY.current - ev.clientY; // up = positive = expand
        const next = Math.max(
          MIN_PANEL_HEIGHT,
          Math.min(maxH, dragStartHeight.current + delta),
        );
        setPanelHeight(next);
      };
      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [panelHeight],
  );

  if (!item) return null;

  const priorityCfg = PRIORITY_MAP[item.priority] ?? {
    dot: "bg-gray-400",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    label: item.priority,
    icon: null,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            className="fixed inset-0 bg-black/25 backdrop-blur-[1.5px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/60 shadow-2xl rounded-t-2xl flex flex-col"
            style={{ height: panelHeight }}
            initial={{ y: DEFAULT_PANEL_HEIGHT + 80 }}
            animate={{ y: 0 }}
            exit={{ y: DEFAULT_PANEL_HEIGHT + 80 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 34,
              mass: 0.85,
            }}
          >
            {/* ── Drag Handle ─────────────────────────────────────────────── */}
            <div
              className="flex flex-col items-center pt-2.5 pb-1 shrink-0 cursor-ns-resize select-none group touch-none"
              onPointerDown={handlePointerDown}
            >
              <div className="h-1.5 w-14 rounded-full bg-border group-hover:bg-primary/50 group-active:bg-primary/70 transition-colors duration-150" />
              <span className="text-xs text-muted-foreground/80 mt-1 group-hover:text-muted-foreground/70 transition-colors flex items-center gap-0.5 tracking-tighter">
                <DotsSixVertical className="h-3 w-3" />
                kéo để thay đổi kích cỡ
              </span>
            </div>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pb-1 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    priorityCfg.dot,
                  )}
                />
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap">
                    <span className="font-bold text-xl tracking-tighter">
                      {item.activityCode}
                    </span>
                  </div>
                  <p className="text-sm tracking-tighter mt-0.5">
                    Loại: {item.activityType} · Hoạt động số{" "}
                    <strong>{item.activityId}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={item.priority} />
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
                {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button> */}
              </div>
            </div>

            {/* ── Scrollable Body ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-5 space-y-5">
                {/* 3-column info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoCard
                    title="Thông tin nhiệm vụ"
                    color="blue"
                    icon={<Shield className="h-3.5 w-3.5" weight="fill" />}
                  >
                    <InfoKV label="Loại nhiệm vụ" value={item.missionType} />
                    <InfoKV
                      label="Trạng thái"
                      value={
                        <StatusBadge
                          status={item.missionStatus}
                          map={MISSION_STATUS_MAP}
                        />
                      }
                    />
                    <InfoKV
                      label="Bắt đầu"
                      value={formatDate(item.missionStartTime)}
                    />
                    <InfoKV
                      label="Dự kiến kết thúc"
                      value={formatDate(item.missionExpectedEndTime)}
                    />
                  </InfoCard>

                  <InfoCard
                    title="Chi tiết hoạt động"
                    color="violet"
                    icon={
                      <ClipboardText className="h-3.5 w-3.5" weight="fill" />
                    }
                  >
                    <InfoKV
                      label="Mã hoạt động"
                      value={item.activityCode}
                      mono
                    />
                    <InfoKV label="Loại hoạt động" value={item.activityType} />
                    <InfoKV
                      label="Thời gian ước tính"
                      value={formatDuration(item.estimatedTime)}
                    />
                    {item.description && (
                      <div className="pt-1.5 border-t border-border/30">
                        <p className="text-sm font-medium leading-relaxed tracking-tighter">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </InfoCard>

                  <InfoCard
                    title="Đội cứu hộ"
                    color="emerald"
                    icon={<Users className="h-3.5 w-3.5" weight="fill" />}
                  >
                    <InfoKV
                      label="Tên đội"
                      value={
                        <span className="font-semibold tracking-tighter">
                          {item.rescueTeamName}
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            ({item.teamType})
                          </span>
                        </span>
                      }
                    />
                    <InfoKV
                      label="Phân công lúc"
                      value={formatDate(item.assignedAt)}
                    />
                    {isHistory && hist && (
                      <>
                        <InfoKV
                          label="Hoàn thành lúc"
                          value={formatDate(hist.completedAt)}
                        />
                        <InfoKV
                          label="Thực hiện bởi"
                          value={hist.completedByName || "—"}
                          bold
                        />
                      </>
                    )}
                  </InfoCard>
                </div>

                {/* Items grid */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                      <Package
                        className="h-5 w-5 text-orange-500"
                        weight="fill"
                      />
                    </div>
                    <span className="text-xl font-semibold tracking-tight">
                      Vật tư cần lấy
                    </span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold px-1.5 dark:bg-orange-950/50 dark:text-orange-400">
                      {item.items.length}
                    </span>
                  </div>
                  {item.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground tracking-tighter py-2">
                      Không có vật tư
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
                      {item.items.map((it, idx) => (
                        <motion.div
                          key={it.itemId}
                          className="rounded-xl border border-border/60 bg-muted/30 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 transition-colors px-3 py-3 flex flex-col gap-1.5"
                          initial={{ opacity: 0, scale: 0.93 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: 0.04 + idx * 0.03,
                            type: "spring",
                            stiffness: 260,
                            damping: 22,
                          }}
                        >
                          <span className="text-sm font-semibold tracking-tighter line-clamp-2 leading-snug">
                            {it.itemName}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lgs font-bold text-primary tabular-nums">
                              {it.quantity.toLocaleString("vi-VN")}
                            </span>
                            <span className="text-sm text-muted-foreground tracking-tighter">
                              {it.unit}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Upcoming Table ────────────────────────────────────────────────────────────

function UpcomingTable({
  items,
  onSelect,
  selectedId,
}: {
  items: UpcomingPickupEntity[];
  onSelect: (i: UpcomingPickupEntity) => void;
  selectedId: number | null;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return items;
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "activityCode":
          cmp = a.activityCode.localeCompare(b.activityCode);
          break;
        case "rescueTeamName":
          cmp = (a.rescueTeamName ?? "").localeCompare(b.rescueTeamName ?? "");
          break;
        case "missionType":
          cmp = (a.missionType ?? "").localeCompare(b.missionType ?? "");
          break;
        case "priority":
          cmp =
            (PRIORITY_ORDER[a.priority] ?? 0) -
            (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "itemCount":
          cmp = a.items.length - b.items.length;
          break;
        case "missionStartTime":
          cmp =
            new Date(a.missionStartTime ?? 0).getTime() -
            new Date(b.missionStartTime ?? 0).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Clock className="h-10 w-10 opacity-40" />
        </motion.div>
        <p className="text-sm tracking-tighter">Không có hoạt động sắp tới</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tracking-tighter min-w-180">
        <thead>
          <tr className="bg-muted/40 border-b border-border/50 text-left">
            {(
              [
                ["activityCode", "Mã hoạt động"],
                ["rescueTeamName", "Đội cứu hộ"],
                ["missionType", "Loại nhiệm vụ"],
                ["priority", "Mức độ ưu tiên"],
                ["status", "Trạng thái"],
                ["itemCount", "Vật tư"],
                ["missionStartTime", "Thời gian bắt đầu"],
              ] as [string, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="px-4 py-3 font-semibold text-sm tracking-tighter"
              >
                <SortableHeader
                  label={label}
                  sortKey={key}
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => (
            <motion.tr
              key={item.activityId}
              className={cn(
                "border-b border-border/40 cursor-pointer transition-all hover:bg-primary/5",
                selectedId === item.activityId &&
                  "bg-primary/5 border-l-2 border-l-primary",
              )}
              onClick={() => onSelect(item)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <span className="font-semibold">{item.activityCode}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 pl-4 tracking-tighter">
                  Bước {item.step} · #{item.missionId}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex font-semibold text-base items-center">
                  <span>
                    {item.rescueTeamName}{" "}
                    <span className="text-sm font-normal italic">
                      ({item.teamType})
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm tracking-tighter">
                {item.missionType}
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Package
                    className="h-3.5 w-3.5 text-orange-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-medium">{item.items.length} mục</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5 tracking-tighter">
                    {item.items
                      .slice(0, 2)
                      .map((i) => i.itemName)
                      .join(", ")}
                    {item.items.length > 2 && "…"}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-1.5">
                  <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(item.missionStartTime)}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

function HistoryTable({
  items,
  onSelect,
  selectedId,
}: {
  items: PickupHistoryEntity[];
  onSelect: (i: PickupHistoryEntity) => void;
  selectedId: number | null;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return items;
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "activityCode":
          cmp = a.activityCode.localeCompare(b.activityCode);
          break;
        case "rescueTeamName":
          cmp = (a.rescueTeamName ?? "").localeCompare(b.rescueTeamName ?? "");
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "priority":
          cmp =
            (PRIORITY_ORDER[a.priority] ?? 0) -
            (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "itemCount":
          cmp = a.items.length - b.items.length;
          break;
        case "completedByName":
          cmp = (a.completedByName ?? "").localeCompare(
            b.completedByName ?? "",
          );
          break;
        case "completedAt":
          cmp =
            new Date(a.completedAt ?? 0).getTime() -
            new Date(b.completedAt ?? 0).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <CheckCircle className="h-10 w-10 opacity-40" />
        </motion.div>
        <p className="text-sm tracking-tighter">Chưa có lịch sử lấy hàng</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tracking-tighter min-w-180">
        <thead>
          <tr className="bg-muted/40 border-b border-border/50 text-left">
            {(
              [
                ["activityCode", "Mã hoạt động"],
                ["rescueTeamName", "Đội cứu hộ"],
                ["status", "Trạng thái"],
                ["priority", "Mức độ ưu tiên"],
                ["itemCount", "Vật tư đã giao"],
                ["completedByName", "Thực hiện bởi"],
                ["completedAt", "Hoàn thành lúc"],
              ] as [string, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="px-4 py-3 font-semibold text-sm tracking-tighter"
              >
                <SortableHeader
                  label={label}
                  sortKey={key}
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => (
            <motion.tr
              key={item.activityId}
              className={cn(
                "border-b border-border/40 cursor-pointer transition-all hover:bg-primary/5",
                selectedId === item.activityId &&
                  "bg-primary/5 border-l-2 border-l-primary",
              )}
              onClick={() => onSelect(item)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle
                    className="h-3.5 w-3.5 text-emerald-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-semibold">{item.activityCode}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 tracking-tighter">
                  Nhiệm vụ số {item.missionId}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">
                    {item.rescueTeamName}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({item.teamType})
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Package
                    className="h-3.5 w-3.5 text-orange-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-medium">{item.items.length} mục</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-tighter">
                    {item.items
                      .slice(0, 2)
                      .map((i) => i.itemName)
                      .join(", ")}
                    {item.items.length > 2 && "…"}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-sm tracking-tighter">
                {item.completedByName || "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-1.5">
                  {formatDate(item.completedAt)}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  totalCount,
  isFetching,
  onPrev,
  onNext,
  onRefetch,
  label,
}: {
  page: number;
  totalPages?: number;
  totalCount?: number;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRefetch: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-2">
      <p className="text-xs text-muted-foreground tracking-tighter">
        Trang {page}
        {totalPages ? ` / ${totalPages}` : ""}
        {totalCount !== undefined ? ` · ${totalCount} ${label}` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          disabled={page <= 1 || isFetching}
          onClick={onPrev}
        >
          <CaretLeft className="h-3.5 w-3.5" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          disabled={page >= (totalPages ?? 1) || isFetching}
          onClick={onNext}
        >
          Sau
          <CaretRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={isFetching}
          onClick={onRefetch}
        >
          <ArrowsClockwise
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PickupActivitiesPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // History date filter — staged (user edits) vs applied (query param)
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [selectedItem, setSelectedItem] = useState<
    UpcomingPickupEntity | PickupHistoryEntity | null
  >(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: upcomingData,
    isLoading: isUpcomingLoading,
    isFetching: isUpcomingFetching,
    refetch: refetchUpcoming,
  } = useMyDepotUpcomingPickups(
    { pageNumber: upcomingPage, pageSize: 15 },
    { refetchInterval: 30_000 },
  );

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useMyDepotPickupHistory(
    {
      pageNumber: historyPage,
      pageSize: 15,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
    },
    { refetchInterval: 60_000 },
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectUpcoming = useCallback(
    (item: UpcomingPickupEntity) => {
      if (selectedItem?.activityId === item.activityId && panelOpen) {
        setPanelOpen(false);
        return;
      }
      setSelectedItem(item);
      setPanelOpen(true);
    },
    [selectedItem, panelOpen],
  );

  const handleSelectHistory = useCallback(
    (item: PickupHistoryEntity) => {
      if (selectedItem?.activityId === item.activityId && panelOpen) {
        setPanelOpen(false);
        return;
      }
      setSelectedItem(item);
      setPanelOpen(true);
    },
    [selectedItem, panelOpen],
  );

  const handleClose = useCallback(() => setPanelOpen(false), []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setPanelOpen(false);
    setSelectedItem(null);
  }, []);

  const handleApplyFilter = useCallback(() => {
    setAppliedFrom(fromDate ? format(fromDate, "yyyy-MM-dd") : "");
    setAppliedTo(toDate ? format(toDate, "yyyy-MM-dd") : "");
    setHistoryPage(1);
    setPanelOpen(false);
  }, [fromDate, toDate]);

  const handleClearFilter = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedFrom("");
    setAppliedTo("");
    setHistoryPage(1);
  }, []);

  const hasActiveFilter = !!(appliedFrom || appliedTo);
  const isLoading =
    activeTab === "upcoming" ? isUpcomingLoading : isHistoryLoading;

  return (
    <div className="space-y-0">
      {/* Tab + Date Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-muted/40 self-start shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("upcoming")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tighter transition-all duration-200",
              activeTab === "upcoming"
                ? "bg-background shadow-sm text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            <Clock
              className={cn(
                "h-4 w-4",
                activeTab === "upcoming"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              weight={activeTab === "upcoming" ? "fill" : "regular"}
            />
            Sắp tới
            {(upcomingData?.totalCount ?? 0) > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-1.5 dark:bg-blue-950/60 dark:text-blue-400">
                {upcomingData!.totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tighter transition-all duration-200",
              activeTab === "history"
                ? "bg-background shadow-sm text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            <CheckCircle
              className={cn(
                "h-4 w-4",
                activeTab === "history"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              weight={activeTab === "history" ? "fill" : "regular"}
            />
            Lịch sử
            {(historyData?.totalCount ?? 0) > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 dark:bg-emerald-950/60 dark:text-emerald-400">
                {historyData!.totalCount}
              </span>
            )}
          </button>
        </div>

        {/* Date filter — slides in when history tab active */}
        <AnimatePresence>
          {activeTab === "history" && (
            <motion.div
              key="filter"
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  Từ
                </span>
                <DatePickerButton
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="Chọn ngày"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  Đến
                </span>
                <DatePickerButton
                  value={toDate}
                  onChange={setToDate}
                  placeholder="Chọn ngày"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-sm tracking-tighter"
                onClick={handleApplyFilter}
                disabled={!fromDate && !toDate}
              >
                Lọc
              </Button>
              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground gap-1"
                  onClick={handleClearFilter}
                >
                  <X className="h-3.5 w-3.5" />
                  Xóa lọc
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />
        {/* <p className="text-xs text-muted-foreground tracking-tighter hidden sm:block self-center">
          Nhấn vào hàng để xem chi tiết
        </p> */}
      </div>

      {/* Applied filter badges */}
      <AnimatePresence>
        {activeTab === "history" && hasActiveFilter && (
          <motion.div
            key="filter-badges"
            className="flex items-center gap-2 mb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-xs text-muted-foreground">Đang lọc:</span>
            {appliedFrom && (
              <span className="inline-flex items-center text-xs tracking-tighter bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                Từ {new Date(appliedFrom).toLocaleDateString("vi-VN")}
              </span>
            )}
            {appliedTo && (
              <span className="inline-flex items-center text-xs tracking-tighter bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                Đến {new Date(appliedTo).toLocaleDateString("vi-VN")}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Card className="border-border/60 py-0 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <table className="w-full">
                    <tbody>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "upcoming" ? (
                <UpcomingTable
                  items={upcomingData?.items ?? []}
                  onSelect={handleSelectUpcoming}
                  selectedId={
                    panelOpen ? (selectedItem?.activityId ?? null) : null
                  }
                />
              ) : (
                <HistoryTable
                  items={historyData?.items ?? []}
                  onSelect={handleSelectHistory}
                  selectedId={
                    panelOpen ? (selectedItem?.activityId ?? null) : null
                  }
                />
              )}

              <div className="px-4 pb-4">
                {activeTab === "upcoming" ? (
                  <Pagination
                    page={upcomingPage}
                    totalPages={upcomingData?.totalPages}
                    totalCount={upcomingData?.totalCount}
                    isFetching={isUpcomingFetching}
                    onPrev={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                    onNext={() => setUpcomingPage((p) => p + 1)}
                    onRefetch={() => refetchUpcoming()}
                    label="hoạt động"
                  />
                ) : (
                  <Pagination
                    page={historyPage}
                    totalPages={historyData?.totalPages}
                    totalCount={historyData?.totalCount}
                    isFetching={isHistoryFetching}
                    onPrev={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    onNext={() => setHistoryPage((p) => p + 1)}
                    onRefetch={() => refetchHistory()}
                    label="lượt lấy hàng"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Detail Panel */}
      <DetailPanel
        item={selectedItem}
        open={panelOpen}
        onClose={handleClose}
        mode={activeTab}
      />
    </div>
  );
}
