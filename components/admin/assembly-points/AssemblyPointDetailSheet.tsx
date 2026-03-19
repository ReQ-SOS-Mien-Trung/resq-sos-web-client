"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
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
} from "@phosphor-icons/react";
import { useAssemblyPointById } from "@/services/assembly_points";
import type {
  AssemblyPointTeam,
  AssemblyPointTeamMember,
  AssemblyPointTeamType,
  AssemblyPointTeamStatus,
  AssemblyPointStatus,
} from "@/services/assembly_points";

/* ── Status configs ── */

const statusConfig: Record<
  AssemblyPointStatus,
  { label: string; class: string }
> = {
  Active: {
    label: "Hoạt động",
    class: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  Overloaded: {
    label: "Quá tải",
    class: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  Unavailable: {
    label: "Không khả dụng",
    class: "bg-red-500/10 text-red-700 border-red-200",
  },
};

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

const teamStatusLabels: Record<AssemblyPointTeamStatus, string> = {
  AwaitingAcceptance: "Chờ chấp nhận",
  Ready: "Sẵn sàng",
  Gathering: "Đang tập hợp",
};

const teamStatusColors: Record<AssemblyPointTeamStatus, string> = {
  AwaitingAcceptance: "text-amber-600",
  Ready: "text-emerald-600",
  Gathering: "text-blue-600",
};

/* ── Cursor-following member tooltip (flips when near edges) ── */

const TOOLTIP_GAP = 14;

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
        <p className="text-[13px] font-semibold text-foreground tracking-tight mb-2">
          Thành viên ({members.length})
        </p>
        <div className="space-y-1.5 max-w-56">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <Avatar className="h-5 w-5 text-[11px]">
                <AvatarFallback
                  className={cn(
                    m.isLeader && "bg-amber-100 text-amber-800",
                  )}
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

function TeamCard({ team }: { team: AssemblyPointTeam }) {
  const typeConf = teamTypeConfig[team.teamType] ?? teamTypeConfig.Rescue;
  const accepted = team.members.filter((m) => m.status === "Accepted").length;

  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => setMouse({ x: e.clientX, y: e.clientY }),
    [],
  );

  return (
    <>
      <div
        className="rounded-xl border border-border/60 bg-background p-3 cursor-default hover:border-primary/30 hover:shadow-sm transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                typeConf.class,
              )}
            >
              {typeConf.icon}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tighter truncate">
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
              "text-xs shrink-0",
              teamStatusColors[team.status],
            )}
          >
            {teamStatusLabels[team.status] ?? team.status}
          </Badge>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground tracking-tight">
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
              className="mt-2 flex items-center gap-1.5 text-sm tracking-tight"
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
      </div>

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
  /** Called when open state changes — parent adjusts margin-right */
  onPanelChange?: (open: boolean) => void;
}

export function AssemblyPointDetailSheet({
  open,
  onOpenChange,
  pointId,
  onPanelChange,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useAssemblyPointById(pointId ?? 0, {
    enabled: open && pointId !== null,
  });

  const st = data ? statusConfig[data.status] : null;

  const handleOpenChange = useCallback(
    (val: boolean) => {
      onOpenChange(val);
      onPanelChange?.(val);
    },
    [onOpenChange, onPanelChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        ref={sheetRef}
        side="right"
        showOverlay={false}
        className="w-full sm:max-w-md h-dvh overflow-y-auto p-6"
      >
        <SheetHeader className="pb-4 border-b mb-4">
          <SheetTitle className="tracking-tighter text-xl">
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
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold tracking-tighter">
                    {data.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono tracking-tight">
                    {data.code}
                  </p>
                </div>
                {st && (
                  <Badge variant="outline" className={cn("text-sm", st.class)}>
                    {st.label}
                  </Badge>
                )}
              </div>

              {/* Meta cards */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                    <MapPin size={11} />
                    Tọa độ
                  </p>
                  <p className="text-sm font-mono tracking-tight">
                    {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                    <UsersThree size={11} />
                    Sức chứa
                  </p>
                  <p className="text-sm font-semibold tracking-tight">
                    {data.teams.length}/{data.maxCapacity} người
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight flex items-center gap-1 mb-1">
                    <Clock size={11} />
                    Cập nhật lần cuối
                  </p>
                  <p className="text-sm tracking-tight">
                    {new Date(data.lastUpdatedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>

            {/* Teams */}
            <div>
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
                  <p className="text-base text-muted-foreground tracking-tight">
                    Chưa có đội nào tại điểm tập kết này
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
