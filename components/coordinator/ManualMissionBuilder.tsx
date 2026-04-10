"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useDeferredValue,
} from "react";
import type { AxiosError } from "axios";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { activityTypeConfig, depotStatusConfig } from "@/lib/constants";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS } from "@/lib/priority";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  DotsSixVertical,
  Trash,
  Plus,
  MapPin,
  Rocket,
  TreeStructure,
  ListChecks,
  Package,
  Storefront,
  UsersThree,
  Lightning,
  CircleNotch,
  Warning,
  PencilSimpleLine,
  CopySimple,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Buildings,
  Compass,
  Info,
  Clock,
  Phone,
} from "@phosphor-icons/react";
import type { SOSRequest } from "@/type";
import type { SOSClusterEntity } from "@/services/sos_cluster/type";
import type { ClusterActivityType } from "@/services/sos_cluster/type";
import {
  useCreateMission,
  useMission,
  useMissionActivities,
  useUpdateMission,
  useUpdateActivity,
  useCreateActivity,
} from "@/services/mission/hooks";
import { useRescueTeamsByCluster } from "@/services/rescue_teams/hooks";
import { useDepotInventory } from "@/services/inventory/hooks";
import { useDepotsByCluster } from "@/services/depot";
import type { DepotByClusterEntity, DepotStatus } from "@/services/depot";
import type { MissionActivity, MissionType } from "@/services/mission/type";

// ── Types ──

interface ManualActivity {
  id: string;
  activityType: ClusterActivityType;
  description: string;
  target: string;
  items: string;
  targetLatitude: number;
  targetLongitude: number;
  rescueTeamId: number | null;
  depotId: number | null;
  depotName: string | null;
  depotAddress: string | null;
  suppliesToCollect: ManualSupplyItem[];
  isAutoReturnStep?: boolean;
}

interface ManualSupplyItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
  sourceDepotId: number | null;
  sourceDepotName: string | null;
  sourceDepotAddress: string | null;
}

interface ManualTeamOption {
  id: number;
  name: string;
  teamType: string;
  assemblyPointName: string | null;
  status: string | null;
  distanceKm?: number | null;
}

interface ManualInventoryDragPayload {
  itemId: number;
  itemName: string;
  unit: string;
  sourceDepotId: number;
  sourceDepotName: string;
  sourceDepotAddress: string | null;
  availableQuantity: number;
}

interface ManualMissionBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: number | null;
  cluster: SOSClusterEntity | null;
  clusterSOSRequests: SOSRequest[];
  onCreated: () => void;
  /** When provided, load an existing mission for viewing/editing */
  existingMissionId?: number | null;
}

// ── Activity type palette items ──

const ACTIVITY_TYPES: ClusterActivityType[] = [
  "ASSESS",
  "RESCUE",
  "MEDICAL_AID",
  "EVACUATE",
  "DELIVER_SUPPLIES",
  "COLLECT_SUPPLIES",
  "RETURN_SUPPLIES",
  "MIXED",
];

const PALETTE_PREFIX = "palette-";
const TIMELINE_PREFIX = "timeline-";
const DROPPABLE_ID = "timeline-drop-zone";
const MANUAL_INVENTORY_MIME = "application/manual-inventory-item";
const CLEAR_ACTIVITY_TEAM_VALUE = "__clear_manual_activity_team__";

const SUPPLY_ACTIVITY_TYPES = new Set<ClusterActivityType>([
  "COLLECT_SUPPLIES",
  "DELIVER_SUPPLIES",
  "RETURN_SUPPLIES",
]);

const AUTO_RETURN_TRIGGER_TYPES = new Set<ClusterActivityType>([
  "COLLECT_SUPPLIES",
]);

const AUTO_RETURN_STEP_DESCRIPTION =
  "Trả vật phẩm còn lại về kho sau khi hoàn tất nhiệm vụ.";
const AUTO_RETURN_TARGET_FALLBACK = "Kho tiếp nhận vật phẩm";

function isSupplyActivityType(activityType: string): boolean {
  return SUPPLY_ACTIVITY_TYPES.has(activityType as ClusterActivityType);
}

function getSupplyStepTitle(activityType: string): string {
  if (activityType === "DELIVER_SUPPLIES") {
    return "Vật phẩm cần bàn giao ở bước này";
  }

  if (activityType === "RETURN_SUPPLIES") {
    return "Vật phẩm cần hoàn trả ở bước này";
  }

  return "Vật phẩm cần thu gom ở bước này";
}

function buildSupplySummary(supplies: ManualSupplyItem[]): string {
  if (!supplies.length) return "";

  return supplies
    .map((item) => `${item.itemName} x${item.quantity} ${item.unit}`.trim())
    .join(", ");
}

function hasRenderableCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (Math.abs(lat) > 0.000001 || Math.abs(lng) > 0.000001)
  );
}

function mergeCollectedSuppliesForAutoReturn(
  activities: ManualActivity[],
): ManualSupplyItem[] {
  const merged = new Map<string, ManualSupplyItem>();

  activities.forEach((activity) => {
    if (!AUTO_RETURN_TRIGGER_TYPES.has(activity.activityType)) {
      return;
    }

    activity.suppliesToCollect.forEach((supply) => {
      const key = `${supply.itemId}-${supply.sourceDepotId ?? "no-depot"}`;
      const existing = merged.get(key);

      if (existing) {
        merged.set(key, {
          ...existing,
          quantity: existing.quantity + Math.max(1, supply.quantity),
        });
        return;
      }

      merged.set(key, {
        ...supply,
        quantity: Math.max(1, supply.quantity),
      });
    });
  });

  return Array.from(merged.values());
}

