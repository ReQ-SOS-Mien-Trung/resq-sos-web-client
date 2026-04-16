"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  MapPin,
  UsersThree,
  Crown,
  ShieldCheck,
  FirstAidKit,
  Truck,
  User,
  Clock,
  ArrowsOut,
  ArrowsIn,
  X,
} from "@phosphor-icons/react";
import { useAssemblyPointById } from "@/services/assembly_points";
import { useRescueTeamStatuses } from "@/services/rescue_teams/hooks";
import type {
  AssemblyPointStatusMetadata,
  AssemblyPointTeam,
  AssemblyPointTeamMember,
  AssemblyPointTeamType,
} from "@/services/assembly_points";
import type { RescueTeamStatusOption } from "@/services/rescue_teams/type";
import {
  buildAssemblyPointStatusConfig,
  getAssemblyPointStatusConfig,
} from "@/components/admin/assembly-points/status-config";

function formatLastUpdated(date: string | null) {
  if (!date) return "Chưa cập nhật";
  return new Date(date).toLocaleString("vi-VN");
}

function formatStatusActor(actor: string | null) {
  return actor?.trim() || "Không có dữ liệu";
}

const teamTypeConfig: Record<
  AssemblyPointTeamType,
  { label: string; icon: React.ReactNode; class: string }
> = {
  Rescue: {
    label: "Cứu hộ",
    icon: <ShieldCheck size={14} weight="fill" />,
    class: "text-blue-600 bg-blue-50",
  },
  Medical: {
    label: "Y tế",
    icon: <FirstAidKit size={14} weight="fill" />,
    class: "text-emerald-600 bg-emerald-50",
  },
  Transportation: {
    label: "Vận chuyển",
    icon: <Truck size={14} weight="fill" />,
    class: "text-orange-600 bg-orange-50",
  },
};

const rescueTeamStatusFallbackLabels: Record<string, string> = {
  AwaitingAcceptance: "Chờ xác nhận",
  Ready: "Sẵn sàng",
  Gathering: "Đang tập hợp",
  Available: "Sẵn sàng nhiệm vụ",
  Assigned: "Đã được phân công",
  OnMission: "Đang làm nhiệm vụ",
  Stuck: "Gặp sự cố",
  Unavailable: "Không khả dụng",
  Disbanded: "Đã giải tán",
};

const rescueTeamStatusTextColors: Record<string, string> = {
  awaitingacceptance: "text-amber-600",
  ready: "text-emerald-600",
  gathering: "text-blue-600",
  available: "text-teal-600",
  assigned: "text-indigo-600",
  onmission: "text-violet-600",
  stuck: "text-rose-600",
  unavailable: "text-slate-600",
  disbanded: "text-zinc-600",
};

