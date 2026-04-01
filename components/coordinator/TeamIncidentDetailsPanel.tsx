"use client";

import { useMemo } from "react";
import { TeamIncidentDetailsPanelProps } from "@/type";
import { useTeamIncidentsByMission } from "@/services/team_incidents/hooks";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  EnvelopeSimple,
  MapPin,
  Phone,
  ShieldWarning,
  User,
  X,
} from "@phosphor-icons/react";

const PANEL_WIDTH = 420;

function formatDateTime(value: string): string {
  if (Number.isNaN(Date.parse(value))) return value;
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getIncidentReporterName(
  reportedBy: TeamIncidentEntity["reportedBy"],
): string {
  if (!reportedBy) return "Chưa rõ người báo cáo";
  if (typeof reportedBy === "string") return reportedBy;

  const fullName = [reportedBy.firstName, reportedBy.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    fullName || reportedBy.phone || reportedBy.email || "Chưa rõ người báo cáo"
  );
}

function getIncidentReporterPhone(
  reportedBy: TeamIncidentEntity["reportedBy"],
): string | null {
  if (!reportedBy || typeof reportedBy === "string") return null;
  return reportedBy.phone;
}

function getIncidentReporterEmail(
  reportedBy: TeamIncidentEntity["reportedBy"],
): string | null {
  if (!reportedBy || typeof reportedBy === "string") return null;
  return reportedBy.email;
}

function statusMeta(status: string): { label: string; className: string } {
  if (status === "Reported") {
    return {
      label: "Đã báo cáo",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300",
    };
  }

  if (status === "Acknowledged") {
    return {
      label: "Đã tiếp nhận",
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/30 dark:text-orange-300",
    };
  }

  if (status === "Resolved") {
    return {
      label: "Đã xử lý",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }

  return {
    label: status,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/30 dark:text-slate-300",
  };
}

const TeamIncidentDetailsPanel = ({
  open,
  onOpenChange,
  incident,
}: TeamIncidentDetailsPanelProps) => {
  if (!incident && !open) return null;

  const missionId = incident?.missionTeamId ?? 0;

  const {
    data: missionIncidentsData,
    isLoading,
    isError,
  } = useTeamIncidentsByMission(missionId, {
    enabled: open && !!incident,
  });

  const missionIncidents = useMemo(() => {
    const items = missionIncidentsData?.incidents ?? [];
    return [...items].sort((a, b) => {
      const timeA = Date.parse(a.reportedAt);
      const timeB = Date.parse(b.reportedAt);
      if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) return 0;
      return timeB - timeA;
    });
  }, [missionIncidentsData]);

  const activeIncident =
    missionIncidents.find((item) => item.incidentId === incident?.incidentId) ||
    incident;

  if (!incident || !activeIncident) {
    return (
      <div
        className={cn(
          "absolute top-0 right-0 h-full z-1000 transition-all duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ width: PANEL_WIDTH }}
      />
    );
  }

  const currentStatus = statusMeta(activeIncident.status);
  const reporterName = getIncidentReporterName(activeIncident.reportedBy);
  const reporterPhone = getIncidentReporterPhone(activeIncident.reportedBy);
  const reporterEmail = getIncidentReporterEmail(activeIncident.reportedBy);

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full z-1000 transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
      <div className="h-full bg-background border-l shadow-2xl flex flex-col">
        <div className="p-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShieldWarning className="h-5 w-5 text-red-500" weight="fill" />
                Sự cố đội cứu hộ
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chi tiết sự cố nhiệm vụ #{missionId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Mã sự cố</p>
              <p className="text-sm font-semibold mt-1">
                #{activeIncident.incidentId}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Đội</p>
              <p className="text-sm font-semibold mt-1">
                #{activeIncident.missionTeamId}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Cùng nhiệm vụ</p>
              <p className="text-sm font-semibold mt-1">
                {missionIncidentsData?.incidents?.length ?? 0} sự cố
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Sự cố hiện tại</h4>
                <Badge
                  variant="outline"
                  className={cn("text-xs", currentStatus.className)}
                >
                  {currentStatus.label}
                </Badge>
              </div>

              <p className="text-sm leading-relaxed text-foreground">
                {activeIncident.description}
              </p>

              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDateTime(activeIncident.reportedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{reporterName}</span>
                </div>
                {reporterPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{reporterPhone}</span>
                  </div>
                )}
                {reporterEmail && (
                  <div className="flex items-center gap-1.5">
                    <EnvelopeSimple className="h-3.5 w-3.5" />
                    <span className="break-all">{reporterEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {activeIncident.latitude.toFixed(5)},{" "}
                    {activeIncident.longitude.toFixed(5)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h4 className="text-sm font-semibold mb-3">
                Dòng sự cố cùng nhiệm vụ
              </h4>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              ) : isError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300">
                  Không tải được chi tiết sự cố theo mission.
                </div>
              ) : missionIncidents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Không có dữ liệu sự cố trong nhiệm vụ này.
                </p>
              ) : (
                <div className="space-y-2">
                  {missionIncidents.map((item) => {
                    const meta = statusMeta(item.status);
                    const isActive =
                      item.incidentId === activeIncident.incidentId;
                    const itemReporterName = getIncidentReporterName(
                      item.reportedBy,
                    );
                    const itemReporterPhone = getIncidentReporterPhone(
                      item.reportedBy,
                    );

                    return (
                      <div
                        key={item.incidentId}
                        className={cn(
                          "rounded-md border px-3 py-2.5",
                          isActive
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/70 bg-background",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            Sự cố #{item.incidentId}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", meta.className)}
                          >
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatDateTime(item.reportedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Người báo: {itemReporterName}
                          {itemReporterPhone ? ` • ${itemReporterPhone}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TeamIncidentDetailsPanel;
