"use client";

import { useMemo } from "react";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  MapPin,
  Factory,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  Package,
  ChartBar,
  NavigationArrow,
  ShareNetwork,
  BookmarkSimple,
  DotsThree,
  Users,
  Hash,
  Info,
} from "@phosphor-icons/react";
import { LocationDetailsPanelProps } from "@/type";
import { depotStatusConfig, assemblyPointStatusConfig } from "@/lib/constants";

// Panel width
const PANEL_WIDTH = 380;

function formatLastUpdated(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const LocationDetailsPanel = ({
  open,
  onOpenChange,
  location,
}: LocationDetailsPanelProps) => {
  if (!location && !open) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 h-full z-[1000] transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
      <div className="h-full bg-background border-r shadow-2xl flex flex-col">
        {location?.type === "depot" ? (
          <DepotDetails
            depot={location.data}
            onClose={() => onOpenChange(false)}
          />
        ) : location?.type === "assemblyPoint" ? (
          <AssemblyPointDetails
            assemblyPoint={location.data}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </div>
    </div>
  );
};

// ════════════════════════════════
// Depot Details
// ════════════════════════════════
function DepotDetails({
  depot,
  onClose,
}: {
  depot: DepotEntity;
  onClose: () => void;
}) {
  const statusConfig = depotStatusConfig[depot.status];
  const StatusIcon = statusConfig.icon;

  const utilizationPercent = useMemo(() => {
    if (depot.capacity === 0) return 0;
    return Math.min(
      100,
      Math.round((depot.currentUtilization / depot.capacity) * 100),
    );
  }, [depot.currentUtilization, depot.capacity]);

  const utilizationColor =
    utilizationPercent >= 90
      ? "bg-red-500"
      : utilizationPercent >= 70
        ? "bg-orange-500"
        : utilizationPercent >= 40
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div className="h-36 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden">
          {/* Abstract warehouse pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-lg" />
            <div className="absolute top-8 left-24 w-12 h-12 border-2 border-white rounded-lg" />
            <div className="absolute bottom-4 right-8 w-20 h-14 border-2 border-white rounded-lg" />
            <div className="absolute bottom-8 right-32 w-10 h-10 border-2 border-white rounded-lg" />
          </div>

          {/* Main icon */}
          <div className="absolute bottom-4 left-5 flex items-end gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Factory className="h-7 w-7 text-white" weight="fill" />
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 pt-4 pb-3 border-b shrink-0">
        <h3 className="text-lg font-bold leading-tight">{depot.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{depot.address}</p>

        {/* Rating-like status row */}
        <div className="flex items-center gap-2 mt-3">
          <Badge
            className={cn(
              "gap-1.5 px-2.5 py-1",
              statusConfig.bgColor,
              statusConfig.textColor,
              "border-0",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" weight="fill" />
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">Kho vật tư</span>
        </div>
      </div>

      {/* Quick Actions - Google Maps style */}
      <div className="px-5 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <ActionButton
            icon={<NavigationArrow className="h-5 w-5" weight="fill" />}
            label="Chỉ đường"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<BookmarkSimple className="h-5 w-5" />}
            label="Lưu"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<ShareNetwork className="h-5 w-5" />}
            label="Chia sẻ"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<DotsThree className="h-5 w-5" weight="bold" />}
            label="Thêm"
            color="text-blue-600 dark:text-blue-400"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Capacity & Utilization */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-sm">Sức chứa</div>
                <div className="text-xs text-muted-foreground">
                  {depot.currentUtilization} / {depot.capacity} đơn vị
                </div>
              </div>
            </div>

            {/* Utilization bar */}
            <div className="ml-8">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  Mức sử dụng
                </span>
                <span className="text-xs font-semibold">
                  {utilizationPercent}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    utilizationColor,
                  )}
                  style={{ width: `${utilizationPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Address */}
          <InfoRow
            icon={<MapPin className="h-5 w-5" />}
            primary={depot.address}
          />

          <div className="h-px bg-border mx-5" />

          <div className="h-px bg-border mx-5" />

          {/* Manager Info */}
          {depot.manager ? (
            <>
              <InfoRow
                icon={<User className="h-5 w-5" />}
                primary={depot.manager.fullName}
                secondary="Quản lý kho"
              />

              <div className="h-px bg-border mx-5" />

              <InfoRow
                icon={<Phone className="h-5 w-5" />}
                primary={depot.manager.phone}
                secondary="Số điện thoại"
                isLink
              />

              {depot.manager.email && (
                <>
                  <div className="h-px bg-border mx-5" />
                  <InfoRow
                    icon={<EnvelopeSimple className="h-5 w-5" />}
                    primary={depot.manager.email}
                    secondary="Email"
                    isLink
                  />
                </>
              )}
            </>
          ) : (
            <>
              <InfoRow
                icon={<User className="h-5 w-5" />}
                primary="Chưa có quản lý"
                secondary="Quản lý kho"
                isMuted
              />
            </>
          )}

          <div className="h-px bg-border mx-5" />

          {/* Last Updated */}
          <InfoRow
            icon={<Clock className="h-5 w-5" />}
            primary={formatLastUpdated(depot.lastUpdatedAt)}
            secondary="Cập nhật lần cuối"
          />

          {/* Additional Info Section */}
          <div className="h-2 bg-muted/50" />

          <div className="px-5 py-4">
            <h4 className="text-sm font-semibold mb-3">Thông tin bổ sung</h4>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="ID"
                value={`#${depot.id}`}
                icon={<Hash className="h-4 w-4" />}
              />
              <StatCard
                label="Tình trạng"
                value={statusConfig.label}
                icon={<StatusIcon className="h-4 w-4" />}
                statusColor={statusConfig.textColor}
              />
              <StatCard
                label="Sức chứa"
                value={`${depot.capacity}`}
                icon={<Package className="h-4 w-4" />}
              />
              <StatCard
                label="Đang dùng"
                value={`${depot.currentUtilization}`}
                icon={<ChartBar className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
}

// ════════════════════════════════
// Assembly Point Details
// ════════════════════════════════
function AssemblyPointDetails({
  assemblyPoint,
  onClose,
}: {
  assemblyPoint: AssemblyPointEntity;
  onClose: () => void;
}) {
  const statusConfig = assemblyPointStatusConfig[assemblyPoint.status];
  const StatusIcon = statusConfig.icon;

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div className="h-36 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-700 relative overflow-hidden">
          {/* Abstract pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 left-6 w-8 h-8 rounded-full border-2 border-white" />
            <div className="absolute top-3 left-20 w-6 h-6 rounded-full border-2 border-white" />
            <div className="absolute bottom-6 left-12 w-10 h-10 rounded-full border-2 border-white" />
            <div className="absolute top-10 right-10 w-12 h-12 rounded-full border-2 border-white" />
            <div className="absolute bottom-4 right-20 w-7 h-7 rounded-full border-2 border-white" />
          </div>

          {/* Main icon */}
          <div className="absolute bottom-4 left-5 flex items-end gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <MapPin className="h-7 w-7 text-white" weight="fill" />
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 pt-4 pb-3 border-b shrink-0">
        <h3 className="text-lg font-bold leading-tight">
          {assemblyPoint.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mã: {assemblyPoint.code}
        </p>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-3">
          <Badge
            className={cn(
              "gap-1.5 px-2.5 py-1",
              statusConfig.bgColor,
              statusConfig.textColor,
              "border-0",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" weight="fill" />
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">Điểm tập kết</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <ActionButton
            icon={<NavigationArrow className="h-5 w-5" weight="fill" />}
            label="Chỉ đường"
            color="text-purple-600 dark:text-purple-400"
          />
          <ActionButton
            icon={<BookmarkSimple className="h-5 w-5" />}
            label="Lưu"
            color="text-purple-600 dark:text-purple-400"
          />
          <ActionButton
            icon={<ShareNetwork className="h-5 w-5" />}
            label="Chia sẻ"
            color="text-purple-600 dark:text-purple-400"
          />
          <ActionButton
            icon={<DotsThree className="h-5 w-5" weight="bold" />}
            label="Thêm"
            color="text-purple-600 dark:text-purple-400"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Code */}
          <InfoRow
            icon={<Hash className="h-5 w-5" />}
            primary={assemblyPoint.code}
            secondary="Mã điểm tập kết"
          />

          <div className="h-px bg-border mx-5" />

          {/* Capacity */}
          <InfoRow
            icon={<Users className="h-5 w-5" />}
            primary={`${assemblyPoint.capacityTeams} đội`}
            secondary="Sức chứa đội cứu hộ"
          />

          <div className="h-px bg-border mx-5" />

          {/* Last Updated */}
          <InfoRow
            icon={<Clock className="h-5 w-5" />}
            primary={formatLastUpdated(assemblyPoint.lastUpdatedAt)}
            secondary="Cập nhật lần cuối"
          />

          {/* Additional Info */}
          <div className="h-2 bg-muted/50" />

          <div className="px-5 py-4">
            <h4 className="text-sm font-semibold mb-3">Thông tin bổ sung</h4>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="ID"
                value={`#${assemblyPoint.id}`}
                icon={<Hash className="h-4 w-4" />}
              />
              <StatCard
                label="Tình trạng"
                value={statusConfig.label}
                icon={<StatusIcon className="h-4 w-4" />}
                statusColor={statusConfig.textColor}
              />
              <StatCard
                label="Sức chứa"
                value={`${assemblyPoint.capacityTeams} đội`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="Mã"
                value={assemblyPoint.code}
                icon={<Info className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
}

// ════════════════════════════════
// Shared Components
// ════════════════════════════════

function ActionButton({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button className="flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors group">
      <div
        className={cn(
          "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-105",
          color,
          "border-current",
        )}
      >
        {icon}
      </div>
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </button>
  );
}

function InfoRow({
  icon,
  primary,
  secondary,
  isLink,
  isMuted,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  isLink?: boolean;
  isMuted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors cursor-default">
      <div className="text-muted-foreground shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm truncate",
            isLink && "text-blue-600 dark:text-blue-400",
            isMuted && "text-muted-foreground italic",
          )}
        >
          {primary}
        </div>
        {secondary && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  statusColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  statusColor?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-sm font-bold", statusColor)}>{value}</div>
    </div>
  );
}

export default LocationDetailsPanel;