function normalizeRescueTeamStatusKey(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

function buildRescueTeamStatusLabelMap(
  options?: RescueTeamStatusOption[],
): Map<string, string> {
  const labels = new Map<string, string>();

  for (const option of options ?? []) {
    const normalizedKey = normalizeRescueTeamStatusKey(option.key);
    const configuredLabel =
      typeof option.value === "string" ? option.value.trim() : "";

    if (normalizedKey && configuredLabel) {
      labels.set(normalizedKey, configuredLabel);
    }
  }

  return labels;
}

function getRescueTeamStatusMeta(
  status: string | null | undefined,
  configuredLabels?: ReadonlyMap<string, string>,
): { label: string; className: string } {
  const normalizedStatus = normalizeRescueTeamStatusKey(status);
  const configuredLabel = normalizedStatus
    ? configuredLabels?.get(normalizedStatus)
    : undefined;
  const fallbackLabel = status ? rescueTeamStatusFallbackLabels[status] : undefined;

  return {
    label: configuredLabel || fallbackLabel || status || "Chưa rõ",
    className: normalizedStatus
      ? (rescueTeamStatusTextColors[normalizedStatus] ?? "text-muted-foreground")
      : "text-muted-foreground",
  };
}

/* ── Cursor-following member tooltip (flips when near edges) ── */

const TOOLTIP_GAP = 14;
const DEFAULT_PANEL_WIDTH = 448;

function MemberFloatingTooltip({
  members,
  mouseX,
  mouseY,
}: {
  members: AssemblyPointTeamMember[];
  mouseX: number;
  mouseY: number;
}) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = mouseX + TOOLTIP_GAP;
      let y = mouseY + TOOLTIP_GAP;

      // Flip left if overflows right
      if (x + width > vw - 8) x = mouseX - width - TOOLTIP_GAP;
      // Flip up if overflows bottom
      if (y + height > vh - 8) y = mouseY - height - TOOLTIP_GAP;

      // Clamp to viewport
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    },
    [mouseX, mouseY],
  );

  const content =
    members.length === 0 ? (
      <p className="text-sm text-muted-foreground tracking-tight">
        Chưa có thành viên
      </p>
    ) : (
      <>
        <p className="text-sm font-semibold text-foreground tracking-tighter mb-2">
          Thành viên ({members.length})
        </p>
        <div className="space-y-1.5 max-w-56">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <Avatar className="h-6 w-6 text-xs">
                <AvatarFallback
                  className={cn(m.isLeader && "bg-amber-100 text-amber-800")}
                >
                  {m.lastName?.[0]}
                  {m.firstName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm tracking-tight flex-1 truncate">
                {m.lastName} {m.firstName}
              </span>
              {m.isLeader && (
                <Crown
                  size={13}
                  weight="fill"
                  className="text-amber-500 shrink-0"
                />
              )}
              {m.status === "Pending" && (
                <span className="text-xs text-amber-600 font-medium tracking-tight">
                  Chờ
                </span>
              )}
            </div>
          ))}
        </div>
      </>
    );

  return (
    <div
      ref={ref}
      className="fixed z-9999 pointer-events-none rounded-lg border bg-popover px-3 py-2.5 shadow-xl"
      style={{ left: mouseX + TOOLTIP_GAP, top: mouseY + TOOLTIP_GAP }}
    >
      {content}
    </div>
  );
}

/* ── Team card with cursor-following tooltip ── */

function TeamCard({
  team,
  compact = false,
  statusLabels,
}: {
  team: AssemblyPointTeam;
  compact?: boolean;
  statusLabels?: ReadonlyMap<string, string>;
}) {
  const typeConf = teamTypeConfig[team.teamType] ?? teamTypeConfig.Rescue;
  const accepted = team.members.filter((m) => m.status === "Accepted").length;
  const teamStatusMeta = useMemo(
    () => getRescueTeamStatusMeta(team.status, statusLabels),
    [statusLabels, team.status],
  );

  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => setMouse({ x: e.clientX, y: e.clientY }),
    [],
  );

  return (
    <>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.7 }}
        className={cn(
          "rounded-xl border border-border/60 bg-background cursor-default hover:border-primary/30 hover:shadow-sm transition-all",
          compact ? "p-3" : "p-3.5",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Header */}
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2",
            compact ? "mb-1.5" : "mb-2",
          )}
        >
          <div className="flex min-w-0 items-start gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                typeConf.class,
              )}
            >
              {typeConf.icon}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold tracking-tighter whitespace-normal break-words leading-tight",
                  compact ? "text-[15px]" : "text-base",
                )}
              >
                {team.name}
              </p>
              <p className="text-xs text-muted-foreground tracking-tight font-mono">
                {team.code}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-auto min-h-7 shrink-0 self-start px-2 py-1 text-center text-xs leading-tight whitespace-normal break-words",
              compact ? "max-w-[7.75rem]" : "max-w-[9rem]",
              teamStatusMeta.className,
            )}
          >
            {teamStatusMeta.label}
          </Badge>
        </div>

        {/* Info */}
        <div
          className={cn(
            "flex items-center justify-between text-muted-foreground tracking-tight",
            compact ? "text-[13px]" : "text-sm",
          )}
        >
          <span className="flex items-center gap-1">
            <UsersThree size={12} />
            {accepted}/{team.maxMembers} thành viên
          </span>
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                typeConf.class.split(" ")[0],
              )}
            />
            {typeConf.label}
          </span>
        </div>

        {/* Leader row */}
        {team.members
          .filter((m) => m.isLeader)
          .map((leader) => (
            <div
              key={leader.userId}
              className={cn(
                "flex items-center gap-1.5 tracking-tight",
                compact ? "mt-1.5 text-[13px]" : "mt-2 text-sm",
              )}
            >
              <Crown
                size={12}
                weight="fill"
                className="text-amber-500 shrink-0"
              />
              <span className="text-foreground font-medium truncate">
                {leader.lastName} {leader.firstName}
              </span>
              <span className="text-muted-foreground">· Đội trưởng</span>
            </div>
          ))}
      </motion.div>

      {/* Cursor-following tooltip — portal to body to escape Sheet contain/transform */}
      {hovered &&
        createPortal(
          <MemberFloatingTooltip
            members={team.members}
            mouseX={mouse.x}
            mouseY={mouse.y}
          />,
          document.body,
        )}
    </>
  );
}