function toValidRescueTeamId(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const apiMessage = axiosError?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function formatDistanceKmLabel(distanceKm?: number | null): string {
  if (!Number.isFinite(distanceKm)) {
    return "Chưa có khoảng cách";
  }

  return `${distanceKm!.toFixed(1)} km`;
}

function formatManualTeamType(teamType?: string | null): string {
  switch ((teamType ?? "").trim().toUpperCase()) {
    case "RESCUE":
      return "Cứu hộ";
    case "MEDICAL":
      return "Y tế";
    case "TRANSPORTATION":
    case "LOGISTICS":
      return "Hậu cần";
    case "MIXED":
      return "Hỗn hợp";
    default:
      return teamType?.trim() || "Chưa rõ";
  }
}

function getTeamStatusMeta(status?: string | null) {
  switch ((status ?? "").trim()) {
    case "AwaitingAcceptance":
      return {
        label: "Chờ xác nhận",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "Ready":
    case "Available":
      return {
        label: "Sẵn sàng",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "Gathering":
      return {
        label: "Đang tập hợp",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "Assigned":
    case "OnMission":
      return {
        label: "Đang triển khai",
        className: "border-indigo-200 bg-indigo-50 text-indigo-800",
      };
    default:
      return {
        label: status?.trim() || "Chưa rõ",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

function getDepotStatusMeta(status?: string | null) {
  const normalizedStatus = (status ?? "").trim() as DepotStatus;

  if (normalizedStatus in depotStatusConfig) {
    const config =
      depotStatusConfig[normalizedStatus as keyof typeof depotStatusConfig];

    return {
      label: config.label,
      className: `${config.bgColor} ${config.textColor} border-transparent`,
    };
  }

  switch (normalizedStatus) {
    case "Closing":
      return {
        label: "Đang đóng",
        className:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      };
    case "UnderMaintenance":
      return {
        label: "Bảo trì",
        className:
          "border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      };
    default:
      return {
        label: status?.trim() || "Chưa rõ",
        className:
          "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
      };
  }
}

function getDepotUtilizationPercent(
  currentUtilization?: number | null,
  capacity?: number | null,
) {
  if (!Number.isFinite(currentUtilization) || !Number.isFinite(capacity)) {
    return 0;
  }

  if ((capacity ?? 0) <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(((currentUtilization ?? 0) / (capacity ?? 1)) * 100),
    ),
  );
}

function formatSOSStatusLabel(status?: string | null): string {
  switch ((status ?? "").trim().toUpperCase()) {
    case "ASSIGNED":
      return "Đã phân công";
    case "RESCUED":
      return "Đã cứu hộ";
    case "PENDING":
    default:
      return "Chờ xử lý";
  }
}

function getSOSStatusClassName(status?: string | null): string {
  switch ((status ?? "").trim().toUpperCase()) {
    case "ASSIGNED":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-sky-300";
    case "RESCUED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300";
  }
}

function humanizeSOSValue(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSOSTypeLabel(sosType?: string | null): string {
  const normalized = (sosType ?? "").trim().toLowerCase();

  if (normalized.includes("rescue")) return "Cứu hộ";
  if (normalized.includes("relief") || normalized.includes("support")) {
    return "Cứu trợ";
  }
  if (normalized.includes("medical")) return "Y tế";
  if (normalized.includes("evac")) return "Sơ tán";

  return humanizeSOSValue(sosType) ?? "Chưa rõ";
}

function getSOSPeopleTotal(sos: SOSRequest): number | null {
  if (!sos.peopleCount) return null;
  return (
    (sos.peopleCount.adult ?? 0) +
    (sos.peopleCount.child ?? 0) +
    (sos.peopleCount.elderly ?? 0)
  );
}

function formatSOSWaitTime(waitTimeMinutes?: number | null): string | null {
  if (!Number.isFinite(waitTimeMinutes)) return null;

  const totalMinutes = Math.max(0, Math.round(waitTimeMinutes ?? 0));
  if (totalMinutes >= 1440) {
    return `${Math.floor(totalMinutes / 1440)} ngày`;
  }
  if (totalMinutes >= 60) {
    return `${Math.max(1, Math.floor(totalMinutes / 60))} giờ`;
  }
  return `${Math.max(1, totalMinutes)} phút`;
}

function getSOSNeedBadges(sos: SOSRequest): string[] {
  const badges: string[] = [];

  if (sos.needs.medical) badges.push("Cần y tế");
  if (sos.needs.food) badges.push("Cần lương thực");
  if (sos.needs.boat) badges.push("Cần thuyền");
  if (sos.hasInjured) badges.push("Có người bị thương");
  if (sos.canMove === false) badges.push("Không thể tự di chuyển");

  return badges;
}

// ── Preset templates ──

const TEMPLATES: { label: string; types: ClusterActivityType[] }[] = [
  { label: "Giải cứu cơ bản", types: ["ASSESS", "RESCUE", "EVACUATE"] },
  {
    label: "Y tế khẩn cấp",
    types: ["ASSESS", "MEDICAL_AID", "EVACUATE"],
  },
  {
    label: "Bàn giao vật phẩm",
    types: ["ASSESS", "DELIVER_SUPPLIES", "EVACUATE"],
  },
];

function normalizeManualMissionType(value?: string | null): MissionType {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "MIXED") return "MIXED";

  if (
    normalized === "SUPPLY" ||
    normalized === "MEDICAL" ||
    normalized === "EVACUATE" ||
    normalized === "EVACUATION" ||
    normalized === "RELIEF"
  ) {
    return "RELIEF";
  }

  if (normalized === "RESCUER") return "RESCUER";
  return "RESCUE";
}

// ── Palette Draggable Item ──

function PaletteItem({ type }: { type: ClusterActivityType }) {
  const config = activityTypeConfig[type] || activityTypeConfig["ASSESS"];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
    data: { type, source: "palette" },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none",
        config.bgColor,
        "border-transparent hover:border-border hover:shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
          config.bgColor,
          config.color,
        )}
      >
        <Plus className="h-3.5 w-3.5" weight="bold" />
      </div>
      <span className={cn("text-xs font-semibold", config.color)}>
        {config.label}
      </span>
    </div>
  );
}

// ── Sortable Timeline Item ──

function SortableActivityCard({
  activity,
  index,
  isLast,
  isRecentlyInserted,
  onUpdate,
  onRemove,
  onAddSupply,
  onUpdateSupplyQuantity,
  onRemoveSupply,
  teamOptions,
  clusterSOSRequests,
}: {
  activity: ManualActivity;
  index: number;
  isLast: boolean;
  isRecentlyInserted: boolean;
  onUpdate: (
    id: string,
    field: keyof ManualActivity,
    value: string | number | null,
  ) => void;
  onRemove: (id: string) => void;
  onAddSupply: (activityId: string, item: ManualInventoryDragPayload) => void;
  onUpdateSupplyQuantity: (
    activityId: string,
    supplyIndex: number,
    quantity: number,
  ) => void;
  onRemoveSupply: (activityId: string, supplyIndex: number) => void;
  teamOptions: ManualTeamOption[];
  clusterSOSRequests: SOSRequest[];
}) {
  const config =
    activityTypeConfig[activity.activityType] || activityTypeConfig["ASSESS"];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const matchSos = clusterSOSRequests.find(
    (s) =>
      s.location.lat === activity.targetLatitude &&
      s.location.lng === activity.targetLongitude,
  );
  const selectValue = matchSos ? matchSos.id : "";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasValidCoordinates =
    Number.isFinite(activity.targetLatitude) &&
    Number.isFinite(activity.targetLongitude) &&
    (Math.abs(activity.targetLatitude) > 0.000001 ||
      Math.abs(activity.targetLongitude) > 0.000001);
  const coordinateLabel = hasValidCoordinates
    ? `${activity.targetLatitude.toFixed(4)}, ${activity.targetLongitude.toFixed(4)}`
    : "Chưa gán tọa độ";
  const isSupplyStep = isSupplyActivityType(activity.activityType);
  const isAutoReturnStep = activity.isAutoReturnStep === true;
  const selectedTeam =
    teamOptions.find((team) => team.id === activity.rescueTeamId) ?? null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-background p-3 space-y-2.5 transition-all",
        isDragging ? "opacity-50 scale-[0.98]" : "hover:shadow-sm",
        isRecentlyInserted &&
          "animate-in fade-in slide-in-from-top-2 duration-200",
        !isLast && "border-border/90",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label={`Kéo để sắp xếp bước ${index + 1}`}
        >
          <DotsSixVertical className="h-4 w-4" weight="bold" />
        </div>
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            config.bgColor,
            config.color,
          )}
        >
          {index + 1}
        </div>
        <Select
          value={activity.activityType}
          disabled={isAutoReturnStep}
          onValueChange={(value) =>
            onUpdate(activity.id, "activityType", value)
          }
        >
          <SelectTrigger className="h-7 w-42 text-sm font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-1200">
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="text-sm">
                {activityTypeConfig[type]?.label || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-red-500"
          disabled={isAutoReturnStep}
          onClick={() => onRemove(activity.id)}
          aria-label={`Xóa bước ${index + 1}`}
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>

      {isAutoReturnStep ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-300">
          Bước này được tự động tạo khi có bước thu gom vật phẩm và luôn nằm ở
          cuối.
        </div>
      ) : null}

      <div>
        <Label className="text-sm text-muted-foreground uppercase tracking-wider">
          Mô tả
        </Label>
        <textarea
          value={activity.description || ""}
          onChange={(e) => onUpdate(activity.id, "description", e.target.value)}
          placeholder="Mô tả hoạt động…"
          name={`activity-${activity.id}-description`}
          autoComplete="off"
          rows={2}
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-sm text-muted-foreground uppercase tracking-wider">
            Mục tiêu
          </Label>
          <Input
            placeholder="Tên địa điểm / mục tiêu…"
            value={activity.target || ""}
            onChange={(e) => onUpdate(activity.id, "target", e.target.value)}
            name={`activity-${activity.id}-target`}
            autoComplete="off"
            className="h-9 text-sm mt-1"
          />
        </div>

        <div>
          <Label className="text-sm text-muted-foreground uppercase tracking-wider">
            Liên kết SOS
          </Label>
          <div>
            <Select
              value={selectValue}
              onValueChange={(val) => {
                const sos = clusterSOSRequests.find((s) => s.id === val);
                if (sos) {
                  onUpdate(activity.id, "targetLatitude", sos.location.lat);
                  onUpdate(activity.id, "targetLongitude", sos.location.lng);
                }
              }}
            >
              <SelectTrigger className="h-9 text-sm mt-1">
                <SelectValue placeholder="Chọn một yêu cầu SOS để gán tọa độ…" />
              </SelectTrigger>
              <SelectContent className="z-1200">
                {clusterSOSRequests.map((sos) => (
                  <SelectItem key={sos.id} value={sos.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">
                        #{sos.id}
                      </span>
                      <span className="truncate max-w-50">{sos.message}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2.5 dark:border-emerald-700/50 dark:bg-emerald-900/15">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <UsersThree className="h-3.5 w-3.5" weight="fill" />
          Điều phối đội cứu hộ
        </p>
        <p className="mt-0.5 text-sm text-emerald-700/80 dark:text-emerald-300/80">
          {selectedTeam ? selectedTeam.name : "Chưa chọn đội phụ trách"}
        </p>

        <Select
          value={
            activity.rescueTeamId != null
              ? String(activity.rescueTeamId)
              : undefined
          }
          disabled={teamOptions.length === 0}
          onValueChange={(value) => {
            if (value === CLEAR_ACTIVITY_TEAM_VALUE) {
              onUpdate(activity.id, "rescueTeamId", null);
              return;
            }

            const teamId = Number(value);
            if (!Number.isFinite(teamId)) {
              return;
            }

            onUpdate(activity.id, "rescueTeamId", teamId);
          }}
        >
          <SelectTrigger className="h-9 text-sm mt-2 bg-white/90 dark:bg-emerald-950/25">
            <SelectValue
              placeholder={
                teamOptions.length > 0
                  ? "Chọn đội phụ trách bước này"
                  : "Chưa có đội gần cụm để chọn"
              }
            />
          </SelectTrigger>
          <SelectContent className="z-1200">
            {teamOptions.map((team) => (
              <SelectItem
                key={team.id}
                value={String(team.id)}
                className="text-sm"
              >
                {team.name}
                {team.distanceKm != null
                  ? ` • ${team.distanceKm.toFixed(1)} km`
                  : ""}
              </SelectItem>
            ))}
            <SelectItem
              value={CLEAR_ACTIVITY_TEAM_VALUE}
              className="text-sm text-rose-700"
            >
              Bỏ gán đội cho bước này
            </SelectItem>
          </SelectContent>
        </Select>

        {selectedTeam?.assemblyPointName ? (
          <p className="mt-2 text-sm text-emerald-700/75 dark:text-emerald-300/75">
            Điểm tập kết: {selectedTeam.assemblyPointName}
          </p>
        ) : null}

        {selectedTeam?.distanceKm != null ? (
          <p className="mt-1 text-xs text-emerald-700/65 dark:text-emerald-300/65">
            Khoảng cách đến cụm:{" "}
            {formatDistanceKmLabel(selectedTeam.distanceKm)}
          </p>
        ) : null}

        {teamOptions.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-amber-300/80 bg-amber-100/60 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
            Chưa có đội cứu hộ gần cụm. Cần có đội hợp lệ để xác nhận nhiệm vụ.
          </p>
        ) : null}
      </div>

      {isSupplyStep ? (
        <div
          className={cn(
            "mt-1 p-2 rounded-lg border-2 border-dashed transition-colors",
            "border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/10",
          )}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes(MANUAL_INVENTORY_MIME)) {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.classList.add(
                "border-blue-400",
                "bg-blue-100/50",
              );
            }
          }}
          onDragLeave={(event) => {
            event.currentTarget.classList.remove(
              "border-blue-400",
              "bg-blue-100/50",
            );
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.classList.remove(
              "border-blue-400",
              "bg-blue-100/50",
            );

            const rawPayload = event.dataTransfer.getData(
              MANUAL_INVENTORY_MIME,
            );
            if (!rawPayload) {
              return;
            }

            try {
              const payload = JSON.parse(
                rawPayload,
              ) as ManualInventoryDragPayload;
              if (!payload || typeof payload.itemId !== "number") {
                return;
              }

              onAddSupply(activity.id, payload);
            } catch {
              // Ignore malformed drag payload.
            }
          }}
        >
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
            <Package className="h-3 w-3" weight="fill" />
            {getSupplyStepTitle(activity.activityType)}
          </p>

          {activity.suppliesToCollect.length > 0 ? (
            <div className="space-y-1">
              {activity.suppliesToCollect.map((supply, supplyIndex) => (
                <div
                  key={`${supply.itemId}-${supplyIndex}`}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px_44px_24px] items-center gap-2 text-sm py-1 px-2 bg-background rounded border shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Package className="h-3 w-3 text-blue-500 shrink-0" />
                    <span
                      className="truncate font-medium text-foreground"
                      title={supply.itemName}
                    >
                      {supply.itemName}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={supply.quantity}
                    onChange={(event) =>
                      onUpdateSupplyQuantity(
                        activity.id,
                        supplyIndex,
                        parseInt(event.target.value, 10) || 1,
                      )
                    }
                    name={`activity-${activity.id}-supply-${supplyIndex}-quantity`}
                    autoComplete="off"
                    className="h-6 w-full text-sm text-center px-1"
                  />
                  <span className="text-right text-sm text-muted-foreground">
                    {supply.unit}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-red-500"
                    onClick={() => onRemoveSupply(activity.id, supplyIndex)}
                    aria-label={`Xóa vật phẩm ${supply.itemName}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70 text-center py-1">
              Kéo vật phẩm từ kho bên trái vào đây
            </p>
          )}
        </div>
      ) : (
        <div>
          <Label className="text-sm text-muted-foreground uppercase tracking-wider">
            Vật phẩm / Thiết bị
          </Label>
          <Input
            placeholder="VD: Áo phao x5, Lương khô x10…"
            value={activity.items || ""}
            onChange={(e) => onUpdate(activity.id, "items", e.target.value)}
            name={`activity-${activity.id}-items`}
            autoComplete="off"
            className="h-9 text-sm mt-1"
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tọa độ:{" "}
        <span className="font-mono text-foreground/80">{coordinateLabel}</span>
      </p>
    </div>
  );
}

// ── Drag Overlay Item (preview while dragging) ──

function DragOverlayContent({ type }: { type: ClusterActivityType }) {
  const config = activityTypeConfig[type] || activityTypeConfig["ASSESS"];
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed shadow-lg bg-background",
        config.bgColor,
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          config.bgColor,
          config.color,
        )}
      >
        <Plus className="h-4 w-4" weight="bold" />
      </div>
      <span className={cn("text-sm font-semibold", config.color)}>
        {config.label}
      </span>
    </div>
  );
}

// ── Timeline Drop Zone ──

function TimelineDropZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: DROPPABLE_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-50 rounded-xl border-2 border-dashed transition-all duration-200 p-3",
        isEmpty ? "flex flex-col items-center justify-center" : "space-y-3",
        isOver
          ? "border-primary/60 bg-primary/5"
          : "border-border/50 bg-muted/10",
      )}
    >
      {isEmpty ? (
        <div className="text-center py-8 select-none">
          <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground/60">
            Kéo hoạt động vào đây
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            hoặc chọn mẫu có sẵn bên trên
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function NearbyDepotInventoryCard({ depot }: { depot: DepotByClusterEntity }) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const { data, isLoading, isError, error } = useDepotInventory({
    depotId: depot.id,
    itemName: deferredSearchTerm || undefined,
    pageNumber: page,
    pageSize: 6,
  });

  const availableItems =
    data?.items.filter((item) =>
      item.itemType === "Reusable"
        ? item.availableUnit > 0
        : item.availableQuantity > 0,
    ) ?? [];
  const utilizationPercent = getDepotUtilizationPercent(
    depot.currentUtilization,
    depot.capacity,
  );
  const statusMeta = getDepotStatusMeta(depot.status);

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-sm dark:border-amber-800/40 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.22)_0%,rgba(15,23,42,0.88)_100%)]">
      <div className="border-b border-amber-200/70 px-3 py-3 dark:border-amber-800/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Storefront
                className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300"
                weight="fill"
              />
              <p className="truncate text-sm font-bold text-foreground">
                {depot.name}
              </p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {depot.address}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-xs font-semibold",
                statusMeta.className,
              )}
            >
              {statusMeta.label}
            </Badge>
            <Badge
              variant="secondary"
              className="h-5 rounded-full bg-sky-100 px-2 text-xs font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
            >
              <Compass className="mr-1 h-3 w-3" weight="fill" />
              {formatDistanceKmLabel(depot.distanceKm)}
            </Badge>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-background/80 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sức chứa
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {depot.currentUtilization.toLocaleString("vi-VN")} /{" "}
              {depot.capacity.toLocaleString("vi-VN")}
            </p>
            <Progress value={utilizationPercent} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Mặt hàng hiện có
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {data?.totalCount?.toLocaleString("vi-VN") ?? "—"} vật phẩm
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Trang {data?.pageNumber ?? 1}/{data?.totalPages ?? 1}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3">
        <div className="space-y-1.5">
          <Label
            htmlFor={`manual-depot-search-${depot.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Tìm vật phẩm
          </Label>
          <div className="relative">
            <Input
              id={`manual-depot-search-${depot.id}`}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Nhập tên vật phẩm cần lấy..."
              className="h-9 pr-9 text-sm"
            />
            {searchTerm ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                aria-label="Xóa từ khóa tìm vật phẩm"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={`${depot.id}-inventory-skeleton-${index}`}
              className="h-12 rounded-xl"
            />
          ))
        ) : isError ? (
          <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/80 px-3 py-3 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-300">
            {getErrorMessage(error, "Không thể tải vật phẩm của kho này.")}
          </div>
        ) : availableItems.length > 0 ? (
          availableItems.map((item, index) => {
            const availableQuantity =
              item.itemType === "Reusable"
                ? item.availableUnit
                : item.availableQuantity;
            const itemWithUnit = item as typeof item & {
              unit?: string;
              unitName?: string;
            };
            const rawUnit =
              (typeof itemWithUnit.unit === "string"
                ? itemWithUnit.unit.trim()
                : "") ||
              (typeof itemWithUnit.unitName === "string"
                ? itemWithUnit.unitName.trim()
                : "");

            return (
              <div
                key={`${depot.id}-${item.itemModelId}-${item.itemType}-${index}`}
                draggable
                onDragStart={(event) => {
                  const payload: ManualInventoryDragPayload = {
                    itemId: item.itemModelId,
                    itemName: item.itemModelName,
                    unit: rawUnit || "đơn vị",
                    availableQuantity,
                    sourceDepotId: depot.id,
                    sourceDepotName: depot.name,
                    sourceDepotAddress: depot.address,
                  };

                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    MANUAL_INVENTORY_MIME,
                    JSON.stringify(payload),
                  );
                }}
                className="flex cursor-grab items-center gap-2 rounded-xl border border-border/70 bg-background/90 px-2.5 py-2 transition-colors hover:bg-accent/40 active:cursor-grabbing"
              >
                <Package
                  className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300"
                  weight="fill"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {item.itemModelName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.categoryName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="h-6 shrink-0 rounded-full px-2 text-xs font-bold"
                >
                  {availableQuantity.toLocaleString("vi-VN")}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center">
            <p className="text-sm font-medium text-foreground">
              {deferredSearchTerm
                ? "Không tìm thấy vật phẩm phù hợp"
                : "Không còn vật phẩm khả dụng"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {deferredSearchTerm
                ? "Thử từ khóa khác để tiếp tục kéo-thả vật phẩm vào các bước."
                : "Chuyển trang hoặc chọn kho khác để tiếp tục kéo-thả vật phẩm."}
            </p>
          </div>
        )}

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs font-semibold"
              disabled={!data.hasPreviousPage}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            >
              <CaretLeft className="h-3 w-3" />
              Trước
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              {data.pageSize} vật phẩm / trang
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs font-semibold"
              disabled={!data.hasNextPage}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Sau
              <CaretRight className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main Component ──

const ManualMissionBuilder = ({
  open,
  onOpenChange,
  clusterId,
  cluster,
  clusterSOSRequests,
  onCreated,
  existingMissionId,
}: ManualMissionBuilderProps) => {
  // ── State ──
  const [splitPercent, setSplitPercent] = useState(18);
  const [activities, setActivities] = useState<ManualActivity[]>([]);
  const [missionType, setMissionType] = useState<MissionType>("RESCUE");
  const [priorityScore, setPriorityScore] = useState(5);
  const [startTime, setStartTime] = useState("");
  const [expectedEndTime, setExpectedEndTime] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] =
    useState<ClusterActivityType | null>(null);
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);
  const [selectedSOSId, setSelectedSOSId] = useState<string | null>(null);
  const [recentlyInsertedActivityId, setRecentlyInsertedActivityId] =
    useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: createMissionAsync, isPending: isCreatingMission } =
    useCreateMission();
  const { mutateAsync: updateMissionAsync, isPending: isUpdatingMission } =
    useUpdateMission();
  const { mutateAsync: updateActivityAsync, isPending: isUpdatingAct } =
    useUpdateActivity();
  const { mutateAsync: createActivityAsync, isPending: isCreatingAct } =
    useCreateActivity();

  const isSubmitting =
    isCreatingMission || isUpdatingMission || isUpdatingAct || isCreatingAct;

  // ── Fetch existing mission ──
  const { data: existingMission } = useMission(existingMissionId ?? 0, {
    enabled: !!existingMissionId && open,
  });
  const { data: existingActivities } = useMissionActivities(
    existingMissionId ?? 0,
    {
      enabled: !!existingMissionId && open,
    },
  );
  const {
    data: rescueTeamsByClusterData,
    isLoading: isNearbyTeamsLoading,
    isError: isNearbyTeamsError,
    error: nearbyTeamsError,
  } = useRescueTeamsByCluster(clusterId ?? 0, {
    enabled: open && !!clusterId && clusterId > 0,
  });
  const {
    data: nearbyDepotsData,
    isLoading: isNearbyDepotsLoading,
    isError: isNearbyDepotsError,
    error: nearbyDepotsError,
  } = useDepotsByCluster(clusterId ?? 0, {
    enabled: open && !!clusterId && clusterId > 0,
  });

  const teamOptions = useMemo<ManualTeamOption[]>(() => {
    return (rescueTeamsByClusterData ?? [])
      .map((team) => ({
        id: team.id,
        name: team.name,
        teamType: team.teamType,
        assemblyPointName: team.assemblyPointName,
        status: team.status,
        distanceKm: team.distanceKm,
      }))
      .sort((teamA, teamB) => {
        const distanceA = Number.isFinite(teamA.distanceKm)
          ? teamA.distanceKm!
          : Number.POSITIVE_INFINITY;
        const distanceB = Number.isFinite(teamB.distanceKm)
          ? teamB.distanceKm!
          : Number.POSITIVE_INFINITY;

        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }

        return teamA.name.localeCompare(teamB.name, "vi");
      });
  }, [rescueTeamsByClusterData]);
  const nearbyDepots = nearbyDepotsData ?? [];
  const hasNearbyTeams = teamOptions.length > 0;
  const hasNearbyDepots = nearbyDepots.length > 0;
  const selectedSOSRequest = useMemo(
    () =>
      clusterSOSRequests.find((sos) => sos.id === selectedSOSId) ??
      clusterSOSRequests[0] ??
      null,
    [clusterSOSRequests, selectedSOSId],
  );

  const isEditingExisting = !!existingMissionId;

  // ── Pre-fill from existing mission ──
  useEffect(() => {
    if (!existingMission || !open || hasLoadedExisting) return;
    const timeoutId = window.setTimeout(() => {
      const normalizedMissionType = normalizeManualMissionType(
        existingMission.missionType,
      );
      setMissionType(normalizedMissionType);
      setPriorityScore(existingMission.priorityScore || 5);
      setStartTime(existingMission.startTime?.slice(0, 16) || "");
      setExpectedEndTime(existingMission.expectedEndTime?.slice(0, 16) || "");

      const rescueTeamIdByMissionTeamId = new Map(
        (existingMission.teams ?? []).map((team) => [
          team.missionTeamId,
          team.rescueTeamId,
        ]),
      );

      const acts = existingMission.activities ?? existingActivities ?? [];
      if (acts.length > 0) {
        setActivities(
          acts.map((a: MissionActivity) => ({
            id: `${TIMELINE_PREFIX}existing-${a.id}-${Date.now()}`,
            activityType: (a.activityType || "ASSESS") as ClusterActivityType,
            description: a.description || "",
            target: a.target || "",
            items:
              typeof a.items === "string"
                ? a.items
                : buildSupplySummary(
                    (a.suppliesToCollect ?? []).map((supply) => ({
                      itemId: supply.itemId ?? -1,
                      itemName: supply.itemName ?? "Vật phẩm chưa rõ tên",
                      quantity: supply.quantity,
                      unit: supply.unit,
                      sourceDepotId: a.depotId,
                      sourceDepotName: a.depotName,
                      sourceDepotAddress: a.depotAddress,
                    })),
                  ),
            targetLatitude: a.targetLatitude || 0,
            targetLongitude: a.targetLongitude || 0,
            rescueTeamId:
              typeof a.missionTeamId === "number"
                ? (rescueTeamIdByMissionTeamId.get(a.missionTeamId) ?? null)
                : null,
            depotId: a.depotId ?? null,
            depotName: a.depotName ?? null,
            depotAddress: a.depotAddress ?? null,
            suppliesToCollect: (a.suppliesToCollect ?? []).map((supply) => ({
              itemId: supply.itemId ?? -1,
              itemName: supply.itemName ?? "Vật phẩm chưa rõ tên",
              quantity: supply.quantity,
              unit: supply.unit,
              sourceDepotId: a.depotId,
              sourceDepotName: a.depotName,
              sourceDepotAddress: a.depotAddress,
            })),
          })),
        );
      }
      setHasLoadedExisting(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [existingMission, existingActivities, open, hasLoadedExisting]);

  // Reset loaded flag when closing or changing mission
  useEffect(() => {
    if (open) return;

    const timeoutId = window.setTimeout(() => {
      setHasLoadedExisting(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!recentlyInsertedActivityId) return;

    const timeoutId = window.setTimeout(() => {
      setRecentlyInsertedActivityId((current) =>
        current === recentlyInsertedActivityId ? null : current,
      );
    }, 240);

    return () => window.clearTimeout(timeoutId);
  }, [recentlyInsertedActivityId]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;

      setSplitPercent(Math.min(28, Math.max(16, nextPercent)));
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Generate unique ID ──
  const genId = useCallback(
    () =>
      `${TIMELINE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    [],
  );

  // ── Create fresh activity ──
  const createActivity = useCallback(
    (type: ClusterActivityType): ManualActivity => ({
      id: genId(),
      activityType: type,
      description: "",
      target: "",
      items: "",
      targetLatitude: cluster?.centerLatitude ?? 0,
      targetLongitude: cluster?.centerLongitude ?? 0,
      rescueTeamId: null,
      depotId: null,
      depotName: null,
      depotAddress: null,
      suppliesToCollect: [],
    }),
    [genId, cluster],
  );

  // ── DnD handlers ──
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(String(active.id));
      const data = active.data.current;
      if (data?.source === "palette") {
        setActiveDragType(data.type as ClusterActivityType);
      } else {
        const act = activities.find((a) => a.id === String(active.id));
        if (act) setActiveDragType(act.activityType);
      }
    },
    [activities],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveDragType(null);

      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // From palette → drop zone or onto an existing item
      if (activeIdStr.startsWith(PALETTE_PREFIX)) {
        const type = active.data.current?.type as ClusterActivityType;
        if (!type) return;

        const newActivity = createActivity(type);
        setRecentlyInsertedActivityId(newActivity.id);

        if (overIdStr === DROPPABLE_ID) {
          // Drop onto the zone itself → append
          setActivities((prev) => [...prev, newActivity]);
        } else if (overIdStr.startsWith(TIMELINE_PREFIX)) {
          // Drop onto an existing item → insert above it
          setActivities((prev) => {
            const overIndex = prev.findIndex((a) => a.id === overIdStr);
            if (overIndex === -1) return [...prev, newActivity];
            const next = [...prev];
            next.splice(overIndex, 0, newActivity);
            return next;
          });
        }
        return;
      }

      // Reorder within timeline
      if (
        activeIdStr.startsWith(TIMELINE_PREFIX) &&
        overIdStr.startsWith(TIMELINE_PREFIX) &&
        activeIdStr !== overIdStr
      ) {
        setActivities((prev) => {
          const oldIndex = prev.findIndex((a) => a.id === activeIdStr);
          const newIndex = prev.findIndex((a) => a.id === overIdStr);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    [createActivity],
  );

  // ── Activity CRUD ──
  const handleUpdateActivity = useCallback(
    (
      id: string,
      field: keyof ManualActivity,
      value: string | number | null,
    ) => {
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id !== id) {
            return a;
          }

          if (field === "activityType") {
            const nextType = value as ClusterActivityType;
            if (!isSupplyActivityType(nextType)) {
              return {
                ...a,
                activityType: nextType,
                items: "",
                depotId: null,
                depotName: null,
                depotAddress: null,
                suppliesToCollect: [],
              };
            }

            return {
              ...a,
              activityType: nextType,
            };
          }

          return {
            ...a,
            [field]: value,
          };
        }),
      );
    },
    [],
  );

  const handleRemoveActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Apply template ──
  const applyTemplate = useCallback(
    (types: ClusterActivityType[]) => {
      setActivities(types.map((type) => createActivity(type)));
    },
    [createActivity],
  );

  const handleAddActivity = useCallback(() => {
    const newActivity = createActivity("ASSESS");
    setRecentlyInsertedActivityId(newActivity.id);
    setActivities((previous) => [...previous, newActivity]);
  }, [createActivity]);

  const handleAddSupplyToActivity = useCallback(
    (activityId: string, item: ManualInventoryDragPayload) => {
      setActivities((previous) =>
        previous.map((activity) => {
          if (activity.id !== activityId) {
            return activity;
          }

          const existingSupplies = activity.suppliesToCollect ?? [];
          const existingIndex = existingSupplies.findIndex(
            (supply) => supply.itemId === item.itemId,
          );

          let nextSupplies = existingSupplies;
          if (existingIndex >= 0) {
            nextSupplies = [...existingSupplies];
            nextSupplies[existingIndex] = {
              ...nextSupplies[existingIndex],
              quantity: nextSupplies[existingIndex].quantity + 1,
            };
          } else {
            nextSupplies = [
              ...existingSupplies,
              {
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: 1,
                unit: item.unit,
                sourceDepotId: item.sourceDepotId,
                sourceDepotName: item.sourceDepotName,
                sourceDepotAddress: item.sourceDepotAddress,
              },
            ];
          }

          return {
            ...activity,
            depotId: item.sourceDepotId,
            depotName: item.sourceDepotName,
            depotAddress: item.sourceDepotAddress,
            suppliesToCollect: nextSupplies,
            items: buildSupplySummary(nextSupplies),
          };
        }),
      );
    },
    [],
  );

  const handleUpdateSupplyQuantity = useCallback(
    (activityId: string, supplyIndex: number, quantity: number) => {
      setActivities((previous) =>
        previous.map((activity) => {
          if (activity.id !== activityId) {
            return activity;
          }

          const nextSupplies = [...activity.suppliesToCollect];
          if (!nextSupplies[supplyIndex]) {
            return activity;
          }

          nextSupplies[supplyIndex] = {
            ...nextSupplies[supplyIndex],
            quantity: Math.max(1, quantity),
          };

          return {
            ...activity,
            suppliesToCollect: nextSupplies,
            items: buildSupplySummary(nextSupplies),
          };
        }),
      );
    },
    [],
  );

  const handleRemoveSupplyFromActivity = useCallback(
    (activityId: string, supplyIndex: number) => {
      setActivities((previous) =>
        previous.map((activity) => {
          if (activity.id !== activityId) {
            return activity;
          }

          const nextSupplies = [...activity.suppliesToCollect];
          nextSupplies.splice(supplyIndex, 1);

          const nextDepotSource = nextSupplies[0];
          return {
            ...activity,
            depotId: nextDepotSource?.sourceDepotId ?? null,
            depotName: nextDepotSource?.sourceDepotName ?? null,
            depotAddress: nextDepotSource?.sourceDepotAddress ?? null,
            suppliesToCollect: nextSupplies,
            items: buildSupplySummary(nextSupplies),
          };
        }),
      );
    },
    [],
  );

  // ── Auto append final RETURN_SUPPLIES when supply collection exists ──
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActivities((previous) => {
        if (previous.length === 0) {
          return previous;
        }

        const triggerActivities = previous.filter((activity) =>
          AUTO_RETURN_TRIGGER_TYPES.has(activity.activityType),
        );
        const hasSupplyCollectionStep = triggerActivities.length > 0;
        const autoReturnIndexes: number[] = [];

        for (let index = 0; index < previous.length; index += 1) {
          if (previous[index].isAutoReturnStep) {
            autoReturnIndexes.push(index);
          }
        }

        if (!hasSupplyCollectionStep) {
          if (autoReturnIndexes.length === 0) {
            return previous;
          }

          return previous.filter((activity) => !activity.isAutoReturnStep);
        }

        let managedReturnIndex =
          autoReturnIndexes.length > 0
            ? autoReturnIndexes[autoReturnIndexes.length - 1]
            : -1;

        if (managedReturnIndex < 0) {
          for (let index = previous.length - 1; index >= 0; index -= 1) {
            if (previous[index].activityType === "RETURN_SUPPLIES") {
              managedReturnIndex = index;
              break;
            }
          }
        }

        const lastCollectStep = triggerActivities[triggerActivities.length - 1];
        const mergedSupplies =
          mergeCollectedSuppliesForAutoReturn(triggerActivities);
        const baseManagedStep =
          managedReturnIndex >= 0
            ? previous[managedReturnIndex]
            : createActivity("RETURN_SUPPLIES");

        const nextSupplies =
          mergedSupplies.length > 0
            ? mergedSupplies
            : baseManagedStep.suppliesToCollect;

        const autoReturnStep: ManualActivity = {
          ...baseManagedStep,
          activityType: "RETURN_SUPPLIES",
          description:
            baseManagedStep.description.trim() || AUTO_RETURN_STEP_DESCRIPTION,
          target:
            baseManagedStep.target.trim() ||
            lastCollectStep.depotName ||
            lastCollectStep.target ||
            AUTO_RETURN_TARGET_FALLBACK,
          targetLatitude: hasRenderableCoordinates(
            lastCollectStep.targetLatitude,
            lastCollectStep.targetLongitude,
          )
            ? lastCollectStep.targetLatitude
            : baseManagedStep.targetLatitude,
          targetLongitude: hasRenderableCoordinates(
            lastCollectStep.targetLatitude,
            lastCollectStep.targetLongitude,
          )
            ? lastCollectStep.targetLongitude
            : baseManagedStep.targetLongitude,
          rescueTeamId:
            lastCollectStep.rescueTeamId ??
            baseManagedStep.rescueTeamId ??
            null,
          depotId: lastCollectStep.depotId ?? baseManagedStep.depotId ?? null,
          depotName:
            lastCollectStep.depotName ?? baseManagedStep.depotName ?? null,
          depotAddress:
            lastCollectStep.depotAddress ??
            baseManagedStep.depotAddress ??
            null,
          suppliesToCollect: nextSupplies,
          items: buildSupplySummary(nextSupplies),
          isAutoReturnStep: true,
        };

        const normalizedActivities = previous.filter((activity, index) => {
          if (index === managedReturnIndex) {
            return false;
          }

          return !activity.isAutoReturnStep;
        });

        normalizedActivities.push(autoReturnStep);

        if (JSON.stringify(normalizedActivities) === JSON.stringify(previous)) {
          return previous;
        }

        return normalizedActivities;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activities, createActivity]);

  // ── Fill location from SOS ──
  const handleSOSLocationFill = useCallback(
    (lat: number, lng: number) => {
      // Find the first activity with no coordinates set (or center coords)
      const emptyAct = activities.find(
        (a) =>
          (a.targetLatitude === 0 && a.targetLongitude === 0) ||
          (a.targetLatitude === (cluster?.centerLatitude ?? 0) &&
            a.targetLongitude === (cluster?.centerLongitude ?? 0)),
      );
      if (emptyAct) {
        handleUpdateActivity(emptyAct.id, "targetLatitude", lat);
        handleUpdateActivity(emptyAct.id, "targetLongitude", lng);
        toast.success(
          `Đã gán tọa độ cho bước ${activities.indexOf(emptyAct) + 1}`,
        );
      } else {
        // Copy to clipboard as fallback
        navigator.clipboard.writeText(`${lat}, ${lng}`);
        toast.info("Đã sao chép tọa độ vào clipboard");
      }
    },
    [activities, cluster, handleUpdateActivity],
  );

  const handleCopySelectedSOSCoordinates = useCallback(() => {
    if (!selectedSOSRequest) return;

    navigator.clipboard.writeText(
      `${selectedSOSRequest.location.lat}, ${selectedSOSRequest.location.lng}`,
    );
    toast.info("Đã sao chép tọa độ SOS vào clipboard");
  }, [selectedSOSRequest]);

  // ── Validation ──
  const validate = useCallback((): boolean => {
    if (activities.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 hoạt động");
      return false;
    }
    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];
      if (!a.description.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mô tả`);
        return false;
      }
      if (!a.target.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mục tiêu`);
        return false;
      }

      if (!toValidRescueTeamId(a.rescueTeamId)) {
        toast.error(`Bước ${i + 1}: Vui lòng chọn đội phụ trách`);
        return false;
      }

      if (
        isSupplyActivityType(a.activityType) &&
        a.suppliesToCollect.length === 0
      ) {
        toast.error(`Bước ${i + 1}: Vui lòng kéo thả ít nhất 1 vật phẩm`);
        return false;
      }
    }
    if (!startTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu");
      return false;
    }
    if (!expectedEndTime) {
      toast.error("Vui lòng chọn thời gian kết thúc dự kiến");
      return false;
    }
    if (new Date(startTime) >= new Date(expectedEndTime)) {
      toast.error("Thời gian bắt đầu phải trước thời gian kết thúc");
      return false;
    }
    return true;
  }, [activities, startTime, expectedEndTime]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!clusterId || !validate()) return;

    if (isEditingExisting && existingMissionId) {
      try {
        await updateMissionAsync({
          missionId: existingMissionId,
          request: {
            missionType,
            priorityScore,
            startTime: new Date(startTime).toISOString(),
            expectedEndTime: new Date(expectedEndTime).toISOString(),
          },
        });

        // Update or create activities
        await Promise.all(
          activities.map((a, i) => {
            const step = i + 1;
            const activityCode = `${a.activityType}_${step}`;
            const rescueTeamId = toValidRescueTeamId(a.rescueTeamId);
            const reqData = {
              step,
              activityCode,
              activityType: a.activityType,
              description: a.description,
              priority: "Medium",
              estimatedTime: 30,
              sosRequestId: 0,
              depotId: 0,
              depotName: "",
              depotAddress: "",
              suppliesToCollect: a.suppliesToCollect.map((supply) => ({
                id: supply.itemId > 0 ? supply.itemId : null,
                name: supply.itemName,
                quantity: supply.quantity,
                unit: supply.unit,
              })),
              target: a.target,
              items: a.items || buildSupplySummary(a.suppliesToCollect),
              targetLatitude: a.targetLatitude,
              targetLongitude: a.targetLongitude,
              rescueTeamId,
            };

            if (a.id.startsWith(`${TIMELINE_PREFIX}existing-`)) {
              const activityId = parseInt(a.id.split("-")[2], 10);
              return updateActivityAsync({
                missionId: existingMissionId,
                activityId: activityId,
                request: reqData,
              });
            } else {
              return createActivityAsync({
                missionId: existingMissionId,
                request: reqData,
              });
            }
          }),
        );

        toast.success("Đã cập nhật nhiệm vụ và hoạt động thành công!");
        onOpenChange(false);
        onCreated();
      } catch (error) {
        console.error("Failed to update mission or activities:", error);
        toast.error("Không thể cập nhật nhiệm vụ. Vui lòng thử lại.");
      }
    } else {
      try {
        await createMissionAsync({
          clusterId,
          missionType,
          priorityScore,
          startTime: new Date(startTime).toISOString(),
          expectedEndTime: new Date(expectedEndTime).toISOString(),
          activities: activities.map((a, i) => {
            const isSupplyStep = isSupplyActivityType(a.activityType);
            const matchedSos = isSupplyStep
              ? null
              : clusterSOSRequests.find(
                  (s) =>
                    s.location.lat === a.targetLatitude &&
                    s.location.lng === a.targetLongitude,
                );

            const rawSosRequestId = matchedSos?.id
              ? Number(matchedSos.id)
              : NaN;
            const sosRequestId =
              Number.isFinite(rawSosRequestId) && rawSosRequestId > 0
                ? rawSosRequestId
                : null;

            const depotId =
              typeof a.depotId === "number" &&
              Number.isFinite(a.depotId) &&
              a.depotId > 0
                ? a.depotId
                : null;
            const depotName =
              typeof a.depotName === "string" && a.depotName.trim()
                ? a.depotName.trim()
                : null;
            const depotAddress =
              typeof a.depotAddress === "string" && a.depotAddress.trim()
                ? a.depotAddress.trim()
                : null;
            const rescueTeamId = toValidRescueTeamId(a.rescueTeamId);

            return {
              step: i + 1,
              activityCode: `${a.activityType}_${i + 1}`,
              activityType: a.activityType,
              description: a.description,
              priority: "Medium",
              estimatedTime: 30,
              sosRequestId,
              depotId,
              depotName,
              depotAddress,
              suppliesToCollect: a.suppliesToCollect.map((supply) => ({
                id: supply.itemId > 0 ? supply.itemId : null,
                name: supply.itemName,
                quantity: supply.quantity,
                unit: supply.unit,
              })),
              target: depotName || a.target,
              targetLatitude: a.targetLatitude,
              targetLongitude: a.targetLongitude,
              rescueTeamId,
            };
          }),
        });

        toast.success("Đã tạo nhiệm vụ thành công!");
        setActivities([]);
        setStartTime("");
        setExpectedEndTime("");
        setPriorityScore(5);
        onOpenChange(false);
        onCreated();
      } catch (error) {
        console.error("Failed to create mission:", error);
        toast.error("Không thể tạo nhiệm vụ. Vui lòng thử lại.");
      }
    }
  }, [
    clusterId,
    validate,
    isEditingExisting,
    existingMissionId,
    updateMissionAsync,
    createMissionAsync,
    updateActivityAsync,
    createActivityAsync,
    missionType,
    priorityScore,
    startTime,
    expectedEndTime,
    activities,
    clusterSOSRequests,
    onOpenChange,
    onCreated,
  ]);

  // ── Sortable IDs ──
  const sortableIds = useMemo(() => activities.map((a) => a.id), [activities]);
  const hasAssignedTeamsForAllSteps =
    activities.length > 0 &&
    activities.every((activity) => toValidRescueTeamId(activity.rescueTeamId));
  const canSubmitMission =
    activities.length > 0 && hasNearbyTeams && hasAssignedTeamsForAllSteps;
  const selectedSOSPeopleTotal = selectedSOSRequest
    ? getSOSPeopleTotal(selectedSOSRequest)
    : null;
  const selectedSOSNeedBadges = selectedSOSRequest
    ? getSOSNeedBadges(selectedSOSRequest)
    : [];
  const selectedSOSMedicalIssues =
    selectedSOSRequest?.medicalIssues?.map((issue) =>
      humanizeSOSValue(issue),
    ) ?? [];
  const selectedSOSSupplies =
    selectedSOSRequest?.supplies?.map((supply) => humanizeSOSValue(supply)) ??
    [];
  const selectedSOSSituation =
    humanizeSOSValue(selectedSOSRequest?.situation) ??
    humanizeSOSValue(selectedSOSRequest?.structuredData?.situation);
  const selectedSOSNarrative =
    selectedSOSRequest?.additionalDescription?.trim() ||
    selectedSOSRequest?.message?.trim() ||
    "Chưa có mô tả bổ sung.";
  const selectedSOSWaitTimeLabel = formatSOSWaitTime(
    selectedSOSRequest?.waitTimeMinutes,
  );

  if (!clusterId) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-1100 transition-opacity duration-500 ease-out",
        open
          ? "opacity-100 visible"
          : "opacity-0 invisible pointer-events-none",
      )}
    >
      <div className="h-full bg-background/98 backdrop-blur-sm border-t shadow-2xl flex flex-col">
        {/* ── Header ── */}
        <div className="p-4 pb-3 border-b shrink-0 bg-linear-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <PencilSimpleLine
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">
                  {isEditingExisting
                    ? `Xem / Sửa nhiệm vụ #${existingMissionId} — Cụm #${clusterId}`
                    : `Tạo nhiệm vụ thủ công — Cụm #${clusterId}`}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 h-5 gap-1"
                  >
                    <TreeStructure className="h-3 w-3" weight="fill" />
                    {clusterSOSRequests.length} SOS
                  </Badge>
                  {cluster?.severityLevel && (
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0 h-5"
                    >
                      {cluster.severityLevel}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 h-5 gap-1"
                  >
                    <PencilSimpleLine className="h-3 w-3" />
                    Thủ công
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Đóng trình tạo nhiệm vụ thủ công"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={containerRef}
            className="flex min-h-0 flex-1 overflow-hidden"
          >
            {/* ── Left Panel: Palette + Reference Data ── */}
            <div
              className="shrink-0 border-r flex flex-col overflow-hidden"
              style={{
                width: `${splitPercent}%`,
                minWidth: "240px",
                maxWidth: "420px",
              }}
            >
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* SOS requests reference */}
                  <section>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Warning
                            className="h-3 w-3 text-red-500"
                            weight="fill"
                          />
                          SOS trong cụm ({clusterSOSRequests.length})
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Chọn một SOS để xem đầy đủ thông tin ở cột bên phải.
                        </p>
                      </div>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {clusterSOSRequests.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {clusterSOSRequests.map((sos) => {
                        const isSelected = selectedSOSRequest?.id === sos.id;
                        const totalPeople = getSOSPeopleTotal(sos);
                        const summaryBadges = getSOSNeedBadges(sos).slice(0, 2);

                        return (
                          <button
                            key={sos.id}
                            type="button"
                            className={cn(
                              "w-full rounded-2xl border px-3 py-2.5 text-left transition-all",
                              "hover:border-border hover:bg-accent/30 hover:shadow-sm",
                              isSelected
                                ? "border-emerald-300 bg-emerald-50/80 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/20"
                                : "border-border/70 bg-background/90",
                            )}
                            onClick={() => setSelectedSOSId(sos.id)}
                            aria-pressed={isSelected}
                          >
                            <div className="flex items-start gap-2">
                              <MapPin
                                className={cn(
                                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                                  sos.priority === "P1"
                                    ? "text-red-500"
                                    : sos.priority === "P2"
                                      ? "text-orange-500"
                                      : sos.priority === "P3"
                                        ? "text-yellow-500"
                                        : "text-teal-500",
                                )}
                                weight="fill"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant={
                                      PRIORITY_BADGE_VARIANT[sos.priority]
                                    }
                                    className="h-5 rounded-full px-2 text-[11px] font-semibold"
                                  >
                                    {PRIORITY_LABELS[sos.priority]}
                                  </Badge>
                                  <span className="text-sm font-semibold text-foreground">
                                    #{sos.id}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "h-5 rounded-full px-2 text-[11px] font-semibold",
                                      getSOSStatusClassName(sos.status),
                                    )}
                                  >
                                    {formatSOSStatusLabel(sos.status)}
                                  </Badge>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="h-5 rounded-full px-2 text-[11px]"
                                  >
                                    {formatSOSTypeLabel(sos.sosType)}
                                  </Badge>
                                  {totalPeople ? (
                                    <Badge
                                      variant="outline"
                                      className="h-5 rounded-full px-2 text-[11px]"
                                    >
                                      {totalPeople} người
                                    </Badge>
                                  ) : null}
                                  {summaryBadges.map((badge) => (
                                    <Badge
                                      key={`${sos.id}-${badge}`}
                                      variant="outline"
                                      className="h-5 rounded-full px-2 text-[11px]"
                                    >
                                      {badge}
                                    </Badge>
                                  ))}
                                </div>

                                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {sos.message}
                                </p>

                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                                  <Compass className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {sos.location.lat.toFixed(4)},{" "}
                                    {sos.location.lng.toFixed(4)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <Separator />

                  {/* Activity palette */}
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Lightning className="h-3 w-3" weight="fill" />
                      Hoạt động
                    </h3>
                    <div className="space-y-1.5">
                      {ACTIVITY_TYPES.map((type) => (
                        <PaletteItem key={type} type={type} />
                      ))}
                    </div>
                  </section>

                  <Separator />

                  {/* Templates */}
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Rocket className="h-3 w-3" weight="fill" />
                      Mẫu có sẵn
                    </h3>
                    <div className="space-y-1.5">
                      {TEMPLATES.map((tpl) => (
                        <Button
                          key={tpl.label}
                          variant="outline"
                          size="sm"
                          className="w-full h-auto py-2 px-3 text-left justify-start text-xs"
                          onClick={() => applyTemplate(tpl.types)}
                        >
                          <div>
                            <div className="font-semibold">{tpl.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {tpl.types
                                .map((t) => activityTypeConfig[t]?.label || t)
                                .join(" → ")}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </section>

                  <Separator />

                  {/* Nearby rescue teams */}
                  <section>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <UsersThree className="h-3 w-3" weight="fill" />
                          Đội gần cụm SOS
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Chỉ dùng đội thật từ backend. Chọn đội phụ trách cho
                          từng bước ở cột bên phải.
                        </p>
                      </div>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {teamOptions.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {isNearbyTeamsLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton
                            key={`nearby-team-skeleton-${index}`}
                            className="h-20 rounded-xl"
                          />
                        ))
                      ) : isNearbyTeamsError ? (
                        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/80 px-3 py-3 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-300">
                          {getErrorMessage(
                            nearbyTeamsError,
                            "Không thể tải danh sách đội gần cụm.",
                          )}
                        </div>
                      ) : hasNearbyTeams ? (
                        teamOptions.map((team) => {
                          const statusMeta = getTeamStatusMeta(team.status);

                          return (
                            <div
                              key={team.id}
                              className="rounded-2xl border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.95)_0%,rgba(255,255,255,0.98)_100%)] p-3 shadow-sm dark:border-emerald-800/40 dark:bg-[linear-gradient(180deg,rgba(6,95,70,0.22)_0%,rgba(15,23,42,0.88)_100%)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {team.name}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="h-5 rounded-full px-2 text-[11px]"
                                    >
                                      {formatManualTeamType(team.teamType)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "h-5 rounded-full px-2 text-[11px] font-semibold",
                                        statusMeta.className,
                                      )}
                                    >
                                      {statusMeta.label}
                                    </Badge>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="h-5 shrink-0 rounded-full bg-sky-100 px-2 text-[11px] font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                                >
                                  {formatDistanceKmLabel(team.distanceKm)}
                                </Badge>
                              </div>

                              {team.assemblyPointName ? (
                                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <Buildings className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span className="line-clamp-2">
                                    {team.assemblyPointName}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/80 px-3 py-4 text-center dark:border-amber-700/60 dark:bg-amber-900/15">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Chưa có đội gần cụm
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-700/80 dark:text-amber-300/80">
                            Hệ thống chưa trả về đội cứu hộ phù hợp trong bán
                            kính điều phối. Bạn vẫn có thể dựng kế hoạch, nhưng
                            chưa thể xác nhận nhiệm vụ.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <Separator />

                  {/* Nearby depots for drag/drop supply planning */}
                  <section>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Storefront className="h-3 w-3" weight="fill" />
                          Kho gần cụm SOS
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Kéo vật phẩm từ kho khả dụng vào các bước lấy, giao
                          hoặc trả vật phẩm ở bên phải.
                        </p>
                      </div>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {nearbyDepots.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {isNearbyDepotsLoading ? (
                        Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton
                            key={`nearby-depot-skeleton-${index}`}
                            className="h-56 rounded-2xl"
                          />
                        ))
                      ) : isNearbyDepotsError ? (
                        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/80 px-3 py-3 text-xs text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-300">
                          {getErrorMessage(
                            nearbyDepotsError,
                            "Không thể tải danh sách kho gần cụm.",
                          )}
                        </div>
                      ) : hasNearbyDepots ? (
                        nearbyDepots.map((depot) => (
                          <NearbyDepotInventoryCard
                            key={depot.id}
                            depot={depot}
                          />
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center">
                          <p className="text-sm font-semibold text-foreground">
                            Chưa có kho khả dụng gần cụm
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Backend không trả về kho `Available` còn hàng trong
                            bán kính điều phối cho cụm này.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <Separator />
                </div>
              </ScrollArea>
            </div>

            <div
              onMouseDown={handleMouseDown}
              className="h-full w-2 shrink-0 cursor-col-resize select-none bg-border/50 transition-colors hover:bg-primary/20 active:bg-primary/30"
              aria-label="Kéo để thay đổi độ rộng bảng tham chiếu"
              role="separator"
              aria-orientation="vertical"
            >
              <div className="flex h-full items-center justify-center">
                <DotsSixVertical
                  className="h-5 w-5 text-muted-foreground"
                  weight="bold"
                />
              </div>
            </div>

            {/* ── Right Panel: Timeline + Mission Config ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {selectedSOSRequest ? (
                    <section className="rounded-2xl border border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.96)_0%,rgba(255,255,255,0.98)_100%)] p-4 shadow-sm dark:border-rose-800/50 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.22)_0%,rgba(15,23,42,0.95)_100%)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <Warning
                                className="h-3.5 w-3.5 text-rose-500"
                                weight="fill"
                              />
                              SOS đang theo dõi
                            </h3>
                            <Badge
                              variant={
                                PRIORITY_BADGE_VARIANT[
                                  selectedSOSRequest.priority
                                ]
                              }
                              className="h-5 rounded-full px-2 text-[11px] font-semibold"
                            >
                              {PRIORITY_LABELS[selectedSOSRequest.priority]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 rounded-full px-2 text-[11px] font-semibold",
                                getSOSStatusClassName(
                                  selectedSOSRequest.status,
                                ),
                              )}
                            >
                              {formatSOSStatusLabel(selectedSOSRequest.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-base font-bold text-foreground">
                              SOS #{selectedSOSRequest.id}
                            </p>
                            <Badge
                              variant="outline"
                              className="h-6 rounded-full px-2 text-xs"
                            >
                              {formatSOSTypeLabel(selectedSOSRequest.sosType)}
                            </Badge>
                            {selectedSOSSituation ? (
                              <Badge
                                variant="outline"
                                className="h-6 rounded-full px-2 text-xs"
                              >
                                {selectedSOSSituation}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-foreground/80">
                            {selectedSOSNarrative}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-sm"
                            onClick={handleCopySelectedSOSCoordinates}
                          >
                            <CopySimple className="h-3.5 w-3.5" />
                            Sao chép tọa độ
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1.5 text-sm"
                            onClick={() =>
                              handleSOSLocationFill(
                                selectedSOSRequest.location.lat,
                                selectedSOSRequest.location.lng,
                              )
                            }
                          >
                            <MapPin className="h-3.5 w-3.5" weight="fill" />
                            Dùng tọa độ cho bước tiếp theo
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Tổng người
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {selectedSOSPeopleTotal ?? "Chưa rõ"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Trẻ em / Người già
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {selectedSOSRequest.peopleCount
                              ? `${selectedSOSRequest.peopleCount.child}/${selectedSOSRequest.peopleCount.elderly}`
                              : "Chưa rõ"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Chờ xử lý
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {selectedSOSWaitTimeLabel ?? "Vừa gửi"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Người bị thương
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {selectedSOSRequest.hasInjured
                              ? "Có"
                              : "Chưa ghi nhận"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
                        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                          <p className="text-sm font-semibold text-foreground">
                            Tóm tắt yêu cầu
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {selectedSOSNeedBadges.length > 0 ? (
                              selectedSOSNeedBadges.map((badge) => (
                                <Badge
                                  key={`selected-sos-need-${badge}`}
                                  variant="outline"
                                  className="rounded-full px-2 py-0.5 text-xs"
                                >
                                  {badge}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Chưa có cờ nhu cầu nhanh.
                              </span>
                            )}
                          </div>

                          {(selectedSOSMedicalIssues.length > 0 ||
                            selectedSOSSupplies.length > 0) && (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {selectedSOSMedicalIssues.length > 0 ? (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Vấn đề y tế
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedSOSMedicalIssues.map((issue) =>
                                      issue ? (
                                        <Badge
                                          key={`medical-${issue}`}
                                          variant="outline"
                                          className="rounded-full px-2 py-0.5 text-xs"
                                        >
                                          {issue}
                                        </Badge>
                                      ) : null,
                                    )}
                                  </div>
                                </div>
                              ) : null}

                              {selectedSOSSupplies.length > 0 ? (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Vật phẩm cần
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedSOSSupplies.map((supply) =>
                                      supply ? (
                                        <Badge
                                          key={`supply-${supply}`}
                                          variant="outline"
                                          className="rounded-full px-2 py-0.5 text-xs"
                                        >
                                          {supply}
                                        </Badge>
                                      ) : null,
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                          <p className="text-sm font-semibold text-foreground">
                            Vị trí và liên hệ
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-medium text-foreground">
                                  {selectedSOSRequest.location.lat.toFixed(4)},{" "}
                                  {selectedSOSRequest.location.lng.toFixed(4)}
                                </p>
                                {selectedSOSRequest.address ? (
                                  <p className="mt-0.5 leading-relaxed">
                                    {selectedSOSRequest.address}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {(selectedSOSRequest.victimPhone ||
                              selectedSOSRequest.reporterPhone) && (
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1">
                                  {selectedSOSRequest.victimPhone ? (
                                    <p>
                                      Nạn nhân:{" "}
                                      <span className="font-medium text-foreground">
                                        {selectedSOSRequest.victimName ||
                                          "Chưa rõ tên"}
                                        {" • "}
                                        {selectedSOSRequest.victimPhone}
                                      </span>
                                    </p>
                                  ) : null}
                                  {selectedSOSRequest.reporterPhone ? (
                                    <p>
                                      Người báo tin:{" "}
                                      <span className="font-medium text-foreground">
                                        {selectedSOSRequest.reporterName ||
                                          "Chưa rõ tên"}
                                        {" • "}
                                        {selectedSOSRequest.reporterPhone}
                                      </span>
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-2 text-muted-foreground">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-medium text-foreground">
                                  {new Date(
                                    selectedSOSRequest.createdAt,
                                  ).toLocaleString("vi-VN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <p className="mt-0.5">
                                  {selectedSOSRequest.reporterIsOnline === true
                                    ? "Người báo tin đang online"
                                    : selectedSOSRequest.reporterIsOnline ===
                                        false
                                      ? "Người báo tin đang offline"
                                      : "Chưa có trạng thái kết nối"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                      Chưa có SOS nào trong cụm để hiển thị chi tiết.
                    </section>
                  )}

                  <div className="rounded-2xl border border-amber-300/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.95)_0%,rgba(255,255,255,0.98)_100%)] p-4 shadow-sm dark:border-amber-700/60 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.25)_0%,rgba(15,23,42,0.95)_100%)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <PencilSimpleLine
                            className="h-4 w-4 text-amber-600"
                            weight="fill"
                          />
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                            Tạo kế hoạch cứu hộ thủ công
                          </span>
                        </div>
                        <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                          Sắp xếp trình tự triển khai, gán đội phụ trách và kéo
                          vật phẩm thực tế từ các kho gần cụm để tạo nhiệm vụ.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="h-6 rounded-full px-2"
                        >
                          {activities.length} bước
                        </Badge>
                        <Badge
                          variant="outline"
                          className="h-6 rounded-full px-2"
                        >
                          {teamOptions.length} đội gần cụm
                        </Badge>
                        <Badge
                          variant="outline"
                          className="h-6 rounded-full px-2"
                        >
                          {nearbyDepots.length} kho gần cụm
                        </Badge>
                      </div>
                    </div>

                    {(!hasNearbyTeams || !hasNearbyDepots) && (
                      <div className="mt-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-100/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
                        <p className="flex items-start gap-1.5 leading-relaxed">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {!hasNearbyTeams
                              ? "Chưa có đội gần cụm nên nhiệm vụ chưa thể xác nhận cho đến khi mỗi bước được gán một đội hợp lệ."
                              : "Cụm này hiện chưa có kho khả dụng gần đó. Bạn vẫn có thể cấu hình bước, nhưng không thể kéo vật phẩm từ danh sách kho."}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <section className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Rocket className="h-3.5 w-3.5" weight="fill" />
                          Cấu hình nhiệm vụ
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Thiết lập loại nhiệm vụ, mức ưu tiên và khung thời
                          gian triển khai trước khi xác nhận.
                        </p>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-2 text-xs sm:w-auto sm:min-w-55">
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <p className="uppercase tracking-[0.14em] text-muted-foreground">
                            Loại
                          </p>
                          <p className="mt-1 font-semibold text-foreground">
                            {missionType}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <p className="uppercase tracking-[0.14em] text-muted-foreground">
                            Ưu tiên
                          </p>
                          <p className="mt-1 font-semibold text-foreground">
                            {priorityScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                          <p className="uppercase tracking-[0.14em] text-muted-foreground">
                            Tiến độ
                          </p>
                          <p className="mt-1 font-semibold text-foreground">
                            {activities.length} bước
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                        <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                          Loại nhiệm vụ
                        </Label>
                        <Select
                          value={missionType}
                          onValueChange={(value) =>
                            setMissionType(value as MissionType)
                          }
                        >
                          <SelectTrigger className="mt-2 h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-1200">
                            <SelectItem value="RESCUE">Cứu hộ</SelectItem>
                            <SelectItem value="RELIEF">Cứu trợ</SelectItem>
                            <SelectItem value="MIXED">Tổng hợp</SelectItem>
                            <SelectItem value="RESCUER">Cứu hộ viên</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Loại nhiệm vụ sẽ định hướng cách đặt hoạt động và vật
                          tư trong timeline.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                        <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                          Điểm ưu tiên
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          step={0.1}
                          value={priorityScore}
                          onChange={(e) => {
                            const nextPriority =
                              parseFloat(e.target.value) || 1;
                            setPriorityScore(
                              Math.max(1, Math.min(10, nextPriority)),
                            );
                          }}
                          name="mission-priority-score"
                          autoComplete="off"
                          className="mt-2 h-10 text-sm"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Dùng thang điểm từ 1 đến 10 để phản ánh mức khẩn cấp.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                        <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                          Bắt đầu
                        </Label>
                        <Input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          name="mission-start-time"
                          autoComplete="off"
                          className="mt-2 h-10 text-sm"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Chọn thời điểm đội bắt đầu di chuyển hoặc tập kết.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                        <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                          Kết thúc dự kiến
                        </Label>
                        <Input
                          type="datetime-local"
                          value={expectedEndTime}
                          onChange={(e) => setExpectedEndTime(e.target.value)}
                          name="mission-expected-end-time"
                          autoComplete="off"
                          className="mt-2 h-10 text-sm"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Hệ thống dùng mốc này để theo dõi tiến độ và cảnh báo
                          trễ hạn.
                        </p>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ListChecks className="h-3.5 w-3.5" weight="bold" />
                        Các bước thực hiện
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm h-5 px-2">
                          {activities.length} bước
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-sm gap-1 border-dashed"
                          onClick={handleAddActivity}
                        >
                          <Plus className="h-3 w-3" weight="bold" />
                          Thêm bước
                        </Button>
                      </div>
                    </div>

                    <TimelineDropZone isEmpty={activities.length === 0}>
                      <SortableContext
                        items={sortableIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {activities.map((activity, index) => (
                          <SortableActivityCard
                            key={activity.id}
                            activity={activity}
                            index={index}
                            isLast={index === activities.length - 1}
                            isRecentlyInserted={
                              recentlyInsertedActivityId === activity.id
                            }
                            onUpdate={handleUpdateActivity}
                            onRemove={handleRemoveActivity}
                            onAddSupply={handleAddSupplyToActivity}
                            onUpdateSupplyQuantity={handleUpdateSupplyQuantity}
                            onRemoveSupply={handleRemoveSupplyFromActivity}
                            teamOptions={teamOptions}
                            clusterSOSRequests={clusterSOSRequests}
                          />
                        ))}
                      </SortableContext>
                    </TimelineDropZone>
                  </section>
                </div>
              </ScrollArea>

              {/* ── Footer Actions ── */}
              <div className="flex items-center justify-between gap-3 border-t bg-background p-4 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-sm"
                >
                  Hủy bỏ
                </Button>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm text-muted-foreground">
                    {activities.length} hoạt động
                    {!hasNearbyTeams
                      ? " • cần đội gần cụm"
                      : !hasAssignedTeamsForAllSteps
                        ? " • chưa gán đủ đội"
                        : ""}
                  </span>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 bg-linear-to-r from-[#FF5722] to-orange-600 hover:from-[#E64A19] hover:to-orange-700 text-white shadow-sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canSubmitMission}
                  >
                    {isSubmitting ? (
                      <>
                        <CircleNotch className="h-4 w-4 animate-spin" />
                        {isEditingExisting ? "Đang cập nhật…" : "Đang tạo…"}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" weight="fill" />
                        {isEditingExisting
                          ? "Cập nhật nhiệm vụ"
                          : "Xác nhận nhiệm vụ"}
                      </>
                    )}
                  </Button>
                  {!canSubmitMission ? (
                    <p className="text-xs text-muted-foreground">
                      Cần ít nhất 1 bước và mỗi bước phải có đội cứu hộ hợp lệ.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* ── Drag Overlay ── */}
          <DragOverlay
            dropAnimation={
              activeId?.startsWith(PALETTE_PREFIX) ? null : undefined
            }
          >
            {activeId && activeDragType ? (
              <DragOverlayContent type={activeDragType} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default ManualMissionBuilder;