/* ── Main Panel ── */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointId: number | null;
  /** Called when panel layout changes — parent can adjust page offset */
  onPanelChange?: (state: {
    open: boolean;
    isFullscreen: boolean;
    dockedWidth: number;
  }) => void;
  statusMetadata?: AssemblyPointStatusMetadata[];
}

export function AssemblyPointDetailSheet({
  open,
  onOpenChange,
  pointId,
  onPanelChange,
  statusMetadata,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading } = useAssemblyPointById(pointId ?? 0, {
    enabled: open && pointId !== null,
  });
  const { data: rescueTeamStatusOptions } = useRescueTeamStatuses({
    enabled: open,
  });

  const statusConfig = useMemo(
    () => buildAssemblyPointStatusConfig(statusMetadata),
    [statusMetadata],
  );
  const rescueTeamStatusLabels = useMemo(
    () => buildRescueTeamStatusLabelMap(rescueTeamStatusOptions),
    [rescueTeamStatusOptions],
  );
  const st = data ? getAssemblyPointStatusConfig(data.status, statusConfig) : null;
  const resolvedPanelWidth = isFullscreen ? "100vw" : DEFAULT_PANEL_WIDTH;

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) {
        setIsFullscreen(false);
      }
      onOpenChange(val);
    },
    [onOpenChange],
  );

  useEffect(() => {
    onPanelChange?.({
      open,
      isFullscreen,
      dockedWidth: open && !isFullscreen ? DEFAULT_PANEL_WIDTH : 0,
    });
  }, [isFullscreen, onPanelChange, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenChange, open]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <div className="fixed inset-0 z-101 pointer-events-none">
          <motion.div
            key={pointId ?? "empty"}
            initial={{
              x: "100%",
              width: resolvedPanelWidth,
              borderTopLeftRadius: isFullscreen ? 0 : 16,
              borderBottomLeftRadius: isFullscreen ? 0 : 16,
            }}
            animate={{
              x: 0,
              width: resolvedPanelWidth,
              borderTopLeftRadius: isFullscreen ? 0 : 16,
              borderBottomLeftRadius: isFullscreen ? 0 : 16,
            }}
            exit={{
              x: "100%",
              width: resolvedPanelWidth,
              borderTopLeftRadius: isFullscreen ? 0 : 16,
              borderBottomLeftRadius: isFullscreen ? 0 : 16,
            }}
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32, mass: 0.82 },
              width: {
                type: "spring",
                stiffness: 220,
                damping: 30,
                mass: 0.95,
              },
              borderTopLeftRadius: {
                duration: isFullscreen ? 0.16 : 0.24,
                ease: [0.22, 1, 0.36, 1],
              },
              borderBottomLeftRadius: {
                duration: isFullscreen ? 0.16 : 0.24,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            className={cn(
              "absolute top-0 right-0 flex h-dvh flex-col overflow-hidden bg-background shadow-2xl pointer-events-auto",
              isFullscreen ? "border-0" : "border-l",
            )}
            style={{ transformOrigin: "right center" }}
          >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setIsFullscreen((prev) => !prev)}
            >
              {isFullscreen ? (
                <ArrowsIn size={16} weight="bold" />
              ) : (
                <ArrowsOut size={16} weight="bold" />
              )}
              <span className="sr-only">
                {isFullscreen ? "Thu gọn panel" : "Mở rộng toàn màn hình"}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => handleOpenChange(false)}
            >
              <X size={16} weight="bold" />
              <span className="sr-only">Đóng</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.8 }}
              className="space-y-5"
            >
              <SheetHeader className="pb-4 pr-24 border-b mb-4">
                <SheetTitle className="tracking-tighter font-bold mb-0 text-xl">
                  Chi tiết điểm tập kết
                </SheetTitle>
                <SheetDescription className="tracking-tight text-sm">
                  Xem thông tin và danh sách đội tại điểm tập kết
                </SheetDescription>
              </SheetHeader>

              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              )}

              {data && (
                <div className="space-y-5">
                  {/* Header info */}
                  <motion.div layout className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold tracking-tighter">
                          {data.name}
                        </h3>
                        <p className="text-sm text-muted-foreground font-regular tracking-tight">
                          {data.code}
                        </p>
                      </div>
                      {st && (
                        <Badge
                          variant="outline"
                          className={cn("text-sm", st.className)}
                        >
                          {st.label}
                        </Badge>
                      )}
                    </div>

                    {/* Meta cards */}
                    <motion.div
                      layout
                      className={cn(
                        "mt-3 grid gap-2",
                        isFullscreen ? "grid-cols-3" : "grid-cols-2",
                      )}
                    >
                      <motion.div layout className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                          <MapPin size={11} />
                          Tọa độ
                        </p>
                        <p className="text-sm font-semibold tracking-tight">
                          {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}
                        </p>
                      </motion.div>
                      <motion.div layout className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                          <UsersThree size={11} />
                          Sức chứa
                        </p>
                        <p className="text-sm font-semibold tracking-tight">
                          {data.teams.length}/{data.maxCapacity} người
                        </p>
                      </motion.div>
                      <motion.div
                        layout
                        className={cn(
                          "rounded-lg border border-border/60 bg-muted/20 p-2.5",
                          !isFullscreen && "col-span-full",
                        )}
                      >
                        <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                          <Clock size={11} />
                          Cập nhật lần cuối
                        </p>
                        <p className="text-sm tracking-tight">
                          {formatLastUpdated(data.lastUpdatedAt)}
                        </p>
                      </motion.div>
                      {data.statusReason?.trim() && (
                        <motion.div layout className="col-span-full rounded-lg border border-border/60 bg-muted/20 p-2.5">
                          <p className="text-xs text-muted-foreground tracking-tight mb-1">
                            Lý do trạng thái
                          </p>
                          <p className="text-sm tracking-tight">
                            {data.statusReason.trim()}
                          </p>
                        </motion.div>
                      )}
                      {data.statusChangedAt && (
                        <motion.div
                          layout
                          className={cn(
                            "rounded-lg border border-border/60 bg-muted/20 p-2.5",
                            !data.statusChangedBy && "col-span-full",
                            data.statusChangedBy && isFullscreen && "col-span-2",
                          )}
                        >
                          <p className="text-xs text-muted-foreground tracking-tight mb-1">
                            Đổi trạng thái lúc
                          </p>
                          <p className="text-sm tracking-tight">
                            {formatLastUpdated(data.statusChangedAt)}
                          </p>
                        </motion.div>
                      )}
                      {data.statusChangedBy?.trim() && (
                        <motion.div
                          layout
                          className={cn(
                            "rounded-lg border border-border/60 bg-muted/20 p-2.5",
                            !data.statusChangedAt && "col-span-full",
                            data.statusChangedAt && isFullscreen && "col-span-2",
                          )}
                        >
                          <p className="text-xs text-muted-foreground tracking-tight mb-1">
                            Đổi trạng thái bởi
                          </p>
                          <p className="text-sm tracking-tight break-all">
                            {formatStatusActor(data.statusChangedBy)}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>

                  {/* Teams */}
                  <motion.div layout>
                    <h4 className="text-base font-semibold tracking-tighter mb-3 flex items-center gap-1.5">
                      <UsersThree size={15} className="text-primary" />
                      Danh sách đội ({data.teams.length})
                    </h4>

                    {data.teams.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
                        <User
                          size={28}
                          className="mx-auto text-muted-foreground/40 mb-2"
                        />
                        <p className="text-sm text-muted-foreground tracking-tight">
                          Chưa có đội nào tại điểm tập kết này
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        layout
                        className={cn(
                          isFullscreen
                            ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
                            : "space-y-2",
                        )}
                      >
                        {data.teams.map((team) => (
                          <TeamCard
                            key={team.id}
                            team={team}
                            compact={isFullscreen}
                            statusLabels={rescueTeamStatusLabels}
                          />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
