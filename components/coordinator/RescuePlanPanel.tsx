"use client";

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ComponentType,
} from "react";
import gsap from "gsap";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { RescuePlanPanelProps } from "@/type";
import polylineDecode from "@mapbox/polyline";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import { GoongLeafletLayer } from "@/components/GoongLeafletLayer";
import { MapInvalidator } from "./MapInvalidator";
import { divIcon, tileLayer } from "leaflet";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
} from "@/lib/constants";
import {
  getClothingGenderLabel,
  getFoodDurationLabel,
  getMedicalIssueLabel,
  getMedicalSupportNeedLabel,
  getPersonTypeLabel,
  getSituationLabel,
  getSupplyLabel,
  getWaterDurationLabel,
} from "@/lib/sos";
import {
  analyzeMissionSupplyBalance,
  getSupplyIdentity,
  type SupplyBalanceIssue,
} from "@/lib/mission-supply-balance";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS } from "@/lib/priority";
import {
  formatSupplyBufferPercent,
  getSupplyBufferPercentInputValue,
  resolveSupplyBufferRatio,
  supplyBufferPercentToRatio,
} from "@/lib/supply-buffer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateMission,
  useMissions,
  useMissionActivities,
  useActivityRoute,
  useMissionTeamRoute,
  useUpdateMission,
} from "@/services/mission/hooks";
import {
  useRescueTeamStatuses,
  useRescueTeamsByCluster,
} from "@/services/rescue_teams/hooks";
import {
  useAssemblyPointMetadata,
  useAssemblyPoints,
} from "@/services/assembly_points/hooks";
import { useDepotInventoryRealtime } from "@/hooks/useDepotInventoryRealtime";
import { useMissionRealtime } from "@/hooks/useMissionRealtime";
import { getActivityRoute } from "@/services/mission/api";
import type {
  MissionActivity,
  MissionEntity,
  MissionTeamRouteLeg,
  MissionTeamRouteWaypoint,
  MissionType,
  MissionTeam,
  RouteVehicle,
} from "@/services/mission/type";
import {
  useAiMissionStream,
  useMissionSuggestions,
  useAlternativeDepots,
} from "@/services/sos_cluster/hooks";
import {
  ClusterSuggestedActivity,
  ClusterActivityType,
  ClusterSupplyCollection,
  ClusterSupplyShortage,
  ClusterSuggestedResource,
  ClusterRescueSuggestionResponse,
  MissionSuggestionEntity,
  AlternativeDepot,
  ClusterTargetVictim,
} from "@/services/sos_cluster/type";
import { useDepotInventory } from "@/services/inventory/hooks";
import { useSOSRequestAnalysis } from "@/services/sos_request/hooks";
import type {
  RescueTeamByClusterEntity,
  RescueTeamStatusKey,
} from "@/services/rescue_teams/type";
import { SOSRequest } from "@/type";
import {
  X,
  Rocket,
  Clock,
  CheckCircle,
  Lightning,
  Package,
  Warning,
  ShieldCheck,
  ListChecks,
  Cube,
  MapPin,
  TreeStructure,
  ArrowsClockwise,
  ClockCounterClockwise,
  CircleNotch,
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  Storefront,
  Info,
  PencilSimpleLine,
  Trash,
  Plus,
  FloppyDisk,
  DotsSixVertical,
  Path,
  NavigationArrow,
  Users,
  User,
  Phone,
  FirstAid,
  ForkKnife,
  WarehouseIcon,
  Truck,
  Eye,
  Sparkle,
  Brain,
  Camera,
  UserFocus,
} from "@phosphor-icons/react";
import { Icon } from "@iconify/react";

/* ═══ Activity icon map ═══ */
const activityIconMap: Record<
  string,
  ComponentType<{ className?: string; weight?: string }>
> = {
  COLLECT_SUPPLIES: Package,
  DELIVER_SUPPLIES: Truck,
  RESCUE: (props) => (
    <Icon icon="fluent-emoji-high-contrast:rescue-workers-helmet" {...props} />
  ),
  MEDICAL_AID: FirstAid,
  EVACUATE: Users,
  ASSESS: Eye,
  COORDINATE: TreeStructure,
  RETURN_SUPPLIES: ArrowsClockwise,
  RETURN_ASSEMBLY_POINT: MapPin,
  RETURN_TO_ASSEMBLY_POINT: MapPin,
  RETURN_ASSEMBLY: MapPin,
  MIXED: Sparkle,
};

// Extract lat/lng from activity description text
// Matches patterns like "17.214, 106.785" or "17.2195,106.792"
const COORD_REGEX = /(\d{1,2}\.\d{2,6})[,\s]\s*(\d{2,3}\.\d{2,6})/;
const CLEAR_ACTIVITY_TEAM_VALUE = "__clear_activity_team__";
const DEPOT_INVENTORY_PAGE_SIZE = 6;
const DEPOT_INVENTORY_SEARCH_DEBOUNCE_MS = 1000;
const BACKEND_ERROR_STEP_REGEX = /\b(?:bước|step)\s*(\d+)\b/i;
const BACKEND_ERROR_ITEM_ID_REGEX = /\bID\s*=\s*(\d+)\b/i;
const BACKEND_ERROR_ITEM_NAME_REGEX =
  /(?:vật\s*(?:tư|phẩm)|item)\s*['"“”‘’]([^'"“”‘’]+)['"“”‘’]/i;
const BACKEND_ERROR_DEPOT_ID_REGEX = /\bkho\s*#?\s*(\d+)\b/i;

type EditableActivity = ClusterSuggestedActivity & {
  _id: string;
  _missionActivityId?: number | null;
  _missionStatus?: string | null;
  _autoSyncedDeliveryStep?: boolean;
};

type EditActivityErrorState = {
  message: string;
  matchedBy: "step" | "item" | "depot" | "item+depot";
};

type MixedMissionOverrideState = {
  suggestionPreviewId: string;
  sourceSuggestionId: number | null;
  warningMessage: string;
  overrideReason: string;
};

type EditActivityGroup = {
  id: string;
  groupingKey: string;
  sosRequestId: number | null;
  matchedSOS: SOSRequest | null;
  locationName: string | null;
  coordinateKey: string | null;
  coordinateLabel: string | null;
  startIndex: number;
  endIndex: number;
  activities: Array<{ activity: EditableActivity; index: number }>;
};

type SidebarDepotEntry = {
  depotId: number;
  depotName: string;
  depotAddress: string | null;
  kind: "primary" | "alternative";
  sourceReason?: string | null;
};

type AssemblyPointOptionEntry = {
  id: number;
  name: string;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
};

function getAssemblyPointTargetStatusLabel(status: string | null): string {
  switch (status) {
    case "Created":
      return "Mới tạo";
    case "Available":
      return "Sẵn sàng";
    case "PendingUnavailable":
      return "Chờ điều phối lại";
    case "Unavailable":
      return "Không khả dụng";
    case "Closed":
      return "Đã đóng";
    default:
      return status ?? "Không xác định";
  }
}

type BackendActivityErrorClues = {
  step: number | null;
  itemId: number | null;
  itemName: string | null;
  depotId: number | null;
};

type SuggestionPreview = {
  id: string;
  sourceSuggestionId: number | null;
  sourceKind: "saved" | "stream" | "split";
  isSuccess: boolean | null;
  errorMessage: string | null;
  responseTimeMs: number | null;
  sosRequestCount: number | null;
  suggestedMissionTitle: string | null;
  suggestedMissionType: string | null;
  suggestedPriorityScore: number | null;
  suggestedSeverityLevel: string | null;
  confidenceScore: number | null;
  overallAssessment: string | null;
  estimatedDuration: string | null;
  specialNotes: string | null;
  mixedRescueReliefWarning: string | null;
  needsManualReview: boolean;
  lowConfidenceWarning: string | null;
  needsAdditionalDepot: boolean;
  multiDepotRecommended: boolean;
  supplyShortages: ClusterSupplyShortage[];
  suggestedResources: ClusterSuggestedResource[];
  suggestedActivities: ClusterSuggestedActivity[];
  createdAt: string | null;
  modelName: string | null;
  suggestionScope: string | null;
};

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateTimeLocalInputValue(date: Date): string {
  return (
    [
      date.getFullYear(),
      padTwoDigits(date.getMonth() + 1),
      padTwoDigits(date.getDate()),
    ].join("-") +
    `T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`
  );
}

function formatMissionTimeRangeLabel(
  startTime: string | Date,
  endTime: string | Date,
): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const startDateLabel = `${padTwoDigits(start.getDate())}/${padTwoDigits(start.getMonth() + 1)}`;
  const startTimeLabel = `${padTwoDigits(start.getHours())}:${padTwoDigits(start.getMinutes())}`;
  const endDateLabel = `${padTwoDigits(end.getDate())}/${padTwoDigits(end.getMonth() + 1)}`;
  const endTimeLabel = `${padTwoDigits(end.getHours())}:${padTwoDigits(end.getMinutes())}`;

  if (sameDay) {
    return `${startDateLabel}, ${startTimeLabel} - ${endTimeLabel}`;
  }

  return `${startDateLabel}, ${startTimeLabel} - ${endDateLabel}, ${endTimeLabel}`;
}

const AI_STEP_TRANSLATIONS: Record<string, string> = {
  COLLECT_SUPPLIES: "Tiếp nhận vật phẩm",
  DELIVER_SUPPLIES: "Phân phát vật phẩm",
  RESCUE: "Cứu hộ",
  EVACUATE: "Sơ tán",
  RETURN_SUPPLIES: "Hoàn trả vật phẩm",
  MOVE_TO_LOCATION: "Di chuyển",
  SOS_SUPPORT: "Hỗ trợ SOS",
  MEDICAL_AID: "Hỗ trợ y tế",
};

// Standalone English terms the AI may inject verbatim into note/warning strings.
// Order matters: longer/more-specific keys must come before shorter ones.
const AI_INLINE_TERM_TRANSLATIONS: [RegExp, string][] = [
  [
    /\bREUSABLE_FIELD_USE_BEFORE_RETURN\b/g,
    "dùng vật dụng tái sử dụng trước khi hoàn trả",
  ],
  [/\bCOLLECT_SUPPLIES\b/g, "Tiếp nhận vật phẩm"],
  [/\bDELIVER_SUPPLIES\b/g, "Phân phát vật phẩm"],
  [/\bRETURN_SUPPLIES\b/g, "Hoàn trả vật phẩm"],
  [/\bMOVE_TO_LOCATION\b/g, "Di chuyển"],
  [/\bSOS_SUPPORT\b/g, "Hỗ trợ SOS"],
  [/\bMEDICAL_AID\b/g, "Hỗ trợ y tế"],
  [/\bCOLLECT\b/g, "Tiếp nhận"],
  [/\bDELIVER\b/g, "Phân phát"],
  [/\bRESCUE\b/g, "Cứu hộ"],
  [/\bEVACUATE\b/g, "Sơ tán"],
  [/\b[Cc]oordinator\b/g, "người điều phối"],
];

function translateAIText(text: string): string {
  if (!text) return text;
  let result = text
    .replace(
      /Activity step (\d+) \(([^)]+)\)/g,
      (match, step, type) =>
        `Bước ${step} (${AI_STEP_TRANSLATIONS[type] || type})`,
    )
    .replace(/team_id=(\d+)/g, "đội ID $1")
    .replace(
      /pool nearby teams/g,
      "danh sách đội cứu hộ được quét xung quanh khu vực",
    );
  for (const [pattern, replacement] of AI_INLINE_TERM_TRANSLATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function FormattedAINotes({
  text,
  textClassName,
}: {
  text: string;
  textClassName?: string;
}) {
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        if (line.includes("[CẦN REVIEW THỦ CÔNG]")) {
          const content = line.replace("[CẦN REVIEW THỦ CÔNG]", "").trim();
          const items = content
            .split("|")
            .map((i) => i.trim())
            .filter(Boolean);
          return (
            <div
              key={idx}
              className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-md p-3"
            >
              <h5 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2.5 flex items-center gap-1.5">
                <Warning className="w-4 h-4" weight="fill" />
                CẦN XEM LẠI THỦ CÔNG
              </h5>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-red-600/90 dark:text-red-400/90 leading-relaxed">
                {items.map((item, i) => (
                  <li key={i}>{translateAIText(item)}</li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p
            key={idx}
            className={
              textClassName || "text-sm text-foreground/80 leading-relaxed"
            }
          >
            {translateAIText(line)}
          </p>
        );
      })}
    </div>
  );
}

function normalizeErrorLookupValue(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeActivityReportImageUrl(
  imageUrl?: string | null,
): string | null {
  const trimmed = imageUrl?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }

  return null;
}

function normalizeMissionActivityStatusKey(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

function isPlannedMissionActivityStatus(status?: string | null): boolean {
  const normalizedStatus = normalizeMissionActivityStatusKey(status);
  return normalizedStatus === "planned";
}

function isOngoingMissionActivityStatus(status?: string | null): boolean {
  const normalizedStatus = normalizeMissionActivityStatusKey(status);
  return normalizedStatus === "ongoing" || normalizedStatus === "inprogress";
}

function normalizeActivityTypeKey(activityType?: string | null): string {
  return (activityType ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

function isReturnAssemblyPointActivityType(
  activityType?: string | null,
): boolean {
  const normalizedType = normalizeActivityTypeKey(activityType);
  return (
    normalizedType === "returnassemblypoint" ||
    normalizedType === "returntoassemblypoint" ||
    normalizedType === "returnassembly"
  );
}

function extractBackendActivityErrorClues(
  message: string,
): BackendActivityErrorClues {
  const stepMatch = message.match(BACKEND_ERROR_STEP_REGEX);
  const itemIdMatch = message.match(BACKEND_ERROR_ITEM_ID_REGEX);
  const itemNameMatch = message.match(BACKEND_ERROR_ITEM_NAME_REGEX);
  const depotIdMatch = message.match(BACKEND_ERROR_DEPOT_ID_REGEX);

  return {
    step: stepMatch ? Number(stepMatch[1]) : null,
    itemId: itemIdMatch ? Number(itemIdMatch[1]) : null,
    itemName: itemNameMatch?.[1]?.trim() || null,
    depotId: depotIdMatch ? Number(depotIdMatch[1]) : null,
  };
}

function resolveEditActivityErrorsFromBackendMessage(
  message: string,
  activities: EditableActivity[],
): Record<string, EditActivityErrorState> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return {};
  }

  const clues = extractBackendActivityErrorClues(trimmedMessage);
  if (clues.step != null) {
    const matchedActivity = activities.find(
      (activity) => activity.step === clues.step,
    );
    if (matchedActivity) {
      return {
        [matchedActivity._id]: {
          message: trimmedMessage,
          matchedBy: "step",
        },
      };
    }
  }

  const normalizedItemName = normalizeErrorLookupValue(clues.itemName);
  let bestScore = 0;
  let matchedActivities: EditableActivity[] = [];

  for (const activity of activities) {
    let score = 0;

    if (
      clues.depotId != null &&
      typeof activity.depotId === "number" &&
      activity.depotId === clues.depotId
    ) {
      score += 2;
    }

    for (const supply of activity.suppliesToCollect ?? []) {
      if (clues.itemId != null && supply.itemId === clues.itemId) {
        score += 4;
        continue;
      }

      if (!normalizedItemName) {
        continue;
      }

      const normalizedSupplyName = normalizeErrorLookupValue(supply.itemName);
      if (
        normalizedSupplyName &&
        (normalizedSupplyName.includes(normalizedItemName) ||
          normalizedItemName.includes(normalizedSupplyName))
      ) {
        score += 3;
      }
    }

    if (score <= 0) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      matchedActivities = [activity];
      continue;
    }

    if (score === bestScore) {
      matchedActivities.push(activity);
    }
  }

  if (matchedActivities.length === 0) {
    return {};
  }

  const matchedBy: EditActivityErrorState["matchedBy"] =
    (clues.itemId != null || normalizedItemName) && clues.depotId != null
      ? "item+depot"
      : clues.itemId != null || normalizedItemName
        ? "item"
        : "depot";

  return Object.fromEntries(
    matchedActivities.map((activity) => [
      activity._id,
      {
        message: trimmedMessage,
        matchedBy,
      },
    ]),
  );
}

function getEditActivityErrorLabel(
  matchedBy: EditActivityErrorState["matchedBy"],
): string {
  if (matchedBy === "step") {
    return "Backend báo lỗi trực tiếp ở bước này";
  }

  if (matchedBy === "item+depot") {
    return "Backend báo lỗi ở vật phẩm/kho của bước này";
  }

  if (matchedBy === "item") {
    return "Backend báo lỗi ở vật phẩm của bước này";
  }

  return "Backend báo lỗi ở kho của bước này";
}

const extractCoordsFromDescription = (
  desc: string,
): { lat: number; lng: number } | null => {
  const match = desc.match(COORD_REGEX);
  if (!match) return null;
  const a = parseFloat(match[1]);
  const b = parseFloat(match[2]);
  // Vietnam latitude ~8-24, longitude ~100-115
  if (a >= 8 && a <= 24 && b >= 100 && b <= 115) return { lat: a, lng: b };
  if (b >= 8 && b <= 24 && a >= 100 && a <= 115) return { lat: b, lng: a };
  return null;
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  RESCUE: "Cứu hộ",
  MEDICAL: "Y tế",
  LOGISTICS: "Hậu cần",
  BOAT: "Đội thuyền",
  EVACUATION: "Sơ tán",
  FIREFIGHTER: "Cứu hỏa",
  SEARCH_AND_RESCUE: "Tìm kiếm cứu nạn",
};

const MISSION_TYPE_LABELS: Record<string, string> = {
  RESCUE: "Cứu hộ",
  RESCUER: "Cứu hộ",
  RELIEF: "Cứu trợ",
  EVACUATION: "Sơ tán",
  EVACUATE: "Sơ tán",
  MEDICAL: "Y tế",
  SUPPLY: "Cứu trợ",
  MIXED: "Tổng hợp",
  RETURN_ASSEMBLY_POINT: "Quay về điểm tập kết",
  RETURN_TO_ASSEMBLY_POINT: "Quay về điểm tập kết",
  RETURN_ASSEMBLY: "Quay về điểm tập kết",
};

const MISSION_TYPE_BADGE_CLASSNAMES: Record<string, string> = {
  RESCUE:
    "border-[#FF5722]/40 bg-[#FF5722]/10 text-[#C2410C] dark:border-[#FF5722]/45 dark:bg-[#FF5722]/20 dark:text-[#FDBA74]",
  RESCUER:
    "border-[#FF5722]/40 bg-[#FF5722]/10 text-[#C2410C] dark:border-[#FF5722]/45 dark:bg-[#FF5722]/20 dark:text-[#FDBA74]",
  RELIEF:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SUPPLY:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  MEDICAL:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  EVACUATION:
    "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  EVACUATE:
    "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  MIXED:
    "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  RETURN_ASSEMBLY_POINT:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  RETURN_TO_ASSEMBLY_POINT:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  RETURN_ASSEMBLY:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

const normalizeMissionTypeKey = (missionType?: string | null) =>
  (missionType ?? "").trim().toUpperCase();

const formatTeamTypeLabel = (teamType?: string | null) => {
  if (!teamType) return "Chưa rõ";
  const normalized = teamType.trim().toUpperCase();
  return TEAM_TYPE_LABELS[normalized] ?? teamType;
};

const formatMissionTypeLabel = (missionType?: string | null) => {
  if (!missionType) return "Chưa rõ";
  const normalized = normalizeMissionTypeKey(missionType);
  return MISSION_TYPE_LABELS[normalized] ?? missionType;
};

const getMissionTypeBadgeClassName = (missionType?: string | null) => {
  const normalized = normalizeMissionTypeKey(missionType);
  return (
    MISSION_TYPE_BADGE_CLASSNAMES[normalized] ??
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
  );
};

const normalizeEditMissionType = (value?: string | null): MissionType => {
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
};

function trimToNull(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatExecutionModeLabel(value?: string | null): string | null {
  const normalized = trimToNull(value)?.toUpperCase();
  if (!normalized) return null;

  const labels: Record<string, string> = {
    SINGLE_TEAM: "Một đội",
    SPLIT_ACROSS_TEAMS: "Chia nhiều đội",
    SPLITACROSSTEAMS: "Chia nhiều đội",
    PARALLEL: "Song song",
    SEQUENTIAL: "Tuần tự",
  };

  return (
    labels[normalized] ?? labels[normalized.replace(/[\s_-]+/g, "")] ?? value!
  );
}

function isSplitAcrossTeams(value?: string | null): boolean {
  const normalized = trimToNull(value)
    ?.toLowerCase()
    .replace(/[\s_-]+/g, "");
  return normalized === "splitacrossteams" || normalized === "parallel";
}

function getRequiredTeamCount(
  activity: Pick<ClusterSuggestedActivity, "requiredTeamCount">,
): number {
  const count = toFiniteNumber(activity.requiredTeamCount);
  return count != null && count > 0 ? count : 0;
}

function hasSuggestedTeam(
  activity: Pick<ClusterSuggestedActivity, "suggestedTeam">,
): boolean {
  const team = activity.suggestedTeam;
  if (!team) return false;

  const teamId = toFiniteNumber(team.teamId);
  return (
    (teamId != null && teamId > 0) ||
    trimToNull(team.teamName) != null ||
    trimToNull(team.teamType) != null
  );
}

function formatVictimSeverityLabel(value?: string | null): string | null {
  const normalized = trimToNull(value)?.toUpperCase();
  if (!normalized) return null;

  const labels: Record<string, string> = {
    LOW: "Nhẹ",
    MILD: "Nhẹ",
    MODERATE: "Trung bình",
    HIGH: "Nặng",
    SEVERE: "Nặng",
    CRITICAL: "Nguy kịch",
  };

  return labels[normalized] ?? value!;
}

function buildVictimFallbackSummary(
  activity: Pick<
    ClusterSuggestedActivity,
    "targetVictimSummary" | "sosRequestId"
  >,
): string | null {
  return (
    trimToNull(activity.targetVictimSummary) ??
    (activity.sosRequestId != null
      ? `Nạn nhân thuộc SOS #${activity.sosRequestId}`
      : null)
  );
}

function getVictimDisplayName(victim: ClusterTargetVictim): string {
  const name = trimToNull(victim.displayName);
  if (name) return name;

  const personType = trimToNull(victim.personType);
  const index = toFiniteNumber(victim.index);
  if (personType && index != null && index > 0) {
    return `${getPersonTypeLabel(personType)} ${index}`;
  }

  return "Nạn nhân";
}

// For single-victim activities, targetVictimSummary (e.g. "Ông Khoa (người lớn)")
// is more accurate than the generic per-victim displayName (e.g. "Người lớn 1").
function resolveVictimName(
  victim: ClusterTargetVictim,
  activityVictimSummary: string | null | undefined,
  totalVictims: number,
): string {
  if (totalVictims === 1) {
    const summary = trimToNull(activityVictimSummary);
    if (summary) {
      // Strip trailing " (type)" suffix — type is already shown as a separate badge
      return summary.replace(/\s*\([^)]*\)$/, "").trim() || summary;
    }
  }
  return getVictimDisplayName(victim);
}

function getVictimMedicalIssues(victim: ClusterTargetVictim): string[] {
  return Array.isArray(victim.medicalIssues)
    ? victim.medicalIssues.filter(
        (issue): issue is string =>
          typeof issue === "string" && issue.trim().length > 0,
      )
    : [];
}

function getActivityExecutionWarning(
  activity: Pick<
    ClusterSuggestedActivity,
    "executionMode" | "requiredTeamCount" | "suggestedTeam"
  >,
): string | null {
  const requiredTeamCount = getRequiredTeamCount(activity);
  if (
    isSplitAcrossTeams(activity.executionMode) &&
    requiredTeamCount > 0 &&
    !hasSuggestedTeam(activity)
  ) {
    return `Cần ${requiredTeamCount} đội nhưng bước này chưa được gán đội.`;
  }

  return null;
}

function ActivityExecutionMeta({
  activity,
  className,
}: {
  activity: ClusterSuggestedActivity;
  className?: string;
}) {
  const executionModeLabel = formatExecutionModeLabel(activity.executionMode);
  const requiredTeamCount = getRequiredTeamCount(activity);
  const warningMessage = getActivityExecutionWarning(activity);

  if (
    !executionModeLabel &&
    requiredTeamCount === 0 &&
    activity.sosRequestId == null &&
    activity.depotId == null &&
    !warningMessage
  ) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {requiredTeamCount > 0 ? (
        <Badge className="h-7 border-emerald-200/50 bg-emerald-50/80 px-2.5 text-[13px] font-semibold text-emerald-700 backdrop-blur-sm dark:border-emerald-800/30 dark:bg-emerald-900/30 dark:text-emerald-300">
          <Users className="mr-1.5 h-3.5 w-3.5" weight="bold" />
          {requiredTeamCount} đội hỗ trợ
        </Badge>
      ) : null}
      {activity.sosRequestId != null ? (
        <Badge className="h-7 border-rose-200/50 bg-rose-50/80 px-2.5 text-[13px] font-semibold text-rose-700 backdrop-blur-sm dark:border-rose-800/30 dark:bg-rose-900/30 dark:text-rose-300">
          <MapPin className="mr-1.5 h-3.5 w-3.5" weight="fill" />
          SOS #{activity.sosRequestId}
        </Badge>
      ) : null}
      {activity.depotId != null ? (
        <Badge className="h-7 border-amber-300/50 bg-amber-50/80 px-2.5 text-[13px] font-semibold text-amber-700 backdrop-blur-sm dark:border-amber-700/30 dark:bg-amber-900/30 dark:text-amber-300">
          <WarehouseIcon className="mr-1.5 h-3.5 w-3.5" weight="fill" />
          Kho #{activity.depotId}
        </Badge>
      ) : null}
      {warningMessage ? (
        <Badge className="h-7 border-amber-300/50 bg-amber-50/80 px-2.5 text-[13px] font-semibold text-amber-700 backdrop-blur-sm dark:border-amber-700/30 dark:bg-amber-900/30 dark:text-amber-300">
          <Warning className="mr-1.5 h-3.5 w-3.5" weight="fill" />
          Chưa gán đội
        </Badge>
      ) : null}
    </div>
  );
}

function ActivityExecutionWarningBlock({
  activity,
  compact = false,
}: {
  activity: Pick<
    ClusterSuggestedActivity,
    "executionMode" | "requiredTeamCount" | "suggestedTeam"
  >;
  compact?: boolean;
}) {
  const warningMessage = getActivityExecutionWarning(activity);
  if (!warningMessage) return null;

  return (
    <div className="mt-2 rounded-md border border-amber-300/80 bg-amber-50/80 px-2.5 py-2 dark:border-amber-700/60 dark:bg-amber-900/20">
      <p
        className={cn(
          "flex items-start gap-1.5 text-amber-800 dark:text-amber-300",
          compact ? "text-sm" : "text-sm leading-relaxed",
        )}
      >
        <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
        {warningMessage}
      </p>
    </div>
  );
}

function CoordinationNotesBlock({
  activity,
  className,
}: {
  activity: Pick<ClusterSuggestedActivity, "coordinationNotes">;
  className?: string;
}) {
  const notes = trimToNull(activity.coordinationNotes);
  if (!notes) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white p-3.5 dark:border-indigo-800/30 dark:from-indigo-950/20 dark:to-background",
        className,
      )}
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        <Sparkle className="h-4 w-4" />
        Ghi chú phối hợp
      </p>
      <p className="text-[13px] font-medium leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
        {notes}
      </p>
    </div>
  );
}

function TargetVictimsBlock({
  activity,
  className,
  compact = false,
}: {
  activity: Pick<
    ClusterSuggestedActivity,
    "targetVictimSummary" | "targetVictims" | "sosRequestId"
  >;
  className?: string;
  compact?: boolean;
}) {
  const victims = Array.isArray(activity.targetVictims)
    ? activity.targetVictims
    : [];
  const fallbackSummary = buildVictimFallbackSummary(activity);

  if (victims.length === 0 && !fallbackSummary) return null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50/40 to-white/50 p-3 transition-all hover:shadow-md dark:border-rose-800/30 dark:from-rose-950/20 dark:to-background",
        className,
      )}
    >
      <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
        <Users className="h-4 w-4" weight="fill" />
        Đối tượng cần hỗ trợ
      </p>
      {victims.length === 0 ? (
        <p className="text-[13px] font-medium leading-relaxed text-rose-700/85 dark:text-rose-200/85">
          {fallbackSummary}
        </p>
      ) : (
        <div className="space-y-2">
          {victims.map((victim, index) => {
            {
              const medicalIssues = getVictimMedicalIssues(victim);
              const personTypeLabel = victim.personType
                ? getPersonTypeLabel(victim.personType)
                : "Nạn nhân";
              const severityLabel = formatVictimSeverityLabel(victim.severity);
              const phone = trimToNull(victim.personPhone);
              const diet = trimToNull(victim.specialDietDescription);
              const clothingGender = trimToNull(victim.clothingGender);

              return (
                <div
                  key={`${victim.personId ?? "victim"}-${index}`}
                  className="rounded-lg border border-rose-100/50 bg-background/80 p-2.5 shadow-sm dark:border-rose-900/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                        <User className="h-3 w-3" weight="bold" />
                      </div>
                      {resolveVictimName(
                        victim,
                        activity.targetVictimSummary,
                        victims.length,
                      )}
                    </span>
                    <Badge className="bg-muted/50 px-1.5 py-0 text-[11px] font-bold text-muted-foreground">
                      {personTypeLabel}
                    </Badge>
                    {victim.isInjured ? (
                      <Badge
                        variant="destructive"
                        className="bg-rose-500/10 px-1.5 py-0 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                      >
                        BỊ THƯƠNG
                        {severityLabel
                          ? `: ${severityLabel.toUpperCase()}`
                          : ""}
                      </Badge>
                    ) : null}
                    {phone ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {phone}
                      </span>
                    ) : null}
                  </div>
                  {!compact &&
                    (medicalIssues.length > 0 ||
                      diet ||
                      victim.clothingNeeded) && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {medicalIssues.slice(0, 4).map((issue) => (
                          <span
                            key={issue}
                            className="inline-flex items-center rounded-md bg-rose-50/80 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          >
                            <FirstAid className="mr-1 h-3 w-3" weight="fill" />
                            {getMedicalIssueLabel(issue)}
                          </span>
                        ))}
                        {diet ? (
                          <span className="rounded-md bg-zinc-100/80 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                            ĂN: {diet.toUpperCase()}
                          </span>
                        ) : null}
                        {victim.clothingNeeded ? (
                          <span className="rounded-md bg-zinc-100/80 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                            QUẦN ÁO
                            {clothingGender
                              ? ` (${getClothingGenderLabel(clothingGender).toUpperCase()})`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

const severityLabel = (value?: string) => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "none" || !normalized) return "Chưa đánh giá";
  if (normalized.includes("high") || normalized.includes("cao")) return "Cao";
  if (normalized.includes("critical") || normalized.includes("nghiêm"))
    return "Nghiêm trọng";
  if (normalized.includes("severe") || normalized.includes("nặng"))
    return "Nghiêm trọng";
  if (normalized.includes("moderate") || normalized.includes("trung"))
    return "Trung bình";
  if (normalized.includes("low") || normalized.includes("nhẹ")) return "Nhẹ";
  return value || "Chưa rõ";
};

const severityBadgeClass = (value?: string) => {
  const normalized = (value || "").toLowerCase();
  if (
    normalized.includes("critical") ||
    normalized.includes("nghiêm") ||
    normalized.includes("severe") ||
    normalized.includes("nặng")
  ) {
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
  }
  if (normalized.includes("high") || normalized.includes("cao")) {
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
  }
  if (normalized.includes("moderate") || normalized.includes("trung")) {
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
  }
  if (normalized.includes("low") || normalized.includes("nhẹ")) {
    return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50";
  }
  return "bg-muted text-muted-foreground border-border";
};

const getMedicalIssueColorClass = (code: string): string => {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const critical = [
    "UNCONSCIOUS",
    "BREATHING_DIFFICULTY",
    "CHEST_PAIN_STROKE",
    "DROWNING",
  ];
  const severe = [
    "SEVERELY_BLEEDING",
    "BLEEDING",
    "BURNS",
    "HEAD_INJURY",
    "CANNOT_MOVE",
  ];
  const moderate = [
    "HIGH_FEVER",
    "DEHYDRATION",
    "FRACTURE",
    "INFANT_NEEDS_MILK",
    "LOST_PARENT",
    "SHOCK",
    "FEVER",
  ];
  const low = [
    "CHRONIC_DISEASE",
    "CONFUSION",
    "NEEDS_MEDICAL_DEVICE",
    "PREGNANCY",
    "MINOR_WOUND",
    "INFECTION",
    "HYPOTHERMIA",
  ];

  if (critical.includes(normalized))
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (severe.includes(normalized))
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
  if (moderate.includes(normalized))
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
  if (low.includes(normalized))
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
};

/**
 * Parse a raw SOS message string (pipe-separated structured format) and return:
 * - missionType: the [TYPE] prefix if present
 * - freeTextNote: the "Ghi chú:" free-text portion (the human-written note)
 * - isStructured: whether the message had a pipe-separated structure
 */
function parseSOSMessageNote(message: string): {
  missionType: string | null;
  freeTextNote: string | null;
  isStructured: boolean;
} {
  if (!message?.trim()) {
    return { missionType: null, freeTextNote: null, isStructured: false };
  }

  if (!message.includes("|")) {
    return {
      missionType: null,
      freeTextNote: message.trim() || null,
      isStructured: false,
    };
  }

  const typeMatch = message.match(/^\s*\[([^\]]+)\]/);
  const missionType = typeMatch ? typeMatch[1].trim() : null;

  // "Ghi chú:" is always the last meaningful segment
  const ghiChuMatch = message.match(/\|\s*Ghi\s*ch[uú]\s*:\s*(.+)$/i);
  const freeTextNote = ghiChuMatch ? ghiChuMatch[1].trim() : null;

  return { missionType, freeTextNote, isStructured: true };
}

/** Normalize a string for dedup comparison (trim, collapse whitespace, lowercase) */
function normalizeForDedup(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const SOSRequestDetailedCard = ({ sos }: { sos: SOSRequest }) => {
  const { data: analysisData } = useSOSRequestAnalysis(Number(sos.id), {
    enabled: !!sos.id && !isNaN(Number(sos.id)),
  });

  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  // Robust data extraction (handling multiple schema versions)
  const structured = (sos as any).structuredData;
  const v3Incident = structured?.incident;
  const v3GroupNeeds = structured?.group_needs;
  const v3Victims = structured?.victims || [];

  const pc = v3Incident?.people_count ||
    sos.peopleCount ||
    structured?.people_count || { adult: 0, child: 0, elderly: 0 };
  const totalPeople = pc.adult + pc.child + pc.elderly;

  const situation =
    v3Incident?.situation || (sos as any).situation || structured?.situation;
  const additionalDesc =
    v3Incident?.additional_description ||
    (sos as any).additionalDescription ||
    structured?.additional_description;
  const address = v3Incident?.address || sos.address || structured?.address;

  const supplies =
    v3GroupNeeds?.supplies ||
    (sos as any).supplies ||
    structured?.supplies ||
    [];
  const otherSupplies =
    v3GroupNeeds?.other_supply_description ||
    (sos as any).otherSupplyDescription ||
    structured?.other_supply_description;

  // Parse the raw message: extract only the free-text "Ghi chú" portion so we
  // don't repeat structured data already shown in the other columns.
  const {
    missionType: parsedMissionType,
    freeTextNote,
    isStructured: messageIsStructured,
  } = parseSOSMessageNote(sos.message);

  // Suppress additionalDesc if it is the same text as what we extracted from the message
  const showAdditionalDesc =
    !!additionalDesc &&
    normalizeForDedup(additionalDesc) !== normalizeForDedup(freeTextNote);

  // Reporter / sender info
  const reporterName = sos.reporterName ?? null;
  const reporterPhone = sos.reporterPhone ?? null;
  const reporterBatteryLevel = (sos as any).reporterBatteryLevel as
    | number
    | null
    | undefined;
  const reporterIsOnline = sos.reporterIsOnline;
  const isSentOnBehalf = sos.isSentOnBehalf ?? false;
  const companions =
    ((sos as any).companions as Array<{
      userId?: string | null;
      fullName?: string | null;
      phone?: string | null;
      addedAt?: string | null;
    }> | null) ?? [];

  // AI analysis (prefer full analysis endpoint result, fall back to inline entity)
  const inlineAi = (sos.evaluation as any)?.aiAnalysis ?? null;
  const aiAnalysis =
    analysisData?.aiAnalysis ?? analysisData?.aiAnalyses?.[0] ?? inlineAi;
  const aiExplanation = aiAnalysis?.explanation
    ? String(aiAnalysis.explanation).trim()
    : null;
  const aiHandlingReason = aiAnalysis?.handlingReason
    ? String(aiAnalysis.handlingReason).trim()
    : null;
  // Suppress handlingReason if it's the same text as explanation
  const showHandlingReason =
    !!aiHandlingReason &&
    normalizeForDedup(aiHandlingReason) !== normalizeForDedup(aiExplanation);
  const needsImmediateTransfer =
    aiAnalysis?.needsImmediateSafeTransfer === true;
  const canWait = aiAnalysis?.canWaitForCombinedMission === true;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden",
        sos.priority === "P1"
          ? "border-red-200 dark:border-red-900/50"
          : sos.priority === "P2"
            ? "border-orange-200 dark:border-orange-900/50"
            : "border-border",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between border-b",
          sos.priority === "P1"
            ? "bg-red-50/50 dark:bg-red-900/10"
            : sos.priority === "P2"
              ? "bg-orange-50/50 dark:bg-orange-900/10"
              : "bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg bg-background border shadow-sm",
              sos.priority === "P1"
                ? "text-red-600"
                : sos.priority === "P2"
                  ? "text-orange-600"
                  : "text-muted-foreground",
            )}
          >
            <MapPin className="h-5 w-5" weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold tracking-tighter text-foreground">
                SOS #{sos.id}
              </h4>
              <Badge
                variant={PRIORITY_BADGE_VARIANT[sos.priority]}
                className="h-6 px-2 text-sm font-medium uppercase"
              >
                {PRIORITY_LABELS[sos.priority]}
              </Badge>
            </div>
            <p className="text-sm text-foreground/80 font-semibold tracking-tighter full-width">
              {address || "Không rõ địa chỉ"}
            </p>
          </div>
        </div>
        <div className="text-right">
          {ruleScore !== undefined && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-muted-foreground tracking-tighter leading-none mb-1">
                Điểm ưu tiên AI
              </span>
              <span className="text-xl font-bold tracking-tighter text-primary leading-none">
                {ruleScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="@container p-4 space-y-4">
        {/* Stack in narrow split panels, switch directly to 3 columns when wide. */}
        <div className="grid grid-cols-1 gap-4 items-start @4xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.2fr)_minmax(0,1.15fr)]">
          {/* Col 1: Tình trạng & Nhân khẩu */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase">
                Tình trạng
              </p>
              <Badge
                variant="outline"
                className="h-7 bg-background px-3 tracking-tighter font-semibold border-muted-foreground/30"
              >
                {getSituationLabel(situation)}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase">
                Nhân khẩu
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  Già: {pc.elderly}
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  Trẻ em: {pc.child}
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Lớn: {pc.adult}
                </Badge>
              </div>
            </div>
          </div>

          {/* Col 2: Nội dung yêu cầu */}
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase">
              Lời nhắn
            </p>

            {messageIsStructured ? (
              /* Structured pipe-message: show only the human free-text note */
              freeTextNote ? (
                <div className="rounded-lg bg-muted/40 p-3 border border-dashed text-[14px] tracking-tighter leading-relaxed text-foreground/90 italic">
                  {freeTextNote}
                </div>
              ) : (
                <p className="text-[13px] tracking-tighter text-muted-foreground italic">
                  Không có lời nhắn thêm.
                </p>
              )
            ) : (
              /* Free-text message: show as-is */
              <div className="rounded-lg bg-muted/40 p-3 border border-dashed text-[14px] tracking-tighter leading-relaxed text-foreground/90 italic">
                {sos.message}
              </div>
            )}

            {showAdditionalDesc && (
              <div className="text-[14px] tracking-tighter bg-amber-50/50 dark:bg-amber-900/10 p-2.5 rounded border border-amber-200/50">
                <span className="font-semibold tracking-tighter text-amber-700 dark:text-amber-400 mr-1">
                  Ghi chú thêm:
                </span>
                {additionalDesc}
              </div>
            )}
          </div>

          {/* Col 3: Danh sách nạn nhân chi tiết */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Danh sách nạn nhân chi tiết
            </p>
            {v3Victims.length > 0 ? (
              <div className="space-y-2">
                {v3Victims.map((v: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-background p-3 space-y-2 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tracking-tighter text-foreground flex items-center gap-1">
                        {/* {v.person_type === "CHILD"
                          ? "👶"
                          : v.person_type === "ELDERLY"
                            ? "👴"
                            : "🧑"} */}
                        {v.custom_name || `Nạn nhân ${idx + 1}`}
                      </span>
                      {v.incident_status?.severity && (
                        <Badge
                          className={cn(
                            "text-sm h-6 px-1.5 shrink-0",
                            severityBadgeClass(v.incident_status.severity),
                          )}
                        >
                          {severityLabel(v.incident_status.severity)}
                        </Badge>
                      )}
                    </div>
                    {v.incident_status?.medical_issues?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.incident_status.medical_issues.map(
                          (issue: string, i: number) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={cn(
                                "text-sm h-5 px-1.5 border-transparent font-medium",
                                getMedicalIssueColorClass(issue),
                              )}
                            >
                              {getMedicalIssueLabel(issue)}
                            </Badge>
                          ),
                        )}
                      </div>
                    )}
                    {(v.personal_needs?.diet?.has_special_diet ||
                      v.personal_needs?.clothing?.needed) && (
                      <div className="pt-1.5 border-t border-dashed space-y-1">
                        {v.personal_needs.diet?.has_special_diet && (
                          <div className="text-sm tracking-tighter text-muted-foreground flex items-start gap-1.5">
                            <ForkKnife className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>
                              Ăn đặc biệt: {v.personal_needs.diet.description}
                            </span>
                          </div>
                        )}
                        {v.personal_needs.clothing?.needed && (
                          <div className="text-sm text-muted-foreground tracking-tighter flex items-start gap-1.5">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>
                              Cần quần áo{" "}
                              {v.personal_needs.clothing.gender === "MALE"
                                ? "(Nam)"
                                : "(Nữ)"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm tracking-tighter text-muted-foreground italic">
                Không có dữ liệu nạn nhân
              </p>
            )}
          </div>
        </div>

        {/* Reporter & Companions */}
        {(reporterName || reporterPhone || companions.length > 0) && (
          <div className="space-y-3 border-t pt-4">
            <div className="grid gap-3 grid-cols-1 @2xl:grid-cols-2">
              {/* Reporter */}
              {(reporterName || reporterPhone || isSentOnBehalf) && (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {isSentOnBehalf ? "Người báo thay" : "Người báo cáo"}
                  </p>
                  <div className="rounded-lg border bg-background px-3 py-2.5 space-y-1.5">
                    {reporterName && (
                      <p className="text-[14px] font-semibold tracking-tighter text-foreground">
                        {reporterName}
                      </p>
                    )}
                    {reporterPhone && (
                      <p className="text-[14px] tracking-tighter text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        {reporterPhone}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {isSentOnBehalf && (
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300"
                        >
                          Báo thay
                        </Badge>
                      )}
                      {reporterIsOnline !== undefined && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-xs",
                            reporterIsOnline
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {reporterIsOnline ? "Đang online" : "Offline"}
                        </Badge>
                      )}
                      {typeof reporterBatteryLevel === "number" && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-xs",
                            reporterBatteryLevel <= 20
                              ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          Pin {reporterBatteryLevel}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Companions */}
              {companions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Đi cùng ({companions.length})
                  </p>
                  <div className="space-y-1.5">
                    {companions.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-background px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <p className="text-[14px] font-medium tracking-tighter text-foreground">
                          {c.fullName ?? "Không rõ tên"}
                        </p>
                        {c.phone && (
                          <p className="text-[13px] tracking-tighter text-muted-foreground shrink-0 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Needs & Supplies */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-base font-semibold tracking-tighter text-muted-foreground uppercase">
            Nhu yếu phẩm & Vật tư cần thiết
          </p>
          <div className="flex flex-wrap gap-2">
            {supplies.map((s: string, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className="bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 font-medium text-sm px-2 py-1"
              >
                {getSupplyLabel(s)}
              </Badge>
            ))}
            {otherSupplies && (
              <Badge
                variant="outline"
                className="bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 font-medium text-sm px-2 py-1"
              >
                Khác: {otherSupplies}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {v3GroupNeeds?.water?.duration && (
              <div className="space-y-1">
                <p className="text-base font-semibold tracking-tighter text-muted-foreground uppercase">
                  Nước uống còn lại
                </p>
                <p className="text-base font-medium tracking-tighter">
                  {getWaterDurationLabel(v3GroupNeeds.water.duration)}
                </p>
              </div>
            )}
            {v3GroupNeeds?.food?.duration && (
              <div className="space-y-1">
                <p className="text-base font-semibold tracking-tighter text-muted-foreground uppercase">
                  Thực phẩm còn lại
                </p>
                <p className="text-base font-medium tracking-tighter">
                  {getFoodDurationLabel(v3GroupNeeds.food.duration)}
                </p>
              </div>
            )}
            {v3GroupNeeds?.medicine?.needs_urgent_medicine && (
              <div className="space-y-1">
                <p className="text-base font-semibold tracking-tighter text-muted-foreground uppercase underline decoration-red-400">
                  Cần thuốc khẩn cấp
                </p>
                <div className="flex flex-wrap gap-1">
                  {v3GroupNeeds.medicine.medical_needs?.map(
                    (m: string, i: number) => (
                      <span
                        key={i}
                        className="text-sm bg-red-100 tracking-tighter text-red-700 px-1 rounded font-medium"
                      >
                        {getMedicalSupportNeedLabel(m)}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
            {v3GroupNeeds?.blanket?.is_cold_or_wet && (
              <div className="space-y-1">
                <p className="text-base font-semibold tracking-tighter uppercase text-blue-600">
                  Đang bị lạnh/ướt
                </p>
                <p className="text-sm tracking-tighter font-medium">
                  Cần chăn mền/đồ giữ ấm
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Assessment */}
        {(aiExplanation || needsImmediateTransfer || canWait) && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold tracking-tighter text-muted-foreground uppercase flex items-center gap-1.5">
              <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" />
              Đánh giá AI
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {needsImmediateTransfer && (
                <Badge className="h-6 px-2 text-sm bg-red-50 text-red-700 border border-red-300 dark:bg-red-900/20 dark:text-red-300 font-semibold">
                  Cần chuyển viện khẩn
                </Badge>
              )}
              {canWait && (
                <Badge className="h-6 px-2 text-sm bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-900/20 dark:text-sky-300 font-semibold">
                  Có thể ghép mission
                </Badge>
              )}
            </div>
            {aiExplanation && (
              <p className="text-[14px] tracking-tighter leading-relaxed text-foreground/80 bg-muted/40 rounded-lg p-3 border border-dashed">
                {aiExplanation}
              </p>
            )}
            {showHandlingReason && (
              <p className="text-[14px] tracking-tighter leading-relaxed text-amber-700/90 dark:text-amber-300/90 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200/60">
                {aiHandlingReason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

type CoordinationSummaryEntry = {
  key: string;
  activities: ClusterSuggestedActivity[];
  sosIds: number[];
  executionModeLabel: string | null;
  requiredTeamCount: number;
  assignedTeamCount: number;
  notes: string | null;
  hasMissingTeams: boolean;
};

function buildCoordinationSummaryEntries(
  activities: ClusterSuggestedActivity[],
): CoordinationSummaryEntry[] {
  const groups = new Map<
    string,
    {
      activities: ClusterSuggestedActivity[];
      sosIds: Set<number>;
      executionModes: Set<string>;
      requiredTeamCount: number;
      assignedTeams: Set<string>;
      notes: string | null;
    }
  >();

  for (const activity of activities) {
    const groupKey = trimToNull(activity.coordinationGroupKey);
    if (!groupKey) continue;

    const existing = groups.get(groupKey) ?? {
      activities: [],
      sosIds: new Set<number>(),
      executionModes: new Set<string>(),
      requiredTeamCount: 0,
      assignedTeams: new Set<string>(),
      notes: null,
    };

    existing.activities.push(activity);

    if (
      activity.sosRequestId != null &&
      Number.isFinite(activity.sosRequestId)
    ) {
      existing.sosIds.add(activity.sosRequestId);
    }

    const executionMode = formatExecutionModeLabel(activity.executionMode);
    if (executionMode) {
      existing.executionModes.add(executionMode);
    }

    existing.requiredTeamCount = Math.max(
      existing.requiredTeamCount,
      getRequiredTeamCount(activity),
    );

    const teamId = toFiniteNumber(activity.suggestedTeam?.teamId);
    const teamName = trimToNull(activity.suggestedTeam?.teamName);
    if (teamId != null && teamId > 0) {
      existing.assignedTeams.add(`id-${teamId}`);
    } else if (teamName) {
      existing.assignedTeams.add(`name-${teamName}`);
    }

    existing.notes = existing.notes ?? trimToNull(activity.coordinationNotes);
    groups.set(groupKey, existing);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const assignedTeamCount = group.assignedTeams.size;
    const requiredTeamCount = group.requiredTeamCount;

    return {
      key,
      activities: group.activities,
      sosIds: Array.from(group.sosIds).sort((left, right) => left - right),
      executionModeLabel:
        Array.from(group.executionModes).join(", ") || "Chưa rõ chế độ",
      requiredTeamCount,
      assignedTeamCount,
      notes: group.notes,
      hasMissingTeams:
        requiredTeamCount > 0 && assignedTeamCount < requiredTeamCount,
    };
  });
}

function CoordinationSummaryPanel({
  entries,
  compact = false,
}: {
  entries: CoordinationSummaryEntry[];
  compact?: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <TreeStructure className="h-3.5 w-3.5" weight="fill" />
        Nhóm phối hợp
      </h4>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className={cn(
              "rounded-lg border px-2.5 py-2",
              entry.hasMissingTeams
                ? "border-amber-300 bg-amber-50/70 dark:border-amber-700/60 dark:bg-amber-900/20"
                : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/15",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-foreground">
                {entry.key}
              </span>
              <Badge variant="outline" className="h-5 px-1.5 text-sm">
                {entry.activities.length} bước
              </Badge>
              {entry.sosIds.length > 0 ? (
                <Badge variant="outline" className="h-5 px-1.5 text-sm">
                  SOS {entry.sosIds.join(", ")}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="h-5 border-indigo-200 bg-indigo-50 px-1.5 text-sm text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/20 dark:text-indigo-300"
              >
                {entry.executionModeLabel}
              </Badge>
              {entry.requiredTeamCount > 0 ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-sm font-semibold",
                    entry.hasMissingTeams
                      ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                  )}
                >
                  {entry.assignedTeamCount}/{entry.requiredTeamCount} đội
                </Badge>
              ) : null}
            </div>

            {entry.hasMissingTeams ? (
              <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                Nhóm này cần bổ sung đội trước khi xác nhận nhiệm vụ.
              </p>
            ) : null}
            {!compact && entry.notes ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {entry.notes}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function getMissionSuggestionPhasePriority(phase?: string | null): number {
  const normalized = (phase ?? "").trim().toLowerCase();

  if (normalized === "validated") {
    return 0;
  }

  if (normalized === "draft") {
    return 1;
  }

  return 2;
}

function getMissionSuggestionActivityGroups(
  suggestion: MissionSuggestionEntity,
): MissionSuggestionEntity["activities"] {
  return Array.isArray(suggestion.activities) ? suggestion.activities : [];
}

function pickPreferredMissionSuggestionActivityGroup(
  suggestion: MissionSuggestionEntity,
): MissionSuggestionEntity["activities"][number] | null {
  const nonEmptyGroups = getMissionSuggestionActivityGroups(suggestion).filter(
    (activityGroup) =>
      Array.isArray(activityGroup.suggestedActivities) &&
      activityGroup.suggestedActivities.length > 0,
  );

  if (nonEmptyGroups.length === 0) {
    return null;
  }

  const rankedGroups = [...nonEmptyGroups].sort((left, right) => {
    const phasePriorityDelta =
      getMissionSuggestionPhasePriority(left.suggestionPhase) -
      getMissionSuggestionPhasePriority(right.suggestionPhase);

    if (phasePriorityDelta !== 0) {
      return phasePriorityDelta;
    }

    const leftCreatedAt = Date.parse(left.createdAt ?? "");
    const rightCreatedAt = Date.parse(right.createdAt ?? "");
    const hasLeftCreatedAt = Number.isFinite(leftCreatedAt);
    const hasRightCreatedAt = Number.isFinite(rightCreatedAt);

    if (
      hasLeftCreatedAt &&
      hasRightCreatedAt &&
      leftCreatedAt !== rightCreatedAt
    ) {
      return rightCreatedAt - leftCreatedAt;
    }

    if (hasLeftCreatedAt !== hasRightCreatedAt) {
      return hasLeftCreatedAt ? -1 : 1;
    }

    return right.id - left.id;
  });

  return rankedGroups[0] ?? null;
}

function flattenMissionSuggestionActivities(
  suggestion: MissionSuggestionEntity,
): ClusterSuggestedActivity[] {
  const preferredGroup =
    pickPreferredMissionSuggestionActivityGroup(suggestion);

  if (
    Array.isArray(preferredGroup?.suggestedActivities) &&
    preferredGroup.suggestedActivities.length > 0
  ) {
    return preferredGroup.suggestedActivities;
  }

  return Array.isArray(suggestion.suggestedActivities)
    ? suggestion.suggestedActivities
    : [];
}

function hasRenderableMissionSuggestion(
  suggestion: MissionSuggestionEntity,
): boolean {
  const activities = flattenMissionSuggestionActivities(suggestion);
  const suggestedResources = Array.isArray(suggestion.suggestedResources)
    ? suggestion.suggestedResources
    : [];
  const supplyShortages = Array.isArray(suggestion.supplyShortages)
    ? suggestion.supplyShortages
    : [];

  return (
    activities.length > 0 ||
    trimToNull(suggestion.suggestedMissionTitle) != null ||
    trimToNull(suggestion.overallAssessment) != null ||
    trimToNull(suggestion.specialNotes) != null ||
    trimToNull(suggestion.mixedRescueReliefWarning) != null ||
    trimToNull(suggestion.lowConfidenceWarning) != null ||
    suggestedResources.length > 0 ||
    supplyShortages.length > 0 ||
    typeof suggestion.suggestedPriorityScore === "number" ||
    typeof suggestion.confidenceScore === "number"
  );
}

function buildSuggestionPreviewFromMissionSuggestion(
  suggestion: MissionSuggestionEntity,
): SuggestionPreview {
  return {
    id: `saved-${suggestion.id}`,
    sourceSuggestionId: suggestion.id,
    sourceKind: "saved",
    isSuccess: suggestion.isSuccess ?? null,
    errorMessage: suggestion.errorMessage ?? null,
    responseTimeMs: suggestion.responseTimeMs ?? null,
    sosRequestCount: suggestion.sosRequestCount ?? null,
    suggestedMissionTitle: suggestion.suggestedMissionTitle,
    suggestedMissionType: suggestion.suggestedMissionType,
    suggestedPriorityScore: suggestion.suggestedPriorityScore,
    suggestedSeverityLevel: suggestion.suggestedSeverityLevel,
    confidenceScore: suggestion.confidenceScore,
    overallAssessment: suggestion.overallAssessment,
    estimatedDuration: suggestion.estimatedDuration,
    specialNotes: suggestion.specialNotes,
    mixedRescueReliefWarning: trimToNull(suggestion.mixedRescueReliefWarning),
    needsManualReview: suggestion.needsManualReview,
    lowConfidenceWarning: suggestion.lowConfidenceWarning,
    needsAdditionalDepot: suggestion.needsAdditionalDepot,
    multiDepotRecommended: Boolean(suggestion.multiDepotRecommended),
    supplyShortages: suggestion.supplyShortages ?? [],
    suggestedResources: suggestion.suggestedResources ?? [],
    suggestedActivities: flattenMissionSuggestionActivities(suggestion),
    createdAt: suggestion.createdAt,
    modelName: suggestion.modelName,
    suggestionScope: suggestion.suggestionScope,
  };
}

function buildSuggestionPreviewFromRescueSuggestion(
  suggestion: ClusterRescueSuggestionResponse,
  sourceKind: SuggestionPreview["sourceKind"] = "stream",
  overrides?: Partial<SuggestionPreview>,
): SuggestionPreview {
  return {
    id:
      overrides?.id ??
      `${sourceKind}-${suggestion.suggestionId ?? suggestion.suggestedMissionTitle ?? "draft"}`,
    sourceSuggestionId: suggestion.suggestionId ?? null,
    sourceKind,
    isSuccess: suggestion.isSuccess ?? null,
    errorMessage: suggestion.errorMessage ?? null,
    responseTimeMs: suggestion.responseTimeMs ?? null,
    sosRequestCount: suggestion.sosRequestCount ?? null,
    suggestedMissionTitle: suggestion.suggestedMissionTitle,
    suggestedMissionType: suggestion.suggestedMissionType,
    suggestedPriorityScore: suggestion.suggestedPriorityScore,
    suggestedSeverityLevel: suggestion.suggestedSeverityLevel,
    confidenceScore: suggestion.confidenceScore,
    overallAssessment: suggestion.overallAssessment,
    estimatedDuration: suggestion.estimatedDuration,
    specialNotes: suggestion.specialNotes,
    mixedRescueReliefWarning: trimToNull(suggestion.mixedRescueReliefWarning),
    needsManualReview: suggestion.needsManualReview,
    lowConfidenceWarning: suggestion.lowConfidenceWarning,
    needsAdditionalDepot: suggestion.needsAdditionalDepot,
    multiDepotRecommended: suggestion.multiDepotRecommended,
    supplyShortages: suggestion.supplyShortages ?? [],
    suggestedResources: suggestion.suggestedResources ?? [],
    suggestedActivities: suggestion.suggestedActivities ?? [],
    createdAt: overrides?.createdAt ?? null,
    modelName: suggestion.modelName,
    suggestionScope: overrides?.suggestionScope ?? null,
    ...overrides,
  };
}

const RESCUE_LIKE_ACTIVITY_TYPES = new Set<ClusterActivityType>([
  "ASSESS",
  "RESCUE",
  "MEDICAL_AID",
  "EVACUATE",
  "MIXED",
]);

const RELIEF_LIKE_ACTIVITY_TYPES = new Set<ClusterActivityType>([
  "DELIVER_SUPPLIES",
]);

const RESCUE_SUPPLY_HINTS = [
  "xuong",
  "xuong",
  "ca no",
  "cano",
  "boat",
  "thuyen",
  "áo phao",
  "ao phao",
  "cứu sinh",
  "cuu sinh",
  "cứu hộ",
  "cuu ho",
  "phao",
  "day cuu ho",
  "dây cứu hộ",
  "mooring",
];

const RELIEF_SUPPLY_HINTS = [
  "nuoc",
  "nước",
  "thuc pham",
  "thực phẩm",
  "gao",
  "gạo",
  "mi tom",
  "mì tôm",
  "thuoc",
  "thuốc",
  "y te",
  "y tế",
  "chan",
  "chăn",
  "man",
  "màn",
  "blanket",
  "food",
  "water",
  "milk",
  "sua",
  "sữa",
];

function normalizeSuggestionKeyword(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionSuggestsRescue(description?: string | null): boolean {
  const normalized = normalizeSuggestionKeyword(description);

  return (
    normalized.includes("cuu ho") ||
    normalized.includes("so tan") ||
    normalized.includes("cap cuu") ||
    normalized.includes("assembly point") ||
    normalized.includes("diem tap ket") ||
    normalized.includes("safe zone")
  );
}

function classifySupplyIntent(
  supply: ClusterSupplyCollection,
): "rescue" | "relief" | "unknown" {
  const normalized = normalizeSuggestionKeyword(getSupplyDisplayName(supply));

  if (!normalized) {
    return "unknown";
  }

  if (RESCUE_SUPPLY_HINTS.some((hint) => normalized.includes(hint))) {
    return "rescue";
  }

  if (RELIEF_SUPPLY_HINTS.some((hint) => normalized.includes(hint))) {
    return "relief";
  }

  return "unknown";
}

function cloneActivityWithSupplies(
  activity: ClusterSuggestedActivity,
  supplies: ClusterSupplyCollection[],
): ClusterSuggestedActivity {
  return {
    ...activity,
    suppliesToCollect: supplies,
  };
}

function buildSplitMissionTitle(
  baseTitle: string | null,
  suffix: string,
): string {
  const cleanedBaseTitle = trimToNull(baseTitle);
  return cleanedBaseTitle ? `${cleanedBaseTitle} • ${suffix}` : suffix;
}

function buildSplitSuggestionPreviews(
  suggestion: SuggestionPreview,
): SuggestionPreview[] {
  const rescueActivities: ClusterSuggestedActivity[] = [];
  const reliefActivities: ClusterSuggestedActivity[] = [];

  for (const activity of suggestion.suggestedActivities) {
    if (RESCUE_LIKE_ACTIVITY_TYPES.has(activity.activityType)) {
      rescueActivities.push({ ...activity });
      continue;
    }

    if (RELIEF_LIKE_ACTIVITY_TYPES.has(activity.activityType)) {
      reliefActivities.push({ ...activity });
      continue;
    }

    if (
      activity.activityType === "COLLECT_SUPPLIES" ||
      activity.activityType === "RETURN_SUPPLIES"
    ) {
      const rescueSupplies: ClusterSupplyCollection[] = [];
      const reliefSupplies: ClusterSupplyCollection[] = [];

      for (const supply of activity.suppliesToCollect ?? []) {
        const intent = classifySupplyIntent(supply);
        if (intent === "rescue") {
          rescueSupplies.push(supply);
          continue;
        }

        if (intent === "relief") {
          reliefSupplies.push(supply);
          continue;
        }

        if (descriptionSuggestsRescue(activity.description)) {
          rescueSupplies.push(supply);
        } else {
          reliefSupplies.push(supply);
        }
      }

      if (rescueSupplies.length > 0) {
        rescueActivities.push(
          cloneActivityWithSupplies(activity, rescueSupplies),
        );
      }

      if (reliefSupplies.length > 0) {
        reliefActivities.push(
          cloneActivityWithSupplies(activity, reliefSupplies),
        );
      }

      if (
        rescueSupplies.length === 0 &&
        reliefSupplies.length === 0 &&
        (activity.suppliesToCollect?.length ?? 0) === 0
      ) {
        if (descriptionSuggestsRescue(activity.description)) {
          rescueActivities.push({ ...activity });
        } else {
          reliefActivities.push({ ...activity });
        }
      }

      continue;
    }

    if (descriptionSuggestsRescue(activity.description)) {
      rescueActivities.push({ ...activity });
    } else {
      reliefActivities.push({ ...activity });
    }
  }

  const splitPreviews: SuggestionPreview[] = [];

  if (rescueActivities.length > 0) {
    splitPreviews.push({
      ...suggestion,
      id: `${suggestion.id}-split-rescue`,
      sourceKind: "split",
      suggestedMissionTitle: buildSplitMissionTitle(
        suggestion.suggestedMissionTitle,
        "Cứu hộ và cấp cứu",
      ),
      suggestedMissionType: "RESCUE",
      suggestedActivities: rescueActivities,
      suggestedResources: suggestion.suggestedResources.filter((resource) => {
        const normalized = normalizeSuggestionKeyword(
          `${resource.resourceType} ${resource.description}`,
        );
        return (
          resource.resourceType === "BOAT" ||
          normalized.includes("cuu ho") ||
          normalized.includes("y te") ||
          normalized.includes("medical")
        );
      }),
      mixedRescueReliefWarning: null,
      specialNotes: trimToNull(suggestion.specialNotes),
    });
  }

  if (reliefActivities.length > 0) {
    splitPreviews.push({
      ...suggestion,
      id: `${suggestion.id}-split-relief`,
      sourceKind: "split",
      suggestedMissionTitle: buildSplitMissionTitle(
        suggestion.suggestedMissionTitle,
        "Cứu trợ vật phẩm",
      ),
      suggestedMissionType: "RELIEF",
      suggestedActivities: reliefActivities,
      suggestedResources: suggestion.suggestedResources.filter((resource) => {
        const normalized = normalizeSuggestionKeyword(
          `${resource.resourceType} ${resource.description}`,
        );
        return (
          resource.resourceType !== "BOAT" &&
          !normalized.includes("cuu ho") &&
          !normalized.includes("y te") &&
          !normalized.includes("medical")
        );
      }),
      mixedRescueReliefWarning: null,
      specialNotes: trimToNull(suggestion.specialNotes),
    });
  }

  return splitPreviews;
}

const formatCoordinateLabel = (
  lat?: number | null,
  lng?: number | null,
): string | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat!.toFixed(4)}, ${lng!.toFixed(4)}`;
};

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCoordinatePair(
  lat?: unknown,
  lng?: unknown,
): { lat: number; lng: number } | null {
  const parsedLat = toFiniteNumber(lat);
  const parsedLng = toFiniteNumber(lng);

  if (parsedLat == null || parsedLng == null) {
    return null;
  }

  // Ignore backend fallback values like 0,0 so grouping can continue with
  // coordinates extracted from description or other richer sources.
  if (parsedLat === 0 && parsedLng === 0) {
    return null;
  }

  return { lat: parsedLat, lng: parsedLng };
}

function resolveEditActivityGroupContext(
  activity: EditableActivity,
  sosRequestById: Map<string, SOSRequest>,
) {
  const rawSosRequestId = toFiniteNumber(activity.sosRequestId);
  const sosRequestId =
    rawSosRequestId != null && rawSosRequestId > 0 ? rawSosRequestId : null;
  const matchedSOS =
    sosRequestId != null
      ? (sosRequestById.get(String(sosRequestId)) ?? null)
      : null;
  const assemblyPointCoords = resolveCoordinatePair(
    activity.assemblyPointLatitude,
    activity.assemblyPointLongitude,
  );
  const destinationCoords = resolveCoordinatePair(
    activity.destinationLatitude,
    activity.destinationLongitude,
  );
  const descriptionCoords = extractCoordsFromDescription(
    typeof activity.description === "string" ? activity.description : "",
  );
  const sosCoords = resolveCoordinatePair(
    matchedSOS?.location?.lat,
    matchedSOS?.location?.lng,
  );
  const resolvedCoords =
    assemblyPointCoords ??
    destinationCoords ??
    descriptionCoords ??
    sosCoords ??
    null;
  const resolvedLat = resolvedCoords?.lat ?? null;
  const resolvedLng = resolvedCoords?.lng ?? null;
  const coordinateKey =
    resolvedLat != null && resolvedLng != null
      ? `${resolvedLat.toFixed(4)}:${resolvedLng.toFixed(4)}`
      : null;
  const coordinationGroupKey =
    typeof activity.coordinationGroupKey === "string"
      ? activity.coordinationGroupKey.trim()
      : "";
  const hasSharedExecutionPoint =
    !isDepotSupplyStep(activity.activityType) &&
    (coordinationGroupKey.length > 0 || coordinateKey != null);
  const groupingKey = hasSharedExecutionPoint
    ? coordinationGroupKey ||
      (sosRequestId != null
        ? `sos-${sosRequestId}-point-${coordinateKey}`
        : `point-${coordinateKey}`)
    : `activity-${activity._id}`;
  const assemblyPointName =
    typeof activity.assemblyPointName === "string" &&
    activity.assemblyPointName.trim()
      ? activity.assemblyPointName.trim()
      : null;
  const destinationName =
    typeof activity.destinationName === "string" &&
    activity.destinationName.trim()
      ? activity.destinationName.trim()
      : null;
  const sosAddress =
    typeof matchedSOS?.address === "string" && matchedSOS.address.trim()
      ? matchedSOS.address.trim()
      : null;

  return {
    groupingKey,
    sosRequestId,
    matchedSOS,
    locationName: assemblyPointName || destinationName || sosAddress,
    coordinateKey,
    coordinateLabel: formatCoordinateLabel(resolvedLat, resolvedLng),
  };
}

function buildEditActivityGroups(
  activities: EditableActivity[],
  sosRequestById: Map<string, SOSRequest>,
): EditActivityGroup[] {
  const groups: EditActivityGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  activities.forEach((activity, index) => {
    const groupContext = resolveEditActivityGroupContext(
      activity,
      sosRequestById,
    );
    const existingGroupIndex = groupIndexByKey.get(groupContext.groupingKey);

    if (existingGroupIndex != null) {
      const existingGroup = groups[existingGroupIndex];
      existingGroup.activities.push({ activity, index });
      existingGroup.startIndex = Math.min(existingGroup.startIndex, index);
      existingGroup.endIndex = Math.max(existingGroup.endIndex, index);
      return;
    }

    groupIndexByKey.set(groupContext.groupingKey, groups.length);
    groups.push({
      id: `${groupContext.groupingKey}:${activity._id}`,
      groupingKey: groupContext.groupingKey,
      sosRequestId: groupContext.sosRequestId,
      matchedSOS: groupContext.matchedSOS,
      locationName: groupContext.locationName,
      coordinateKey: groupContext.coordinateKey,
      coordinateLabel: groupContext.coordinateLabel,
      startIndex: index,
      endIndex: index,
      activities: [{ activity, index }],
    });
  });

  return groups;
}

function areIndexesSequential(indexes: number[]): boolean {
  if (indexes.length <= 1) return true;

  for (let index = 1; index < indexes.length; index += 1) {
    if (indexes[index] !== indexes[index - 1] + 1) {
      return false;
    }
  }

  return true;
}

const formatDistanceKmLabel = (distanceKm?: number | null) => {
  if (!Number.isFinite(distanceKm)) return "--";
  return `${distanceKm!.toFixed(1)} km`;
};

function normalizeEstimatedTimeInputValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${Math.round(value)} phút`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const numericValue = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return trimmed.toLowerCase().includes("phút")
        ? trimmed
        : `${numericValue} phút`;
    }

    return trimmed;
  }

  return "";
}

function buildFallbackSOSRequest(sosId: string): SOSRequest {
  return {
    id: sosId,
    groupId: sosId,
    location: { lat: 0, lng: 0 },
    priority: "P3",
    needs: {
      medical: false,
      food: false,
      boat: false,
    },
    status: "PENDING",
    message: `Đang chờ đồng bộ thông tin cho SOS #${sosId}.`,
    createdAt: new Date(0),
  };
}

function getRescueTeamOperationalRank(status?: string | null): number {
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "ready" || normalizedStatus === "available") {
    return 0;
  }

  if (normalizedStatus === "gathering") {
    return 1;
  }

  if (normalizedStatus === "awaitingacceptance") {
    return 2;
  }

  if (normalizedStatus === "assigned" || normalizedStatus === "onmission") {
    return 3;
  }

  return 4;
}

const buildLeafletMapKey = (points: [number, number][]) =>
  points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");

const getRouteLabelAnchor = (
  points: [number, number][],
): [number, number] | null => {
  if (points.length === 0) {
    return null;
  }

  return points[Math.floor(points.length / 2)] ?? null;
};

const escapeLeafletLabelHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type RouteDurationBadgeVariant = "primary" | "neutral";

const estimateRouteDurationBadgeWidth = (label: string) =>
  Math.max(72, Math.min(196, Array.from(label).length * 8 + 22));

const buildRouteDurationBadgeIcon = (
  label: string,
  variant: RouteDurationBadgeVariant = "primary",
) => {
  const safeLabel = escapeLeafletLabelHtml(label);
  const badgeWidth = estimateRouteDurationBadgeWidth(label);
  const variantClassName =
    variant === "primary"
      ? "route-duration-badge--primary"
      : "route-duration-badge--neutral";

  return divIcon({
    className: "route-duration-marker-icon",
    iconSize: [badgeWidth, 28],
    iconAnchor: [badgeWidth / 2, 14],
    html: `<span class="route-duration-badge ${variantClassName}">${safeLabel}</span>`,
  });
};

const RoutePreviewFitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      try {
        const container = map.getContainer();
        if (!container) return;

        map.invalidateSize(false);

        if (points.length < 2) {
          map.setView(points[0], 15, { animate: false });
          return;
        }

        map.fitBounds(points, {
          padding: [30, 30],
          maxZoom: 15,
          animate: false,
        });
      } catch {
        // Ignore transient Leaflet teardown/re-init races during HMR or remount.
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [map, points]);

  return null;
};

const SafeTileLayer = ({ url }: { url: string }) => {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("tilePane")) {
      return;
    }

    const layer = tileLayer(url);

    try {
      layer.addTo(map);
    } catch {
      return;
    }

    return () => {
      try {
        if (map.hasLayer(layer)) {
          layer.remove();
        }
      } catch {
        // Ignore teardown races when parent map unmounts first.
      }
    };
  }, [map, url]);

  return null;
};

const RoutePreviewMap = ({
  points,
  origin,
  destination,
}: {
  points: [number, number][];
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) => {
  const mapKey = buildLeafletMapKey(points);

  return (
    <div className="h-72 overflow-hidden rounded-lg border bg-background">
      <MapContainer
        key={mapKey}
        center={points[0]}
        zoom={10}
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        attributionControl={false}
        className="h-full w-full"
      >
        <GoongLeafletLayer
          apiKey={process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}
        />
        <MapInvalidator />
        <RoutePreviewFitBounds points={points} />
        <Polyline
          positions={points}
          pathOptions={{
            color: "#FF6B35",
            weight: 5,
            opacity: 0.92,
            lineJoin: "round",
            lineCap: "round",
          }}
        />
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#16a34a",
            fillOpacity: 1,
          }}
        />
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#dc2626",
            fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  );
};

const SOSRequestSidebarCard = ({ sos }: { sos: SOSRequest }) => {
  const {
    data: analysisData,
    isLoading,
    isError,
    error,
  } = useSOSRequestAnalysis(Number(sos.id), {
    enabled: !!sos.id && !isNaN(Number(sos.id)),
  });

  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 bg-card",
        sos.priority === "P1"
          ? "border-red-200 dark:border-red-800/40"
          : sos.priority === "P2"
            ? "border-orange-200 dark:border-orange-800/40"
            : sos.priority === "P3"
              ? "border-yellow-200 dark:border-yellow-800/40"
              : "border-teal-200 dark:border-teal-800/40",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <MapPin
          className={cn(
            "h-3.5 w-3.5 shrink-0",
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
        <span className="text-sm font-bold truncate">SOS {sos.id}</span>

        {isLoading && (
          <Badge
            variant="outline"
            className="text-sm px-1 h-5 ml-1 animate-pulse border-blue-200 bg-blue-50 text-blue-600"
          >
            Đang tải điểm...
          </Badge>
        )}

        {isError && (
          <Badge
            variant="outline"
            className="text-sm px-1 h-5 ml-1 border-red-200 bg-red-50 text-red-600"
            title={error?.message}
          >
            Lỗi tải
          </Badge>
        )}

        {ruleScore !== undefined && !isLoading && !isError && (
          <Badge
            variant="outline"
            className="text-sm px-1 h-5 ml-1 border-primary/20 bg-primary/5 text-primary"
          >
            Điểm: {ruleScore.toFixed(1)}
          </Badge>
        )}
        <Badge
          variant={PRIORITY_BADGE_VARIANT[sos.priority]}
          className="text-sm px-1 h-5 ml-auto shrink-0"
        >
          {PRIORITY_LABELS[sos.priority]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
        {sos.message}
      </p>
    </div>
  );
};

const SOSGroupHeader = ({
  matchedSOS,
  groupActivitiesLength,
}: {
  matchedSOS: SOSRequest;
  groupActivitiesLength: number;
}) => {
  const {
    data: analysisData,
    isLoading,
    isError,
  } = useSOSRequestAnalysis(Number(matchedSOS.id), {
    enabled: !!matchedSOS.id && !isNaN(Number(matchedSOS.id)),
  });
  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <>
      <div
        className={cn(
          "p-1.5 rounded-lg",
          matchedSOS.priority === "P1"
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            : matchedSOS.priority === "P2"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
              : matchedSOS.priority === "P3"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
        )}
      >
        <MapPin className="h-4 w-4" weight="fill" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">SOS {matchedSOS.id}</p>
          {isLoading && (
            <Badge
              variant="outline"
              className="text-sm px-1.5 h-5 animate-pulse"
            >
              ...
            </Badge>
          )}
          {ruleScore !== undefined && !isLoading && !isError && (
            <Badge
              variant="outline"
              className="text-sm px-1.5 h-5 border-primary/20 bg-primary/5 text-primary"
            >
              Điểm: {ruleScore.toFixed(1)}
            </Badge>
          )}
          <Badge
            variant={PRIORITY_BADGE_VARIANT[matchedSOS.priority]}
            className="text-sm px-1.5 h-5"
          >
            {PRIORITY_LABELS[matchedSOS.priority]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {matchedSOS.message}
        </p>
      </div>
      <Badge variant="outline" className="text-sm h-5 px-1.5 shrink-0">
        {groupActivitiesLength} bước
      </Badge>
    </>
  );
};

const DepotInventoryCard = ({
  depotId,
  depotName,
  depotAddress,
  isDraggable,
  kind = "primary",
}: {
  depotId: number;
  depotName: string;
  depotAddress: string | null;
  isDraggable: boolean;
  kind?: "primary" | "alternative";
}) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, DEPOT_INVENTORY_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const { data, isLoading } = useDepotInventory({
    depotId,
    itemName: debouncedSearchTerm || undefined,
    pageNumber: page,
    pageSize: DEPOT_INVENTORY_PAGE_SIZE,
  });

  const visibleItems = useMemo(
    () =>
      (data?.items ?? []).filter((item) =>
        item.itemType === "Reusable"
          ? item.availableUnit > 0
          : item.availableQuantity > 0,
      ),
    [data?.items],
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-b">
        <WarehouseIcon className="h-3.5 w-3.5 text-amber-600" weight="fill" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{depotName}</p>
          {depotAddress && (
            <p className="text-sm text-muted-foreground truncate">
              {depotAddress}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-6 shrink-0 rounded-md px-2 text-sm font-semibold",
            kind === "alternative"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300",
          )}
        >
          {kind === "alternative" ? "Kho thay thế" : "Kho kế hoạch"}
        </Badge>
        {data ? (
          <Badge
            variant="secondary"
            className="h-6 shrink-0 rounded-md px-2 text-sm font-semibold"
          >
            {data.totalCount} Vật phẩm
          </Badge>
        ) : null}
      </div>
      <div className="p-2 space-y-1">
        <div className="space-y-1">
          <Label
            htmlFor={`rescue-plan-depot-search-${depotId}`}
            className="text-sm font-medium tracking-wider text-foreground/80"
          >
            Tìm vật phẩm
          </Label>
          <div className="relative">
            <Input
              id={`rescue-plan-depot-search-${depotId}`}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Nhập tên vật phẩm cần lấy..."
              className="h-8 pr-9 text-sm"
            />
            {searchTerm ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-0.5 h-7 w-7"
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearchTerm("");
                  setPage(1);
                }}
                aria-label="Xóa từ khóa tìm vật phẩm"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-1 flex min-h-80 flex-col">
          <div className="flex-1 space-y-1">
            {isLoading ? (
              Array.from({ length: DEPOT_INVENTORY_PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))
            ) : visibleItems.length > 0 ? (
              visibleItems.map((item, index) =>
                // Inventory API returns a union shape. Normalize fields for rendering and DnD.
                (() => {
                  const availableQuantity =
                    item.itemType === "Reusable"
                      ? item.availableUnit
                      : item.availableQuantity;
                  const itemId = item.itemModelId;
                  const itemName = item.itemModelName;
                  const itemImageUrl = item.imageUrl?.trim() || "";

                  return (
                    <div
                      key={`${depotId}-${itemId}-${item.itemType}-${index}`}
                      draggable={isDraggable}
                      onDragStart={
                        isDraggable
                          ? (e) => {
                              const itemWithUnit = item as typeof item & {
                                unit?: string;
                                unitName?: string;
                              };
                              const rawUnit =
                                (typeof (item as any).measurementUnit ===
                                "string"
                                  ? (item as any).measurementUnit.trim()
                                  : "") ||
                                (typeof itemWithUnit.unit === "string"
                                  ? itemWithUnit.unit.trim()
                                  : "") ||
                                (typeof itemWithUnit.unitName === "string"
                                  ? itemWithUnit.unitName.trim()
                                  : "");

                              e.dataTransfer.setData(
                                "application/inventory-item",
                                JSON.stringify({
                                  itemId,
                                  itemName,
                                  itemType: item.itemType,
                                  availableQuantity,
                                  categoryName: item.categoryName,
                                  unit: rawUnit || null,
                                  measurementUnit:
                                    (item as any).measurementUnit || null,
                                  sourceDepotId: depotId,
                                  sourceDepotName: depotName,
                                  sourceDepotAddress: depotAddress,
                                }),
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            }
                          : undefined
                      }
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded border bg-background transition-colors",
                        isDraggable
                          ? "hover:bg-accent/30 cursor-grab active:cursor-grabbing"
                          : "cursor-default",
                      )}
                    >
                      <Avatar className="h-9 w-9 shrink-0 rounded-md border border-border/70 bg-slate-100/80 dark:bg-slate-900/60">
                        <AvatarImage
                          src={itemImageUrl || undefined}
                          alt={itemName}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        <AvatarFallback className="rounded-md bg-slate-100 text-blue-500 dark:bg-slate-900 dark:text-blue-300">
                          <Package className="h-4 w-4" weight="fill" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {itemName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.categoryName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-sm h-5 px-1 shrink-0 font-bold"
                      >
                        {availableQuantity}
                      </Badge>
                    </div>
                  );
                })(),
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                {debouncedSearchTerm
                  ? "Không tìm thấy vật phẩm phù hợp"
                  : "Kho trống"}
              </p>
            )}
          </div>

          <div className="mt-2 min-h-10">
            {data && data.totalPages > 1 ? (
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-sm font-semibold"
                  disabled={!data.hasPreviousPage}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <CaretLeft className="h-3 w-3" />
                  Trước
                </Button>

                <div className="text-center leading-none">
                  <p className="text-sm font-semibold text-foreground">
                    Trang {data.pageNumber}/{data.totalPages}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {DEPOT_INVENTORY_PAGE_SIZE} Vật phẩm mỗi trang
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-sm font-semibold"
                  disabled={!data.hasNextPage}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Sau
                  <CaretRight className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Route preview for an activity ──
const ActivityRoutePreview = ({
  missionId,
  activityId,
  activityLat,
  activityLng,
  onShowRoute,
}: {
  missionId: number;
  activityId: number;
  activityLat: number;
  activityLng: number;
  onShowRoute?: (coords: [number, number][]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<"bike" | "car" | "hd">("bike");
  // originCoords = vị trí hiện tại của coordinator (KHÔNG phải tọa độ đích)
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      const linkToRemove = document.querySelector('link[href*="leaflet.css"]');
      if (linkToRemove) {
        document.head.removeChild(linkToRemove);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || originCoords) return;
    if (!navigator.geolocation) {
      // Fallback: trung tâm Miền Trung (Huế)
      setOriginCoords({ lat: 16.4637, lng: 107.5909 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("[ActivityRoutePreview] Origin from geolocation:", loc);
        setOriginCoords(loc);
        setGeoError(false);
      },
      (err) => {
        console.warn(
          "[ActivityRoutePreview] Geolocation failed:",
          err.message,
          "— using fallback Hue",
        );
        // Fallback khi từ chối quyền hoặc timeout
        setOriginCoords({ lat: 16.4637, lng: 107.5909 });
        setGeoError(true);
      },
      { timeout: 5000, maximumAge: 30_000 },
    );
  }, [open, originCoords]);

  const { data, isLoading, isError } = useActivityRoute(
    open && originCoords
      ? {
          missionId,
          activityId,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          vehicle,
        }
      : null,
    { enabled: open && !!originCoords },
  );

  const routeStatusMeta = useMemo(
    () => getActivityRouteStatusMeta(data?.status),
    [data?.status],
  );
  const routeErrorMessage =
    typeof data?.errorMessage === "string" &&
    data.errorMessage.trim().length > 0
      ? data.errorMessage.trim()
      : null;
  const routeSteps = data?.route?.steps ?? [];

  const decodedRoutePoints = useMemo(() => {
    if (!data?.route?.overviewPolyline) return [] as [number, number][];
    return polylineDecode.decode(data.route.overviewPolyline) as [
      number,
      number,
    ][];
  }, [data]);

  // When route data arrives, decode the polyline and push to map
  useEffect(() => {
    if (decodedRoutePoints.length > 1 && onShowRoute) {
      onShowRoute(decodedRoutePoints);
    }
  }, [decodedRoutePoints, onShowRoute]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình
      </button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <NavigationArrow className="h-3 w-3" weight="fill" />
            Lộ trình
          </span>
          {data ? (
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-sm", routeStatusMeta.className)}
            >
              {routeStatusMeta.label}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Vehicle selector */}
          <div className="flex items-center gap-0.5 rounded border bg-background overflow-hidden">
            {(
              [
                { key: "bike", label: "Xe máy" },
                { key: "car", label: "Ô tô" },
                { key: "hd", label: "Xe tải" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVehicle(v.key)}
                className={cn(
                  "px-1.5 py-0.5 text-sm font-medium transition-colors",
                  vehicle === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {/* Chưa có vị trí GPS — đang lấy */}
      {!originCoords && (
        <p className="text-sm text-muted-foreground flex items-center gap-1 animate-pulse">
          <CircleNotch className="h-3 w-3 animate-spin" />
          Đang lấy vị trí hiện tại...
        </p>
      )}
      {/* Dùng vị trí mặc định nếu GPS bị từ chối */}
      {geoError && (
        <p className="text-sm text-orange-500 flex items-center gap-1">
          <Warning className="h-3 w-3" weight="fill" />
          Dùng vị trí mặc định (Huế) — hãy cấp quyền địa điểm để chính xác hơn
        </p>
      )}
      {(isLoading || (!originCoords && open)) && (
        <div className="space-y-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      )}
      {isError && (
        <p className="text-sm text-red-500">Không thể tải lộ trình</p>
      )}
      {routeErrorMessage ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {routeErrorMessage}
        </p>
      ) : null}
      {data?.route && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-primary">
              {data.route.totalDistanceText}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.route.totalDurationText}
            </span>
            {data.route.summary && (
              <span className="text-muted-foreground truncate">
                via {data.route.summary}
              </span>
            )}
          </div>
          {originCoords && decodedRoutePoints.length > 1 && (
            <RoutePreviewMap
              points={decodedRoutePoints}
              origin={originCoords}
              destination={{ lat: activityLat, lng: activityLng }}
            />
          )}

          {routeSteps.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Chỉ dẫn đường đi ({routeSteps.length} chặng)
              </p>
              <ScrollArea className="max-h-36 rounded-md border bg-background/80">
                <div className="space-y-1 p-2">
                  {routeSteps.map((step, index) => (
                    <div
                      key={`${step.startLat}-${step.startLng}-${index}`}
                      className="flex items-start gap-1.5 text-sm"
                    >
                      <span className="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="leading-snug text-foreground/90">
                          {step.instruction}
                        </p>
                        <p className="text-muted-foreground">
                          {step.distanceText} · {step.durationText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </>
      )}
      {data && !data.route && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Không tìm được tuyến đường bằng{" "}
            <strong>
              {vehicle === "bike"
                ? "xe máy"
                : vehicle === "car"
                  ? "ô tô"
                  : "xe tải"}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground/70">
            Điểm đến có thể nằm trong khu vực không có đường. Hãy thử đổi loại
            phương tiện khác.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Consolidated route preview for an entire mission ──
// A unique location derived by deduplicating consecutive activities with the same coords
interface UniqueWaypoint {
  lat: number;
  lng: number;
  activities: MissionActivity[];
}

interface RouteSegment {
  index: number;
  waypoint: UniqueWaypoint;
  points: [number, number][];
  steps: Array<{
    instruction: string;
    distanceText: string;
    durationText: string;
  }>;
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
  isFallback?: boolean;
  usedVehicle?: RouteVehicle;
}

interface MissionTeamRenderableLeg {
  leg?: MissionTeamRouteLeg;
  destinationGroupIndex: number | null;
  points: [number, number][];
  isFallback: boolean;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  source: "team-route" | "activity-route";
}

const COORD_EPSILON = 0.0005; // ~55m tolerance for "same location"
const HUE_DEFAULT_ORIGIN = { lat: 16.4637, lng: 107.5909 };
const SOS_COORD_MATCH_EPSILON = 0.003; // ~330m tolerance for SOS coordinate matching
const MISSION_TEAM_ROUTE_WAYPOINT_EPSILON = 0.0015; // ~165m tolerance when checking whether route covers a waypoint
const OVERVIEW_SPLIT_MAX_MATCH_DISTANCE_METERS = 6000;
const ACTIVITY_ROUTE_DIRECT_FALLBACK_MAX_DISTANCE_METERS = 10000;
const ACTIVITY_ROUTE_FALLBACK_STALE_TIME_MS = 5 * 60 * 1000;
const ACTIVITY_ROUTE_FALLBACK_GC_TIME_MS = 15 * 60 * 1000;
const ACTIVITY_ROUTE_FALLBACK_COOLDOWN_MS = 3 * 60 * 1000;
const VEHICLE_PRIORITY: RouteVehicle[] = ["bike", "car", "hd"];
const VEHICLE_LABELS: Record<RouteVehicle, string> = {
  bike: "Xe máy",
  car: "Ô tô",
  taxi: "Taxi",
  hd: "Xe tải",
};

let activityRouteFallbackBlockedUntil = 0;

function getActivityRouteStatusMeta(status?: string | null): {
  label: string;
  className: string;
} {
  const normalized = (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (normalized === "ok") {
    return {
      label: "Tuyến hợp lệ",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    };
  }

  if (normalized === "noroute") {
    return {
      label: "Chưa có tuyến",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    };
  }

  if (normalized === "error") {
    return {
      label: "Lỗi định tuyến",
      className:
        "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    };
  }

  return {
    label: status?.trim() ? `Trạng thái: ${status}` : "Đang kiểm tra",
    className:
      "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200",
  };
}

function hasRenderableWaypointCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  const lat = latitude as number;
  const lng = longitude as number;

  // 0,0 is used by backend as placeholder when coordinate is missing.
  return Math.abs(lat) > 0.000001 || Math.abs(lng) > 0.000001;
}

function isMissionTeamRouteLegMoving(leg: MissionTeamRouteLeg): boolean {
  const fromLat = Number(leg.fromLatitude);
  const fromLng = Number(leg.fromLongitude);
  const toLat = Number(leg.toLatitude);
  const toLng = Number(leg.toLongitude);

  const hasDistinctEndpoints =
    hasRenderableWaypointCoords(fromLat, fromLng) &&
    hasRenderableWaypointCoords(toLat, toLng) &&
    (Math.abs(fromLat - toLat) >= COORD_EPSILON ||
      Math.abs(fromLng - toLng) >= COORD_EPSILON);

  const hasDistance =
    Number.isFinite(leg.distanceMeters) && leg.distanceMeters > 1;

  return hasDistinctEndpoints || hasDistance;
}

function decodeMissionTeamRouteLegPoints(
  leg: MissionTeamRouteLeg,
): [number, number][] {
  if (leg.overviewPolyline && leg.overviewPolyline.trim().length > 0) {
    try {
      const decodedPoints = polylineDecode.decode(leg.overviewPolyline) as [
        number,
        number,
      ][];

      if (decodedPoints.length >= 2) {
        return decodedPoints;
      }
    } catch {
      // Fall through to endpoint connector below.
    }
  }

  const fromLat = Number(leg.fromLatitude);
  const fromLng = Number(leg.fromLongitude);
  const toLat = Number(leg.toLatitude);
  const toLng = Number(leg.toLongitude);

  if (
    hasRenderableWaypointCoords(fromLat, fromLng) &&
    hasRenderableWaypointCoords(toLat, toLng) &&
    (Math.abs(fromLat - toLat) >= COORD_EPSILON ||
      Math.abs(fromLng - toLng) >= COORD_EPSILON)
  ) {
    return [
      [fromLat, fromLng],
      [toLat, toLng],
    ];
  }

  return [];
}

function buildVehicleTryOrder(preferred: RouteVehicle): RouteVehicle[] {
  const next = [preferred, ...VEHICLE_PRIORITY.filter((v) => v !== preferred)];
  return Array.from(new Set(next));
}

function formatRouteDistanceText(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatRouteDurationText(durationSeconds: number): string {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const mins = Math.floor(durationSeconds / 60);
  if (mins < 60) {
    return `${mins} phút`;
  }

  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}p` : `${hrs}h`;
}

function isRouteRateLimited(errorMessage?: string | null): boolean {
  const normalized = (errorMessage ?? "").trim().toLowerCase();
  return (
    normalized.includes("over_rate_limit") ||
    normalized.includes("exceeded your rate limit") ||
    normalized.includes("http 429") ||
    normalized.includes("rate limit")
  );
}

function formatRouteErrorMessage(errorMessage?: string | null): string | null {
  const trimmed = (errorMessage ?? "").trim();
  if (!trimmed) return null;

  if (isRouteRateLimited(trimmed)) {
    return "Dịch vụ chỉ đường đang bị giới hạn lượt gọi (429). Tạm thời chưa thể lấy tuyến bổ sung lúc này.";
  }

  return trimmed;
}

function extractBackendErrorMessage(error: unknown): string | null {
  const err = error as AxiosError<{
    message?: string;
    title?: string;
    errors?: Record<string, string[] | string | undefined>;
  }>;

  const errors = err.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const firstError = Object.values(errors).find((messages) => {
      if (Array.isArray(messages)) {
        return messages.length > 0;
      }

      return typeof messages === "string" && messages.trim().length > 0;
    });

    if (Array.isArray(firstError) && firstError[0]) {
      return firstError[0].replace(/\s*\n+\s*/g, " ").trim();
    }

    if (typeof firstError === "string" && firstError.trim()) {
      return firstError.replace(/\s*\n+\s*/g, " ").trim();
    }
  }

  const fallbackMessage =
    err.response?.data?.message ||
    err.response?.data?.title ||
    (error instanceof Error ? error.message : null);

  if (!fallbackMessage || fallbackMessage === "[object Object]") {
    return null;
  }

  return fallbackMessage.replace(/\s*\n+\s*/g, " ").trim();
}

function isActivityRouteFallbackCoolingDown(now = Date.now()): boolean {
  return activityRouteFallbackBlockedUntil > now;
}

function blockActivityRouteFallback(now = Date.now()): void {
  activityRouteFallbackBlockedUntil = now + ACTIVITY_ROUTE_FALLBACK_COOLDOWN_MS;
}

function estimateDurationSeconds(
  distanceMeters: number,
  vehicle: RouteVehicle,
) {
  const speedByVehicleKmh: Record<RouteVehicle, number> = {
    bike: 28,
    car: 42,
    taxi: 40,
    hd: 32,
  };
  const speedMps = (speedByVehicleKmh[vehicle] * 1000) / 3600;
  if (!Number.isFinite(speedMps) || speedMps <= 0) {
    return Math.round(distanceMeters / 8);
  }
  return Math.max(60, Math.round(distanceMeters / speedMps));
}

function haversineDistanceMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const R = 6371e3;
  const phi1 = (origin.lat * Math.PI) / 180;
  const phi2 = (destination.lat * Math.PI) / 180;
  const deltaPhi = ((destination.lat - origin.lat) * Math.PI) / 180;
  const deltaLambda = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
const RESCUE_ROUTE_ACTIVITY_TYPES = new Set([
  "COLLECT_SUPPLIES",
  "DELIVER_SUPPLIES",
  "RETURN_SUPPLIES",
  "RESCUE",
  "MEDICAL_AID",
  "EVACUATE",
]);
const SOS_TARGET_REGEX = /SOS\s*#?\s*(\d+)/i;

interface WaypointMeta {
  labels: string[];
  hasSOS: boolean;
  hasDepot: boolean;
  stepNumbers: number[];
  stepRangeLabel: string;
}

type SupplyDisplayItem = {
  name: string;
  quantityLabel: string;
  bufferRatioLabel: string | null;
  pickedQuantityLabel: string | null;
  deliveredQuantityLabel: string | null;
  lotSourceLabel: string | null;
  lotRows: string[];
  lotReferenceLabel: string | null;
  lotReferenceRows: string[];
};

type SupplyLotAllocationLike = {
  lotId?: number | null;
  quantityTaken?: number | null;
  receivedDate?: string | null;
  expiredDate?: string | null;
  remainingQuantityAfterExecution?: number | null;
};

type NormalizedSupplyLotAllocation = {
  lotId: number | null;
  quantityTaken: number;
  receivedDate: string | null;
  expiredDate: string | null;
  remainingQuantityAfterExecution: number | null;
};

type SupplyDisplaySource = {
  itemName?: string | null;
  itemId?: number | null;
  itemType?: string | null;
  quantity: number;
  unit: string;
  plannedPickupLotAllocations?: SupplyLotAllocationLike[] | null;
  plannedPickupReusableUnits?: ClusterSupplyCollection["plannedPickupReusableUnits"];
  pickupLotAllocations?: SupplyLotAllocationLike[] | null;
  pickedReusableUnits?: ClusterSupplyCollection["pickedReusableUnits"];
  availableDeliveryReusableUnits?: ClusterSupplyCollection["availableDeliveryReusableUnits"];
  deliveredReusableUnits?: ClusterSupplyCollection["deliveredReusableUnits"];
  expectedReturnUnits?: ClusterSupplyCollection["expectedReturnUnits"];
  returnedReusableUnits?: ClusterSupplyCollection["returnedReusableUnits"];
  bufferRatio?: number | null;
  bufferQuantity?: number | null;
  bufferUsedQuantity?: number | null;
  bufferUsedReason?: string | null;
  actualDeliveredQuantity?: number | null;
};

function getSupplyDisplayName(supply: {
  itemName?: string | null;
  itemId?: number | null;
}): string {
  const name =
    typeof supply.itemName === "string" ? supply.itemName.trim() : "";
  if (name) return name;
  if (typeof supply.itemId === "number") return `Vật phẩm #${supply.itemId}`;
  return "Vật phẩm chưa rõ tên";
}

function formatSupplyNumber(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }

  return Number(normalized.toFixed(2)).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

function formatSupplyLotDate(value?: string | null): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "-";
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return `${padTwoDigits(parsed.getDate())}/${padTwoDigits(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

function formatSupplyQuantityLabel(
  quantity: number | null,
  unit: string,
): string | null {
  if (quantity == null || !Number.isFinite(quantity)) {
    return null;
  }

  return `${formatSupplyNumber(quantity)} ${unit}`.trim();
}

function normalizeSupplyUnit(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "đơn vị";
}

function normalizeInventoryItemType(
  value: unknown,
): "Reusable" | "Consumable" | null {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalized) {
    return null;
  }

  if (normalized === "reusable" || normalized === "tái sử dụng") {
    return "Reusable";
  }

  if (
    normalized === "consumable" ||
    normalized === "tiêu hao" ||
    normalized === "tiêu thụ"
  ) {
    return "Consumable";
  }

  return null;
}

function normalizeSupplyLotAllocations(
  allocations: SupplyLotAllocationLike[] | null | undefined,
): NormalizedSupplyLotAllocation[] {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return [];
  }

  return allocations.map((allocation) => {
    const parsedLotId = toFiniteNumber(allocation?.lotId);
    const parsedQuantityTaken = toFiniteNumber(allocation?.quantityTaken);
    const parsedRemaining = toFiniteNumber(
      allocation?.remainingQuantityAfterExecution,
    );

    return {
      lotId:
        parsedLotId != null && parsedLotId > 0 ? Math.round(parsedLotId) : null,
      quantityTaken:
        parsedQuantityTaken != null && parsedQuantityTaken > 0
          ? parsedQuantityTaken
          : 0,
      receivedDate:
        typeof allocation?.receivedDate === "string" &&
        allocation.receivedDate.trim()
          ? allocation.receivedDate.trim()
          : null,
      expiredDate:
        typeof allocation?.expiredDate === "string" &&
        allocation.expiredDate.trim()
          ? allocation.expiredDate.trim()
          : null,
      remainingQuantityAfterExecution:
        parsedRemaining != null ? Math.max(0, parsedRemaining) : null,
    };
  });
}

function normalizeSupplyLotAllocationsForMissionPayload(
  allocations: SupplyLotAllocationLike[] | null | undefined,
) {
  if (!Array.isArray(allocations)) {
    return undefined;
  }

  return allocations.map((allocation) => ({
    lotId: Number.isFinite(Number(allocation?.lotId))
      ? Number(allocation?.lotId)
      : 0,
    quantityTaken: Number.isFinite(Number(allocation?.quantityTaken))
      ? Number(allocation?.quantityTaken)
      : 0,
    receivedDate:
      typeof allocation?.receivedDate === "string"
        ? allocation.receivedDate
        : "",
    expiredDate:
      typeof allocation?.expiredDate === "string" ? allocation.expiredDate : "",
    remainingQuantityAfterExecution: Number.isFinite(
      Number(allocation?.remainingQuantityAfterExecution),
    )
      ? Number(allocation?.remainingQuantityAfterExecution)
      : 0,
  }));
}

function getLotQuantityTotal(
  lots: NormalizedSupplyLotAllocation[],
): number | null {
  if (lots.length === 0) {
    return null;
  }

  const total = lots.reduce((sum, lot) => sum + lot.quantityTaken, 0);
  return Number.isFinite(total) ? total : null;
}

function formatSupplyLotRow(lot: NormalizedSupplyLotAllocation): string {
  return `Lô ${lot.lotId ?? "?"} - SL lấy ${formatSupplyNumber(lot.quantityTaken)} - HSD ${formatSupplyLotDate(lot.expiredDate)} - Còn lại ${lot.remainingQuantityAfterExecution != null ? formatSupplyNumber(lot.remainingQuantityAfterExecution) : "-"}`;
}

function buildSupplyDisplayItem(
  activityType: string,
  supply: SupplyDisplaySource,
): SupplyDisplayItem {
  const unit = normalizeSupplyUnit(supply.unit);
  const plannedQuantity = toFiniteNumber(supply.quantity);
  const normalizedActivityType = normalizeActivityTypeKey(activityType);
  const pickupLots = normalizeSupplyLotAllocations(supply.pickupLotAllocations);
  const plannedLots = normalizeSupplyLotAllocations(
    supply.plannedPickupLotAllocations,
  );
  const hasPickupLots = pickupLots.length > 0;
  const isCollectStep = normalizedActivityType === "collectsupplies";
  const isDeliverStep = normalizedActivityType === "deliversupplies";
  const hasBufferPlanning =
    isCollectStep && !isReusableSupplyCollection(supply);

  const lotRows =
    isCollectStep && (hasPickupLots || plannedLots.length > 0)
      ? (hasPickupLots ? pickupLots : plannedLots).map(formatSupplyLotRow)
      : [];
  const lotReferenceRows =
    isCollectStep && hasPickupLots && plannedLots.length > 0
      ? plannedLots.map(formatSupplyLotRow)
      : [];

  return {
    name: getSupplyDisplayName(supply),
    quantityLabel: formatSupplyQuantityLabel(plannedQuantity, unit) ?? "-",
    bufferRatioLabel: hasBufferPlanning
      ? formatSupplyBufferPercent(supply.bufferRatio)
      : null,
    pickedQuantityLabel:
      isCollectStep && hasPickupLots
        ? formatSupplyQuantityLabel(getLotQuantityTotal(pickupLots), unit)
        : null,
    deliveredQuantityLabel:
      isDeliverStep && toFiniteNumber(supply.actualDeliveredQuantity) != null
        ? formatSupplyQuantityLabel(
            toFiniteNumber(supply.actualDeliveredQuantity),
            unit,
          )
        : null,
    lotSourceLabel:
      lotRows.length > 0
        ? hasPickupLots
          ? "Đã lấy thực tế"
          : "Dự kiến lấy"
        : null,
    lotRows,
    lotReferenceLabel: lotReferenceRows.length > 0 ? "Kế hoạch ban đầu" : null,
    lotReferenceRows,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncDescriptionWithSupplies(
  description: string,
  supplies: ClusterSupplyCollection[] | null | undefined,
): string {
  if (!supplies || supplies.length === 0) return description;

  let next = description;
  for (const supply of supplies) {
    const name = getSupplyDisplayName(supply);
    if (!name || name === "Vật phẩm chưa rõ tên") continue;

    // Match patterns like "Tên Vật phẩm x20", "Tên Vật phẩm x 20", "Tên Vật phẩm ×20".
    const qtyPattern = new RegExp(
      `(${escapeRegExp(name)}\\s*[xX×]\\s*)\\d+`,
      "g",
    );
    next = next.replace(qtyPattern, `$1${supply.quantity}`);
  }

  return next;
}

function extractSOSLabel(activity: MissionActivity): string | null {
  const target = typeof activity.target === "string" ? activity.target : "";
  const desc =
    typeof activity.description === "string" ? activity.description : "";

  const targetMatch = target.match(SOS_TARGET_REGEX);
  if (targetMatch?.[1]) return `SOS #${targetMatch[1]}`;

  const descMatch = desc.match(SOS_TARGET_REGEX);
  if (descMatch?.[1]) return `SOS #${descMatch[1]}`;

  return null;
}

function isDepotSupplyStep(activityType: string): boolean {
  return (
    activityType === "COLLECT_SUPPLIES" || activityType === "RETURN_SUPPLIES"
  );
}

function extractDepotLabel(activity: MissionActivity): string | null {
  // Supply pickup/return steps should be labeled as depot points on the route.
  if (!isDepotSupplyStep(activity.activityType)) {
    return null;
  }

  const depotName =
    typeof activity.depotName === "string" ? activity.depotName.trim() : "";
  if (depotName) return depotName;

  const target =
    typeof activity.target === "string" ? activity.target.trim() : "";
  const hasDepotKeyword = /\b(kho|depot)\b/i.test(target);
  if (!hasDepotKeyword) return null;
  if (target && !SOS_TARGET_REGEX.test(target)) return target;
  return "Kho tiếp tế";
}

function inferSOSRequestIdFromActivity(
  activity: MissionActivity,
  sosRequests: SOSRequest[],
): string | null {
  if (typeof activity.sosRequestId === "number") {
    return String(activity.sosRequestId);
  }

  const explicitLabel = extractSOSLabel(activity);
  if (explicitLabel) return explicitLabel.replace("SOS #", "").trim();

  const hasValidCoords =
    activity.targetLatitude !== 0 && activity.targetLongitude !== 0;
  if (hasValidCoords) {
    const withCoords = sosRequests.filter(
      (s) =>
        typeof s.location?.lat === "number" &&
        typeof s.location?.lng === "number",
    );
    if (withCoords.length > 0) {
      const nearest = withCoords.reduce((best, current) => {
        const bestDist =
          Math.pow(best.location!.lat - activity.targetLatitude, 2) +
          Math.pow(best.location!.lng - activity.targetLongitude, 2);
        const currentDist =
          Math.pow(current.location!.lat - activity.targetLatitude, 2) +
          Math.pow(current.location!.lng - activity.targetLongitude, 2);
        return currentDist < bestDist ? current : best;
      });
      return String(nearest.id);
    }
  }

  if (sosRequests.length > 0) return String(sosRequests[0].id);
  return null;
}

function isSupplyStep(activityType: string): boolean {
  return isDepotSupplyStep(activityType) || activityType === "DELIVER_SUPPLIES";
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

function toValidTeamId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeSupplyMatchText(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function toValidSosRequestId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveReturnAssemblyPointTeamFromPrevious(
  returnActivity: Pick<
    ClusterSuggestedActivity,
    "activityType" | "sosRequestId"
  >,
  previousActivities: Array<
    Pick<
      ClusterSuggestedActivity,
      "activityType" | "sosRequestId" | "suggestedTeam"
    >
  >,
): NonNullable<ClusterSuggestedActivity["suggestedTeam"]> | null {
  if (!isReturnAssemblyPointActivityType(returnActivity.activityType)) {
    return null;
  }

  const returnSosRequestId = toValidSosRequestId(returnActivity.sosRequestId);

  const findLatestTeam = (strictSosMatch: boolean) => {
    for (let index = previousActivities.length - 1; index >= 0; index -= 1) {
      const activity = previousActivities[index];
      if (isReturnAssemblyPointActivityType(activity.activityType)) {
        continue;
      }

      const teamId = toValidTeamId(activity.suggestedTeam?.teamId);
      if (teamId == null || !activity.suggestedTeam) {
        continue;
      }

      if (strictSosMatch && returnSosRequestId != null) {
        const candidateSosRequestId = toValidSosRequestId(
          activity.sosRequestId,
        );
        if (candidateSosRequestId !== returnSosRequestId) {
          continue;
        }
      }

      return activity.suggestedTeam as NonNullable<
        ClusterSuggestedActivity["suggestedTeam"]
      >;
    }

    return null;
  };

  return (
    findLatestTeam(returnSosRequestId != null) ?? findLatestTeam(false) ?? null
  );
}

function getSupplyItemIdSet(activity: {
  suppliesToCollect?:
    | ClusterSupplyCollection[]
    | Array<{ itemId: number | null }>
    | null;
}) {
  const ids = new Set<number>();

  for (const supply of activity.suppliesToCollect ?? []) {
    const itemId = Number(supply?.itemId);
    if (Number.isFinite(itemId) && itemId > 0) {
      ids.add(itemId);
    }
  }

  return ids;
}

function cloneSupplyCollections(
  supplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  if (!supplies || supplies.length === 0) {
    return null;
  }

  return supplies.map((supply) => ({
    itemId: Number.isFinite(supply.itemId) ? supply.itemId : 0,
    itemName: typeof supply.itemName === "string" ? supply.itemName.trim() : "",
    ...(normalizeInventoryItemType(supply.itemType)
      ? {
          itemType: normalizeInventoryItemType(supply.itemType),
        }
      : {}),
    quantity: Math.max(0, Number(supply.quantity) || 0),
    unit:
      typeof supply.unit === "string" && supply.unit.trim()
        ? supply.unit.trim()
        : "đơn vị",
    ...(Array.isArray(supply.plannedPickupLotAllocations)
      ? {
          plannedPickupLotAllocations: supply.plannedPickupLotAllocations.map(
            (allocation) => ({
              lotId: Number.isFinite(allocation?.lotId) ? allocation.lotId : 0,
              quantityTaken: Number.isFinite(allocation?.quantityTaken)
                ? allocation.quantityTaken
                : 0,
              receivedDate:
                typeof allocation?.receivedDate === "string"
                  ? allocation.receivedDate
                  : "",
              expiredDate:
                typeof allocation?.expiredDate === "string"
                  ? allocation.expiredDate
                  : "",
              remainingQuantityAfterExecution: Number.isFinite(
                allocation?.remainingQuantityAfterExecution,
              )
                ? allocation.remainingQuantityAfterExecution
                : 0,
            }),
          ),
        }
      : {}),
    ...(Array.isArray(supply.plannedPickupReusableUnits)
      ? {
          plannedPickupReusableUnits: supply.plannedPickupReusableUnits.map(
            (unit) => ({ ...unit }),
          ),
        }
      : {}),
    ...(Array.isArray(supply.pickupLotAllocations)
      ? {
          pickupLotAllocations: supply.pickupLotAllocations.map(
            (allocation) => ({
              lotId: Number.isFinite(allocation?.lotId) ? allocation.lotId : 0,
              quantityTaken: Number.isFinite(allocation?.quantityTaken)
                ? allocation.quantityTaken
                : 0,
              receivedDate:
                typeof allocation?.receivedDate === "string"
                  ? allocation.receivedDate
                  : "",
              expiredDate:
                typeof allocation?.expiredDate === "string"
                  ? allocation.expiredDate
                  : "",
              remainingQuantityAfterExecution: Number.isFinite(
                allocation?.remainingQuantityAfterExecution,
              )
                ? allocation.remainingQuantityAfterExecution
                : 0,
            }),
          ),
        }
      : {}),
    ...(Array.isArray(supply.pickedReusableUnits)
      ? {
          pickedReusableUnits: supply.pickedReusableUnits.map((unit) => ({
            ...unit,
          })),
        }
      : {}),
    ...(Array.isArray(supply.availableDeliveryReusableUnits)
      ? {
          availableDeliveryReusableUnits:
            supply.availableDeliveryReusableUnits.map((unit) => ({
              ...unit,
            })),
        }
      : {}),
    ...(Array.isArray(supply.deliveredReusableUnits)
      ? {
          deliveredReusableUnits: supply.deliveredReusableUnits.map((unit) => ({
            ...unit,
          })),
        }
      : {}),
    ...(Array.isArray(supply.expectedReturnUnits)
      ? {
          expectedReturnUnits: supply.expectedReturnUnits.map((unit) => ({
            ...unit,
          })),
        }
      : {}),
    ...(Array.isArray(supply.returnedReusableUnits)
      ? {
          returnedReusableUnits: supply.returnedReusableUnits.map((unit) => ({
            ...unit,
          })),
        }
      : {}),
    bufferRatio: resolveSupplyBufferRatio(supply.bufferRatio),
    ...(toFiniteNumber(supply.bufferQuantity) != null
      ? {
          bufferQuantity: Math.max(
            0,
            toFiniteNumber(supply.bufferQuantity) ?? 0,
          ),
        }
      : {}),
    ...(toFiniteNumber(supply.bufferUsedQuantity) != null
      ? {
          bufferUsedQuantity: Math.max(
            0,
            toFiniteNumber(supply.bufferUsedQuantity) ?? 0,
          ),
        }
      : {}),
    ...(typeof supply.bufferUsedReason === "string" &&
    supply.bufferUsedReason.trim()
      ? { bufferUsedReason: supply.bufferUsedReason.trim() }
      : {}),
    ...(toFiniteNumber(supply.actualDeliveredQuantity) != null
      ? {
          actualDeliveredQuantity: toFiniteNumber(
            supply.actualDeliveredQuantity,
          ),
        }
      : {}),
  }));
}

function hasReusableUnitMetadata(
  supply: Pick<
    ClusterSupplyCollection,
    | "plannedPickupReusableUnits"
    | "pickedReusableUnits"
    | "availableDeliveryReusableUnits"
    | "deliveredReusableUnits"
    | "expectedReturnUnits"
    | "returnedReusableUnits"
  >,
): boolean {
  return (
    Array.isArray(supply.plannedPickupReusableUnits) ||
    Array.isArray(supply.pickedReusableUnits) ||
    Array.isArray(supply.availableDeliveryReusableUnits) ||
    Array.isArray(supply.deliveredReusableUnits) ||
    Array.isArray(supply.expectedReturnUnits) ||
    Array.isArray(supply.returnedReusableUnits)
  );
}

function isReusableSupplyCollection(
  supply: Pick<
    ClusterSupplyCollection,
    | "itemType"
    | "plannedPickupReusableUnits"
    | "pickedReusableUnits"
    | "availableDeliveryReusableUnits"
    | "deliveredReusableUnits"
    | "expectedReturnUnits"
    | "returnedReusableUnits"
  >,
): boolean {
  return (
    normalizeInventoryItemType(supply.itemType) === "Reusable" ||
    hasReusableUnitMetadata(supply)
  );
}

function buildSupplyComparisonKey(
  supply: Pick<ClusterSupplyCollection, "itemId" | "itemName" | "unit">,
): string {
  const itemId = Number(supply.itemId);
  if (Number.isFinite(itemId) && itemId > 0) {
    return `id:${itemId}`;
  }

  const itemName =
    typeof supply.itemName === "string"
      ? supply.itemName.trim().toLowerCase()
      : "";
  const unit =
    typeof supply.unit === "string" ? supply.unit.trim().toLowerCase() : "";
  return `name:${itemName}|unit:${unit}`;
}

function haveMatchingSupplyCollections(
  left: ClusterSupplyCollection[] | null | undefined,
  right: ClusterSupplyCollection[] | null | undefined,
): boolean {
  const normalizedLeft = (cloneSupplyCollections(left) ?? [])
    .map((supply) => ({
      key: buildSupplyComparisonKey(supply),
      quantity: supply.quantity,
      unit: supply.unit.trim().toLowerCase(),
    }))
    .sort(
      (a, b) =>
        a.key.localeCompare(b.key, "vi") ||
        a.unit.localeCompare(b.unit, "vi") ||
        a.quantity - b.quantity,
    );
  const normalizedRight = (cloneSupplyCollections(right) ?? [])
    .map((supply) => ({
      key: buildSupplyComparisonKey(supply),
      quantity: supply.quantity,
      unit: supply.unit.trim().toLowerCase(),
    }))
    .sort(
      (a, b) =>
        a.key.localeCompare(b.key, "vi") ||
        a.unit.localeCompare(b.unit, "vi") ||
        a.quantity - b.quantity,
    );

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((supply, index) => {
    const peer = normalizedRight[index];
    return (
      supply.key === peer?.key &&
      supply.unit === peer.unit &&
      supply.quantity === peer.quantity
    );
  });
}

function findMatchingSupplyInCollection(
  target: Pick<ClusterSupplyCollection, "itemId" | "itemName" | "unit">,
  supplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection | null {
  const targetItemId = Number(target.itemId);
  if (Number.isFinite(targetItemId) && targetItemId > 0) {
    const matchedById = (supplies ?? []).find(
      (supply) => Number(supply.itemId) === targetItemId,
    );
    if (matchedById) {
      return matchedById;
    }
  }

  const targetKey = buildSupplyComparisonKey(target);
  return (
    (supplies ?? []).find(
      (supply) => buildSupplyComparisonKey(supply) === targetKey,
    ) ?? null
  );
}

function syncExplicitReturnSuppliesWithCollector(
  returnSupplies: ClusterSupplyCollection[] | null | undefined,
  collectorSupplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  const normalizedReturnSupplies = cloneSupplyCollections(returnSupplies);
  if (!normalizedReturnSupplies || normalizedReturnSupplies.length === 0) {
    return null;
  }

  return normalizedReturnSupplies.map((returnSupply) => {
    const matchedCollectorSupply = findMatchingSupplyInCollection(
      returnSupply,
      collectorSupplies,
    );

    if (!matchedCollectorSupply) {
      return returnSupply;
    }

    return {
      itemId: matchedCollectorSupply.itemId,
      itemName: matchedCollectorSupply.itemName,
      ...(normalizeInventoryItemType(matchedCollectorSupply.itemType)
        ? {
            itemType: normalizeInventoryItemType(
              matchedCollectorSupply.itemType,
            ),
          }
        : normalizeInventoryItemType(returnSupply.itemType)
          ? {
              itemType: normalizeInventoryItemType(returnSupply.itemType),
            }
          : {}),
      quantity: matchedCollectorSupply.quantity,
      unit: matchedCollectorSupply.unit,
    };
  });
}

function buildAutoReturnSuppliesFromCollector(
  returnSupplies: ClusterSupplyCollection[] | null | undefined,
  collectorSupplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  const syncedExplicitSupplies =
    syncExplicitReturnSuppliesWithCollector(
      returnSupplies,
      collectorSupplies,
    ) ?? [];
  const collectorSupplyList = cloneSupplyCollections(collectorSupplies) ?? [];

  const nextByKey = new Map<string, ClusterSupplyCollection>();

  for (const supply of syncedExplicitSupplies) {
    nextByKey.set(buildSupplyComparisonKey(supply), supply);
  }

  for (const supply of collectorSupplyList) {
    if (!isReusableSupplyCollection(supply)) {
      continue;
    }

    const key = buildSupplyComparisonKey(supply);
    if (!nextByKey.has(key)) {
      nextByKey.set(key, supply);
    }
  }

  return nextByKey.size > 0 ? Array.from(nextByKey.values()) : null;
}

function hasValidReturnSupplySelections(
  returnSupplies: ClusterSupplyCollection[] | null | undefined,
  collectorSupplies: ClusterSupplyCollection[] | null | undefined,
): boolean {
  const normalizedReturnSupplies = mergeSupplyCollections(returnSupplies);
  if (!normalizedReturnSupplies || normalizedReturnSupplies.length === 0) {
    return true;
  }

  const normalizedCollectorSupplies = mergeSupplyCollections(collectorSupplies);
  const collectorQuantityByKey = new Map<string, number>();

  for (const collectorSupply of normalizedCollectorSupplies ?? []) {
    const key = buildSupplyComparisonKey(collectorSupply);
    collectorQuantityByKey.set(key, collectorSupply.quantity);
  }

  return normalizedReturnSupplies.every((returnSupply) => {
    const matchedCollectorSupply = findMatchingSupplyInCollection(
      returnSupply,
      collectorSupplies,
    );
    const key = buildSupplyComparisonKey(returnSupply);
    const collectorQuantity = collectorQuantityByKey.get(key) ?? 0;

    return (
      !!matchedCollectorSupply &&
      returnSupply.quantity > 0 &&
      returnSupply.quantity <= collectorQuantity
    );
  });
}

function mergeSupplyCollections(
  supplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  const normalizedSupplies = cloneSupplyCollections(supplies);
  if (!normalizedSupplies || normalizedSupplies.length === 0) {
    return null;
  }

  const buckets = new Map<string, ClusterSupplyCollection>();

  normalizedSupplies.forEach((supply) => {
    const key = buildSupplyComparisonKey(supply);
    const existing = buckets.get(key);

    if (existing) {
      buckets.set(key, {
        ...existing,
        quantity: existing.quantity + supply.quantity,
      });
      return;
    }

    buckets.set(key, {
      ...supply,
      quantity: Math.max(0, Number(supply.quantity) || 0),
    });
  });

  return Array.from(buckets.values());
}

function syncDeliveryActivitiesWithCollectors(
  activities: EditableActivity[],
  options?: { sourceActivityId?: string | null },
): EditableActivity[] {
  const normalizedActivities = activities.map((activity) =>
    activity._autoSyncedDeliveryStep
      ? { ...activity, _autoSyncedDeliveryStep: false }
      : activity,
  );

  const sourceActivityId = options?.sourceActivityId ?? null;
  const sourceIndex =
    sourceActivityId != null
      ? normalizedActivities.findIndex(
          (activity) => activity._id === sourceActivityId,
        )
      : -1;
  const sourceActivity =
    sourceIndex >= 0 ? normalizedActivities[sourceIndex] : null;

  if (sourceActivity?.activityType === "DELIVER_SUPPLIES") {
    const collectIndex = findPairedCollectIndexForDelivery(
      normalizedActivities,
      sourceIndex,
    );

    if (collectIndex < 0) {
      return normalizedActivities;
    }

    const pairedDeliveryIndexes = findPairedDeliveryIndexesForCollector(
      normalizedActivities,
      collectIndex,
    );

    // Aggregate supplies from ALL paired delivery steps (including the just-edited one)
    // so the collector reflects the total of all deliveries, not just the changed step.
    const allDeliverySupplies: ClusterSupplyCollection[] = [];
    for (const idx of pairedDeliveryIndexes) {
      const distributable = getDistributableSupplyCollections(
        normalizedActivities[idx].suppliesToCollect,
      );
      if (distributable) {
        allDeliverySupplies.push(...distributable);
      }
    }
    const aggregatedDeliverySupplies =
      allDeliverySupplies.length > 0
        ? mergeSupplyCollections(allDeliverySupplies)
        : null;

    return normalizedActivities.map((activity, index) =>
      index === collectIndex
        ? {
            ...activity,
            suppliesToCollect: mergeCollectorReusableSuppliesWithDelivery(
              activity.suppliesToCollect,
              aggregatedDeliverySupplies,
            ),
          }
        : activity,
    );
  }

  const collectIndexesToSync =
    sourceActivity?.activityType === "COLLECT_SUPPLIES"
      ? [sourceIndex]
      : normalizedActivities
          .map((activity, index) =>
            activity.activityType === "COLLECT_SUPPLIES" ? index : -1,
          )
          .filter((index) => index >= 0);

  if (collectIndexesToSync.length === 0) {
    return normalizedActivities;
  }

  const deliveryUpdates = new Map<number, ClusterSupplyCollection[] | null>();

  for (const collectIndex of collectIndexesToSync) {
    const collector = normalizedActivities[collectIndex];
    const distributableSupplies = getDistributableSupplyCollections(
      collector.suppliesToCollect,
    );

    const pairedDeliveryIndexes = findPairedDeliveryIndexesForCollector(
      normalizedActivities,
      collectIndex,
    );

    // When there are multiple delivery steps, each step has its own independent
    // quantity set by the user. Only propagate the collector's total to each
    // delivery step if that step has no supplies yet (initial setup).
    for (const deliveryIndex of pairedDeliveryIndexes) {
      const deliveryActivity = normalizedActivities[deliveryIndex];
      const hasOwnSupplies =
        deliveryActivity.suppliesToCollect != null &&
        deliveryActivity.suppliesToCollect.length > 0;
      if (!hasOwnSupplies) {
        deliveryUpdates.set(deliveryIndex, distributableSupplies);
      }
    }
  }

  if (deliveryUpdates.size === 0) {
    return normalizedActivities;
  }

  return normalizedActivities.map((activity, index) =>
    deliveryUpdates.has(index)
      ? {
          ...activity,
          suppliesToCollect: deliveryUpdates.get(index) ?? null,
        }
      : activity,
  );
}

function getDistributableSupplyCollections(
  supplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  const distributableSupplies = (cloneSupplyCollections(supplies) ?? []).filter(
    (supply) => !isReusableSupplyCollection(supply),
  );

  return distributableSupplies.length > 0
    ? mergeSupplyCollections(distributableSupplies)
    : null;
}

function mergeCollectorReusableSuppliesWithDelivery(
  collectorSupplies: ClusterSupplyCollection[] | null | undefined,
  deliverySupplies: ClusterSupplyCollection[] | null | undefined,
): ClusterSupplyCollection[] | null {
  const reusableCollectorSupplies = (
    cloneSupplyCollections(collectorSupplies) ?? []
  ).filter(isReusableSupplyCollection);
  const normalizedDeliverySupplies =
    getDistributableSupplyCollections(deliverySupplies) ?? [];

  return mergeSupplyCollections([
    ...reusableCollectorSupplies,
    ...normalizedDeliverySupplies,
  ]);
}

function findPairedCollectIndexForDelivery(
  activities: EditableActivity[],
  deliveryIndex: number,
): number {
  const delivery = activities[deliveryIndex];
  if (!delivery || delivery.activityType !== "DELIVER_SUPPLIES") {
    return -1;
  }

  const deliveryTeamId = toValidTeamId(delivery.suggestedTeam?.teamId);
  const deliverySosRequestId = toValidSosRequestId(delivery.sosRequestId);
  const deliveryStep = Number(delivery.step);

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = deliveryIndex - 1; index >= 0; index -= 1) {
    const candidate = activities[index];
    if (candidate.activityType !== "COLLECT_SUPPLIES") {
      continue;
    }

    const candidateTeamId = toValidTeamId(candidate.suggestedTeam?.teamId);
    const candidateSosRequestId = toValidSosRequestId(candidate.sosRequestId);
    const candidateStep = Number(candidate.step);
    let score = 0;

    if (
      deliveryTeamId != null &&
      candidateTeamId != null &&
      deliveryTeamId === candidateTeamId
    ) {
      score += 60;
    }

    if (
      deliverySosRequestId != null &&
      candidateSosRequestId != null &&
      deliverySosRequestId === candidateSosRequestId
    ) {
      score += 40;
    }

    if (Number.isFinite(deliveryStep) && Number.isFinite(candidateStep)) {
      score += Math.max(0, 20 - Math.abs(deliveryStep - candidateStep));
    }

    score += index;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function findPairedDeliveryIndexesForCollector(
  activities: EditableActivity[],
  collectorIndex: number,
): number[] {
  const collector = activities[collectorIndex];
  if (!collector || collector.activityType !== "COLLECT_SUPPLIES") {
    return [];
  }

  const nextCollectorIndex = activities.findIndex(
    (activity, index) =>
      index > collectorIndex && activity.activityType === "COLLECT_SUPPLIES",
  );
  const searchEnd =
    nextCollectorIndex >= 0 ? nextCollectorIndex : activities.length;
  const deliveryIndexes: number[] = [];

  for (let index = collectorIndex + 1; index < searchEnd; index += 1) {
    if (activities[index].activityType === "DELIVER_SUPPLIES") {
      deliveryIndexes.push(index);
    }
  }

  if (deliveryIndexes.length > 0) {
    return deliveryIndexes;
  }

  const collectorTeamId = toValidTeamId(collector.suggestedTeam?.teamId);
  const collectorSosRequestId = toValidSosRequestId(collector.sosRequestId);

  return activities
    .map((activity, index) => ({ activity, index }))
    .filter(({ activity, index }) => {
      if (
        index <= collectorIndex ||
        activity.activityType !== "DELIVER_SUPPLIES"
      ) {
        return false;
      }

      const deliveryTeamId = toValidTeamId(activity.suggestedTeam?.teamId);
      const deliverySosRequestId = toValidSosRequestId(activity.sosRequestId);

      if (
        collectorTeamId != null &&
        deliveryTeamId != null &&
        collectorTeamId !== deliveryTeamId
      ) {
        return false;
      }

      if (
        collectorSosRequestId != null &&
        deliverySosRequestId != null &&
        collectorSosRequestId !== deliverySosRequestId
      ) {
        return false;
      }

      return true;
    })
    .map(({ index }) => index);
}

function buildTeamSupplyRemainingBalance(
  activities: EditableActivity[],
  teamId: number,
  preservedDeliverySupplyKeys?: Set<string>,
): Map<string, number> {
  const balanceByKey = new Map<string, number>();

  for (const activity of activities) {
    const activityTeamId = toValidTeamId(activity.suggestedTeam?.teamId);
    if (activityTeamId !== teamId) {
      continue;
    }

    const normalizedType = normalizeActivityTypeKey(activity.activityType);
    const isInflow = normalizedType === "collectsupplies";
    const isOutflow =
      normalizedType === "deliversupplies" ||
      normalizedType === "returnsupplies";

    if (!isInflow && !isOutflow) {
      continue;
    }

    const mergedSupplies = mergeSupplyCollections(activity.suppliesToCollect);
    for (const supply of mergedSupplies ?? []) {
      const key = buildSupplyComparisonKey(supply);
      const quantity = Math.max(0, Number(supply.quantity) || 0);
      const current = balanceByKey.get(key) ?? 0;

      if (
        normalizedType === "deliversupplies" &&
        preservedDeliverySupplyKeys?.has(key)
      ) {
        continue;
      }

      if (isInflow) {
        balanceByKey.set(key, current + quantity);
      } else {
        balanceByKey.set(key, Math.max(0, current - quantity));
      }
    }
  }

  return balanceByKey;
}

function capReturnSuppliesByRemainingBalance(
  returnSupplies: ClusterSupplyCollection[] | null | undefined,
  remainingBalanceByKey: Map<string, number>,
): ClusterSupplyCollection[] | null {
  const mergedReturnSupplies = mergeSupplyCollections(returnSupplies);
  if (!mergedReturnSupplies || mergedReturnSupplies.length === 0) {
    return null;
  }

  const cappedSupplies: ClusterSupplyCollection[] = [];

  for (const supply of mergedReturnSupplies) {
    const key = buildSupplyComparisonKey(supply);
    const remaining = remainingBalanceByKey.get(key) ?? 0;
    if (remaining <= 0) {
      continue;
    }

    const desiredQuantity = Math.min(
      Math.max(0, Number(supply.quantity) || 0),
      remaining,
    );

    if (desiredQuantity <= 0) {
      continue;
    }

    cappedSupplies.push({
      ...supply,
      quantity: desiredQuantity,
    });

    remainingBalanceByKey.set(key, Math.max(0, remaining - desiredQuantity));
  }

  return cappedSupplies.length > 0 ? cappedSupplies : null;
}

function normalizeDepotName(value?: string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function findCollectorActivityForReturn(
  returnActivity: Pick<
    ClusterSuggestedActivity,
    "activityType" | "step" | "depotId" | "depotName" | "suppliesToCollect"
  >,
  activities: Array<
    Pick<
      ClusterSuggestedActivity,
      | "activityType"
      | "step"
      | "depotId"
      | "depotName"
      | "suppliesToCollect"
      | "suggestedTeam"
    >
  >,
) {
  if (returnActivity.activityType !== "RETURN_SUPPLIES") {
    return null;
  }

  const returnStep = Number(returnActivity.step);
  const returnDepotId =
    typeof returnActivity.depotId === "number" && returnActivity.depotId > 0
      ? returnActivity.depotId
      : null;
  const returnDepotName = normalizeDepotName(returnActivity.depotName);
  const returnSupplyItemIds = getSupplyItemIdSet(returnActivity);

  let bestCandidate: {
    activity: (typeof activities)[number];
    score: number;
    step: number;
  } | null = null;

  for (const activity of activities) {
    if (activity.activityType !== "COLLECT_SUPPLIES") {
      continue;
    }

    const collectorTeamId = toValidTeamId(activity.suggestedTeam?.teamId);
    if (collectorTeamId == null) {
      continue;
    }

    const collectorStep = Number(activity.step);
    const collectorDepotId =
      typeof activity.depotId === "number" && activity.depotId > 0
        ? activity.depotId
        : null;
    const collectorDepotName = normalizeDepotName(activity.depotName);
    const collectorSupplyItemIds = getSupplyItemIdSet(activity);

    let score = 0;

    if (returnDepotId != null && collectorDepotId != null) {
      if (returnDepotId === collectorDepotId) {
        score += 120;
      }
    }

    if (
      returnDepotName &&
      collectorDepotName &&
      returnDepotName === collectorDepotName
    ) {
      score += 80;
    }

    let overlapCount = 0;
    if (returnSupplyItemIds.size > 0 && collectorSupplyItemIds.size > 0) {
      for (const itemId of returnSupplyItemIds) {
        if (collectorSupplyItemIds.has(itemId)) {
          overlapCount += 1;
        }
      }
      score += overlapCount * 35;
    }

    if (Number.isFinite(returnStep) && Number.isFinite(collectorStep)) {
      if (collectorStep <= returnStep) {
        score += 12;
      } else {
        score -= 8;
      }
      score += Math.max(0, 6 - Math.abs(returnStep - collectorStep));
    }

    if (overlapCount === 0 && !returnDepotName && returnDepotId == null) {
      score += 1;
    }

    if (
      !bestCandidate ||
      score > bestCandidate.score ||
      (score === bestCandidate.score && collectorStep > bestCandidate.step)
    ) {
      bestCandidate = {
        activity,
        score,
        step: Number.isFinite(collectorStep) ? collectorStep : -1,
      };
    }
  }

  return bestCandidate?.activity ?? null;
}

function parseSupplyItemsFromDescription(
  description: string,
): SupplyDisplayItem[] {
  const markerMatch = description.match(
    /(?:Lấy|Lay|Thu gom|Thu gom Vật phẩm|Thu gom vat tu|Giao Vật phẩm|Ban giao|Bàn giao|Tiếp tế|Tiep te|Trả|Tra|Hoàn trả|Hoan tra|Cấp phát|Cap phat|Collect(?: supplies)?|Deliver(?: supplies)?|Return(?: supplies)?)[^:]*:\s*(.+)$/i,
  );
  if (!markerMatch?.[1]) return [];

  const listText = markerMatch[1].replace(/\.+\s*$/, "").trim();
  if (!listText) return [];

  return listText
    .split(/\s*,\s*/)
    .map((chunk) => {
      const value = chunk.trim();
      if (!value) return null;

      const qtyMatch = value.match(/^(.*?)[xX×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (!qtyMatch) {
        return {
          name: value,
          quantityLabel: "",
          bufferRatioLabel: null,
          pickedQuantityLabel: null,
          deliveredQuantityLabel: null,
          lotSourceLabel: null,
          lotRows: [],
          lotReferenceLabel: null,
          lotReferenceRows: [],
        };
      }

      const name = qtyMatch[1].trim();
      const quantity = qtyMatch[2].trim();
      const unit = qtyMatch[3].trim();

      return {
        name: name || value,
        quantityLabel: `${quantity} ${unit}`.trim(),
        bufferRatioLabel: null,
        pickedQuantityLabel: null,
        deliveredQuantityLabel: null,
        lotSourceLabel: null,
        lotRows: [],
        lotReferenceLabel: null,
        lotReferenceRows: [],
      };
    })
    .filter((item): item is SupplyDisplayItem => !!item && !!item.name);
}

function getSupplyDisplayItems(activity: {
  activityType: string;
  description: string;
  suppliesToCollect?: SupplyDisplaySource[] | null;
}): SupplyDisplayItem[] {
  if (activity.suppliesToCollect && activity.suppliesToCollect.length > 0) {
    return activity.suppliesToCollect.map((supply) =>
      buildSupplyDisplayItem(activity.activityType, {
        ...supply,
        quantity: toFiniteNumber(supply.quantity) ?? 0,
        unit: normalizeSupplyUnit(supply.unit),
      }),
    );
  }

  if (!isSupplyStep(activity.activityType)) return [];
  return parseSupplyItemsFromDescription(activity.description);
}

function stripSupplyDetailsFromDescription(description: string): string {
  return description
    .replace(
      /\s*(?:Lấy|Lay|Thu gom|Thu gom Vật phẩm|Thu gom vat tu|Giao Vật phẩm|Ban giao|Bàn giao|Tiếp tế|Tiep te|Hoàn trả|Hoan tra|Cấp phát|Cap phat|Collect(?: supplies)?|Deliver(?: supplies)?|Return(?: supplies)?)[^:]*:\s*.*$/i,
      "",
    )
    .replace(/[\s,;:.]+$/, "")
    .trim();
}

function getActivityStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  const normalizedStatus = (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (normalizedStatus === "succeed" || normalizedStatus === "completed") {
    return {
      label: "Hoàn thành",
      className:
        "bg-[#16a34a]/12 text-[#16a34a] border-[#16a34a]/40 dark:bg-[#117b38]/20 dark:text-[#117b38] dark:border-[#117b38]/45",
      icon: <CheckCircle className="h-3.5 w-3.5" weight="fill" />,
    };
  }

  if (normalizedStatus === "suggested") {
    return {
      label: "Gợi ý",
      className:
        "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
      icon: <Lightning className="h-3.5 w-3.5" weight="fill" />,
    };
  }

  if (normalizedStatus === "ongoing" || normalizedStatus === "inprogress") {
    return {
      label: "Đang thực hiện",
      className:
        "bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/40 dark:bg-[#c07e09]/20 dark:text-[#c07e09] dark:border-[#c07e09]/45",
      icon: <CircleNotch className="h-3.5 w-3.5 animate-spin" weight="bold" />,
    };
  }

  if (normalizedStatus === "pendingconfirmation") {
    return {
      label: "Chờ kho xác nhận",
      className:
        "bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/40 dark:bg-[#c07e09]/20 dark:text-[#c07e09] dark:border-[#c07e09]/45",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }

  if (normalizedStatus === "pending") {
    return {
      label: "Chờ xác nhận",
      className:
        "bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/40 dark:bg-[#c07e09]/20 dark:text-[#c07e09] dark:border-[#c07e09]/45",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }

  if (normalizedStatus === "planned") {
    return {
      label: "Đã lập kế hoạch",
      className:
        "bg-[#0ea5e9]/12 text-[#0ea5e9] border-[#0ea5e9]/40 dark:bg-[#0b7eaf]/18 dark:text-[#0b7eaf] dark:border-[#0b7eaf]/45",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }

  if (normalizedStatus === "failed") {
    return {
      label: "Thất bại",
      className:
        "bg-[#ff5722]/12 text-[#ff5722] border-[#ff5722]/40 dark:bg-[#bf4119]/20 dark:text-[#bf4119] dark:border-[#bf4119]/45",
      icon: <Warning className="h-3.5 w-3.5" weight="fill" />,
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      label: "Đã hủy",
      className:
        "bg-[#6e6e73]/10 text-[#6e6e73] border-[#6e6e73]/35 dark:bg-[#aaaaaa]/18 dark:text-[#aaaaaa] dark:border-[#aaaaaa]/45",
      icon: <X className="h-3.5 w-3.5" weight="bold" />,
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
    icon: <Clock className="h-3.5 w-3.5" />,
  };
}

function getMissionStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalizedStatus = (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (normalizedStatus === "completed") {
    return {
      label: "Hoàn thành",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    };
  }

  if (normalizedStatus === "ongoing" || normalizedStatus === "inprogress") {
    return {
      label: "Đang thực hiện",
      className:
        "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      label: "Đã hủy",
      className:
        "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
    };
  }

  if (normalizedStatus === "pending") {
    return {
      label: "Chờ xử lý",
      className:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    };
  }

  if (normalizedStatus === "planned") {
    return {
      label: "Đã lập kế hoạch",
      className:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    };
  }

  if (normalizedStatus === "incompleted") {
    return {
      label: "Chưa hoàn thành",
      className:
        "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  };
}

function getTeamAssignmentStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "assigned") {
    return {
      label: "Đã phân công",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    };
  }

  if (
    normalizedStatus === "inprogress" ||
    normalizedStatus === "in_progress" ||
    normalizedStatus === "in progress"
  ) {
    return {
      label: "Đang thực hiện",
      className:
        "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    };
  }

  if (
    normalizedStatus === "unassigned" ||
    normalizedStatus === "removed" ||
    normalizedStatus === "inactive"
  ) {
    return {
      label: "Ngừng phụ trách",
      className:
        "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
    };
  }

  if (
    normalizedStatus === "completed" ||
    normalizedStatus === "succeed" ||
    normalizedStatus === "success"
  ) {
    return {
      label: "Hoàn thành",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    };
  }

  if (
    normalizedStatus === "completedwaitingreport" ||
    normalizedStatus === "completed_waiting_report"
  ) {
    return {
      label: "Hoàn thành – Chờ báo cáo",
      className:
        "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
    };
  }

  if (normalizedStatus === "reported") {
    return {
      label: "Đã báo cáo",
      className:
        "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
    };
  }

  if (
    normalizedStatus === "waitingreport" ||
    normalizedStatus === "waiting_report"
  ) {
    return {
      label: "Chờ báo cáo",
      className:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  };
}

function isMissionTeamActive(team: MissionTeam): boolean {
  const normalizedStatus = (team.status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  return (
    (!team.unassignedAt || team.unassignedAt.trim() === "") &&
    (normalizedStatus === "assigned" ||
      normalizedStatus === "inprogress" ||
      normalizedStatus === "reported" ||
      normalizedStatus === "completed")
  );
}

const RESCUE_TEAM_STATUS_LABELS_VI: Record<RescueTeamStatusKey, string> = {
  AwaitingAcceptance: "Chờ xác nhận",
  Ready: "Sẵn sàng",
  Gathering: "Đang tập hợp",
  Available: "Sẵn sàng",
  Assigned: "Đã phân công",
  OnMission: "Đang làm nhiệm vụ",
  Stuck: "Mắc kẹt",
  Unavailable: "Không khả dụng",
  Disbanded: "Đã giải tán",
};

const RESCUE_TEAM_STATUS_COLOR_MAP: Record<string, string> = {
  awaitingacceptance:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  ready:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  gathering:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
  available:
    "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
  assigned:
    "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
  onmission:
    "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  stuck:
    "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  unavailable:
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  disbanded:
    "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-200 dark:border-zinc-600",
};

function normalizeRescueTeamStatusKey(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

function getRescueTeamStatusMeta(
  status: string | null | undefined,
  configuredLabels?: ReadonlyMap<string, string>,
): {
  label: string;
  className: string;
} {
  const normalizedStatus = normalizeRescueTeamStatusKey(status);
  const configuredLabel =
    normalizedStatus && configuredLabels
      ? configuredLabels.get(normalizedStatus)
      : undefined;
  const fallbackViLabel =
    status && status in RESCUE_TEAM_STATUS_LABELS_VI
      ? RESCUE_TEAM_STATUS_LABELS_VI[status as RescueTeamStatusKey]
      : undefined;

  return {
    label: configuredLabel || fallbackViLabel || status || "Chưa rõ",
    className: normalizedStatus
      ? (RESCUE_TEAM_STATUS_COLOR_MAP[normalizedStatus] ??
        "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600")
      : "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  };
}

function getActiveMissionTeams(mission: MissionEntity): MissionTeam[] {
  return (mission.teams ?? []).filter(isMissionTeamActive);
}

function inferSOSLabelFromCoords(
  lat: number,
  lng: number,
  sosRequests: SOSRequest[],
): string | null {
  const sosWithCoords = sosRequests.filter(
    (sos) =>
      typeof sos.location?.lat === "number" &&
      typeof sos.location?.lng === "number",
  );

  if (sosWithCoords.length === 0) return null;

  const nearest = sosWithCoords.reduce((best, current) => {
    const bestDistSq =
      Math.pow(best.location!.lat - lat, 2) +
      Math.pow(best.location!.lng - lng, 2);
    const currentDistSq =
      Math.pow(current.location!.lat - lat, 2) +
      Math.pow(current.location!.lng - lng, 2);
    return currentDistSq < bestDistSq ? current : best;
  });

  const nearestDistSq =
    Math.pow(nearest.location!.lat - lat, 2) +
    Math.pow(nearest.location!.lng - lng, 2);

  if (nearestDistSq > Math.pow(SOS_COORD_MATCH_EPSILON, 2)) return null;
  return `SOS #${nearest.id}`;
}

function getWaypointMeta(
  waypoint: UniqueWaypoint,
  sosRequests: SOSRequest[],
): WaypointMeta {
  const sosIds = new Set<string>();
  let hasSOS = false;
  let hasDepot = false;

  const pushSosId = (value: string | null | undefined) => {
    if (!value) return;
    const match = value.match(/(\d+)/);
    if (!match?.[1]) return;
    sosIds.add(match[1]);
    hasSOS = true;
  };

  for (const activity of waypoint.activities) {
    const depotLabel = extractDepotLabel(activity);
    if (depotLabel) {
      hasDepot = true;
    }

    if (typeof activity.sosRequestId === "number") {
      pushSosId(String(activity.sosRequestId));
      continue;
    }

    const sosLabel = extractSOSLabel(activity);
    if (sosLabel) {
      pushSosId(sosLabel);
    } else if (!depotLabel) {
      const inferredFromCoords = inferSOSLabelFromCoords(
        activity.targetLatitude,
        activity.targetLongitude,
        sosRequests,
      );
      if (inferredFromCoords) {
        pushSosId(inferredFromCoords);
      }
    }
  }

  const orderedLabels = Array.from(sosIds)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => `SOS ${id}`);

  const stepNumbers = waypoint.activities
    .map((activity) => activity.step)
    .filter((step) => Number.isFinite(step))
    .sort((a, b) => a - b);

  const uniqueStepNumbers = Array.from(new Set(stepNumbers));
  const firstStep = uniqueStepNumbers[0];
  const lastStep = uniqueStepNumbers[uniqueStepNumbers.length - 1];
  const stepRangeLabel =
    uniqueStepNumbers.length === 0
      ? ""
      : firstStep === lastStep
        ? `Bước ${firstStep}`
        : `Bước ${firstStep}-${lastStep}`;

  return {
    labels: orderedLabels,
    hasSOS,
    hasDepot,
    stepNumbers: uniqueStepNumbers,
    stepRangeLabel,
  };
}

function extractDepotLabelFromRouteWaypoint(
  waypoint: MissionTeamRouteWaypoint,
): string | null {
  if (!isDepotSupplyStep(waypoint.activityType)) return null;

  const description = String(waypoint.description ?? "").trim();
  if (!description) return "Kho tiếp tế";

  const match = description.match(/kho\s+(.+?)(?:\s+tại|\s+tai|\.|,|$)/i);
  if (match?.[1]) {
    const depotName = match[1].trim();
    return depotName ? `Kho ${depotName}` : "Kho tiếp tế";
  }

  return /\bkho\b/i.test(description) ? "Kho tiếp tế" : null;
}

function extractTargetLabelFromRouteWaypoint(
  waypoint: MissionTeamRouteWaypoint,
): string | null {
  const description = String(waypoint.description ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!description) return null;

  if (isDepotSupplyStep(waypoint.activityType)) {
    return extractDepotLabelFromRouteWaypoint(waypoint);
  }

  const startMatch = description.match(/di chuyển đến\s+(.+)/i);
  if (!startMatch?.[1]) {
    return null;
  }

  let label = startMatch[1]
    .split(/\s+(?:Lấy:|Giao\b|Thực hiện\b)/i)[0]
    .replace(/\s+\((?:tiện đường|tien duong)[^)]+\)\s*$/i, "")
    .trim();

  const sosLabel = extractSOSLabelFromRouteWaypoint(waypoint);
  if (sosLabel && /\(SOS\s*ID\s*\d+\)/i.test(label)) {
    label = label.replace(/\s*\(SOS\s*ID\s*\d+\)\s*/i, "").trim();
    return label ? `${sosLabel} • ${label}` : sosLabel;
  }

  return label || sosLabel;
}

function extractSOSLabelFromRouteWaypoint(
  waypoint: MissionTeamRouteWaypoint,
): string | null {
  const description = String(waypoint.description ?? "").trim();
  if (!description) return null;

  const match = description.match(SOS_TARGET_REGEX);
  if (!match?.[1]) return null;

  return `SOS ${match[1]}`;
}

const MissionRoutePreview = ({
  mission,
  sosRequests,
}: {
  mission: MissionEntity;
  sosRequests: SOSRequest[];
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<RouteVehicle>("bike");
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [fallbackSegments, setFallbackSegments] = useState(0);
  const [alternativeVehicleSegments, setAlternativeVehicleSegments] =
    useState(0);
  const abortRef = useRef(false);

  const routeOrigin = useMemo(() => {
    const teams = mission.teams ?? [];
    const hasActiveStatus = (status: string | null | undefined) => {
      const normalized = (status ?? "").trim().toLowerCase();
      return (
        normalized === "assigned" ||
        normalized === "inprogress" ||
        normalized === "in_progress" ||
        normalized === "in progress"
      );
    };

    const activeTeams = teams.filter(
      (team) => team.unassignedAt == null && hasActiveStatus(team.status),
    );

    const teamCandidates = activeTeams.length > 0 ? activeTeams : teams;

    for (const team of teamCandidates) {
      const lat =
        typeof team.latitude === "number" ? team.latitude : Number.NaN;
      const lng =
        typeof team.longitude === "number" ? team.longitude : Number.NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const baseName = team.teamName || `Đội #${team.rescueTeamId}`;
      const sourceSuffix = team.locationSource
        ? ` (${team.locationSource})`
        : "";

      return {
        lat,
        lng,
        label: `${baseName}${sourceSuffix}`,
        isFallback: false,
      };
    }

    const activeTeamIds = new Set(activeTeams.map((team) => team.rescueTeamId));
    const suggested = mission.suggestedActivities ?? [];
    const suggestedCandidates =
      activeTeamIds.size > 0
        ? suggested.filter((activity) =>
            activity.suggestedTeam?.teamId
              ? activeTeamIds.has(activity.suggestedTeam.teamId)
              : false,
          )
        : suggested;

    for (const activity of suggestedCandidates) {
      const rawLat = activity.suggestedTeam?.latitude;
      const rawLng = activity.suggestedTeam?.longitude;
      const lat =
        typeof rawLat === "number"
          ? rawLat
          : typeof rawLat === "string"
            ? Number(rawLat)
            : Number.NaN;
      const lng =
        typeof rawLng === "number"
          ? rawLng
          : typeof rawLng === "string"
            ? Number(rawLng)
            : Number.NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const teamLabel =
        activity.suggestedTeam?.teamName ||
        (activity.suggestedTeam?.teamId
          ? `Đội #${activity.suggestedTeam.teamId}`
          : "Đội cứu hộ đề xuất");

      return {
        lat,
        lng,
        label: `${teamLabel} (AI đề xuất)`,
        isFallback: false,
      };
    }

    return {
      lat: HUE_DEFAULT_ORIGIN.lat,
      lng: HUE_DEFAULT_ORIGIN.lng,
      label: "Mặc định Huế",
      isFallback: true,
    };
  }, [mission.teams, mission.suggestedActivities]);

  const originCoords = useMemo(
    () => ({ lat: routeOrigin.lat, lng: routeOrigin.lng }),
    [routeOrigin.lat, routeOrigin.lng],
  );

  // Filter activities that have valid coordinates, sorted by step
  // Fallback: if targetLatitude/Longitude are 0 or all the same, try parsing from description
  const routeActivities = useMemo(() => {
    const acts = mission.activities
      .filter((a) => RESCUE_ROUTE_ACTIVITY_TYPES.has(a.activityType))
      .slice()
      .sort((a, b) => a.step - b.step);

    // Enrich activities: if coords are 0, try extracting from description
    const enriched = acts.map((a) => {
      if (a.targetLatitude !== 0 && a.targetLongitude !== 0) return a;
      const parsed = extractCoordsFromDescription(a.description);
      if (parsed) {
        return {
          ...a,
          targetLatitude: parsed.lat,
          targetLongitude: parsed.lng,
        };
      }
      return a;
    });

    // Check if all non-zero coords are identical (cluster center fallback)
    const withCoords = enriched.filter(
      (a) => a.targetLatitude !== 0 && a.targetLongitude !== 0,
    );
    if (withCoords.length > 1) {
      const allSame = withCoords.every(
        (a) =>
          a.targetLatitude === withCoords[0].targetLatitude &&
          a.targetLongitude === withCoords[0].targetLongitude,
      );
      if (allSame) {
        // All have cluster center coords — try parsing unique coords from descriptions
        return enriched
          .map((a) => {
            const parsed = extractCoordsFromDescription(a.description);
            if (parsed) {
              return {
                ...a,
                targetLatitude: parsed.lat,
                targetLongitude: parsed.lng,
              };
            }
            return a;
          })
          .filter((a) => a.targetLatitude !== 0 && a.targetLongitude !== 0);
      }
    }

    return enriched.filter(
      (a) => a.targetLatitude !== 0 && a.targetLongitude !== 0,
    );
  }, [mission.activities]);

  // Deduplicate consecutive activities sharing the same coordinates
  const uniqueWaypoints = useMemo(() => {
    const wps: UniqueWaypoint[] = [];
    for (const act of routeActivities) {
      const last = wps[wps.length - 1];
      if (
        last &&
        Math.abs(last.lat - act.targetLatitude) < COORD_EPSILON &&
        Math.abs(last.lng - act.targetLongitude) < COORD_EPSILON
      ) {
        last.activities.push(act);
      } else {
        wps.push({
          lat: act.targetLatitude,
          lng: act.targetLongitude,
          activities: [act],
        });
      }
    }
    return wps;
  }, [routeActivities]);

  // Load Leaflet CSS
  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }, []);

  // Fetch routes only between distinct waypoints, chaining origins
  useEffect(() => {
    if (!open || uniqueWaypoints.length === 0) return;
    abortRef.current = false;
    setLoading(true);
    setError(null);
    setSegments([]);
    setFetchProgress(0);
    setFallbackSegments(0);
    setAlternativeVehicleSegments(0);

    let currentOrigin = { lat: originCoords.lat, lng: originCoords.lng };

    (async () => {
      const allSegments: RouteSegment[] = [];
      let distanceSum = 0;
      let durationSum = 0;
      let fallbackCount = 0;
      let altVehicleCount = 0;

      for (let i = 0; i < uniqueWaypoints.length; i++) {
        if (abortRef.current) return;
        const wp = uniqueWaypoints[i];

        // Skip if origin is already at this waypoint (e.g. user is at the first point)
        const isSameAsOrigin =
          Math.abs(currentOrigin.lat - wp.lat) < COORD_EPSILON &&
          Math.abs(currentOrigin.lng - wp.lng) < COORD_EPSILON;

        if (!isSameAsOrigin) {
          // Use the first activity in this waypoint group for the API call
          const representativeAct = wp.activities[0];
          let segmentAdded = false;
          const tryVehicles = buildVehicleTryOrder(vehicle);

          for (const tryVehicle of tryVehicles) {
            try {
              const resp = await getActivityRoute({
                missionId: mission.id,
                activityId: representativeAct.id,
                originLat: currentOrigin.lat,
                originLng: currentOrigin.lng,
                vehicle: tryVehicle,
              });
              if (!resp.route?.overviewPolyline) {
                continue;
              }

              const decoded = polylineDecode.decode(
                resp.route.overviewPolyline,
              ) as [number, number][];
              if (decoded.length < 2) {
                continue;
              }

              allSegments.push({
                index: i,
                waypoint: wp,
                points: decoded,
                steps: resp.route.steps ?? [],
                distance: resp.route.totalDistanceText,
                duration: resp.route.totalDurationText,
                distanceMeters: resp.route.totalDistanceMeters,
                durationSeconds: resp.route.totalDurationSeconds,
              });
              distanceSum += resp.route.totalDistanceMeters;
              durationSum += resp.route.totalDurationSeconds;
              if (tryVehicle !== vehicle) {
                altVehicleCount += 1;
              }
              segmentAdded = true;
              break;
            } catch {
              // Try next vehicle profile for the same segment.
            }
          }

          if (!segmentAdded) {
            // Final fallback: draw a direct line so the mission route still renders.
            const distanceMeters = Math.round(
              haversineDistanceMeters(currentOrigin, {
                lat: wp.lat,
                lng: wp.lng,
              }),
            );
            const durationSeconds = estimateDurationSeconds(
              distanceMeters,
              vehicle,
            );
            allSegments.push({
              index: i,
              waypoint: wp,
              points: [
                [currentOrigin.lat, currentOrigin.lng],
                [wp.lat, wp.lng],
              ],
              steps: [],
              distance:
                distanceMeters < 1000
                  ? `${distanceMeters}m`
                  : `${(distanceMeters / 1000).toFixed(1)} km`,
              duration:
                durationSeconds < 3600
                  ? `${Math.round(durationSeconds / 60)} phút`
                  : `${Math.floor(durationSeconds / 3600)}h ${Math.round((durationSeconds % 3600) / 60)}p`,
              distanceMeters,
              durationSeconds,
            });
            distanceSum += distanceMeters;
            durationSum += durationSeconds;
            fallbackCount += 1;
          }
        }

        // Chain: next origin = this waypoint
        currentOrigin = { lat: wp.lat, lng: wp.lng };
        setFetchProgress(i + 1);
      }

      if (!abortRef.current) {
        setSegments(allSegments);
        setTotalDistance(distanceSum);
        setTotalDuration(durationSum);
        setFallbackSegments(fallbackCount);
        setAlternativeVehicleSegments(altVehicleCount);
        setLoading(false);
      }
    })();

    return () => {
      abortRef.current = true;
    };
  }, [open, originCoords, uniqueWaypoints, vehicle, mission.id]);

  const waypointMetaList = useMemo(
    () =>
      uniqueWaypoints.map((waypoint) => getWaypointMeta(waypoint, sosRequests)),
    [uniqueWaypoints, sosRequests],
  );

  if (routeActivities.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình tổng hợp ({uniqueWaypoints.length} điểm ·{" "}
        {routeActivities.length} bước)
      </button>
    );
  }

  const allPoints = segments.flatMap((s) => s.points);
  const missionRouteMapKey = buildLeafletMapKey(allPoints);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs}h ${remainMins}p` : `${hrs}h`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Color palette for route segments
  const segmentColors = [
    "#FF6B35",
    "#2563EB",
    "#16A34A",
    "#9333EA",
    "#DC2626",
    "#D97706",
    "#0891B2",
    "#BE185D",
  ];

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <NavigationArrow className="h-3 w-3" weight="fill" />
          Lộ trình tổng hợp
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded border bg-background overflow-hidden">
            {(
              [
                { key: "bike", label: "Xe máy" },
                { key: "car", label: "Ô tô" },
                { key: "hd", label: "Xe tải" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVehicle(v.key)}
                className={cn(
                  "px-1.5 py-0.5 text-sm font-medium transition-colors",
                  vehicle === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" weight="fill" />
        {routeOrigin.isFallback
          ? `Xuất phát mặc định: Huế (${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)})`
          : `Xuất phát từ ${routeOrigin.label} (${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)})`}
      </p>
      {loading && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1 animate-pulse">
            <CircleNotch className="h-3 w-3 animate-spin" />
            Đang tải lộ trình ({fetchProgress}/{uniqueWaypoints.length} điểm)...
          </p>
          <Skeleton className="h-48 w-full rounded" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && segments.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-primary">
              {formatDistance(totalDistance)}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </span>
            <span className="text-muted-foreground">
              {uniqueWaypoints.length} điểm · {segments.length} đoạn đường
            </span>
          </div>

          {(fallbackSegments > 0 || alternativeVehicleSegments > 0) && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {alternativeVehicleSegments > 0
                ? `${alternativeVehicleSegments} đoạn đã tự đổi phương tiện để tìm đường. `
                : ""}
              {fallbackSegments > 0
                ? `${fallbackSegments} đoạn dùng lộ trình ước lượng đường thẳng do API chưa trả tuyến.`
                : ""}
            </p>
          )}

          {originCoords && allPoints.length > 1 && (
            <div className="h-112 overflow-hidden rounded-lg border bg-background">
              <MapContainer
                key={missionRouteMapKey}
                center={allPoints[0]}
                zoom={10}
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                attributionControl={false}
                className="h-full w-full"
              >
                <GoongLeafletLayer
                  apiKey={process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}
                />
                <MapInvalidator />
                <RoutePreviewFitBounds points={allPoints} />
                {/* Render each segment with different color */}
                {segments.flatMap((seg, idx) => {
                  const durationLabel =
                    (typeof seg.duration === "string" && seg.duration.trim()) ||
                    formatDuration(seg.durationSeconds);
                  const routeLabelAnchor = getRouteLabelAnchor(seg.points);
                  const segmentKey = `mission-route-segment-${seg.index}-${idx}`;

                  return [
                    <Polyline
                      key={`${segmentKey}-line`}
                      positions={seg.points}
                      pathOptions={{
                        color: segmentColors[idx % segmentColors.length],
                        weight: 5,
                        opacity: 0.85,
                        lineJoin: "round",
                        lineCap: "round",
                      }}
                    />,
                    routeLabelAnchor ? (
                      <Marker
                        key={`${segmentKey}-eta`}
                        position={routeLabelAnchor}
                        icon={buildRouteDurationBadgeIcon(
                          durationLabel,
                          seg.isFallback ? "neutral" : "primary",
                        )}
                        interactive={false}
                        keyboard={false}
                      />
                    ) : null,
                  ];
                })}
                {/* Origin marker (green) */}
                <CircleMarker
                  center={[originCoords.lat, originCoords.lng]}
                  radius={8}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#16a34a",
                    fillOpacity: 1,
                  }}
                />
                {/* Unique waypoint markers */}
                {uniqueWaypoints.map((wp, idx) => {
                  const isLast = idx === uniqueWaypoints.length - 1;
                  const meta = waypointMetaList[idx];

                  const markerColor = isLast
                    ? "#dc2626"
                    : meta?.hasSOS
                      ? "#2563eb"
                      : meta?.hasDepot
                        ? "#a16207"
                        : segmentColors[idx % segmentColors.length];

                  return (
                    <CircleMarker
                      key={`wp-${idx}`}
                      center={[wp.lat, wp.lng]}
                      radius={isLast ? 9 : 7}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 2,
                        fillColor: markerColor,
                        fillOpacity: 1,
                      }}
                    >
                      {meta?.labels.length > 0 && (
                        <Tooltip
                          direction="top"
                          offset={[0, -10]}
                          opacity={1}
                          permanent
                        >
                          <div className="text-sm font-semibold whitespace-nowrap">
                            {meta.labels.join(" • ")}
                          </div>
                        </Tooltip>
                      )}
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          {/* Segment legend — grouped by unique waypoint */}
          <div className="space-y-1.5 mt-1">
            {uniqueWaypoints.map((wp, wpIdx) => {
              const seg = segments.find((s) => s.index === wpIdx);
              const meta = waypointMetaList[wpIdx];
              return (
                <div key={wpIdx} className="space-y-0.5">
                  {/* Route distance to this waypoint */}
                  {seg && (
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="w-4 h-1 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            segmentColors[wpIdx % segmentColors.length],
                        }}
                      />
                      <NavigationArrow
                        className="h-2.5 w-2.5 text-muted-foreground"
                        weight="bold"
                      />
                      <span className="text-muted-foreground">
                        {seg.distance} · {seg.duration}
                      </span>
                    </div>
                  )}
                  {seg?.steps?.[0]?.instruction ? (
                    <p className="pl-6 text-sm text-muted-foreground">
                      {seg.steps[0].instruction}
                      {seg.steps.length > 1
                        ? ` (+${seg.steps.length - 1} chặng)`
                        : ""}
                    </p>
                  ) : null}
                  {meta?.labels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pl-6">
                      {meta.labels.map((label) => (
                        <Badge
                          key={`${wpIdx}-${label}`}
                          variant="outline"
                          className="h-5 px-1.5 text-sm"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Activities at this waypoint */}
                  {wp.activities.map((act) => {
                    const config =
                      activityTypeConfig[act.activityType] ||
                      activityTypeConfig["ASSESS"];
                    return (
                      <div
                        key={act.id}
                        className="flex items-center gap-2 text-sm pl-6"
                      >
                        <span className="font-bold text-muted-foreground">
                          {act.step}.
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm h-5 px-1",
                            config.color,
                            config.bgColor,
                            "border-transparent",
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && segments.length === 0 && originCoords && (
        <p className="text-sm text-muted-foreground">
          Không tìm được tuyến đường. Hãy thử đổi loại phương tiện.
        </p>
      )}
    </div>
  );
};

const MissionTeamRoutePreview = ({
  mission,
  sosRequests,
}: {
  mission: MissionEntity;
  sosRequests: SOSRequest[];
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<RouteVehicle>("car");

  const missionRouteTeams = useMemo(() => {
    const teams = mission.teams ?? [];
    const activeTeams = teams.filter(isMissionTeamActive);
    const sourceTeams = activeTeams.length > 0 ? activeTeams : teams;

    return sourceTeams.filter(
      (team) => Number.isFinite(team.missionTeamId) && team.missionTeamId > 0,
    );
  }, [mission.teams]);

  const [selectedMissionTeamId, setSelectedMissionTeamId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (missionRouteTeams.length === 0) {
      setSelectedMissionTeamId(null);
      return;
    }

    setSelectedMissionTeamId((prev) => {
      if (
        prev != null &&
        missionRouteTeams.some((team) => team.missionTeamId === prev)
      ) {
        return prev;
      }
      return missionRouteTeams[0]?.missionTeamId ?? null;
    });
  }, [missionRouteTeams]);

  const selectedMissionTeam = useMemo(
    () =>
      missionRouteTeams.find(
        (team) => team.missionTeamId === selectedMissionTeamId,
      ) ??
      missionRouteTeams[0] ??
      null,
    [missionRouteTeams, selectedMissionTeamId],
  );

  const originCoords = useMemo(() => {
    const lat = selectedMissionTeam?.latitude;
    const lng = selectedMissionTeam?.longitude;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        lat: HUE_DEFAULT_ORIGIN.lat,
        lng: HUE_DEFAULT_ORIGIN.lng,
      };
    }

    return { lat: lat as number, lng: lng as number };
  }, [selectedMissionTeam?.latitude, selectedMissionTeam?.longitude]);

  const isFallbackOrigin = useMemo(() => {
    const lat = selectedMissionTeam?.latitude;
    const lng = selectedMissionTeam?.longitude;
    return !Number.isFinite(lat) || !Number.isFinite(lng);
  }, [selectedMissionTeam?.latitude, selectedMissionTeam?.longitude]);

  const {
    data: teamRouteData,
    isLoading: isTeamRouteLoading,
    isFetching: isTeamRouteFetching,
    isError: isTeamRouteError,
  } = useMissionTeamRoute(
    open && selectedMissionTeam
      ? {
          missionId: mission.id,
          missionTeamId: selectedMissionTeam.missionTeamId,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          vehicle,
        }
      : null,
    { enabled: open && !!selectedMissionTeam },
  );

  const { data: missionActivitiesData } = useMissionActivities(mission.id, {
    enabled: open && !!selectedMissionTeam,
  });

  const routeStatusMeta = useMemo(
    () => getActivityRouteStatusMeta(teamRouteData?.status),
    [teamRouteData?.status],
  );

  const routeErrorMessage = useMemo(
    () => formatRouteErrorMessage(teamRouteData?.errorMessage),
    [teamRouteData?.errorMessage],
  );
  const isTeamRouteRateLimited = useMemo(
    () => isRouteRateLimited(teamRouteData?.errorMessage),
    [teamRouteData?.errorMessage],
  );

  const routeWaypoints = useMemo(
    () => teamRouteData?.waypoints ?? [],
    [teamRouteData?.waypoints],
  );
  const routeLegs = useMemo(
    () => teamRouteData?.legs ?? [],
    [teamRouteData?.legs],
  );
  const movingRouteLegs = useMemo(
    () => routeLegs.filter(isMissionTeamRouteLegMoving),
    [routeLegs],
  );

  const waypointGroups = useMemo(() => {
    const sourceActivities =
      missionActivitiesData && missionActivitiesData.length > 0
        ? missionActivitiesData
        : mission.activities;

    const selectedMissionTeamValue = selectedMissionTeam?.missionTeamId;
    const selectedTeamActivities =
      Number.isFinite(selectedMissionTeamValue) &&
      selectedMissionTeamValue != null
        ? sourceActivities.filter(
            (activity) => activity.missionTeamId === selectedMissionTeamValue,
          )
        : sourceActivities;

    const routeTeamActivities = selectedTeamActivities.filter((activity) =>
      RESCUE_ROUTE_ACTIVITY_TYPES.has(activity.activityType),
    );

    const sortedActivities = routeTeamActivities
      .slice()
      .sort((a, b) => (a.step !== b.step ? a.step - b.step : a.id - b.id));

    const activityById = new Map(
      selectedTeamActivities.map((activity) => [activity.id, activity]),
    );
    const activitiesByStep = new Map<number, MissionActivity[]>();

    for (const activity of sortedActivities) {
      const existing = activitiesByStep.get(activity.step) ?? [];
      existing.push(activity);
      activitiesByStep.set(activity.step, existing);
    }

    // Prefer backend mission-team waypoints when available because activities may
    // share fallback coordinates and hide intermediate depot/SOS stopovers.
    const apiWaypoints = routeWaypoints
      .map((waypoint) => {
        const byId = activityById.get(waypoint.activityId);
        const byStep = activitiesByStep.get(waypoint.step) ?? [];
        const matchedActivity = byId ?? byStep[0];

        let lat = Number(waypoint.latitude);
        let lng = Number(waypoint.longitude);

        if (!hasRenderableWaypointCoords(lat, lng) && matchedActivity) {
          if (
            hasRenderableWaypointCoords(
              matchedActivity.targetLatitude,
              matchedActivity.targetLongitude,
            )
          ) {
            lat = matchedActivity.targetLatitude;
            lng = matchedActivity.targetLongitude;
          } else {
            const parsed = extractCoordsFromDescription(
              matchedActivity.description,
            );
            if (parsed) {
              lat = parsed.lat;
              lng = parsed.lng;
            }
          }
        }

        if (!hasRenderableWaypointCoords(lat, lng)) {
          return null;
        }

        return {
          lat,
          lng,
          activities: byId ? [byId] : byStep,
        } as UniqueWaypoint;
      })
      .filter((waypoint): waypoint is UniqueWaypoint => !!waypoint);

    if (apiWaypoints.length > 0) {
      const groupedFromApi: UniqueWaypoint[] = [];

      for (const waypoint of apiWaypoints) {
        const last = groupedFromApi[groupedFromApi.length - 1];

        if (
          last &&
          Math.abs(last.lat - waypoint.lat) < COORD_EPSILON &&
          Math.abs(last.lng - waypoint.lng) < COORD_EPSILON
        ) {
          for (const activity of waypoint.activities) {
            if (!last.activities.some((item) => item.id === activity.id)) {
              last.activities.push(activity);
            }
          }
          continue;
        }

        groupedFromApi.push({
          lat: waypoint.lat,
          lng: waypoint.lng,
          activities: [...waypoint.activities],
        });
      }

      return groupedFromApi;
    }

    const enrichedActivities = sortedActivities
      .map((activity) => {
        if (
          hasRenderableWaypointCoords(
            activity.targetLatitude,
            activity.targetLongitude,
          )
        ) {
          return activity;
        }

        const parsed = extractCoordsFromDescription(activity.description);
        if (!parsed) return null;

        return {
          ...activity,
          targetLatitude: parsed.lat,
          targetLongitude: parsed.lng,
        };
      })
      .filter((activity): activity is MissionActivity => !!activity);

    if (enrichedActivities.length > 0) {
      const grouped: UniqueWaypoint[] = [];

      for (const activity of enrichedActivities) {
        const last = grouped[grouped.length - 1];

        if (
          last &&
          Math.abs(last.lat - activity.targetLatitude) < COORD_EPSILON &&
          Math.abs(last.lng - activity.targetLongitude) < COORD_EPSILON
        ) {
          last.activities.push(activity);
          continue;
        }

        grouped.push({
          lat: activity.targetLatitude,
          lng: activity.targetLongitude,
          activities: [activity],
        });
      }

      return grouped;
    }

    if (routeWaypoints.length === 0) return [] as UniqueWaypoint[];

    const fallbackWaypoints = routeWaypoints
      .map((waypoint) => {
        let lat = waypoint.latitude;
        let lng = waypoint.longitude;

        if (!hasRenderableWaypointCoords(lat, lng)) {
          const matched = activityById.get(waypoint.activityId);
          if (
            matched &&
            hasRenderableWaypointCoords(
              matched.targetLatitude,
              matched.targetLongitude,
            )
          ) {
            lat = matched.targetLatitude;
            lng = matched.targetLongitude;
          } else {
            const parsed = matched
              ? extractCoordsFromDescription(matched.description)
              : null;
            if (parsed) {
              lat = parsed.lat;
              lng = parsed.lng;
            }
          }
        }

        if (!hasRenderableWaypointCoords(lat, lng)) {
          return null;
        }

        const byId = activityById.get(waypoint.activityId);
        const byStep = selectedTeamActivities.filter(
          (activity) => activity.step === waypoint.step,
        );

        return {
          lat,
          lng,
          activities: byId ? [byId] : byStep,
        } as UniqueWaypoint;
      })
      .filter((waypoint): waypoint is UniqueWaypoint => !!waypoint);

    const groupedFallback: UniqueWaypoint[] = [];

    for (const waypoint of fallbackWaypoints) {
      const last = groupedFallback[groupedFallback.length - 1];

      if (
        last &&
        Math.abs(last.lat - waypoint.lat) < COORD_EPSILON &&
        Math.abs(last.lng - waypoint.lng) < COORD_EPSILON
      ) {
        last.activities.push(...waypoint.activities);
        continue;
      }

      groupedFallback.push({
        lat: waypoint.lat,
        lng: waypoint.lng,
        activities: [...waypoint.activities],
      });
    }

    return groupedFallback;
  }, [
    missionActivitiesData,
    mission.activities,
    selectedMissionTeam?.missionTeamId,
    routeWaypoints,
  ]);

  const routeWaypointByGroupIndex = useMemo(() => {
    const matchedWaypoints = Array<MissionTeamRouteWaypoint | null>(
      waypointGroups.length,
    ).fill(null);

    if (waypointGroups.length === 0 || routeWaypoints.length === 0) {
      return matchedWaypoints;
    }

    const usedRouteWaypointIndexes = new Set<number>();

    // Pass 1: strongest match by activity step and nearest coordinate.
    for (let index = 0; index < waypointGroups.length; index += 1) {
      const waypoint = waypointGroups[index];
      const stepSet = new Set(
        waypoint.activities
          .map((activity) => activity.step)
          .filter((step): step is number => Number.isFinite(step)),
      );

      if (stepSet.size === 0) {
        continue;
      }

      let bestRouteWaypointIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (
        let routeWaypointIndex = 0;
        routeWaypointIndex < routeWaypoints.length;
        routeWaypointIndex += 1
      ) {
        if (usedRouteWaypointIndexes.has(routeWaypointIndex)) {
          continue;
        }

        const routeWaypoint = routeWaypoints[routeWaypointIndex];
        if (!stepSet.has(routeWaypoint.step)) {
          continue;
        }

        const waypointLat = Number(routeWaypoint.latitude);
        const waypointLng = Number(routeWaypoint.longitude);
        if (!hasRenderableWaypointCoords(waypointLat, waypointLng)) {
          continue;
        }

        const distance = haversineDistanceMeters(
          { lat: waypoint.lat, lng: waypoint.lng },
          { lat: waypointLat, lng: waypointLng },
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestRouteWaypointIndex = routeWaypointIndex;
        }
      }

      if (bestRouteWaypointIndex >= 0) {
        matchedWaypoints[index] = routeWaypoints[bestRouteWaypointIndex];
        usedRouteWaypointIndexes.add(bestRouteWaypointIndex);
      }
    }

    // Pass 2: fallback by nearest coordinate among remaining route waypoints.
    for (let index = 0; index < waypointGroups.length; index += 1) {
      if (matchedWaypoints[index]) {
        continue;
      }

      const waypoint = waypointGroups[index];
      let bestRouteWaypointIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (
        let routeWaypointIndex = 0;
        routeWaypointIndex < routeWaypoints.length;
        routeWaypointIndex += 1
      ) {
        if (usedRouteWaypointIndexes.has(routeWaypointIndex)) {
          continue;
        }

        const routeWaypoint = routeWaypoints[routeWaypointIndex];
        const waypointLat = Number(routeWaypoint.latitude);
        const waypointLng = Number(routeWaypoint.longitude);
        if (!hasRenderableWaypointCoords(waypointLat, waypointLng)) {
          continue;
        }

        const distance = haversineDistanceMeters(
          { lat: waypoint.lat, lng: waypoint.lng },
          { lat: waypointLat, lng: waypointLng },
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestRouteWaypointIndex = routeWaypointIndex;
        }
      }

      if (bestRouteWaypointIndex >= 0) {
        matchedWaypoints[index] = routeWaypoints[bestRouteWaypointIndex];
        usedRouteWaypointIndexes.add(bestRouteWaypointIndex);
      }
    }

    // Pass 3: final stable fallback by leftover order.
    let fallbackCursor = 0;
    for (let index = 0; index < waypointGroups.length; index += 1) {
      if (matchedWaypoints[index]) {
        continue;
      }

      while (
        fallbackCursor < routeWaypoints.length &&
        usedRouteWaypointIndexes.has(fallbackCursor)
      ) {
        fallbackCursor += 1;
      }

      if (fallbackCursor >= routeWaypoints.length) {
        break;
      }

      matchedWaypoints[index] = routeWaypoints[fallbackCursor];
      usedRouteWaypointIndexes.add(fallbackCursor);
      fallbackCursor += 1;
    }

    return matchedWaypoints;
  }, [routeWaypoints, waypointGroups]);

  const waypointMetaList = useMemo(
    () =>
      waypointGroups.map((waypoint, index) => {
        const baseMeta = getWaypointMeta(waypoint, sosRequests);
        const apiWaypoint = routeWaypointByGroupIndex[index];

        if (!apiWaypoint) {
          return baseMeta;
        }

        const waypointLabel = extractTargetLabelFromRouteWaypoint(apiWaypoint);

        if (isDepotSupplyStep(apiWaypoint.activityType)) {
          return {
            ...baseMeta,
            labels: waypointLabel
              ? [waypointLabel]
              : [`Kho (Bước ${apiWaypoint.step})`],
            hasDepot: true,
            hasSOS: false,
          };
        }

        const sosLabel = extractSOSLabelFromRouteWaypoint(apiWaypoint);
        if (sosLabel) {
          return {
            ...baseMeta,
            labels: waypointLabel ? [waypointLabel] : [sosLabel],
            hasSOS: true,
          };
        }

        if (waypointLabel) {
          return {
            ...baseMeta,
            labels: [waypointLabel],
          };
        }

        return baseMeta;
      }),
    [waypointGroups, sosRequests, routeWaypointByGroupIndex],
  );

  const teamOverviewPolyline = teamRouteData?.overviewPolyline ?? null;

  const decodedRoutePoints = useMemo(() => {
    if (!teamOverviewPolyline) return [] as [number, number][];

    try {
      return polylineDecode.decode(teamOverviewPolyline) as [number, number][];
    } catch {
      return [] as [number, number][];
    }
  }, [teamOverviewPolyline]);

  const apiRouteLegSegments = useMemo(() => {
    if (movingRouteLegs.length === 0) {
      return [] as MissionTeamRenderableLeg[];
    }

    const provisionalSegments = movingRouteLegs
      .map((leg, legIndex) => {
        const routeLegStatus = (leg.status ?? "").trim().toUpperCase();
        const points = decodeMissionTeamRouteLegPoints(leg);

        let destinationGroupIndex = -1;

        if (Number.isFinite(leg.toStep)) {
          destinationGroupIndex = waypointGroups.findIndex(
            (waypoint, index) => {
              const stepNumbers = new Set<number>();

              for (const activity of waypoint.activities) {
                if (Number.isFinite(activity.step)) {
                  stepNumbers.add(activity.step);
                }
              }

              const apiWaypointStep = routeWaypointByGroupIndex[index]?.step;
              if (Number.isFinite(apiWaypointStep)) {
                stepNumbers.add(apiWaypointStep as number);
              }

              return stepNumbers.has(leg.toStep as number);
            },
          );
        }

        if (destinationGroupIndex < 0) {
          const toLat = Number(leg.toLatitude);
          const toLng = Number(leg.toLongitude);

          if (hasRenderableWaypointCoords(toLat, toLng)) {
            let bestDistance = Number.POSITIVE_INFINITY;

            for (
              let waypointIndex = 0;
              waypointIndex < waypointGroups.length;
              waypointIndex += 1
            ) {
              const waypoint = waypointGroups[waypointIndex];
              const distance = haversineDistanceMeters(
                { lat: waypoint.lat, lng: waypoint.lng },
                { lat: toLat, lng: toLng },
              );

              if (distance < bestDistance) {
                bestDistance = distance;
                destinationGroupIndex = waypointIndex;
              }
            }
          }
        }

        return {
          leg,
          destinationGroupIndex:
            destinationGroupIndex >= 0 ? destinationGroupIndex : null,
          points,
          isFallback:
            routeLegStatus === "NO_ROUTE" ||
            routeLegStatus === "FALLBACK" ||
            !leg.overviewPolyline?.trim(),
          distanceMeters: leg.distanceMeters,
          durationSeconds: leg.durationSeconds,
          distanceText:
            leg.distanceText || formatRouteDistanceText(leg.distanceMeters),
          durationText:
            leg.durationText || formatRouteDurationText(leg.durationSeconds),
          source: "team-route" as const,
          sortIndex:
            Number.isFinite(leg.segmentIndex) && leg.segmentIndex != null
              ? (leg.segmentIndex as number)
              : legIndex,
        };
      })
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const usedDestinationGroupIndexes = new Set<number>();

    for (const segment of provisionalSegments) {
      if (
        segment.destinationGroupIndex != null &&
        !usedDestinationGroupIndexes.has(segment.destinationGroupIndex)
      ) {
        usedDestinationGroupIndexes.add(segment.destinationGroupIndex);
        continue;
      }

      segment.destinationGroupIndex = null;
    }

    let nextGroupIndex = 0;
    for (const segment of provisionalSegments) {
      if (segment.destinationGroupIndex != null) {
        continue;
      }

      while (
        nextGroupIndex < waypointGroups.length &&
        usedDestinationGroupIndexes.has(nextGroupIndex)
      ) {
        nextGroupIndex += 1;
      }

      if (nextGroupIndex >= waypointGroups.length) {
        break;
      }

      segment.destinationGroupIndex = nextGroupIndex;
      usedDestinationGroupIndexes.add(nextGroupIndex);
      nextGroupIndex += 1;
    }

    return provisionalSegments.map((segment) => ({
      leg: segment.leg,
      destinationGroupIndex: segment.destinationGroupIndex,
      points: segment.points,
      isFallback: segment.isFallback,
      distanceMeters: segment.distanceMeters,
      durationSeconds: segment.durationSeconds,
      distanceText: segment.distanceText,
      durationText: segment.durationText,
      source: segment.source,
    }));
  }, [movingRouteLegs, routeWaypointByGroupIndex, waypointGroups]);

  const apiPolylineLegSegments = useMemo(
    () =>
      apiRouteLegSegments.filter(
        (segment) => !segment.isFallback && segment.points.length > 1,
      ),
    [apiRouteLegSegments],
  );

  const hasApiRoutePolylineLegSegments = apiPolylineLegSegments.length > 0;

  const decodedLegRoutePoints = useMemo(() => {
    if (apiPolylineLegSegments.length === 0) {
      return [] as [number, number][];
    }

    const points: [number, number][] = [];

    for (const segment of apiPolylineLegSegments) {
      for (const point of segment.points) {
        const last = points[points.length - 1];
        if (
          last &&
          Math.abs(last[0] - point[0]) < COORD_EPSILON &&
          Math.abs(last[1] - point[1]) < COORD_EPSILON
        ) {
          continue;
        }

        points.push(point);
      }
    }

    return points;
  }, [apiPolylineLegSegments]);

  const apiRouteLegByWaypointIndex = useMemo(() => {
    const mapping = new Map<number, MissionTeamRenderableLeg>();

    for (const segment of apiRouteLegSegments) {
      if (
        segment.destinationGroupIndex == null ||
        mapping.has(segment.destinationGroupIndex)
      ) {
        continue;
      }

      mapping.set(segment.destinationGroupIndex, segment);
    }

    return mapping;
  }, [apiRouteLegSegments]);

  const stopoverGuidePoints = useMemo(() => {
    const points: [number, number][] = [[originCoords.lat, originCoords.lng]];

    for (const waypoint of waypointGroups) {
      const last = points[points.length - 1];

      if (
        last &&
        Math.abs(last[0] - waypoint.lat) < COORD_EPSILON &&
        Math.abs(last[1] - waypoint.lng) < COORD_EPSILON
      ) {
        continue;
      }

      points.push([waypoint.lat, waypoint.lng]);
    }

    return points;
  }, [waypointGroups, originCoords.lat, originCoords.lng]);

  const expectedLegCount = useMemo(
    () => Math.max(0, stopoverGuidePoints.length - 1),
    [stopoverGuidePoints],
  );

  const splitOverviewSegments = useMemo(() => {
    if (decodedRoutePoints.length < 2 || stopoverGuidePoints.length < 3) {
      return [] as [number, number][][];
    }

    const legCount = stopoverGuidePoints.length - 1;
    const segments: [number, number][][] = [];
    let previousIndex = 0;

    for (let legIndex = 0; legIndex < legCount; legIndex += 1) {
      const remainingLegs = legCount - legIndex - 1;
      const minEndIndex = previousIndex + 1;
      const maxEndIndex = decodedRoutePoints.length - 1 - remainingLegs;

      if (minEndIndex > maxEndIndex) {
        return [] as [number, number][][];
      }

      let endIndex = maxEndIndex;

      if (legIndex < legCount - 1) {
        const target = stopoverGuidePoints[legIndex + 1];
        let bestIndex = minEndIndex;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (
          let pointIndex = minEndIndex;
          pointIndex <= maxEndIndex;
          pointIndex += 1
        ) {
          const point = decodedRoutePoints[pointIndex];
          const distance = haversineDistanceMeters(
            { lat: point[0], lng: point[1] },
            { lat: target[0], lng: target[1] },
          );

          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = pointIndex;
          }
        }

        if (bestDistance > OVERVIEW_SPLIT_MAX_MATCH_DISTANCE_METERS) {
          return [] as [number, number][][];
        }

        endIndex = bestIndex;
      }

      const segmentPoints = decodedRoutePoints.slice(
        previousIndex,
        endIndex + 1,
      );
      if (segmentPoints.length < 2) {
        return [] as [number, number][][];
      }

      segments.push(segmentPoints);
      previousIndex = endIndex;
    }

    return segments;
  }, [decodedRoutePoints, stopoverGuidePoints]);

  const splitOverviewPoints = useMemo(() => {
    if (splitOverviewSegments.length === 0) {
      return [] as [number, number][];
    }

    const points: [number, number][] = [];

    for (const segment of splitOverviewSegments) {
      for (const point of segment) {
        const last = points[points.length - 1];
        if (
          last &&
          Math.abs(last[0] - point[0]) < COORD_EPSILON &&
          Math.abs(last[1] - point[1]) < COORD_EPSILON
        ) {
          continue;
        }

        points.push(point);
      }
    }

    return points;
  }, [splitOverviewSegments]);

  const apiRoutePoints = useMemo(() => {
    if (decodedLegRoutePoints.length > 1) {
      return decodedLegRoutePoints;
    }

    if (decodedRoutePoints.length > 1) {
      return decodedRoutePoints;
    }

    return [] as [number, number][];
  }, [decodedRoutePoints, decodedLegRoutePoints]);

  const missingWaypointCount = useMemo(() => {
    if (apiRoutePoints.length <= 1 || waypointGroups.length === 0) {
      return 0;
    }

    return waypointGroups.reduce((missing, waypoint) => {
      const covered = apiRoutePoints.some(
        ([lat, lng]) =>
          Math.abs(lat - waypoint.lat) < MISSION_TEAM_ROUTE_WAYPOINT_EPSILON &&
          Math.abs(lng - waypoint.lng) < MISSION_TEAM_ROUTE_WAYPOINT_EPSILON,
      );

      return covered ? missing : missing + 1;
    }, 0);
  }, [apiRoutePoints, waypointGroups]);

  const shouldPreferStopoverGuide = useMemo(() => {
    if (waypointGroups.length <= 1) {
      return false;
    }

    if (hasApiRoutePolylineLegSegments) {
      return false;
    }

    if (apiRoutePoints.length <= 1) {
      return true;
    }

    if (
      movingRouteLegs.length > 0 &&
      movingRouteLegs.length < expectedLegCount
    ) {
      return true;
    }

    return missingWaypointCount > 0;
  }, [
    waypointGroups.length,
    hasApiRoutePolylineLegSegments,
    apiRoutePoints.length,
    movingRouteLegs.length,
    expectedLegCount,
    missingWaypointCount,
  ]);

  const shouldUseSplitOverview = useMemo(() => {
    if (!shouldPreferStopoverGuide) {
      return false;
    }

    if (expectedLegCount <= 1) {
      return false;
    }

    return splitOverviewSegments.length === expectedLegCount;
  }, [shouldPreferStopoverGuide, expectedLegCount, splitOverviewSegments]);

  const activityRouteFallbackKey = useMemo(
    () =>
      waypointGroups
        .map((waypoint, index) => {
          const representativeActivityId = waypoint.activities[0]?.id ?? index;
          return `${representativeActivityId}:${waypoint.lat.toFixed(5)}:${waypoint.lng.toFixed(5)}`;
        })
        .join("|"),
    [waypointGroups],
  );

  const shouldFetchActivityRouteFallback =
    open &&
    !!selectedMissionTeam &&
    waypointGroups.length > 0 &&
    shouldPreferStopoverGuide &&
    !isTeamRouteRateLimited &&
    !isActivityRouteFallbackCoolingDown() &&
    !hasApiRoutePolylineLegSegments &&
    !shouldUseSplitOverview;

  const {
    data: activityRouteFallbackLegSegments = [],
    isFetching: isActivityRouteFallbackFetching,
  } = useQuery<MissionTeamRenderableLeg[]>({
    queryKey: [
      "mission-team-route-activity-fallback",
      mission.id,
      selectedMissionTeam?.missionTeamId ?? null,
      originCoords.lat,
      originCoords.lng,
      vehicle,
      activityRouteFallbackKey,
    ],
    enabled: shouldFetchActivityRouteFallback,
    queryFn: async () => {
      const segments: MissionTeamRenderableLeg[] = [];
      let currentOrigin = { lat: originCoords.lat, lng: originCoords.lng };

      for (let index = 0; index < waypointGroups.length; index += 1) {
        const waypoint = waypointGroups[index];
        const representativeActivity = waypoint.activities[0];

        if (!representativeActivity) {
          currentOrigin = { lat: waypoint.lat, lng: waypoint.lng };
          continue;
        }

        const isSameAsOrigin =
          Math.abs(currentOrigin.lat - waypoint.lat) < COORD_EPSILON &&
          Math.abs(currentOrigin.lng - waypoint.lng) < COORD_EPSILON;

        if (isSameAsOrigin) {
          currentOrigin = { lat: waypoint.lat, lng: waypoint.lng };
          continue;
        }

        let resolvedSegment: MissionTeamRenderableLeg | null = null;
        const tryVehicles = buildVehicleTryOrder(vehicle);

        for (const tryVehicle of tryVehicles) {
          try {
            const response = await getActivityRoute({
              missionId: mission.id,
              activityId: representativeActivity.id,
              originLat: currentOrigin.lat,
              originLng: currentOrigin.lng,
              vehicle: tryVehicle,
            });

            if (!response.route?.overviewPolyline) {
              continue;
            }

            const points = polylineDecode.decode(
              response.route.overviewPolyline,
            ) as [number, number][];

            if (points.length < 2) {
              continue;
            }

            resolvedSegment = {
              destinationGroupIndex: index,
              points,
              isFallback: false,
              distanceMeters: response.route.totalDistanceMeters,
              durationSeconds: response.route.totalDurationSeconds,
              distanceText:
                response.route.totalDistanceText ||
                formatRouteDistanceText(response.route.totalDistanceMeters),
              durationText:
                response.route.totalDurationText ||
                formatRouteDurationText(response.route.totalDurationSeconds),
              source: "activity-route",
            };
            break;
          } catch (error) {
            const fallbackErrorMessage =
              error instanceof Error ? error.message : String(error ?? "");

            if (isRouteRateLimited(fallbackErrorMessage)) {
              blockActivityRouteFallback();
              return segments;
            }

            // Try next vehicle profile before falling back to direct line.
          }
        }

        if (!resolvedSegment) {
          const distanceMeters = Math.round(
            haversineDistanceMeters(currentOrigin, {
              lat: waypoint.lat,
              lng: waypoint.lng,
            }),
          );

          if (
            distanceMeters > ACTIVITY_ROUTE_DIRECT_FALLBACK_MAX_DISTANCE_METERS
          ) {
            currentOrigin = { lat: waypoint.lat, lng: waypoint.lng };
            continue;
          }

          const durationSeconds = estimateDurationSeconds(
            distanceMeters,
            vehicle,
          );

          resolvedSegment = {
            destinationGroupIndex: index,
            points: [
              [currentOrigin.lat, currentOrigin.lng],
              [waypoint.lat, waypoint.lng],
            ],
            isFallback: true,
            distanceMeters,
            durationSeconds,
            distanceText: formatRouteDistanceText(distanceMeters),
            durationText: formatRouteDurationText(durationSeconds),
            source: "activity-route",
          };
        }

        segments.push(resolvedSegment);
        currentOrigin = { lat: waypoint.lat, lng: waypoint.lng };
      }

      return segments;
    },
    staleTime: ACTIVITY_ROUTE_FALLBACK_STALE_TIME_MS,
    gcTime: ACTIVITY_ROUTE_FALLBACK_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const isUsingActivityRouteFallback =
    shouldFetchActivityRouteFallback &&
    activityRouteFallbackLegSegments.some(
      (segment) => segment.points.length > 1,
    );
  const isActivityRouteFallbackBlocked =
    shouldPreferStopoverGuide && isActivityRouteFallbackCoolingDown();

  const isUsingStopoverGuideFallback =
    shouldPreferStopoverGuide &&
    !isUsingActivityRouteFallback &&
    !shouldUseSplitOverview &&
    apiRoutePoints.length <= 1;

  const isUsingPartialApiPolyline =
    shouldPreferStopoverGuide &&
    !isUsingActivityRouteFallback &&
    !shouldUseSplitOverview &&
    apiRoutePoints.length > 1;

  const effectiveRouteLegSegments = useMemo(
    () =>
      isUsingActivityRouteFallback
        ? activityRouteFallbackLegSegments
        : apiRouteLegSegments,
    [
      activityRouteFallbackLegSegments,
      apiRouteLegSegments,
      isUsingActivityRouteFallback,
    ],
  );

  const effectiveRouteLegPoints = useMemo(() => {
    if (effectiveRouteLegSegments.length === 0) {
      return [] as [number, number][];
    }

    const points: [number, number][] = [];

    for (const segment of effectiveRouteLegSegments) {
      for (const point of segment.points) {
        const last = points[points.length - 1];

        if (
          last &&
          Math.abs(last[0] - point[0]) < COORD_EPSILON &&
          Math.abs(last[1] - point[1]) < COORD_EPSILON
        ) {
          continue;
        }

        points.push(point);
      }
    }

    return points;
  }, [effectiveRouteLegSegments]);

  const shouldRenderEffectiveRouteLegSegments = useMemo(() => {
    if (isUsingActivityRouteFallback) {
      return effectiveRouteLegSegments.some(
        (segment) => segment.points.length > 1,
      );
    }

    return (
      hasApiRoutePolylineLegSegments &&
      effectiveRouteLegSegments.some((segment) => segment.points.length > 1)
    );
  }, [
    effectiveRouteLegSegments,
    hasApiRoutePolylineLegSegments,
    isUsingActivityRouteFallback,
  ]);

  const routeLegByWaypointIndex = useMemo(() => {
    if (isUsingActivityRouteFallback) {
      const mapping = new Map<number, MissionTeamRenderableLeg>();

      for (const segment of activityRouteFallbackLegSegments) {
        if (
          segment.destinationGroupIndex == null ||
          mapping.has(segment.destinationGroupIndex)
        ) {
          continue;
        }

        mapping.set(segment.destinationGroupIndex, segment);
      }

      return mapping;
    }

    return apiRouteLegByWaypointIndex;
  }, [
    activityRouteFallbackLegSegments,
    apiRouteLegByWaypointIndex,
    isUsingActivityRouteFallback,
  ]);

  const displayPoints = useMemo(() => {
    if (isUsingActivityRouteFallback && effectiveRouteLegPoints.length > 1) {
      return effectiveRouteLegPoints;
    }

    if (shouldUseSplitOverview && splitOverviewPoints.length > 1) {
      return splitOverviewPoints;
    }

    if (isUsingStopoverGuideFallback && stopoverGuidePoints.length > 1) {
      return stopoverGuidePoints;
    }

    if (apiRoutePoints.length > 1) {
      return apiRoutePoints;
    }

    return stopoverGuidePoints;
  }, [
    apiRoutePoints,
    effectiveRouteLegPoints,
    isUsingStopoverGuideFallback,
    isUsingActivityRouteFallback,
    shouldUseSplitOverview,
    splitOverviewPoints,
    stopoverGuidePoints,
  ]);

  const hasOriginInDisplayPoints = useMemo(
    () =>
      displayPoints.some(
        ([lat, lng]) =>
          Math.abs(lat - originCoords.lat) <
            MISSION_TEAM_ROUTE_WAYPOINT_EPSILON &&
          Math.abs(lng - originCoords.lng) <
            MISSION_TEAM_ROUTE_WAYPOINT_EPSILON,
      ),
    [displayPoints, originCoords.lat, originCoords.lng],
  );

  const originConnectorPoints = useMemo<[number, number][]>(() => {
    if (displayPoints.length === 0 || hasOriginInDisplayPoints) {
      return [];
    }

    const firstPoint = displayPoints[0];
    if (!firstPoint) {
      return [];
    }

    const originPoint: [number, number] = [originCoords.lat, originCoords.lng];
    return [originPoint, firstPoint];
  }, [
    displayPoints,
    hasOriginInDisplayPoints,
    originCoords.lat,
    originCoords.lng,
  ]);

  const mapFitPoints = useMemo<[number, number][]>(() => {
    if (displayPoints.length === 0) {
      return [];
    }

    if (hasOriginInDisplayPoints) {
      return displayPoints;
    }

    const originPoint: [number, number] = [originCoords.lat, originCoords.lng];
    return [originPoint, ...displayPoints];
  }, [
    displayPoints,
    hasOriginInDisplayPoints,
    originCoords.lat,
    originCoords.lng,
  ]);

  const isUsingOriginConnector = originConnectorPoints.length > 1;

  const missionRouteMapKey = useMemo(() => {
    if (mapFitPoints.length > 0) {
      return buildLeafletMapKey(mapFitPoints);
    }

    return "mission-team-route-empty";
  }, [mapFitPoints]);

  const totalDistanceMeters = useMemo(() => {
    if (isUsingActivityRouteFallback) {
      return activityRouteFallbackLegSegments.reduce(
        (sum, segment) => sum + segment.distanceMeters,
        0,
      );
    }

    if (
      teamRouteData &&
      Number.isFinite(teamRouteData.totalDistanceMeters) &&
      teamRouteData.totalDistanceMeters > 0
    ) {
      return teamRouteData.totalDistanceMeters;
    }

    return routeLegs.reduce(
      (sum, leg) =>
        sum + (Number.isFinite(leg.distanceMeters) ? leg.distanceMeters : 0),
      0,
    );
  }, [
    activityRouteFallbackLegSegments,
    isUsingActivityRouteFallback,
    teamRouteData,
    routeLegs,
  ]);

  const totalDurationSeconds = useMemo(() => {
    if (isUsingActivityRouteFallback) {
      return activityRouteFallbackLegSegments.reduce(
        (sum, segment) => sum + segment.durationSeconds,
        0,
      );
    }

    if (
      teamRouteData &&
      Number.isFinite(teamRouteData.totalDurationSeconds) &&
      teamRouteData.totalDurationSeconds > 0
    ) {
      return teamRouteData.totalDurationSeconds;
    }

    return routeLegs.reduce(
      (sum, leg) =>
        sum + (Number.isFinite(leg.durationSeconds) ? leg.durationSeconds : 0),
      0,
    );
  }, [
    activityRouteFallbackLegSegments,
    isUsingActivityRouteFallback,
    teamRouteData,
    routeLegs,
  ]);

  const splitOverviewLegByWaypointIndex = useMemo(() => {
    const mapping = new Map<
      number,
      {
        distanceMeters: number;
        durationSeconds: number;
      }
    >();

    if (!shouldUseSplitOverview || splitOverviewSegments.length === 0) {
      return mapping;
    }

    const rawDistances = splitOverviewSegments.map((segment) => {
      let distanceMeters = 0;

      for (let pointIndex = 1; pointIndex < segment.length; pointIndex += 1) {
        distanceMeters += haversineDistanceMeters(
          { lat: segment[pointIndex - 1][0], lng: segment[pointIndex - 1][1] },
          { lat: segment[pointIndex][0], lng: segment[pointIndex][1] },
        );
      }

      return distanceMeters;
    });

    const rawDistanceTotal = rawDistances.reduce(
      (sum, value) => sum + value,
      0,
    );

    const normalizedDistances = rawDistances.map((distanceMeters) => {
      if (
        Number.isFinite(totalDistanceMeters) &&
        totalDistanceMeters > 0 &&
        rawDistanceTotal > 0
      ) {
        return (distanceMeters / rawDistanceTotal) * totalDistanceMeters;
      }

      return distanceMeters;
    });

    const normalizedDistanceTotal = normalizedDistances.reduce(
      (sum, value) => sum + value,
      0,
    );

    for (
      let legIndex = 0;
      legIndex < normalizedDistances.length;
      legIndex += 1
    ) {
      const distanceMeters = Math.max(
        0,
        Math.round(normalizedDistances[legIndex] ?? 0),
      );

      let durationSeconds = 0;

      if (
        Number.isFinite(totalDurationSeconds) &&
        totalDurationSeconds > 0 &&
        normalizedDistanceTotal > 0
      ) {
        durationSeconds = Math.max(
          60,
          Math.round(
            ((normalizedDistances[legIndex] ?? 0) / normalizedDistanceTotal) *
              totalDurationSeconds,
          ),
        );
      } else {
        durationSeconds = estimateDurationSeconds(distanceMeters, vehicle);
      }

      mapping.set(legIndex, { distanceMeters, durationSeconds });
    }

    return mapping;
  }, [
    shouldUseSplitOverview,
    splitOverviewSegments,
    totalDistanceMeters,
    totalDurationSeconds,
    vehicle,
  ]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs}h ${remainMins}p` : `${hrs}h`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const isLoadingRoute =
    isTeamRouteLoading ||
    isTeamRouteFetching ||
    isActivityRouteFallbackFetching;

  if (missionRouteTeams.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình tổng hợp ({missionRouteTeams.length} đội)
      </button>
    );
  }

  const selectedTeamLabel =
    selectedMissionTeam?.teamName ||
    (selectedMissionTeam ? `Đội #${selectedMissionTeam.rescueTeamId}` : "-");
  const displayedLegCount =
    shouldUseSplitOverview || isUsingStopoverGuideFallback
      ? expectedLegCount
      : effectiveRouteLegSegments.length > 0
        ? effectiveRouteLegSegments.length
        : expectedLegCount;
  const consolidatedDurationLabel =
    Number.isFinite(totalDurationSeconds) && totalDurationSeconds > 0
      ? formatDuration(totalDurationSeconds)
      : "";
  const consolidatedRouteLabelAnchor = getRouteLabelAnchor(displayPoints);

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <NavigationArrow className="h-3 w-3" weight="fill" />
            Lộ trình tổng hợp
          </span>
          {teamRouteData ? (
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-sm", routeStatusMeta.className)}
            >
              {routeStatusMeta.label}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Select
            value={
              selectedMissionTeamId != null ? String(selectedMissionTeamId) : ""
            }
            onValueChange={(value) => setSelectedMissionTeamId(Number(value))}
          >
            <SelectTrigger className="h-7 w-45 text-sm">
              <SelectValue placeholder="Chọn đội" />
            </SelectTrigger>
            <SelectContent>
              {missionRouteTeams.map((team) => {
                const label = team.teamName || `Đội #${team.rescueTeamId}`;
                return (
                  <SelectItem
                    key={team.missionTeamId}
                    value={String(team.missionTeamId)}
                    className="text-sm"
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 overflow-hidden rounded border bg-background">
            {(
              [
                { key: "bike", label: VEHICLE_LABELS.bike },
                { key: "car", label: VEHICLE_LABELS.car },
                { key: "hd", label: VEHICLE_LABELS.hd },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setVehicle(option.key)}
                className={cn(
                  "px-1.5 py-0.5 text-sm font-medium transition-colors",
                  vehicle === option.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        <ShieldCheck className="h-3 w-3" weight="fill" />
        Đội: {selectedTeamLabel}
      </p>

      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="h-3 w-3" weight="fill" />
        {isFallbackOrigin
          ? "Vị trí xuất phát mặc định (Huế)"
          : "Vị trí đội hiện tại"}
      </p>

      {isLoadingRoute && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-sm text-muted-foreground animate-pulse">
            <CircleNotch className="h-3 w-3 animate-spin" />
            Đang tải lộ trình đội...
          </p>
          <Skeleton className="h-48 w-full rounded" />
        </div>
      )}

      {isTeamRouteError && !isLoadingRoute && (
        <p className="text-sm text-red-500">Không thể tải lộ trình tổng hợp.</p>
      )}

      {routeErrorMessage ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {routeErrorMessage}
        </p>
      ) : null}

      {!isLoadingRoute && shouldUseSplitOverview && expectedLegCount > 1 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          API chỉ trả tuyến tổng, hệ thống đã tách overview polyline theo
          waypoint để hiển thị đúng từng chặng.
        </p>
      ) : null}

      {!isLoadingRoute &&
      isUsingActivityRouteFallback &&
      waypointGroups.length > 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Team route chưa khớp đầy đủ, hệ thống đang dùng activity route theo
          từng chặng để vẽ đường chính xác hơn.
        </p>
      ) : null}

      {!isLoadingRoute &&
      !isUsingActivityRouteFallback &&
      isActivityRouteFallbackBlocked ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Fallback activity route đang tạm nghỉ vài phút để tránh spam khi dịch
          vụ chỉ đường báo giới hạn lượt gọi.
        </p>
      ) : null}

      {!isLoadingRoute &&
      isUsingStopoverGuideFallback &&
      waypointGroups.length > 1 &&
      expectedLegCount > 1 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          API tuyến đội chưa trả đủ polyline, đang tạm hiển thị tuyến nối
          waypoint để giữ đúng thứ tự điểm dừng.
        </p>
      ) : null}

      {!isLoadingRoute &&
      isUsingPartialApiPolyline &&
      waypointGroups.length > 1 &&
      expectedLegCount > 1 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          API chỉ trả polyline một phần, hệ thống đang ưu tiên vẽ polyline khả
          dụng thay vì nối thẳng toàn tuyến.
        </p>
      ) : null}

      {!isLoadingRoute && isUsingOriginConnector ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          API tuyến đội chưa chứa đoạn xuất phát từ vị trí đội, hệ thống đang
          nối tạm từ điểm tập kết vào tuyến để hiển thị đúng điểm khởi hành.
        </p>
      ) : null}

      {!isLoadingRoute && (teamRouteData || isUsingActivityRouteFallback) && (
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-primary">
            {formatDistance(totalDistanceMeters)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(totalDurationSeconds)}
          </span>
          <span className="text-muted-foreground">
            {waypointGroups.length} điểm · {displayedLegCount} chặng
          </span>
        </div>
      )}

      {!isLoadingRoute && displayPoints.length > 1 && (
        <div className="h-112 overflow-hidden rounded-lg border bg-background">
          <MapContainer
            key={missionRouteMapKey}
            center={displayPoints[0]}
            zoom={10}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={true}
            attributionControl={false}
            className="h-full w-full"
          >
            <GoongLeafletLayer
              apiKey={process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}
            />
            <MapInvalidator />
            <RoutePreviewFitBounds points={mapFitPoints} />

            {isUsingOriginConnector ? (
              <Polyline
                positions={originConnectorPoints}
                pathOptions={{
                  color: "#16a34a",
                  weight: 4,
                  opacity: 0.75,
                  lineJoin: "round",
                  lineCap: "round",
                  dashArray: "6 6",
                }}
              />
            ) : null}

            {shouldUseSplitOverview ? (
              splitOverviewSegments.map((segment, segmentIndex) => (
                <Polyline
                  key={`mission-team-overview-segment-${segmentIndex}`}
                  positions={segment}
                  pathOptions={{
                    color: "#FF6B35",
                    weight: 5,
                    opacity: 0.85,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />
              ))
            ) : shouldRenderEffectiveRouteLegSegments ? (
              effectiveRouteLegSegments
                .filter((segment) => segment.points.length > 1)
                .map((segment, segmentIndex) => (
                  <Polyline
                    key={`mission-team-leg-segment-${segment.leg?.segmentIndex ?? `${segment.source}-${segmentIndex}`}`}
                    positions={segment.points}
                    pathOptions={{
                      color: "#FF6B35",
                      weight: 5,
                      opacity: segment.isFallback ? 0.75 : 0.85,
                      lineJoin: "round",
                      lineCap: "round",
                      dashArray: segment.isFallback ? "7 7" : undefined,
                    }}
                  />
                ))
            ) : (
              <Polyline
                positions={displayPoints}
                pathOptions={{
                  color: "#FF6B35",
                  weight: 5,
                  opacity: 0.85,
                  lineJoin: "round",
                  lineCap: "round",
                  dashArray: isUsingStopoverGuideFallback ? "7 7" : undefined,
                }}
              />
            )}
            {consolidatedDurationLabel && consolidatedRouteLabelAnchor ? (
              <Marker
                position={consolidatedRouteLabelAnchor}
                icon={buildRouteDurationBadgeIcon(
                  consolidatedDurationLabel,
                  isUsingStopoverGuideFallback ? "neutral" : "primary",
                )}
                interactive={false}
                keyboard={false}
              />
            ) : null}

            {originCoords ? (
              <CircleMarker
                center={[originCoords.lat, originCoords.lng]}
                radius={8}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: "#16a34a",
                  fillOpacity: 1,
                }}
              />
            ) : null}

            {waypointGroups.map((waypoint, index) => {
              const isLast = index === waypointGroups.length - 1;
              const meta = waypointMetaList[index];
              const apiWaypoint = routeWaypointByGroupIndex[index];
              const tooltipLabel =
                meta?.labels.length > 0
                  ? meta.labels.join(" • ")
                  : apiWaypoint
                    ? `Bước ${apiWaypoint.step}`
                    : `Điểm ${index + 1}`;

              const markerColor = isLast
                ? "#dc2626"
                : meta?.hasSOS
                  ? "#2563eb"
                  : meta?.hasDepot
                    ? "#a16207"
                    : "#FF6B35";

              return (
                <CircleMarker
                  key={`mission-team-waypoint-${index}`}
                  center={[waypoint.lat, waypoint.lng]}
                  radius={isLast ? 9 : 7}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: markerColor,
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    opacity={1}
                    permanent={tooltipLabel.length <= 18}
                    sticky={tooltipLabel.length > 18}
                  >
                    <div className="max-w-55 whitespace-normal text-sm font-semibold leading-4">
                      {tooltipLabel}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {!isLoadingRoute && waypointGroups.length > 0 && (
        <div className="mt-1 space-y-1.5">
          {waypointGroups.map((waypoint, index) => {
            const routeLegSegment = shouldUseSplitOverview
              ? null
              : routeLegByWaypointIndex.get(index);
            const splitLeg = splitOverviewLegByWaypointIndex.get(index);
            const meta = waypointMetaList[index];
            const apiWaypoint = routeWaypointByGroupIndex[index];
            const isRouteLegFallback =
              routeLegSegment != null ? routeLegSegment.isFallback : !!splitLeg;

            const legDistanceLabel = routeLegSegment
              ? routeLegSegment?.distanceText ||
                formatDistance(routeLegSegment?.distanceMeters ?? 0)
              : splitLeg
                ? formatDistance(splitLeg.distanceMeters)
                : "";

            const legDurationLabel = routeLegSegment
              ? routeLegSegment?.durationText ||
                formatDuration(routeLegSegment?.durationSeconds ?? 0)
              : splitLeg
                ? formatDuration(splitLeg.durationSeconds)
                : "";

            return (
              <div
                key={`mission-team-waypoint-legend-${index}`}
                className="space-y-0.5"
              >
                {routeLegSegment || splitLeg ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "h-1 w-4 shrink-0 rounded-full",
                        isRouteLegFallback ? "bg-[#FF6B35]/70" : "bg-[#FF6B35]",
                      )}
                    />
                    <NavigationArrow
                      className="h-2.5 w-2.5 text-muted-foreground"
                      weight="bold"
                    />
                    <span className="text-muted-foreground">
                      {`${legDistanceLabel} · ${legDurationLabel}`}
                    </span>
                  </div>
                ) : null}

                {meta?.labels.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pl-6">
                    {meta.labels.map((label) => (
                      <Badge
                        key={`${index}-${label}`}
                        variant="outline"
                        className="h-5 px-1.5 text-sm"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {waypoint.activities.length > 0 ? (
                  waypoint.activities.map((activity) => {
                    const config =
                      activityTypeConfig[activity.activityType] ||
                      activityTypeConfig["ASSESS"];

                    return (
                      <div
                        key={`mission-team-activity-${activity.id}`}
                        className="flex items-center gap-2 pl-6 text-sm"
                      >
                        <span className="font-bold text-muted-foreground">
                          {activity.step}.
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1 text-sm",
                            config.color,
                            config.bgColor,
                            "border-transparent",
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })
                ) : apiWaypoint ? (
                  <p className="pl-6 text-sm text-muted-foreground">
                    Bước {apiWaypoint.step}: {apiWaypoint.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!isLoadingRoute && displayPoints.length <= 1 && !routeErrorMessage && (
        <p className="text-sm text-muted-foreground">
          Không đủ dữ liệu waypoint để hiển thị bản đồ lộ trình.
        </p>
      )}
    </div>
  );
};

// ── AI Origin Node ──
function AiOriginNode() {
  return (
    <div className="flex items-center gap-3 mb-0">
      <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <Brain className="h-4 w-4 text-primary" weight="fill" />
      </div>
      <div>
        <span className="text-base font-bold text-primary">AI Engine</span>
        <p className="text-sm font-medium mb-0.5 text-muted-foreground">
          Bắt đầu thực thi kế hoạch
        </p>
      </div>
    </div>
  );
}

// ── Card hiển thị 1 AI suggestion đã lưu ──
const SuggestionCard = ({
  suggestion,
  onEdit,
  editable = true,
  actionLabel = "Dùng gợi ý này",
}: {
  suggestion: SuggestionPreview;
  onEdit: () => void;
  editable?: boolean;
  actionLabel?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const allActivities = suggestion.suggestedActivities;
  const coordinationEntries = useMemo(
    () => buildCoordinationSummaryEntries(allActivities),
    [allActivities],
  );
  const createdAtLabel = suggestion.createdAt
    ? new Date(suggestion.createdAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Chưa rõ thời gian";
  const aiErrorMessage = trimToNull(suggestion.errorMessage);
  const hasAiError = suggestion.isSuccess === false || aiErrorMessage != null;
  const hasSystemWarnings =
    suggestion.needsManualReview ||
    trimToNull(suggestion.lowConfidenceWarning) != null ||
    trimToNull(suggestion.mixedRescueReliefWarning) != null ||
    hasAiError ||
    suggestion.needsAdditionalDepot ||
    suggestion.multiDepotRecommended ||
    suggestion.supplyShortages.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket
              className="h-4 w-4 text-emerald-500 shrink-0"
              weight="fill"
            />
            <span className="text-sm font-bold truncate">
              {suggestion.suggestedMissionTitle || "Gợi ý AI chưa có tiêu đề"}
            </span>
          </div>
          {editable ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-sm gap-1 px-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                onClick={onEdit}
              >
                <PencilSimpleLine className="h-3 w-3" />
                {actionLabel}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {createdAtLabel}
          </span>
          {trimToNull(suggestion.suggestedMissionType) ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-sm",
                getMissionTypeBadgeClassName(suggestion.suggestedMissionType),
              )}
            >
              {formatMissionTypeLabel(suggestion.suggestedMissionType)}
            </Badge>
          ) : null}
          <span>
            Ưu tiên:{" "}
            {typeof suggestion.suggestedPriorityScore === "number"
              ? suggestion.suggestedPriorityScore.toFixed(1)
              : "N/A"}
          </span>
          <span>{allActivities.length} bước</span>
          {typeof suggestion.sosRequestCount === "number" &&
          suggestion.sosRequestCount > 0 ? (
            <span>{suggestion.sosRequestCount} SOS</span>
          ) : null}
          <span className="flex items-center gap-1">
            <Lightning className="h-3 w-3" weight="fill" />
            {suggestion.modelName || "AI"}
          </span>
          {typeof suggestion.responseTimeMs === "number" &&
          suggestion.responseTimeMs > 0 ? (
            <span>{(suggestion.responseTimeMs / 1000).toFixed(1)}s</span>
          ) : null}
          {typeof suggestion.confidenceScore === "number" ? (
            <span>
              Tin cậy: {(suggestion.confidenceScore * 100).toFixed(0)}%
            </span>
          ) : null}
        </div>

        {hasSystemWarnings ? (
          <div className="flex flex-wrap gap-1.5">
            {trimToNull(suggestion.mixedRescueReliefWarning) ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-sm border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
              >
                Có cảnh báo tách mission
              </Badge>
            ) : null}
            {suggestion.needsManualReview ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-sm border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              >
                Cần review thủ công
              </Badge>
            ) : null}
            {suggestion.needsAdditionalDepot ||
            suggestion.supplyShortages.length > 0 ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-sm border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-300"
              >
                Thiếu vật phẩm / cần thêm kho
              </Badge>
            ) : null}
            {suggestion.multiDepotRecommended ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-sm border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              >
                Khuyến nghị nhiều kho
              </Badge>
            ) : null}
            {hasAiError ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
              >
                Có lỗi AI
              </Badge>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? (
            <CaretUp className="h-3 w-3" />
          ) : (
            <CaretDown className="h-3 w-3" />
          )}
          {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
        </button>

        {expanded ? (
          <div className="space-y-2 mt-1">
            {suggestion.overallAssessment ? (
              <div className="rounded-md border bg-muted/30 px-2.5 py-2">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {suggestion.overallAssessment}
                </p>
              </div>
            ) : null}

            {trimToNull(suggestion.mixedRescueReliefWarning) ? (
              <div className="rounded-md border border-rose-200 bg-rose-50/80 px-2.5 py-2 dark:border-rose-800/40 dark:bg-rose-900/10">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Cảnh báo gộp cứu hộ và cứu trợ
                </p>
                <p className="mt-0.5 text-sm text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
                  {translateAIText(suggestion.mixedRescueReliefWarning ?? "")}
                </p>
              </div>
            ) : null}

            {suggestion.lowConfidenceWarning ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 dark:border-amber-800/40 dark:bg-amber-900/10">
                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                  {translateAIText(suggestion.lowConfidenceWarning ?? "")}
                </p>
              </div>
            ) : null}

            {hasAiError ? (
              <div className="rounded-md border border-red-200 bg-red-50/80 px-2.5 py-2 dark:border-red-800/40 dark:bg-red-900/10">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Lỗi AI
                </p>
                <p className="mt-0.5 text-sm text-red-700/80 dark:text-red-300/80 leading-relaxed">
                  {aiErrorMessage ??
                    "AI trả về trạng thái không thành công nhưng chưa có chi tiết lỗi."}
                </p>
              </div>
            ) : null}

            {suggestion.supplyShortages.length > 0 ? (
              <div className="rounded-md border border-sky-200 bg-sky-50/80 px-2.5 py-2 dark:border-sky-800/40 dark:bg-sky-900/10">
                <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                  Thiếu vật phẩm
                </p>
                <div className="mt-1 space-y-1">
                  {suggestion.supplyShortages.map((shortage, index) => (
                    <p
                      key={`${suggestion.id}-shortage-${index}`}
                      className="text-sm text-sky-700/80 dark:text-sky-300/80"
                    >
                      {`${shortage.itemName} thiếu x${shortage.missingQuantity}${shortage.unit ? ` ${shortage.unit}` : ""}`}
                      {shortage.selectedDepotName
                        ? ` • Kho: ${shortage.selectedDepotName}`
                        : ""}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {allActivities.length > 0 ? (
              <div className="relative mt-4">
                <AiOriginNode />
                <div className="ml-12 mt-4 space-y-0">
                  {allActivities.map((act, aIdx) => {
                    const normalizedActivityType = (act.activityType ?? "")
                      .trim()
                      .toUpperCase();
                    const config =
                      activityTypeConfig[act.activityType] ||
                      activityTypeConfig[normalizedActivityType] ||
                      activityTypeConfig["ASSESS"];
                    const Icon =
                      activityIconMap[act.activityType] ||
                      activityIconMap[normalizedActivityType] ||
                      Sparkle;

                    const isDepotStep =
                      normalizedActivityType === "COLLECT_SUPPLIES" ||
                      act.depotName !== null;
                    const isSosStep =
                      normalizedActivityType === "RESCUE" ||
                      normalizedActivityType === "MEDICAL_AID" ||
                      normalizedActivityType === "EVACUATE";

                    const hasVictims =
                      (Array.isArray(act.targetVictims) &&
                        act.targetVictims.length > 0) ||
                      !!buildVictimFallbackSummary(act);

                    return (
                      <div key={aIdx} className="relative">
                        {/* Timeline Line */}
                        <div className="absolute -left-7 top-0 h-full w-[2px] bg-primary/10" />

                        <div
                          className={cn(
                            "relative border rounded-xl p-4 mb-4 transition-all hover:shadow-md",
                            isDepotStep &&
                              "border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/[0.04]",
                            isSosStep &&
                              "border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.03]",
                            !isDepotStep && !isSosStep && "border bg-card",
                          )}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative w-8 h-8 shrink-0">
                              <svg
                                viewBox="0 0 28 28"
                                className="w-full h-full"
                              >
                                <polygon
                                  points="14,1 26,7.5 26,20.5 14,27 2,20.5 2,7.5"
                                  fill={
                                    isDepotStep
                                      ? "rgba(245,158,11,0.2)"
                                      : isSosStep
                                        ? "rgba(239,68,68,0.15)"
                                        : "rgba(249,115,22,0.1)"
                                  }
                                  stroke={
                                    isDepotStep
                                      ? "rgba(245,158,11,0.6)"
                                      : isSosStep
                                        ? "rgba(239,68,68,0.5)"
                                        : "rgba(249,115,22,0.4)"
                                  }
                                  strokeWidth="1"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
                                {act.step}
                              </span>
                            </div>
                            <Badge
                              className={cn(
                                "text-sm px-2 h-7 border font-bold",
                                config.bgColor,
                                config.color,
                                "border-current/20",
                              )}
                            >
                              <Icon className="h-4 w-4 mr-1" weight="fill" />
                              {config.label}
                            </Badge>
                            {act.estimatedTime && (
                              <span className="text-sm font-medium flex items-center gap-1 ml-auto text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {act.estimatedTime}
                              </span>
                            )}
                          </div>

                          <p className="text-sm leading-relaxed font-bold mb-4 pl-0">
                            {act.description}
                          </p>

                          <div className="space-y-4">
                            <ActivityExecutionMeta
                              activity={act}
                              className="mb-2"
                            />

                            <div
                              className={cn(
                                "grid gap-4 items-start",
                                hasVictims
                                  ? "grid-cols-1 lg:grid-cols-2"
                                  : "grid-cols-1",
                              )}
                            >
                              <div className="space-y-4 flex flex-col">
                                {hasVictims && (
                                  <TargetVictimsBlock
                                    activity={act}
                                    className="flex-1"
                                  />
                                )}
                                <CoordinationNotesBlock activity={act} />
                              </div>

                              <div className="space-y-4 flex flex-col">
                                {act.suggestedTeam && (
                                  <div className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 transition-all hover:shadow-md dark:border-emerald-800/30 dark:from-emerald-950/20 dark:to-background flex-1">
                                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                      <ShieldCheck
                                        className="h-4 w-4"
                                        weight="fill"
                                      />
                                      Đội ngũ đề xuất
                                    </p>
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                        {act.suggestedTeam.teamName ||
                                          (act.suggestedTeam.teamId
                                            ? `Đội #${act.suggestedTeam.teamId}`
                                            : "Đội chưa đặt tên")}
                                      </p>
                                      <div className="grid grid-cols-1 gap-1.5 text-[13px] font-medium text-emerald-800/80 dark:text-emerald-200/70">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                          Loại:{" "}
                                          {formatTeamTypeLabel(
                                            act.suggestedTeam.teamType,
                                          )}
                                        </div>
                                        {act.suggestedTeam.contactPhone && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5" />
                                            SĐT:{" "}
                                            {act.suggestedTeam.contactPhone}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {(act.assemblyPointName ||
                                  (act.assemblyPointLatitude != null &&
                                    act.assemblyPointLongitude != null)) && (
                                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/40 to-white p-3.5 dark:border-blue-800/30 dark:from-blue-950/20 dark:to-background">
                                    <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                      <MapPin
                                        className="h-4 w-4"
                                        weight="fill"
                                      />
                                      Điểm tập kết
                                    </p>
                                    <div className="space-y-1">
                                      {act.assemblyPointName && (
                                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                          {act.assemblyPointName}
                                        </p>
                                      )}
                                      {act.assemblyPointLatitude != null &&
                                        act.assemblyPointLongitude != null && (
                                          <p className="text-[12px] font-mono font-medium text-blue-600/60 dark:text-blue-400/60">
                                            COORD:{" "}
                                            {act.assemblyPointLatitude.toFixed(
                                              5,
                                            )}
                                            ,{" "}
                                            {act.assemblyPointLongitude.toFixed(
                                              5,
                                            )}
                                          </p>
                                        )}
                                    </div>
                                  </div>
                                )}

                                {act.depotName && (
                                  <div className="group relative overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/40 to-white p-4 transition-all hover:shadow-md dark:border-sky-800/30 dark:from-sky-950/20 dark:to-background">
                                    <div className="flex items-start gap-3">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                                        <WarehouseIcon
                                          className="h-5 w-5"
                                          weight="fill"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600/70 dark:text-sky-400/70">
                                          Địa điểm tiếp nhận
                                        </p>
                                        <h4 className="mt-0.5 text-[14px] font-bold text-sky-900 dark:text-sky-100">
                                          {act.depotName}
                                        </h4>
                                        {act.depotAddress && (
                                          <p className="mt-1 text-[13px] font-medium leading-relaxed text-sky-700/70 dark:text-sky-300/60">
                                            {act.depotAddress}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {act.suppliesToCollect &&
                              act.suppliesToCollect.length > 0 && (
                                <div className="mt-2 border-t border-dashed border-border pt-4">
                                  <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                    <Package className="h-3.5 w-3.5" />
                                    Vật phẩm cần chuẩn bị
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {act.suppliesToCollect.map(
                                      (supply, sIdx) => {
                                        const showSupplyBuffer =
                                          act.activityType ===
                                            "COLLECT_SUPPLIES" &&
                                          !isReusableSupplyCollection(supply);

                                        return (
                                          <div
                                            key={`${supply.itemId}-${sIdx}`}
                                            className="supply-tag flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-primary/[0.03] border border-primary/10 text-[13px] transition-all hover:border-primary/20 hover:bg-primary/[0.05]"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Package
                                                  className="h-4 w-4"
                                                  weight="fill"
                                                />
                                              </div>
                                              <span className="font-bold text-foreground truncate">
                                                {getSupplyDisplayName(supply)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {showSupplyBuffer ? (
                                                <span className="rounded bg-amber-50 px-1 text-[11px] font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                                  Dự trù{" "}
                                                  {formatSupplyBufferPercent(
                                                    supply.bufferRatio,
                                                  )}
                                                </span>
                                              ) : null}
                                              <span className="text-[14px] font-black text-primary">
                                                ×{supply.quantity}
                                              </span>
                                              <span className="text-[11px] font-bold uppercase text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                {supply.unit}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 px-2.5 py-3 text-sm text-muted-foreground">
                Gợi ý này chưa có activity khả dụng để hiển thị.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const RescuePlanPanel = ({
  open,
  onOpenChange,
  clusterSOSRequests,
  clusterId,
  rescueSuggestion,
  preferSplitSuggestion = false,
  onApprove,
  onReAnalyze,
  isReAnalyzing,
  onShowRoute,
  defaultTab,
  readOnly = false,
}: RescuePlanPanelProps) => {
  // ── Custom resizable split ──
  const [splitPercent, setSplitPercent] = useState(42); // left panel %
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const mainScrollAreaRef = useRef<HTMLDivElement>(null);
  const dragPointerYRef = useRef<number | null>(null);
  const dragAutoScrollFrameRef = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      // Clamp between 30% and 80%
      setSplitPercent(Math.min(80, Math.max(30, pct)));
    };
    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Edit mode state ──
  const [isEditMode, setIsEditMode] = useState(false);
  type PendingRemoval =
    | {
        type: "activity";
        activityId: string;
        displayStep: number;
        hasSupplyItems: boolean;
      }
    | {
        type: "supply";
        activityId: string;
        supplyIndex: number;
        supplyName: string;
      };

  const [editActivities, setEditActivities] = useState<EditableActivity[]>([]);
  const [editActivityErrors, setEditActivityErrors] = useState<
    Record<string, EditActivityErrorState>
  >({});
  const [editMissionType, setEditMissionType] = useState<MissionType>("RESCUE");
  const [editPriorityScore, setEditPriorityScore] = useState(5);
  const [editStartTime, setEditStartTime] = useState("");
  const [editExpectedEndTime, setEditExpectedEndTime] = useState("");
  const [editingMissionId, setEditingMissionId] = useState<number | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [expandedEditSupplyKeys, setExpandedEditSupplyKeys] = useState<
    Record<string, boolean>
  >({});
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  );
  const [pendingMixedSuggestion, setPendingMixedSuggestion] =
    useState<SuggestionPreview | null>(null);
  const [pendingMixedOverrideReason, setPendingMixedOverrideReason] =
    useState("");
  const [splitSuggestionPreview, setSplitSuggestionPreview] =
    useState<SuggestionPreview | null>(null);
  const [dismissAutoSplitSuggestion, setDismissAutoSplitSuggestion] =
    useState(false);
  const [editSourceSuggestionId, setEditSourceSuggestionId] = useState<
    number | null
  >(null);
  const [mixedMissionOverride, setMixedMissionOverride] =
    useState<MixedMissionOverrideState | null>(null);
  const [editSuggestionContext, setEditSuggestionContext] =
    useState<SuggestionPreview | null>(null);
  const supplyUnitByItemIdRef = useRef<Record<number, string>>({});

  const { mutateAsync: createMissionAsync, isPending: isCreatingMission } =
    useCreateMission();
  const { mutateAsync: updateMissionAsync, isPending: isUpdatingMission } =
    useUpdateMission();
  const isSubmittingMissionEdit = isCreatingMission || isUpdatingMission;

  const syncReturnActivitiesWithCollectors = useCallback(
    (
      activities: EditableActivity[],
      options?: { sourceActivityId?: string | null },
    ): EditableActivity[] => {
      const normalizedActivities = syncDeliveryActivitiesWithCollectors(
        activities,
        options,
      );

      const nextActivities: EditableActivity[] = [];

      for (const activity of normalizedActivities) {
        if (isReturnAssemblyPointActivityType(activity.activityType)) {
          const matchedTeam = resolveReturnAssemblyPointTeamFromPrevious(
            activity,
            nextActivities,
          );
          const currentTeamId = toValidTeamId(activity.suggestedTeam?.teamId);
          const matchedTeamId = toValidTeamId(matchedTeam?.teamId);
          const expectedReason =
            "Tự động gán cùng đội thực thi bước trước để quay về điểm tập kết.";

          if (matchedTeamId == null) {
            if (activity.suggestedTeam == null) {
              nextActivities.push(activity);
              continue;
            }

            nextActivities.push({
              ...activity,
              suggestedTeam: null,
            });
            continue;
          }

          if (
            currentTeamId === matchedTeamId &&
            activity.suggestedTeam?.reason === expectedReason
          ) {
            nextActivities.push(activity);
            continue;
          }

          nextActivities.push({
            ...activity,
            suggestedTeam: {
              ...matchedTeam,
              reason: expectedReason,
            },
          });
          continue;
        }

        if (activity.activityType !== "RETURN_SUPPLIES") {
          nextActivities.push(activity);
          continue;
        }

        const collectorActivity = findCollectorActivityForReturn(
          activity,
          normalizedActivities,
        );
        const collectorTeamId = toValidTeamId(
          collectorActivity?.suggestedTeam?.teamId,
        );
        const currentTeamId = toValidTeamId(activity.suggestedTeam?.teamId);
        const collectorSupplies = cloneSupplyCollections(
          collectorActivity?.suppliesToCollect ?? null,
        );
        const currentSupplies = cloneSupplyCollections(
          activity.suppliesToCollect ?? null,
        );
        const syncedReturnSupplies = buildAutoReturnSuppliesFromCollector(
          currentSupplies,
          collectorSupplies,
        );
        const preservedDeliverySupplyKeys = new Set(
          (syncedReturnSupplies ?? []).map((supply) =>
            buildSupplyComparisonKey(supply),
          ),
        );

        if (!collectorActivity || collectorTeamId == null) {
          const hasAutoAssignedCollectorReason =
            typeof activity.suggestedTeam?.reason === "string" &&
            activity.suggestedTeam.reason.startsWith(
              "Tự động gán theo đội thu gom Vật phẩm ở Bước ",
            );
          const nextSuggestedTeam = hasAutoAssignedCollectorReason
            ? null
            : (activity.suggestedTeam ?? null);

          if (
            nextSuggestedTeam === activity.suggestedTeam &&
            haveMatchingSupplyCollections(
              currentSupplies,
              activity.suppliesToCollect,
            )
          ) {
            nextActivities.push(activity);
            continue;
          }

          nextActivities.push({
            ...activity,
            suggestedTeam: nextSuggestedTeam,
            suppliesToCollect: currentSupplies,
          });
          continue;
        }

        const remainingBalanceByKey = buildTeamSupplyRemainingBalance(
          nextActivities,
          collectorTeamId,
          preservedDeliverySupplyKeys,
        );
        const cappedReturnSupplies = capReturnSuppliesByRemainingBalance(
          syncedReturnSupplies,
          remainingBalanceByKey,
        );

        const expectedReason = `Tự động gán theo đội thu gom Vật phẩm ở Bước ${collectorActivity.step}.`;
        const hasMatchingSupplies = haveMatchingSupplyCollections(
          currentSupplies,
          cappedReturnSupplies,
        );

        if (
          currentTeamId === collectorTeamId &&
          activity.suggestedTeam?.reason === expectedReason &&
          hasMatchingSupplies
        ) {
          nextActivities.push(activity);
          continue;
        }

        nextActivities.push({
          ...activity,
          suggestedTeam: {
            ...collectorActivity.suggestedTeam,
            reason: expectedReason,
          },
          suppliesToCollect: cappedReturnSupplies,
        });
      }

      return nextActivities;
    },
    [],
  );

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditActivities([]);
    setEditingMissionId(null);
    setEditSourceSuggestionId(null);
    setMixedMissionOverride(null);
    setEditSuggestionContext(null);
    setPendingMixedOverrideReason("");
    setEditActivityErrors({});
    setExpandedEditSupplyKeys({});
  }, []);

  const clearEditActivityErrors = useCallback(() => {
    setEditActivityErrors((previous) =>
      Object.keys(previous).length > 0 ? {} : previous,
    );
  }, []);

  const buildEditableActivitiesFromSuggestion = useCallback(
    (activities: ClusterSuggestedActivity[]): EditableActivity[] =>
      syncReturnActivitiesWithCollectors(
        activities.map((activity, index) => ({
          ...activity,
          estimatedTime: normalizeEstimatedTimeInputValue(
            activity.estimatedTime,
          ),
          _id: `edit-suggestion-${index}-${Date.now()}`,
          _missionActivityId: null,
          _missionStatus: null,
        })),
      ),
    [syncReturnActivitiesWithCollectors],
  );

  const applySuggestionPreviewToEditForm = useCallback(
    (
      suggestion: SuggestionPreview,
      options?: { mixedOverrideReason?: string | null },
    ) => {
      if (readOnly) return;

      setPendingMixedSuggestion(null);
      setPendingMixedOverrideReason("");
      setSplitSuggestionPreview(null);
      setDismissAutoSplitSuggestion(false);
      setEditActivityErrors({});
      setExpandedEditSupplyKeys({});
      setEditActivities(
        buildEditableActivitiesFromSuggestion(suggestion.suggestedActivities),
      );
      setEditSourceSuggestionId(suggestion.sourceSuggestionId ?? null);
      setEditSuggestionContext(suggestion);
      const normalizedOverrideReason = trimToNull(options?.mixedOverrideReason);
      if (
        trimToNull(suggestion.mixedRescueReliefWarning) &&
        normalizedOverrideReason
      ) {
        setMixedMissionOverride({
          suggestionPreviewId: suggestion.id,
          sourceSuggestionId: suggestion.sourceSuggestionId ?? null,
          warningMessage: suggestion.mixedRescueReliefWarning ?? "",
          overrideReason: normalizedOverrideReason,
        });
      } else {
        setMixedMissionOverride(null);
      }
      setEditPriorityScore(suggestion.suggestedPriorityScore || 5);
      setEditMissionType(
        normalizeEditMissionType(suggestion.suggestedMissionType),
      );
      const now = new Date();
      setEditStartTime(formatDateTimeLocalInputValue(now));
      const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      setEditExpectedEndTime(formatDateTimeLocalInputValue(end));
      setEditingMissionId(null);
      setIsEditMode(true);
    },
    [buildEditableActivitiesFromSuggestion, readOnly],
  );

  const handleSuggestionEditRequest = useCallback(
    (suggestion: SuggestionPreview) => {
      if (readOnly) {
        return;
      }

      if (trimToNull(suggestion.mixedRescueReliefWarning)) {
        setPendingMixedSuggestion(suggestion);
        setPendingMixedOverrideReason(
          mixedMissionOverride?.suggestionPreviewId === suggestion.id
            ? mixedMissionOverride.overrideReason
            : "",
        );
        return;
      }

      applySuggestionPreviewToEditForm(suggestion);
    },
    [applySuggestionPreviewToEditForm, mixedMissionOverride, readOnly],
  );

  const confirmMixedSuggestionAsSingleMission = useCallback(() => {
    if (!pendingMixedSuggestion) {
      return;
    }

    const overrideReason = trimToNull(pendingMixedOverrideReason);
    if (!overrideReason) {
      toast.error("Vui lòng nhập lý do khi bỏ qua cảnh báo mission hỗn hợp.");
      return;
    }

    applySuggestionPreviewToEditForm(pendingMixedSuggestion, {
      mixedOverrideReason: overrideReason,
    });
  }, [
    applySuggestionPreviewToEditForm,
    pendingMixedOverrideReason,
    pendingMixedSuggestion,
  ]);

  const confirmMixedSuggestionAsSplitMission = useCallback(() => {
    if (!pendingMixedSuggestion) {
      return;
    }

    setPendingMixedSuggestion(null);
    setPendingMixedOverrideReason("");
    setMixedMissionOverride(null);
    setIsEditMode(false);
    setEditingMissionId(null);
    setEditSourceSuggestionId(null);
    setEditActivities([]);
    setEditSuggestionContext(null);
    setSplitSuggestionPreview(pendingMixedSuggestion);
    setDismissAutoSplitSuggestion(false);
  }, [pendingMixedSuggestion]);

  const updateEditActivity = useCallback(
    (id: string, field: string, value: string | number | null) => {
      clearEditActivityErrors();
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(
          prev.map((a) => {
            if (a._id !== id) return a;

            // Only supply-related activities should keep the supply list.
            if (field === "activityType") {
              const nextType = value as ClusterActivityType;
              if (!isSupplyStep(nextType)) {
                return {
                  ...a,
                  activityType: nextType,
                  suppliesToCollect: null,
                };
              }
              return { ...a, activityType: nextType };
            }

            return { ...a, [field]: value } as EditableActivity;
          }),
        ),
      );
    },
    [clearEditActivityErrors, syncReturnActivitiesWithCollectors],
  );

  const removeEditActivity = useCallback(
    (id: string) => {
      clearEditActivityErrors();
      setExpandedEditSupplyKeys((previous) => {
        if (!(id in previous)) {
          return previous;
        }

        const next = { ...previous };
        delete next[id];
        return next;
      });
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(prev.filter((a) => a._id !== id)),
      );
    },
    [clearEditActivityErrors, syncReturnActivitiesWithCollectors],
  );

  const addEditActivity = useCallback(() => {
    clearEditActivityErrors();
    const newAct: EditableActivity = {
      _id: `edit-new-${Date.now()}`,
      step: editActivities.length + 1,
      activityType: "ASSESS" as ClusterActivityType,
      description: "",
      priority: "Medium",
      estimatedTime: "30 phút",
      sosRequestId: null,
      depotId: null,
      depotName: null,
      depotAddress: null,
      suppliesToCollect: null,
    };
    setEditActivities((prev) =>
      syncReturnActivitiesWithCollectors([...prev, newAct]),
    );
  }, [
    clearEditActivityErrors,
    editActivities.length,
    syncReturnActivitiesWithCollectors,
  ]);

  const moveEditActivity = useCallback(
    (idx: number, dir: -1 | 1) => {
      clearEditActivityErrors();
      setEditActivities((prev) => {
        const next = [...prev];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return prev;
        [next[idx], next[target]] = [next[target], next[idx]];
        return syncReturnActivitiesWithCollectors(next);
      });
    },
    [clearEditActivityErrors, syncReturnActivitiesWithCollectors],
  );

  const toggleEditSupplyExpansion = useCallback(
    (activityId: string, defaultExpanded: boolean) => {
      setExpandedEditSupplyKeys((previous) => ({
        ...previous,
        [activityId]: !(previous[activityId] ?? defaultExpanded),
      }));
    },
    [],
  );

  useEffect(() => {
    const next = { ...supplyUnitByItemIdRef.current };

    for (const activity of editActivities) {
      for (const supply of activity.suppliesToCollect ?? []) {
        if (typeof supply.itemId !== "number") continue;
        const unit = typeof supply.unit === "string" ? supply.unit.trim() : "";
        if (unit) {
          next[supply.itemId] = unit;
        }
      }
    }

    supplyUnitByItemIdRef.current = next;
  }, [editActivities]);

  // ── Supply management for edit mode ──
  const handleAddSupply = useCallback(
    (
      activityId: string,
      item: {
        itemId: number;
        itemName: string;
        availableQuantity: number;
        itemType?: string | null;
        unit?: string | null;
        measurementUnit?: string | null;
        sourceDepotId?: number | null;
        sourceDepotName?: string | null;
        sourceDepotAddress?: string | null;
      },
    ) => {
      const targetActivity = editActivities.find((a) => a._id === activityId);
      if (targetActivity?.activityType === "RETURN_SUPPLIES") {
        toast.info(
          "Vật phẩm ở bước Hoàn trả được tự động đồng bộ từ bước Thu gom vật phẩm nên không thể thêm thủ công.",
        );
        return;
      }

      const isDistributionStep =
        targetActivity?.activityType === "DELIVER_SUPPLIES";
      // We pass the incoming item to isReusableSupplyCollection.
      // It might lack metadata, but it's the safest heuristic we have.
      const isReusable = isReusableSupplyCollection(item as any);

      if (isDistributionStep && isReusable) {
        toast.info(
          "Không thể thêm vật phẩm tái sử dụng (Reusable) vào bước phân phát này. Vật phẩm loại này chỉ dành cho đội cứu hộ.",
        );
        return;
      }

      clearEditActivityErrors();
      setExpandedEditSupplyKeys((previous) => ({
        ...previous,
        [activityId]: true,
      }));
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(
          prev.map((a) => {
            if (a._id !== activityId) return a;

            const dragUnit =
              (typeof item.measurementUnit === "string"
                ? item.measurementUnit.trim()
                : "") ||
              (typeof item.unit === "string" ? item.unit.trim() : "");
            const cachedUnit =
              supplyUnitByItemIdRef.current[item.itemId]?.trim() ?? "";
            const resolvedUnit = dragUnit || cachedUnit || "đơn vị";
            const resolvedItemType = normalizeInventoryItemType(item.itemType);
            if (resolvedUnit) {
              supplyUnitByItemIdRef.current[item.itemId] = resolvedUnit;
            }

            const nextDepotId =
              isDepotSupplyStep(a.activityType) &&
              typeof item.sourceDepotId === "number" &&
              item.sourceDepotId > 0
                ? item.sourceDepotId
                : a.depotId;
            const nextDepotName =
              isDepotSupplyStep(a.activityType) &&
              typeof item.sourceDepotName === "string" &&
              item.sourceDepotName.trim()
                ? item.sourceDepotName.trim()
                : a.depotName;
            const nextDepotAddress =
              isDepotSupplyStep(a.activityType) &&
              typeof item.sourceDepotAddress === "string" &&
              item.sourceDepotAddress.trim()
                ? item.sourceDepotAddress.trim()
                : a.depotAddress;

            const existing = a.suppliesToCollect ?? [];
            const foundIdx = existing.findIndex(
              (s) => s.itemId === item.itemId,
            );
            if (foundIdx >= 0) {
              const next = [...existing];
              const currentUnit =
                typeof next[foundIdx].unit === "string"
                  ? next[foundIdx].unit.trim()
                  : "";
              const shouldUpgradeUnit =
                (!currentUnit || currentUnit === "đơn vị") &&
                resolvedUnit !== "đơn vị";
              const currentItemType = normalizeInventoryItemType(
                next[foundIdx].itemType,
              );
              next[foundIdx] = {
                ...next[foundIdx],
                quantity: next[foundIdx].quantity + 1,
                unit: shouldUpgradeUnit ? resolvedUnit : next[foundIdx].unit,
                ...(resolvedItemType && !currentItemType
                  ? { itemType: resolvedItemType }
                  : {}),
              };
              return {
                ...a,
                depotId: nextDepotId,
                depotName: nextDepotName,
                depotAddress: nextDepotAddress,
                suppliesToCollect: next,
              };
            }
            return {
              ...a,
              depotId: nextDepotId,
              depotName: nextDepotName,
              depotAddress: nextDepotAddress,
              suppliesToCollect: [
                ...existing,
                {
                  itemId: item.itemId,
                  itemName: item.itemName,
                  ...(resolvedItemType ? { itemType: resolvedItemType } : {}),
                  quantity: 1,
                  unit: resolvedUnit,
                },
              ],
            };
          }),
          { sourceActivityId: activityId },
        ),
      );
    },
    [
      clearEditActivityErrors,
      editActivities,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleRemoveSupply = useCallback(
    (activityId: string, supplyIndex: number) => {
      const targetActivity = editActivities.find((a) => a._id === activityId);
      if (targetActivity?.activityType === "RETURN_SUPPLIES") {
        toast.info(
          "Vật phẩm ở bước Hoàn trả được tự động đồng bộ từ bước Thu gom vật phẩm nên không thể xóa thủ công.",
        );
        return;
      }

      clearEditActivityErrors();
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(
          prev.map((a) => {
            if (a._id !== activityId) return a;
            const next = [...(a.suppliesToCollect ?? [])];
            next.splice(supplyIndex, 1);
            return { ...a, suppliesToCollect: next.length > 0 ? next : null };
          }),
          { sourceActivityId: activityId },
        ),
      );
    },
    [
      clearEditActivityErrors,
      editActivities,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleUpdateSupplyQuantity = useCallback(
    (activityId: string, supplyIndex: number, quantity: number) => {
      const targetActivity = editActivities.find((a) => a._id === activityId);
      if (targetActivity?.activityType === "RETURN_SUPPLIES") {
        toast.info(
          "Số lượng ở bước Hoàn trả được tự động đồng bộ theo số lượng đã thu gom nên không thể sửa thủ công.",
        );
        return;
      }

      clearEditActivityErrors();
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(
          prev.map((a) => {
            if (a._id !== activityId) return a;
            const next = [...(a.suppliesToCollect ?? [])];
            if (next[supplyIndex]) {
              next[supplyIndex] = {
                ...next[supplyIndex],
                quantity: quantity,
              };
            }
            return { ...a, suppliesToCollect: next };
          }),
          { sourceActivityId: activityId },
        ),
      );
    },
    [
      clearEditActivityErrors,
      editActivities,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleUpdateSupplyBufferRatio = useCallback(
    (activityId: string, supplyIndex: number, percent: number) => {
      const targetActivity = editActivities.find((a) => a._id === activityId);
      if (targetActivity?.activityType === "RETURN_SUPPLIES") {
        toast.info(
          "Tỉ lệ dự trù ở bước Hoàn trả được đồng bộ theo bước Thu gom vật phẩm.",
        );
        return;
      }

      clearEditActivityErrors();
      setEditActivities((prev) =>
        syncReturnActivitiesWithCollectors(
          prev.map((a) => {
            if (a._id !== activityId) return a;
            const next = [...(a.suppliesToCollect ?? [])];
            if (next[supplyIndex]) {
              next[supplyIndex] = {
                ...next[supplyIndex],
                bufferRatio: supplyBufferPercentToRatio(percent),
              };
            }
            return { ...a, suppliesToCollect: next };
          }),
          { sourceActivityId: activityId },
        ),
      );
    },
    [
      clearEditActivityErrors,
      editActivities,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleRemoveActivityWithConfirm = useCallback(
    (activity: EditableActivity, displayStep: number) => {
      setPendingRemoval({
        type: "activity",
        activityId: activity._id,
        displayStep,
        hasSupplyItems: (activity.suppliesToCollect?.length ?? 0) > 0,
      });
      setRemoveConfirmOpen(true);
    },
    [],
  );

  const handleRemoveSupplyWithConfirm = useCallback(
    (activityId: string, supplyIndex: number, supplyName: string) => {
      setPendingRemoval({
        type: "supply",
        activityId,
        supplyIndex,
        supplyName,
      });
      setRemoveConfirmOpen(true);
    },
    [],
  );

  const handleRemoveConfirmOpenChange = useCallback((open: boolean) => {
    setRemoveConfirmOpen(open);
    if (!open) {
      setPendingRemoval(null);
    }
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemoval) return;

    if (pendingRemoval.type === "activity") {
      removeEditActivity(pendingRemoval.activityId);
    } else {
      handleRemoveSupply(pendingRemoval.activityId, pendingRemoval.supplyIndex);
    }

    setRemoveConfirmOpen(false);
    setPendingRemoval(null);
  }, [pendingRemoval, removeEditActivity, handleRemoveSupply]);

  const handleQuickFixSupplyIssue = useCallback(
    (issue: SupplyBalanceIssue<string>) => {
      const teamId = issue.teamId;
      const itemKey = issue.itemKey;
      const issueActivityIndex = editActivities.findIndex(
        (activity) => activity._id === issue.activityId,
      );
      const searchStartIndex =
        issueActivityIndex >= 0
          ? issueActivityIndex
          : Math.min(Math.max(issue.step - 1, 0), editActivities.length - 1);
      const issueItemId = itemKey.startsWith("id:")
        ? Number(itemKey.replace("id:", ""))
        : null;
      const issueItemName = normalizeSupplyMatchText(issue.itemName);
      const matchesIssueSupply = (
        supply: Pick<ClusterSupplyCollection, "itemId" | "itemName" | "unit">,
      ) => {
        const supplyItemId = Number(supply.itemId);
        if (
          Number.isFinite(issueItemId) &&
          issueItemId != null &&
          issueItemId > 0 &&
          supplyItemId === issueItemId
        ) {
          return true;
        }

        const identity = getSupplyIdentity(supply);
        if (identity.itemKey === itemKey) {
          return true;
        }

        return (
          issueItemName.length > 0 &&
          normalizeSupplyMatchText(identity.itemName) === issueItemName
        );
      };
      let targetActivityIdx = -1;

      const findTargetCollectActivity = (strictTeam: boolean) => {
        let fallbackIdx = -1;

        for (let i = searchStartIndex; i >= 0; i -= 1) {
          const candidate = editActivities[i];
          if (candidate.activityType !== "COLLECT_SUPPLIES") {
            continue;
          }

          if (
            strictTeam &&
            toValidTeamId(candidate.suggestedTeam?.teamId) !== teamId
          ) {
            continue;
          }

          const hasItem = candidate.suppliesToCollect?.some(matchesIssueSupply);

          if (issue.issueType === "insufficient-collected") {
            if (fallbackIdx === -1) {
              fallbackIdx = i;
            }
            if (hasItem) {
              return i;
            }
            continue;
          }

          if (hasItem) {
            return i;
          }
        }

        return issue.issueType === "insufficient-collected" ? fallbackIdx : -1;
      };

      targetActivityIdx = findTargetCollectActivity(true);
      if (targetActivityIdx === -1) {
        targetActivityIdx = findTargetCollectActivity(false);
      }

      if (
        targetActivityIdx === -1 &&
        issue.issueType === "remaining-supplies" &&
        issueActivityIndex >= 0
      ) {
        const issueActivity = editActivities[issueActivityIndex];
        if (
          issueActivity.activityType === "COLLECT_SUPPLIES" &&
          issueActivity.suppliesToCollect?.some(matchesIssueSupply)
        ) {
          targetActivityIdx = issueActivityIndex;
        }
      }

      if (targetActivityIdx === -1) {
        if (issue.issueType === "insufficient-collected") {
          toast.error(
            "Không tìm thấy bước Thu gom vật phẩm phù hợp để tự động sửa.",
            {
              description:
                "Vui lòng thêm bước Thu gom vật phẩm trước khi phân phát.",
            },
          );
        } else {
          toast.error(
            "Không tìm thấy bước Thu gom vật phẩm gốc để điều chỉnh giảm.",
          );
        }
        return;
      }

      const targetActivity = { ...editActivities[targetActivityIdx] };
      const targetSupplies = [...(targetActivity.suppliesToCollect ?? [])];
      const targetSupplyIdx = targetSupplies.findIndex(matchesIssueSupply);
      let fixedQuantity = issue.quantity;

      if (issue.issueType === "insufficient-collected") {
        if (targetSupplyIdx >= 0) {
          targetSupplies[targetSupplyIdx] = {
            ...targetSupplies[targetSupplyIdx],
            quantity: targetSupplies[targetSupplyIdx].quantity + issue.quantity,
          };
        } else {
          const itemId = itemKey.startsWith("id:")
            ? Number(itemKey.replace("id:", ""))
            : null;
          targetSupplies.push({
            itemId: Number.isFinite(itemId) ? itemId : null,
            itemName: issue.itemName,
            quantity: issue.quantity,
            unit: issue.unit,
            bufferRatio: 0,
          });
        }
      } else {
        if (targetSupplyIdx < 0) {
          toast.error(
            "Không tìm thấy bước Thu gom vật phẩm gốc để điều chỉnh giảm.",
          );
          return;
        }

        const currentQty = targetSupplies[targetSupplyIdx].quantity;
        fixedQuantity = Math.min(currentQty, issue.quantity);
        const nextQty = currentQty - fixedQuantity;

        if (nextQty <= 0) {
          targetSupplies.splice(targetSupplyIdx, 1);
        } else {
          targetSupplies[targetSupplyIdx] = {
            ...targetSupplies[targetSupplyIdx],
            quantity: nextQty,
          };
        }
      }

      targetActivity.suppliesToCollect =
        targetSupplies.length > 0 ? targetSupplies : null;
      const nextActivities = editActivities.map((activity, index) =>
        index === targetActivityIdx ? targetActivity : activity,
      );

      clearEditActivityErrors();
      setEditActivities(
        syncReturnActivitiesWithCollectors(nextActivities, {
          sourceActivityId: targetActivity._id,
        }),
      );
      setExpandedEditSupplyKeys((previous) => ({
        ...previous,
        [targetActivity._id]: true,
      }));
      toast.success(
        issue.issueType === "insufficient-collected"
          ? `Đã tự tăng ${issue.itemName} thêm ${fixedQuantity} ${issue.unit} ở Bước ${targetActivityIdx + 1}.`
          : `Đã tự giảm ${issue.itemName} ${fixedQuantity} ${issue.unit} ở Bước ${targetActivityIdx + 1}.`,
        {
          description: `Đã cân bằng vật phẩm cho ${issue.teamName || "đội cứu hộ"}.`,
        },
      );
    },
    [
      clearEditActivityErrors,
      editActivities,
      setEditActivities,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const editSupplyBalanceAnalysis = useMemo(
    () =>
      analyzeMissionSupplyBalance(
        editActivities.map((activity, index) => ({
          activityId: activity._id,
          activityType: activity.activityType,
          step: index + 1,
          teamId: toValidTeamId(activity.suggestedTeam?.teamId),
          teamName: activity.suggestedTeam?.teamName ?? null,
          supplies: activity.suppliesToCollect,
        })),
      ),
    [editActivities],
  );

  const validateEditMission = useCallback(() => {
    if (!clusterId) return false;
    if (editActivities.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 hoạt động");
      return false;
    }
    for (let i = 0; i < editActivities.length; i++) {
      if (!editActivities[i].description.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mô tả`);
        return false;
      }

      if (editActivities[i].activityType === "RETURN_SUPPLIES") {
        const collectorActivity = findCollectorActivityForReturn(
          editActivities[i],
          editActivities,
        );
        const collectorTeamId = toValidTeamId(
          collectorActivity?.suggestedTeam?.teamId,
        );
        const returnTeamId = toValidTeamId(
          editActivities[i].suggestedTeam?.teamId,
        );

        if (collectorTeamId == null || !collectorActivity) {
          toast.error(
            `Bước ${i + 1}: Chưa xác định được đội đã thu gom Vật phẩm để gán cho bước Hoàn trả Vật phẩm.`,
          );
          return false;
        }

        if (returnTeamId !== collectorTeamId) {
          toast.error(
            `Bước ${i + 1}: Đội Hoàn trả Vật phẩm phải trùng với đội thu gom Vật phẩm ở Bước ${collectorActivity.step}.`,
          );
          return false;
        }

        if (
          !hasValidReturnSupplySelections(
            editActivities[i].suppliesToCollect,
            collectorActivity.suppliesToCollect,
          )
        ) {
          toast.error(
            `Bước ${i + 1}: Những vật phẩm được chọn để hoàn trả phải khớp số lượng đã thu gom ở Bước ${collectorActivity.step}.`,
          );
          return false;
        }
      }

      if (isReturnAssemblyPointActivityType(editActivities[i].activityType)) {
        const matchedTeam = resolveReturnAssemblyPointTeamFromPrevious(
          editActivities[i],
          editActivities.slice(0, i),
        );
        const matchedTeamId = toValidTeamId(matchedTeam?.teamId);
        const returnTeamId = toValidTeamId(
          editActivities[i].suggestedTeam?.teamId,
        );

        if (matchedTeamId == null) {
          toast.error(
            `Bước ${i + 1}: Chưa xác định được đội thực thi trước đó để gán cho bước quay về điểm tập kết.`,
          );
          return false;
        }

        if (returnTeamId !== matchedTeamId) {
          toast.error(
            `Bước ${i + 1}: Đội quay về điểm tập kết phải trùng với đội thực thi ở bước trước đó.`,
          );
          return false;
        }
      }
    }

    if (editSupplyBalanceAnalysis.firstIssue) {
      toast.error(editSupplyBalanceAnalysis.firstIssue.message);
      return false;
    }

    if (!editStartTime || !editExpectedEndTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return false;
    }

    return true;
  }, [
    clusterId,
    editActivities,
    editExpectedEndTime,
    editStartTime,
    editSupplyBalanceAnalysis.firstIssue,
  ]);

  const handleOpenSubmitConfirm = useCallback(() => {
    if (readOnly) return;
    if (!validateEditMission()) return;
    setConfirmSubmitOpen(true);
  }, [readOnly, validateEditMission]);

  const handleSubmitEdit = useCallback(() => {
    if (readOnly) return;
    if (!validateEditMission() || !clusterId) return;

    const submit = async () => {
      setConfirmSubmitOpen(false);
      setEditActivityErrors({});

      const sos = clusterSOSRequests[0];
      const normalizedActivities = editActivities.map((activity, index) => {
        const syncedDescription = syncDescriptionWithSupplies(
          activity.description,
          activity.suppliesToCollect,
        );

        const rawSosRequestId =
          activity.sosRequestId != null
            ? Number(activity.sosRequestId)
            : Number(sos?.id);
        const sosRequestId =
          Number.isFinite(rawSosRequestId) && rawSosRequestId > 0
            ? rawSosRequestId
            : null;

        const rawDepotId =
          activity.depotId != null ? Number(activity.depotId) : Number.NaN;
        const depotId =
          Number.isFinite(rawDepotId) && rawDepotId > 0 ? rawDepotId : null;
        const depotName =
          typeof activity.depotName === "string" && activity.depotName.trim()
            ? activity.depotName.trim()
            : null;
        const depotAddress =
          typeof activity.depotAddress === "string" &&
          activity.depotAddress.trim()
            ? activity.depotAddress.trim()
            : null;

        const rawAssemblyPointId =
          activity.assemblyPointId != null
            ? Number(activity.assemblyPointId)
            : Number.NaN;
        const assemblyPointId =
          Number.isFinite(rawAssemblyPointId) && rawAssemblyPointId > 0
            ? rawAssemblyPointId
            : null;
        const assemblyPointName =
          typeof activity.assemblyPointName === "string" &&
          activity.assemblyPointName.trim()
            ? activity.assemblyPointName.trim()
            : null;
        const rawAssemblyPointLat =
          activity.assemblyPointLatitude != null
            ? Number(activity.assemblyPointLatitude)
            : Number.NaN;
        const assemblyPointLatitude = Number.isFinite(rawAssemblyPointLat)
          ? rawAssemblyPointLat
          : null;
        const rawAssemblyPointLng =
          activity.assemblyPointLongitude != null
            ? Number(activity.assemblyPointLongitude)
            : Number.NaN;
        const assemblyPointLongitude = Number.isFinite(rawAssemblyPointLng)
          ? rawAssemblyPointLng
          : null;
        const destinationName =
          typeof activity.destinationName === "string" &&
          activity.destinationName.trim()
            ? activity.destinationName.trim()
            : null;
        const destinationCoordinates = resolveCoordinatePair(
          activity.destinationLatitude,
          activity.destinationLongitude,
        );

        const selectedSos =
          sosRequestId != null
            ? clusterSOSRequests.find(
                (s) => String(s.id) === String(sosRequestId),
              )
            : null;

        const forcedCollectorActivity =
          activity.activityType === "RETURN_SUPPLIES"
            ? findCollectorActivityForReturn(activity, editActivities)
            : null;
        const isReturnAssemblyPointActivity = isReturnAssemblyPointActivityType(
          activity.activityType,
        );
        const forcedReturnAssemblyTeam = isReturnAssemblyPointActivity
          ? resolveReturnAssemblyPointTeamFromPrevious(
              activity,
              editActivities.slice(0, index),
            )
          : null;
        const rescueTeamId =
          activity.activityType === "RETURN_SUPPLIES"
            ? toValidTeamId(forcedCollectorActivity?.suggestedTeam?.teamId)
            : isReturnAssemblyPointActivity
              ? toValidTeamId(forcedReturnAssemblyTeam?.teamId)
              : toValidTeamId(activity.suggestedTeam?.teamId);
        const descriptionCoordinates =
          extractCoordsFromDescription(syncedDescription);
        const fallbackTargetLatitude =
          descriptionCoordinates?.lat ??
          (sosRequestId
            ? (selectedSos?.location?.lat ?? sos?.location?.lat ?? 0)
            : (sos?.location?.lat ?? 0));
        const fallbackTargetLongitude =
          descriptionCoordinates?.lng ??
          (sosRequestId
            ? (selectedSos?.location?.lng ?? sos?.location?.lng ?? 0)
            : (sos?.location?.lng ?? 0));
        const returnAssemblyPointCoordinates = resolveCoordinatePair(
          assemblyPointLatitude,
          assemblyPointLongitude,
        );
        const resolvedTargetName = isReturnAssemblyPointActivity
          ? (assemblyPointName ??
            destinationName ??
            `Điểm tập kết #${assemblyPointId ?? "unknown"}`)
          : (destinationName ??
            depotName ??
            selectedSos?.address ??
            `SOS ${sosRequestId || sos?.id || "unknown"}`);
        const resolvedTargetCoordinates = isReturnAssemblyPointActivity
          ? (returnAssemblyPointCoordinates ??
            destinationCoordinates ?? {
              lat: fallbackTargetLatitude,
              lng: fallbackTargetLongitude,
            })
          : (destinationCoordinates ?? {
              lat: fallbackTargetLatitude,
              lng: fallbackTargetLongitude,
            });

        const createRequest = {
          step: index + 1,
          activityCode: `${activity.activityType}_${index + 1}`,
          activityType: activity.activityType,
          description: syncedDescription,
          priority: activity.priority || "Medium",
          estimatedTime:
            Number.parseInt(String(activity.estimatedTime), 10) || 30,
          sosRequestId,
          depotId,
          depotName,
          depotAddress,
          assemblyPointId,
          assemblyPointName,
          assemblyPointLatitude,
          assemblyPointLongitude,
          suppliesToCollect: (activity.suppliesToCollect ?? []).map((s) => {
            const plannedPickupLotAllocations =
              normalizeSupplyLotAllocationsForMissionPayload(
                s.plannedPickupLotAllocations,
              );
            const pickupLotAllocations =
              normalizeSupplyLotAllocationsForMissionPayload(
                s.pickupLotAllocations,
              );
            const actualDeliveredQuantity = toFiniteNumber(
              s.actualDeliveredQuantity,
            );
            const normalizedItemType = isReusableSupplyCollection(s)
              ? "Reusable"
              : "Consumable";

            return {
              id: typeof s.itemId === "number" ? s.itemId : null,
              name:
                typeof s.itemName === "string" && s.itemName.trim()
                  ? s.itemName.trim()
                  : null,
              itemType: normalizedItemType,
              quantity: s.quantity,
              unit: normalizeSupplyUnit(s.unit),
              ...(activity.activityType === "COLLECT_SUPPLIES" &&
              normalizedItemType === "Consumable"
                ? { bufferRatio: resolveSupplyBufferRatio(s.bufferRatio) }
                : {}),
              ...(plannedPickupLotAllocations
                ? { plannedPickupLotAllocations }
                : {}),
              ...(pickupLotAllocations ? { pickupLotAllocations } : {}),
              ...(actualDeliveredQuantity != null
                ? { actualDeliveredQuantity }
                : {}),
            };
          }),
          target: resolvedTargetName,
          targetLatitude: resolvedTargetCoordinates.lat,
          targetLongitude: resolvedTargetCoordinates.lng,
          rescueTeamId,
          targetVictimSummary: trimToNull(activity.targetVictimSummary) ?? null,
          targetVictims:
            Array.isArray(activity.targetVictims) &&
            activity.targetVictims.length > 0
              ? activity.targetVictims
              : null,
        };

        return {
          sourceActivityId: activity._missionActivityId ?? null,
          sourceMissionStatus: activity._missionStatus ?? null,
          createRequest,
        };
      });

      try {
        if (editingMissionId) {
          const updatableActivities = normalizedActivities.filter(
            ({ sourceMissionStatus, createRequest }) =>
              sourceMissionStatus == null ||
              isPlannedMissionActivityStatus(sourceMissionStatus) ||
              (isOngoingMissionActivityStatus(sourceMissionStatus) &&
                isReturnAssemblyPointActivityType(createRequest.activityType)),
          );

          if (updatableActivities.length === 0) {
            toast.error(
              "Không có activity đủ điều kiện cập nhật (Planned hoặc bước quay về điểm tập kết đang OnGoing).",
            );
            return;
          }

          await updateMissionAsync({
            missionId: editingMissionId,
            request: {
              missionType: editMissionType,
              priorityScore: editPriorityScore,
              startTime: new Date(editStartTime).toISOString(),
              expectedEndTime: new Date(editExpectedEndTime).toISOString(),
              activities: updatableActivities.map(
                ({ sourceActivityId, createRequest }) => ({
                  activityId:
                    typeof sourceActivityId === "number" && sourceActivityId > 0
                      ? sourceActivityId
                      : 0,
                  activityType: createRequest.activityType,
                  step: createRequest.step,
                  description: createRequest.description,
                  target: createRequest.target,
                  assemblyPointId: createRequest.assemblyPointId ?? null,
                  ...(createRequest.assemblyPointId == null
                    ? {
                        targetLatitude: createRequest.targetLatitude,
                        targetLongitude: createRequest.targetLongitude,
                      }
                    : {}),
                  items: createRequest.suppliesToCollect.map((supply) => {
                    const plannedPickupLotAllocations =
                      normalizeSupplyLotAllocationsForMissionPayload(
                        supply.plannedPickupLotAllocations,
                      );
                    const pickupLotAllocations =
                      normalizeSupplyLotAllocationsForMissionPayload(
                        supply.pickupLotAllocations,
                      );
                    const actualDeliveredQuantity = toFiniteNumber(
                      supply.actualDeliveredQuantity,
                    );
                    const normalizedItemType =
                      normalizeInventoryItemType(supply.itemType) ??
                      "Consumable";

                    return {
                      itemId: supply.id,
                      itemName: supply.name,
                      quantity: supply.quantity,
                      unit: normalizeSupplyUnit(supply.unit),
                      ...(createRequest.activityType === "COLLECT_SUPPLIES" &&
                      normalizedItemType === "Consumable"
                        ? {
                            bufferRatio: resolveSupplyBufferRatio(
                              supply.bufferRatio,
                            ),
                          }
                        : {}),
                      ...(plannedPickupLotAllocations
                        ? { plannedPickupLotAllocations }
                        : {}),
                      ...(pickupLotAllocations ? { pickupLotAllocations } : {}),
                      ...(actualDeliveredQuantity != null
                        ? { actualDeliveredQuantity }
                        : {}),
                    };
                  }),
                  targetVictimSummary:
                    createRequest.targetVictimSummary ?? null,
                  targetVictims: createRequest.targetVictims ?? null,
                }),
              ),
            },
          });

          toast.success("Đã cập nhật nhiệm vụ thành công!");
        } else {
          const normalizedOverrideReason = trimToNull(
            mixedMissionOverride?.overrideReason,
          );
          const shouldIgnoreMixedMissionWarning =
            trimToNull(mixedMissionOverride?.warningMessage) != null &&
            normalizedOverrideReason != null;

          await createMissionAsync({
            clusterId,
            aiSuggestionId: editSourceSuggestionId,
            missionType: editMissionType,
            priorityScore: editPriorityScore,
            startTime: new Date(editStartTime).toISOString(),
            expectedEndTime: new Date(editExpectedEndTime).toISOString(),
            ignoreMixedMissionWarning: shouldIgnoreMixedMissionWarning,
            overrideReason: shouldIgnoreMixedMissionWarning
              ? normalizedOverrideReason
              : null,
            activities: normalizedActivities.map(
              ({ createRequest }) => createRequest,
            ),
          });

          toast.success("Đã tạo nhiệm vụ thành công!");
        }

        exitEditMode();
        onApprove();
      } catch (error) {
        const backendMessage = extractBackendErrorMessage(error);
        console.error(
          editingMissionId
            ? "Failed to update mission:"
            : "Failed to create mission:",
          error,
        );
        if (backendMessage) {
          const nextEditActivityErrors =
            resolveEditActivityErrorsFromBackendMessage(
              backendMessage,
              editActivities,
            );
          setEditActivityErrors(nextEditActivityErrors);
          const firstErrorActivityId = Object.keys(nextEditActivityErrors)[0];
          if (firstErrorActivityId) {
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(
                  `[data-edit-activity-id="${firstErrorActivityId}"]`,
                )
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }
        }
        toast.error(
          backendMessage ??
            (editingMissionId
              ? "Không thể cập nhật nhiệm vụ. Vui lòng thử lại."
              : "Không thể tạo nhiệm vụ. Vui lòng thử lại."),
        );
      }
    };

    void submit();
  }, [
    clusterId,
    editActivities,
    editMissionType,
    editPriorityScore,
    editStartTime,
    editExpectedEndTime,
    clusterSOSRequests,
    editingMissionId,
    createMissionAsync,
    editSourceSuggestionId,
    exitEditMode,
    mixedMissionOverride,
    onApprove,
    readOnly,
    updateMissionAsync,
    validateEditMission,
  ]);

  // ── AI Stream ──
  const aiStream = useAiMissionStream();

  // ── Fetch saved AI suggestions for this cluster ──
  const {
    data: suggestionsData,
    isLoading: isSuggestionsLoading,
    refetch: refetchSuggestions,
  } = useMissionSuggestions(clusterId ?? 0, {
    enabled: !!clusterId && open,
  });
  const renderableSavedSuggestions = useMemo(
    () =>
      [...(suggestionsData?.missionSuggestions ?? [])]
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        })
        .filter(hasRenderableMissionSuggestion)
        .map(buildSuggestionPreviewFromMissionSuggestion),
    [suggestionsData?.missionSuggestions],
  );

  // ── Fetch existing missions for this cluster ──
  const {
    data: missionsData,
    isLoading: isMissionsLoading,
    refetch: refetchMissions,
  } = useMissions(clusterId ?? 0, {
    enabled: !!clusterId && open,
  });

  const {
    data: nearbyTeamsByClusterData,
    isLoading: isNearbyTeamsByClusterLoading,
  } = useRescueTeamsByCluster(clusterId ?? 0, {
    enabled: open && isEditMode && !!clusterId && clusterId > 0,
  });

  const { data: rescueTeamStatusOptions } = useRescueTeamStatuses({
    enabled: open,
  });

  const { data: assemblyPointsData, isLoading: isAssemblyPointsLoading } =
    useAssemblyPoints({
      params: {
        pageNumber: 1,
        pageSize: 300,
      },
      enabled: open && isEditMode,
    });

  const {
    data: assemblyPointMetadataOptions,
    isLoading: isAssemblyPointMetadataLoading,
  } = useAssemblyPointMetadata({
    enabled: open && isEditMode,
  });

  const rescueTeamStatusLabelsByKey = useMemo(() => {
    const labels = new Map<string, string>();

    for (const option of rescueTeamStatusOptions ?? []) {
      const normalizedKey = normalizeRescueTeamStatusKey(option.key);
      if (!normalizedKey) {
        continue;
      }

      const fallbackViLabel = RESCUE_TEAM_STATUS_LABELS_VI[option.key];
      if (fallbackViLabel) {
        labels.set(normalizedKey, fallbackViLabel);
        continue;
      }

      const configuredLabel =
        typeof option.value === "string" ? option.value.trim() : "";
      if (configuredLabel) {
        labels.set(normalizedKey, configuredLabel);
      }
    }

    return labels;
  }, [rescueTeamStatusOptions]);

  const assemblyPointOptions = useMemo<AssemblyPointOptionEntry[]>(() => {
    const byId = new Map<number, AssemblyPointOptionEntry>();

    for (const point of assemblyPointsData?.items ?? []) {
      if (!Number.isFinite(point.id) || point.id <= 0) {
        continue;
      }

      const pointName =
        typeof point.name === "string" && point.name.trim()
          ? point.name.trim()
          : `Điểm tập kết #${point.id}`;

      byId.set(point.id, {
        id: point.id,
        name: pointName,
        status: typeof point.status === "string" ? point.status : null,
        latitude: Number.isFinite(point.latitude) ? point.latitude : null,
        longitude: Number.isFinite(point.longitude) ? point.longitude : null,
      });
    }

    for (const option of assemblyPointMetadataOptions ?? []) {
      const parsedId = Number(option.key);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        continue;
      }

      const optionName =
        typeof option.value === "string" && option.value.trim()
          ? option.value.trim()
          : `Điểm tập kết #${parsedId}`;

      if (byId.has(parsedId)) {
        continue;
      }

      byId.set(parsedId, {
        id: parsedId,
        name: optionName,
        status: null,
        latitude: null,
        longitude: null,
      });
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "vi"),
    );
  }, [assemblyPointsData?.items, assemblyPointMetadataOptions]);

  const assemblyPointOptionById = useMemo(
    () => new Map(assemblyPointOptions.map((point) => [point.id, point])),
    [assemblyPointOptions],
  );
  const availableAssemblyPointOptions = useMemo(
    () => assemblyPointOptions.filter((point) => point.status === "Available"),
    [assemblyPointOptions],
  );

  const nearbyRescueTeams = useMemo(() => {
    const sourceTeams = nearbyTeamsByClusterData ?? [];

    return [...sourceTeams].sort((a, b) => {
      const statusRankDiff =
        getRescueTeamOperationalRank(a.status) -
        getRescueTeamOperationalRank(b.status);
      if (statusRankDiff !== 0) {
        return statusRankDiff;
      }

      const distanceA = Number.isFinite(a.distanceKm)
        ? a.distanceKm
        : Number.POSITIVE_INFINITY;
      const distanceB = Number.isFinite(b.distanceKm)
        ? b.distanceKm
        : Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      return a.name.localeCompare(b.name, "vi");
    });
  }, [nearbyTeamsByClusterData]);

  const nearbyRescueTeamById = useMemo(
    () => new Map(nearbyRescueTeams.map((team) => [team.id, team])),
    [nearbyRescueTeams],
  );

  const updateEditActivitySuggestedTeam = useCallback(
    (activityId: string, team: RescueTeamByClusterEntity | null) => {
      clearEditActivityErrors();
      setEditActivities((previous) =>
        syncReturnActivitiesWithCollectors(
          previous.map((activity) => {
            if (activity._id !== activityId) {
              return activity;
            }

            if (editingMissionId) {
              return activity;
            }

            if (
              activity.activityType === "RETURN_SUPPLIES" ||
              isReturnAssemblyPointActivityType(activity.activityType)
            ) {
              return activity;
            }

            if (!team) {
              return {
                ...activity,
                suggestedTeam: null,
              };
            }

            return {
              ...activity,
              suggestedTeam: {
                teamId: team.id,
                teamName: team.name,
                teamType: team.teamType,
                assemblyPointName: team.assemblyPointName,
                reason: `Điều phối viên cập nhật từ danh sách đội gần cụm SOS (${formatDistanceKmLabel(team.distanceKm)}).`,
              },
            };
          }),
        ),
      );
    },
    [
      clearEditActivityErrors,
      editingMissionId,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleSelectNearbyTeamForActivity = useCallback(
    (activityId: string, value: string) => {
      if (editingMissionId) {
        toast.info(
          "Cập nhật nhiệm vụ đã tạo không cho phép đổi đội cứu hộ ở bước này.",
        );
        return;
      }

      const targetActivity = editActivities.find((a) => a._id === activityId);
      if (targetActivity?.activityType === "RETURN_SUPPLIES") {
        toast.info(
          "Bước Hoàn trả vật phẩm được tự động gán theo đội đã thu gom vật phẩm và không thể thay đổi thủ công.",
        );
        return;
      }

      if (isReturnAssemblyPointActivityType(targetActivity?.activityType)) {
        toast.info(
          "Bước quay về điểm tập kết được tự động gán theo đội thực thi trước đó và không thể thay đổi thủ công.",
        );
        return;
      }

      if (value === CLEAR_ACTIVITY_TEAM_VALUE) {
        updateEditActivitySuggestedTeam(activityId, null);
        return;
      }

      const teamId = Number(value);
      if (!Number.isFinite(teamId)) {
        return;
      }

      const team = nearbyRescueTeamById.get(teamId);
      if (!team) {
        return;
      }

      updateEditActivitySuggestedTeam(activityId, team);
    },
    [
      editActivities,
      editingMissionId,
      nearbyRescueTeamById,
      updateEditActivitySuggestedTeam,
    ],
  );

  const updateEditActivityAssemblyPoint = useCallback(
    (activityId: string, selectedAssemblyPointId: string) => {
      if (editingMissionId) {
        const targetActivity = editActivities.find(
          (activity) => activity._id === activityId,
        );
        const isExistingMissionActivity = Boolean(
          targetActivity &&
          typeof targetActivity._missionActivityId === "number" &&
          targetActivity._missionActivityId > 0,
        );
        const canEditAssemblyPointForStatus = Boolean(
          targetActivity &&
          (!isExistingMissionActivity ||
            isPlannedMissionActivityStatus(targetActivity._missionStatus) ||
            (isOngoingMissionActivityStatus(targetActivity._missionStatus) &&
              isReturnAssemblyPointActivityType(targetActivity.activityType))),
        );

        if (targetActivity && !canEditAssemblyPointForStatus) {
          toast.info(
            "Chỉ có thể đổi điểm tập kết ở activity Planned hoặc bước quay về điểm tập kết đang OnGoing.",
          );
          return;
        }
      }

      const parsedAssemblyPointId = Number(selectedAssemblyPointId);
      if (
        !Number.isFinite(parsedAssemblyPointId) ||
        parsedAssemblyPointId <= 0
      ) {
        return;
      }

      const selectedAssemblyPoint = assemblyPointOptionById.get(
        parsedAssemblyPointId,
      );
      if (!selectedAssemblyPoint) {
        return;
      }

      if (selectedAssemblyPoint.status !== "Available") {
        toast.error(
          "Chỉ có thể chọn điểm tập kết đang ở trạng thái Sẵn sàng.",
        );
        return;
      }

      clearEditActivityErrors();
      setEditActivities((previous) =>
        syncReturnActivitiesWithCollectors(
          previous.map((activity) => {
            if (activity._id !== activityId) {
              return activity;
            }

            return {
              ...activity,
              assemblyPointId: selectedAssemblyPoint.id,
              assemblyPointName: selectedAssemblyPoint.name,
              assemblyPointLatitude: selectedAssemblyPoint.latitude,
              assemblyPointLongitude: selectedAssemblyPoint.longitude,
            };
          }),
        ),
      );
    },
    [
      assemblyPointOptionById,
      clearEditActivityErrors,
      editActivities,
      editingMissionId,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const getNearbyTeamsForActivity = useCallback(
    (activity: EditableActivity) => {
      const normalizedAssemblyPointName =
        typeof activity.assemblyPointName === "string"
          ? activity.assemblyPointName.trim().toLowerCase()
          : "";

      if (!normalizedAssemblyPointName) {
        return nearbyRescueTeams.slice(0, 8);
      }

      const sameAssemblyPointTeams: RescueTeamByClusterEntity[] = [];
      const otherTeams: RescueTeamByClusterEntity[] = [];

      for (const team of nearbyRescueTeams) {
        const normalizedTeamAssemblyPointName =
          typeof team.assemblyPointName === "string"
            ? team.assemblyPointName.trim().toLowerCase()
            : "";

        if (
          normalizedTeamAssemblyPointName &&
          normalizedTeamAssemblyPointName === normalizedAssemblyPointName
        ) {
          sameAssemblyPointTeams.push(team);
        } else {
          otherTeams.push(team);
        }
      }

      return [...sameAssemblyPointTeams, ...otherTeams].slice(0, 8);
    },
    [nearbyRescueTeams],
  );

  // ── Active tab: "plan" for AI plan view, "missions" for existing missions ──
  const [activeTab, setActiveTab] = useState<"plan" | "missions" | "sos_list">(
    defaultTab ?? "missions",
  );
  const [expandedMissionSupplyKeys, setExpandedMissionSupplyKeys] = useState<
    Record<string, boolean>
  >({});
  const [expandedMissionReportImageKeys, setExpandedMissionReportImageKeys] =
    useState<Record<string, boolean>>({});
  const [activeMissionReportImage, setActiveMissionReportImage] = useState<{
    src: string;
    step: number;
    activityLabel: string;
  } | null>(null);
  const [activeMissionTeamReport, setActiveMissionTeamReport] = useState<{
    mission: MissionEntity;
    team: MissionTeam;
  } | null>(null);

  useEffect(() => {
    if (open && defaultTab) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  const toggleMissionSupplyExpansion = useCallback(
    (missionId: number, activityId: number) => {
      const key = `${missionId}:${activityId}`;
      setExpandedMissionSupplyKeys((previous) => ({
        ...previous,
        [key]: !previous[key],
      }));
    },
    [],
  );

  const toggleMissionReportImageExpansion = useCallback(
    (missionId: number, activityId: number) => {
      const key = `${missionId}:report:${activityId}`;
      setExpandedMissionReportImageKeys((previous) => ({
        ...previous,
        [key]: !previous[key],
      }));
    },
    [],
  );

  const handleMissionReportImageViewerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setActiveMissionReportImage(null);
      }
    },
    [],
  );

  const handleMissionTeamReportOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveMissionTeamReport(null);
    }
  }, []);

  const handleOpenMissionTeamReport = useCallback(
    (mission: MissionEntity, team: MissionTeam) => {
      setActiveMissionTeamReport({ mission, team });
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      setExpandedMissionSupplyKeys({});
      setExpandedMissionReportImageKeys({});
      setActiveMissionReportImage(null);
      setPendingMixedSuggestion(null);
      setPendingMixedOverrideReason("");
      setSplitSuggestionPreview(null);
      setDismissAutoSplitSuggestion(false);
      setEditSourceSuggestionId(null);
      setMixedMissionOverride(null);
      setEditSuggestionContext(null);
    }
  }, [open]);

  // ── DnD state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [stepDragHandleId, setStepDragHandleId] = useState<string | null>(null);
  const [groupDragHandleId, setGroupDragHandleId] = useState<string | null>(
    null,
  );

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      dragPointerYRef.current = e.clientY;
      if (dragIdx === null || dragIdx === idx) return;
      setDragOverIdx(idx);
    },
    [dragIdx],
  );

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setDragOverIdx(null);
        dragPointerYRef.current = null;
        return;
      }
      clearEditActivityErrors();
      setEditActivities((prev) => {
        const next = [...prev];
        const [removed] = next.splice(dragIdx, 1);
        next.splice(idx, 0, removed);
        return syncReturnActivitiesWithCollectors(next);
      });
      setDragIdx(null);
      setDragOverIdx(null);
      dragPointerYRef.current = null;
    },
    [clearEditActivityErrors, dragIdx, syncReturnActivitiesWithCollectors],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
    setStepDragHandleId(null);
    dragPointerYRef.current = null;
  }, []);

  // Trigger stream when panel opens or re-analyze requested
  const handleStreamAnalyze = useCallback(() => {
    if (readOnly) return;
    if (!clusterId) return;
    aiStream.startStream(clusterId);
  }, [clusterId, aiStream, readOnly]);

  // Sync stream result → rescueSuggestion equivalent
  const streamResult = aiStream.result;

  // Use either the passed prop or the stream result
  const activeSuggestion = rescueSuggestion ?? streamResult;
  const activeSuggestionPreview = useMemo(
    () =>
      activeSuggestion
        ? buildSuggestionPreviewFromRescueSuggestion(
            activeSuggestion,
            rescueSuggestion ? "saved" : "stream",
          )
        : null,
    [activeSuggestion, rescueSuggestion],
  );
  const effectiveSplitSuggestionPreview =
    splitSuggestionPreview ??
    (open && preferSplitSuggestion && !dismissAutoSplitSuggestion && !isEditMode
      ? activeSuggestionPreview
      : null);
  const splitSuggestionDrafts = useMemo(
    () =>
      effectiveSplitSuggestionPreview
        ? buildSplitSuggestionPreviews(effectiveSplitSuggestionPreview)
        : [],
    [effectiveSplitSuggestionPreview],
  );

  const panelSOSRequests = useMemo(() => {
    const merged = new Map<string, SOSRequest>();

    for (const sos of clusterSOSRequests) {
      merged.set(String(sos.id), sos);
    }

    for (const activity of activeSuggestion?.suggestedActivities ?? []) {
      if (
        typeof activity.sosRequestId !== "number" ||
        !Number.isFinite(activity.sosRequestId) ||
        activity.sosRequestId <= 0
      ) {
        continue;
      }

      const sosId = String(activity.sosRequestId);
      if (!merged.has(sosId)) {
        merged.set(sosId, buildFallbackSOSRequest(sosId));
      }
    }

    return Array.from(merged.values());
  }, [clusterSOSRequests, activeSuggestion]);

  const panelSOSRequestById = useMemo(
    () => new Map(panelSOSRequests.map((sos) => [String(sos.id), sos])),
    [panelSOSRequests],
  );

  const editActivityGroups = useMemo(
    () => buildEditActivityGroups(editActivities, panelSOSRequestById),
    [editActivities, panelSOSRequestById],
  );

  const moveEditActivityGroup = useCallback(
    (groupId: string, dir: -1 | 1) => {
      clearEditActivityErrors();
      setEditActivities((previous) => {
        const groups = buildEditActivityGroups(previous, panelSOSRequestById);
        const sourceIndex = groups.findIndex((group) => group.id === groupId);
        const targetIndex = sourceIndex + dir;

        if (
          sourceIndex < 0 ||
          targetIndex < 0 ||
          targetIndex >= groups.length
        ) {
          return previous;
        }

        const sourceGroup = groups[sourceIndex];
        const targetGroup = groups[targetIndex];
        const sourceIndexes = sourceGroup.activities
          .map(({ index }) => index)
          .sort((a, b) => a - b);
        const sourceIndexSet = new Set(sourceIndexes);
        const movingActivities = sourceIndexes.map((index) => previous[index]);
        const next = previous.filter((_, index) => !sourceIndexSet.has(index));

        let insertIndex =
          dir === -1 ? targetGroup.startIndex : targetGroup.endIndex + 1;
        let removedBeforeInsert = 0;
        for (const index of sourceIndexes) {
          if (index < insertIndex) {
            removedBeforeInsert += 1;
          }
        }
        insertIndex -= removedBeforeInsert;
        next.splice(insertIndex, 0, ...movingActivities);
        return syncReturnActivitiesWithCollectors(next);
      });
    },
    [
      clearEditActivityErrors,
      panelSOSRequestById,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleGroupDragStart = useCallback((groupId: string) => {
    setDragGroupId(groupId);
  }, []);

  const handleGroupDragOver = useCallback(
    (event: React.DragEvent, groupId: string) => {
      event.preventDefault();
      dragPointerYRef.current = event.clientY;
      if (dragGroupId === null || dragGroupId === groupId) return;
      setDragOverGroupId(groupId);
    },
    [dragGroupId],
  );

  const handleGroupDrop = useCallback(
    (groupId: string) => {
      if (dragGroupId === null || dragGroupId === groupId) {
        setDragGroupId(null);
        setDragOverGroupId(null);
        dragPointerYRef.current = null;
        return;
      }

      clearEditActivityErrors();
      setEditActivities((previous) => {
        const groups = buildEditActivityGroups(previous, panelSOSRequestById);
        const sourceGroup = groups.find((group) => group.id === dragGroupId);
        const targetGroup = groups.find((group) => group.id === groupId);

        if (!sourceGroup || !targetGroup) {
          return previous;
        }

        const sourceIndexes = sourceGroup.activities
          .map(({ index }) => index)
          .sort((a, b) => a - b);
        const sourceIndexSet = new Set(sourceIndexes);
        const movingActivities = sourceIndexes.map((index) => previous[index]);
        const next = previous.filter((_, index) => !sourceIndexSet.has(index));

        let insertIndex = targetGroup.startIndex;
        let removedBeforeInsert = 0;
        for (const index of sourceIndexes) {
          if (index < insertIndex) {
            removedBeforeInsert += 1;
          }
        }
        insertIndex -= removedBeforeInsert;
        next.splice(insertIndex, 0, ...movingActivities);
        return syncReturnActivitiesWithCollectors(next);
      });
      setDragGroupId(null);
      setDragOverGroupId(null);
      dragPointerYRef.current = null;
    },
    [
      clearEditActivityErrors,
      dragGroupId,
      panelSOSRequestById,
      syncReturnActivitiesWithCollectors,
    ],
  );

  const handleGroupDragEnd = useCallback(() => {
    setDragGroupId(null);
    setDragOverGroupId(null);
    setGroupDragHandleId(null);
    dragPointerYRef.current = null;
  }, []);

  const armStepDragHandle = useCallback((activityId: string) => {
    setStepDragHandleId(activityId);
  }, []);

  const releaseStepDragHandle = useCallback(() => {
    setStepDragHandleId(null);
  }, []);

  const armGroupDragHandle = useCallback((groupId: string) => {
    setGroupDragHandleId(groupId);
  }, []);

  const releaseGroupDragHandle = useCallback(() => {
    setGroupDragHandleId(null);
  }, []);

  useEffect(() => {
    const root = mainScrollAreaRef.current;
    const viewport = root?.firstElementChild as HTMLDivElement | null;
    const isDraggingActivities = dragIdx !== null || dragGroupId !== null;

    if (!viewport || !isDraggingActivities) {
      dragPointerYRef.current = null;
      return;
    }

    let cancelled = false;
    const thresholdPx = 96;
    const maxScrollStep = 22;

    const tick = () => {
      if (cancelled) return;

      const pointerY = dragPointerYRef.current;
      if (pointerY != null) {
        const rect = viewport.getBoundingClientRect();
        let delta = 0;

        if (pointerY < rect.top + thresholdPx) {
          const intensity = (rect.top + thresholdPx - pointerY) / thresholdPx;
          delta = -Math.max(6, Math.round(intensity * maxScrollStep));
        } else if (pointerY > rect.bottom - thresholdPx) {
          const intensity =
            (pointerY - (rect.bottom - thresholdPx)) / thresholdPx;
          delta = Math.max(6, Math.round(intensity * maxScrollStep));
        }

        if (delta !== 0) {
          viewport.scrollTop += delta;
        }
      }

      dragAutoScrollFrameRef.current = requestAnimationFrame(tick);
    };

    dragAutoScrollFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (dragAutoScrollFrameRef.current != null) {
        cancelAnimationFrame(dragAutoScrollFrameRef.current);
        dragAutoScrollFrameRef.current = null;
      }
    };
  }, [dragIdx, dragGroupId]);

  const panelSOSCount =
    (activeSuggestion?.sosRequestCount ?? 0) > 0
      ? (activeSuggestion?.sosRequestCount ?? 0)
      : panelSOSRequests.length;

  useEffect(() => {
    if (readOnly) {
      setIsEditMode(false);
    }
  }, [readOnly]);

  const enterEditMode = useCallback(() => {
    if (!activeSuggestionPreview) {
      return;
    }

    // Prefer the properly-flattened saved suggestion (Validated group, refined
    // per-activity victim lists) over the raw SSE stream data when a matching
    // saved suggestion exists.
    if (activeSuggestionPreview.sourceSuggestionId != null) {
      const savedMatch = renderableSavedSuggestions.find(
        (s) =>
          s.sourceSuggestionId === activeSuggestionPreview.sourceSuggestionId,
      );
      if (savedMatch) {
        handleSuggestionEditRequest(savedMatch);
        return;
      }
    }

    handleSuggestionEditRequest(activeSuggestionPreview);
  }, [
    activeSuggestionPreview,
    handleSuggestionEditRequest,
    renderableSavedSuggestions,
  ]);

  // Enter edit from an existing mission (missions tab -> edit)
  const enterEditFromMission = useCallback(
    (mission: MissionEntity) => {
      if (readOnly) return;
      setEditActivityErrors({});
      setExpandedEditSupplyKeys({});
      const sortedActivities = [...mission.activities].sort((a, b) => {
        if (a.step !== b.step) {
          return a.step - b.step;
        }
        return a.id - b.id;
      });

      const missionTeamsByMissionTeamId = new Map(
        (mission.teams ?? []).map((team) => [team.missionTeamId, team]),
      );

      setEditActivities(
        syncReturnActivitiesWithCollectors(
          sortedActivities.map((a, i) => {
            const inferredSosRequestId = inferSOSRequestIdFromActivity(
              a,
              panelSOSRequests,
            );
            const isDepot = isDepotSupplyStep(a.activityType);
            const linkedMissionTeam =
              typeof a.missionTeamId === "number"
                ? missionTeamsByMissionTeamId.get(a.missionTeamId)
                : null;

            return {
              _id: `edit-m-${i}-${Date.now()}`,
              _missionActivityId: a.id,
              _missionStatus: a.status ?? null,
              step: a.step,
              activityType: a.activityType as ClusterActivityType,
              description: a.description,
              priority: "Medium",
              estimatedTime: normalizeEstimatedTimeInputValue(a.estimatedTime),
              sosRequestId: isDepot
                ? null
                : inferredSosRequestId
                  ? Number(inferredSosRequestId)
                  : null,
              depotId: isDepot ? (a.depotId ?? null) : null,
              depotName: isDepot ? (a.depotName ?? a.target ?? null) : null,
              depotAddress: isDepot ? (a.depotAddress ?? null) : null,
              assemblyPointId: a.assemblyPointId ?? null,
              assemblyPointName: a.assemblyPointName ?? null,
              assemblyPointLatitude: a.assemblyPointLatitude ?? null,
              assemblyPointLongitude: a.assemblyPointLongitude ?? null,
              targetVictimSummary: a.targetVictimSummary ?? null,
              targetVictims: Array.isArray(a.targetVictims)
                ? a.targetVictims
                : [],
              suppliesToCollect: a.suppliesToCollect,
              suggestedTeam: linkedMissionTeam
                ? {
                    teamId: linkedMissionTeam.rescueTeamId,
                    teamName: linkedMissionTeam.teamName,
                    teamType: linkedMissionTeam.teamType,
                    assemblyPointName: linkedMissionTeam.assemblyPointName,
                    latitude: linkedMissionTeam.latitude,
                    longitude: linkedMissionTeam.longitude,
                    reason: "Đồng bộ từ nhiệm vụ hiện tại.",
                  }
                : null,
            };
          }),
        ),
      );
      setEditMissionType(normalizeEditMissionType(mission.missionType));
      setEditPriorityScore(mission.priorityScore);
      setEditStartTime(
        formatDateTimeLocalInputValue(new Date(mission.startTime)),
      );
      setEditExpectedEndTime(
        formatDateTimeLocalInputValue(new Date(mission.expectedEndTime)),
      );
      setEditSourceSuggestionId(mission.aiSuggestionId ?? null);
      setMixedMissionOverride(null);
      setPendingMixedOverrideReason("");
      setEditSuggestionContext(null);
      setEditingMissionId(mission.id);
      setActiveTab("plan");
      setIsEditMode(true);
    },
    [panelSOSRequests, readOnly, syncReturnActivitiesWithCollectors],
  );

  const hasSidebar = !!activeSuggestion;
  const [selectedShortageDepotId, setSelectedShortageDepotId] = useState<
    number | null
  >(null);
  const [pinnedAlternativeDepots, setPinnedAlternativeDepots] = useState<
    SidebarDepotEntry[]
  >([]);

  // Extract unique depots for inventory sidebar
  // In view mode: from activeSuggestion; in edit mode: from editActivities
  const sidebarDepots = useMemo<SidebarDepotEntry[]>(() => {
    const source = isEditMode
      ? editActivities
      : (activeSuggestion?.suggestedActivities ?? []);
    const map = new Map<number, SidebarDepotEntry>();
    for (const act of source) {
      if (act.depotId && !map.has(act.depotId)) {
        map.set(act.depotId, {
          depotId: act.depotId,
          depotName: act.depotName || `Kho #${act.depotId}`,
          depotAddress: act.depotAddress,
          kind: "primary",
        });
      }
    }

    if (!isEditMode) {
      for (const shortage of activeSuggestion?.supplyShortages ?? []) {
        if (
          shortage.selectedDepotId &&
          shortage.selectedDepotId > 0 &&
          !map.has(shortage.selectedDepotId)
        ) {
          map.set(shortage.selectedDepotId, {
            depotId: shortage.selectedDepotId,
            depotName:
              shortage.selectedDepotName || `Kho #${shortage.selectedDepotId}`,
            depotAddress: null,
            kind: "primary",
          });
        }
      }
    }

    return Array.from(map.values());
  }, [isEditMode, editActivities, activeSuggestion]);

  const preferredShortageDepotId = useMemo(
    () =>
      !isEditMode
        ? (activeSuggestion?.supplyShortages.find(
            (shortage) =>
              typeof shortage.selectedDepotId === "number" &&
              shortage.selectedDepotId > 0,
          )?.selectedDepotId ?? null)
        : null,
    [activeSuggestion, isEditMode],
  );

  const effectiveSelectedShortageDepotId =
    selectedShortageDepotId != null &&
    sidebarDepots.some((depot) => depot.depotId === selectedShortageDepotId)
      ? selectedShortageDepotId
      : (preferredShortageDepotId ?? sidebarDepots[0]?.depotId ?? null);

  const selectedShortageDepot = useMemo(
    () =>
      sidebarDepots.find(
        (depot) => depot.depotId === effectiveSelectedShortageDepotId,
      ) ??
      sidebarDepots[0] ??
      null,
    [sidebarDepots, effectiveSelectedShortageDepotId],
  );

  const {
    data: alternativeDepotsData,
    isLoading: isAlternativeDepotsLoading,
    isFetching: isAlternativeDepotsFetching,
    error: alternativeDepotsError,
  } = useAlternativeDepots(
    clusterId ?? 0,
    selectedShortageDepot?.depotId ?? 0,
    {
      enabled:
        open &&
        !!activeSuggestion &&
        !!clusterId &&
        (selectedShortageDepot?.depotId ?? 0) > 0,
    },
  );

  const alternativeDepotRecommendations = useMemo(
    () => alternativeDepotsData?.alternativeDepots ?? [],
    [alternativeDepotsData],
  );
  const hasAlternativeDepotShortage =
    (alternativeDepotsData?.totalMissingQuantity ?? 0) > 0;
  const hasRecordedSupplyShortages =
    (activeSuggestion?.supplyShortages?.length ?? 0) > 0;
  const shouldShowAlternativeDepotPanel =
    !!activeSuggestion &&
    !!selectedShortageDepot &&
    (isAlternativeDepotsLoading ||
      isAlternativeDepotsFetching ||
      !!alternativeDepotsError ||
      hasAlternativeDepotShortage ||
      hasRecordedSupplyShortages);

  const visibleSidebarDepots = useMemo<SidebarDepotEntry[]>(() => {
    const merged = new Map<number, SidebarDepotEntry>();

    for (const depot of sidebarDepots) {
      merged.set(depot.depotId, depot);
    }

    const activePinnedAlternativeDepots = hasAlternativeDepotShortage
      ? pinnedAlternativeDepots
      : [];

    for (const depot of activePinnedAlternativeDepots) {
      if (!merged.has(depot.depotId)) {
        merged.set(depot.depotId, depot);
      }
    }

    return Array.from(merged.values());
  }, [sidebarDepots, pinnedAlternativeDepots, hasAlternativeDepotShortage]);

  const showSidebar = hasSidebar || visibleSidebarDepots.length > 0;
  const useCompactMissionCards = showSidebar && splitPercent <= 48;

  useDepotInventoryRealtime({
    depotIds: visibleSidebarDepots.map((depot) => depot.depotId),
    missionId: editingMissionId,
    enabled: open && visibleSidebarDepots.length > 0,
  });

  const togglePinnedAlternativeDepot = useCallback(
    (depot: AlternativeDepot) => {
      setPinnedAlternativeDepots((previous) => {
        const exists = previous.some((item) => item.depotId === depot.depotId);
        if (exists) {
          return previous.filter((item) => item.depotId !== depot.depotId);
        }

        return [
          ...previous,
          {
            depotId: depot.depotId,
            depotName: depot.depotName || `Kho #${depot.depotId}`,
            depotAddress: depot.depotAddress || null,
            kind: "alternative",
            sourceReason: depot.reason,
          },
        ];
      });
    },
    [],
  );

  const sortedMissions = useMemo(() => {
    const source = (missionsData?.missions ?? []).slice();
    return source.sort((a, b) => {
      const aAssigned = getActiveMissionTeams(a).length > 0 ? 1 : 0;
      const bAssigned = getActiveMissionTeams(b).length > 0 ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [missionsData?.missions]);

  const missionRealtimeMissionIds = useMemo(
    () => sortedMissions.map((mission) => mission.id),
    [sortedMissions],
  );

  const handleRealtimeActivityStatusUpdated = useCallback(
    ({
      missionId,
      activityId,
      status,
    }: {
      missionId: number;
      activityId: number;
      status: string;
    }) => {
      if (editingMissionId !== missionId) {
        return;
      }

      setEditActivities((previous) => {
        let changed = false;
        const next = previous.map((activity) => {
          if (
            activity._missionActivityId !== activityId ||
            activity._missionStatus === status
          ) {
            return activity;
          }

          changed = true;
          return {
            ...activity,
            _missionStatus: status,
          };
        });

        return changed ? next : previous;
      });
    },
    [editingMissionId],
  );

  useMissionRealtime({
    clusterId,
    missionIds: missionRealtimeMissionIds,
    enabled: open && !!clusterId,
    onActivityStatusUpdated: handleRealtimeActivityStatusUpdated,
  });

  const assignedMissionCount = useMemo(
    () =>
      sortedMissions.filter(
        (mission) => getActiveMissionTeams(mission).length > 0,
      ).length,
    [sortedMissions],
  );

  const severity = activeSuggestion
    ? severityConfig[
        (activeSuggestion.suggestedSeverityLevel as keyof typeof severityConfig) ??
          "Medium"
      ] || severityConfig["Medium"]
    : null;

  // Group activities by SOS request or depot
  type ActivityGroup = {
    type: "sos" | "depot";
    sosRequestId?: number | null;
    depotId?: number | null;
    depotName?: string | null;
    depotAddress?: string | null;
    activities: ClusterSuggestedActivity[];
  };

  const activityGroups: ActivityGroup[] = useMemo(() => {
    const sourceActivities = activeSuggestion
      ? activeSuggestion.suggestedActivities
      : [];
    if (sourceActivities.length === 0) return [];

    const fallbackSosRequestId =
      panelSOSRequests.length > 0 ? Number(panelSOSRequests[0].id) : null;

    const groups: ActivityGroup[] = [];
    for (const act of sourceActivities) {
      const isDepot = isDepotSupplyStep(act.activityType) && act.depotId;
      const resolvedSosRequestId = isDepot
        ? null
        : (act.sosRequestId ?? fallbackSosRequestId);
      const key = isDepot
        ? `depot-${act.depotId}`
        : `sos-${resolvedSosRequestId ?? "unknown"}`;
      const last = groups[groups.length - 1];
      const lastKey = last
        ? last.type === "depot"
          ? `depot-${last.depotId}`
          : `sos-${last.sosRequestId ?? "unknown"}`
        : null;
      if (lastKey === key) {
        last.activities.push(act);
      } else {
        groups.push({
          type: isDepot ? "depot" : "sos",
          sosRequestId: resolvedSosRequestId,
          depotId: act.depotId,
          depotName: act.depotName,
          depotAddress: act.depotAddress,
          activities: [act],
        });
      }
    }
    return groups;
  }, [activeSuggestion, panelSOSRequests]);

  const activeCoordinationEntries = useMemo(
    () =>
      buildCoordinationSummaryEntries(
        activeSuggestion?.suggestedActivities ?? [],
      ),
    [activeSuggestion?.suggestedActivities],
  );

  // Auto-collapse Quick Stats when user scrolls deep into the main plan content.
  useEffect(() => {
    if (!activeSuggestion) {
      setIsStatsCollapsed(false);
      return;
    }

    const root = mainScrollAreaRef.current;
    const viewport = root?.firstElementChild as HTMLDivElement | null;
    if (!viewport) return;

    const onScroll = () => {
      setIsStatsCollapsed(viewport.scrollTop > 120);
    };

    onScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [activeSuggestion, activeTab, isEditMode, open]);

  // Early returns AFTER all hooks
  if (!activeSuggestion && !clusterId) return null;

  const removeDialogTitle =
    pendingRemoval?.type === "activity"
      ? "Xác nhận xóa bước trong kế hoạch"
      : "Xác nhận xóa vật phẩm khỏi gợi ý AI";

  const removeDialogDescription =
    pendingRemoval?.type === "activity"
      ? pendingRemoval.hasSupplyItems
        ? `Bạn sắp xóa Bước ${pendingRemoval.displayStep} trong kế hoạch AI. Toàn bộ vật phẩm và nội dung thuộc bước này sẽ bị loại khỏi kế hoạch khi xác nhận nhiệm vụ.`
        : `Bạn sắp xóa Bước ${pendingRemoval.displayStep} trong kế hoạch AI. Bước này sẽ không còn trong nhiệm vụ khi bạn xác nhận.`
      : pendingRemoval?.type === "supply"
        ? `Bạn có chắc chắn muốn xóa vật phẩm \"${pendingRemoval.supplyName}\" khỏi gợi ý AI này không? vật phẩm này sẽ bị loại khỏi kế hoạch khi bạn xác nhận nhiệm vụ.`
        : "";

  const editSidebarSuggestion =
    isEditMode && !activeSuggestion ? editSuggestionContext : null;
  const editSidebarMixedWarning = trimToNull(
    editSidebarSuggestion?.mixedRescueReliefWarning,
  );
  const editSidebarErrorMessage = trimToNull(
    editSidebarSuggestion?.errorMessage,
  );
  const editSidebarLowConfidenceWarning = trimToNull(
    editSidebarSuggestion?.lowConfidenceWarning,
  );
  const editSidebarSpecialNotes = trimToNull(
    editSidebarSuggestion?.specialNotes,
  );
  const editSidebarSupplyShortages =
    editSidebarSuggestion?.supplyShortages ?? [];
  const hasEditSidebarWarnings =
    !!editSidebarSuggestion &&
    (editSidebarSuggestion.needsManualReview ||
      editSidebarErrorMessage != null ||
      editSidebarLowConfidenceWarning != null ||
      editSidebarSuggestion.multiDepotRecommended ||
      editSidebarMixedWarning != null ||
      editSidebarSuggestion.needsAdditionalDepot ||
      editSidebarSupplyShortages.length > 0);
  const hasEditSidebarContext =
    hasEditSidebarWarnings || editSidebarSpecialNotes != null;

  const editSuggestionSidebarSection = editSidebarSuggestion ? (
    <>
      {hasEditSidebarWarnings ? (
        <section className="space-y-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" weight="fill" />
            Cảnh báo hệ thống
          </h4>
          {editSidebarMixedWarning ? (
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-lg p-2.5">
              <FormattedAINotes
                text={editSidebarMixedWarning}
                textClassName="text-sm text-rose-800 dark:text-rose-300 leading-relaxed"
              />
            </div>
          ) : null}
          {editSidebarErrorMessage ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-2.5">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Lỗi AI
              </p>
              <p className="mt-0.5 text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed">
                {editSidebarErrorMessage}
              </p>
            </div>
          ) : null}
          {editSidebarSuggestion.needsManualReview ? (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                {editSidebarLowConfidenceWarning ||
                  "Kế hoạch cần kiểm tra thủ công trước khi phê duyệt."}
              </p>
            </div>
          ) : null}
          {!editSidebarSuggestion.needsManualReview &&
          editSidebarLowConfidenceWarning ? (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                {editSidebarLowConfidenceWarning}
              </p>
            </div>
          ) : null}
          {editSidebarSuggestion.multiDepotRecommended ? (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-2.5">
              <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                Kế hoạch đề xuất phối hợp nhiều kho để đáp ứng đủ vật phẩm.
              </p>
            </div>
          ) : null}
          {(editSidebarSuggestion.needsAdditionalDepot ||
            editSidebarSupplyShortages.length > 0) && (
            <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800/30 rounded-lg p-2.5">
              <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                Kho hiện tại chưa đủ vật phẩm.
              </p>
              {editSidebarSupplyShortages.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {editSidebarSupplyShortages.map((shortage, index) => (
                    <p
                      key={`edit-sidebar-shortage-${index}`}
                      className="text-sm text-sky-800/80 dark:text-sky-300/80"
                    >
                      {`${shortage.itemName} thiếu x${shortage.missingQuantity}${shortage.unit ? ` ${shortage.unit}` : ""}`}
                      {shortage.selectedDepotName
                        ? ` • Kho chính: ${shortage.selectedDepotName}`
                        : ""}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {hasEditSidebarWarnings && editSidebarSpecialNotes ? <Separator /> : null}

      {editSidebarSpecialNotes ? (
        <section className="space-y-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Warning className="h-3.5 w-3.5 text-orange-500" weight="fill" />
            Lưu ý đặc biệt
          </h4>
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5">
            <FormattedAINotes
              text={editSidebarSpecialNotes}
              textClassName="text-sm text-foreground/75 leading-relaxed"
            />
          </div>
        </section>
      ) : null}
    </>
  ) : null;

  const depotInventorySidebarSection =
    visibleSidebarDepots.length > 0 ? (
      <>
        {activeSuggestion || hasEditSidebarContext ? <Separator /> : null}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-x-2 mb-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <WarehouseIcon
                className="h-3.5 w-3.5 text-amber-500"
                weight="fill"
              />
              Kho vật phẩm
            </h4>
            <p className="text-xs text-muted-foreground">
              {isEditMode
                ? "Kéo vật phẩm vào bước thực hiện bên trái"
                : "Vào chế độ chỉnh sửa để kéo vật phẩm vào bước"}
            </p>
          </div>
          <div className="space-y-2">
            {visibleSidebarDepots.map((depot) => (
              <DepotInventoryCard
                key={depot.depotId}
                depotId={depot.depotId}
                depotName={depot.depotName}
                depotAddress={depot.depotAddress}
                isDraggable={isEditMode}
                kind={depot.kind}
              />
            ))}
          </div>
        </section>
      </>
    ) : null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-1100 transition-all duration-300 ease-out will-change-transform tracking-tighter [&_*]:tracking-tighter",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
    >
      <div className="h-full bg-background backdrop-blur-sm shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 p-3 pb-2 border-b shrink-0 bg-linear-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="ml-2 p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <Icon
                  icon="fluent-emoji-high-contrast:rescue-workers-helmet"
                  width="32"
                  height="32"
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tighter leading-tight">
                  {activeSuggestion
                    ? activeSuggestion.suggestedMissionTitle ||
                      `Kế hoạch cứu hộ — Cụm #${clusterId}`
                    : `Kế hoạch cứu hộ — Cụm #${clusterId}`}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  {activeSuggestion ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-sm px-1.5 py-0 h-5 gap-1"
                      >
                        <TreeStructure className="h-3 w-3" weight="fill" />
                        {panelSOSCount} SOS
                      </Badge>
                      <Badge
                        variant={severity!.variant}
                        className="text-sm px-1.5 py-0 h-5"
                      >
                        {severity!.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm px-1.5 py-0 h-5",
                          getMissionTypeBadgeClassName(
                            activeSuggestion.suggestedMissionType,
                          ),
                        )}
                      >
                        {formatMissionTypeLabel(
                          activeSuggestion.suggestedMissionType,
                        )}
                      </Badge>
                      {activeSuggestion.multiDepotRecommended && (
                        <Badge
                          variant="outline"
                          className="text-sm px-1.5 py-0 h-5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                        >
                          Nhiều kho
                        </Badge>
                      )}
                      {trimToNull(activeSuggestion.mixedRescueReliefWarning) ? (
                        <Badge
                          variant="outline"
                          className="text-sm px-1.5 py-0 h-5 border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300"
                        >
                          Cần tách mission
                        </Badge>
                      ) : null}
                      {activeSuggestion.needsAdditionalDepot ? (
                        <Badge
                          variant="outline"
                          className="text-sm px-1.5 py-0 h-5 border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300"
                        >
                          Thiếu vật phẩm
                        </Badge>
                      ) : null}
                      {activeSuggestion.needsManualReview && (
                        <Badge
                          variant="outline"
                          className="text-sm px-1.5 py-0 h-5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                        >
                          Cần duyệt tay
                        </Badge>
                      )}
                      {activeSuggestion.errorMessage ? (
                        <Badge
                          variant="outline"
                          className="text-sm px-1.5 py-0 h-5 border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                        >
                          Lỗi AI
                        </Badge>
                      ) : null}
                    </>
                  ) : aiStream.loading ? (
                    <Badge
                      variant="outline"
                      className="text-sm px-1.5 py-0 h-5 gap-1"
                    >
                      <CircleNotch className="h-3 w-3 animate-spin" />
                      {aiStream.status || "Đang phân tích..."}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-sm"
                  onClick={exitEditMode}
                >
                  <X className="h-3.5 w-3.5" />
                  Thoát chỉnh sửa
                </Button>
              )}
              {!readOnly ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-sm"
                  onClick={() => {
                    handleStreamAnalyze();
                  }}
                  disabled={isReAnalyzing || aiStream.loading || isEditMode}
                >
                  {isReAnalyzing || aiStream.loading ? (
                    <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowsClockwise className="h-3.5 w-3.5" />
                  )}
                  {isReAnalyzing || aiStream.loading
                    ? "Đang phân tích..."
                    : "Phân tích lại"}
                </Button>
              ) : null}
              <Badge
                variant="outline"
                className="text-sm gap-1 px-1.5 py-0 h-5"
              >
                <Lightning className="h-3 w-3" weight="fill" />
                {activeSuggestion?.modelName ?? "AI"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {activeSuggestion && (
            <div
              className={cn(
                "mt-2 transition-all duration-200",
                isStatsCollapsed
                  ? "grid grid-cols-2 gap-1"
                  : "grid grid-cols-2 lg:grid-cols-2 gap-1.5",
              )}
            >
              {[
                {
                  icon: Warning,
                  value: (activeSuggestion.suggestedPriorityScore ?? 0).toFixed(
                    1,
                  ),
                  label: "Ưu tiên",
                  color: "text-red-500",
                  bg: "bg-red-500/5 border-red-500/15",
                },
                {
                  icon: TreeStructure,
                  value:
                    activeSuggestion.sosRequestCount ?? panelSOSRequests.length,
                  label: "Yêu cầu SOS",
                  color: "text-blue-500",
                  bg: "bg-blue-500/5 border-blue-500/15",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-md border min-w-0",
                    isStatsCollapsed
                      ? "px-1.5 py-1 flex items-center justify-center gap-1.5"
                      : "px-2 py-1.5 flex items-center justify-between gap-2",
                    stat.bg,
                  )}
                  title={stat.label}
                >
                  <stat.icon
                    className={cn("h-3 w-3 shrink-0", stat.color)}
                    weight="fill"
                  />
                  <div
                    className={cn(
                      "text-sm font-bold leading-none shrink-0",
                      stat.color,
                    )}
                  >
                    {stat.value}
                  </div>
                  {!isStatsCollapsed && (
                    <div className="text-sm text-muted-foreground truncate">
                      {stat.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b shrink-0 px-4 bg-background">
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm tracking-tighter font-medium border-b-2 transition-colors",
              activeTab === "sos_list"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-black",
            )}
            onClick={() => setActiveTab("sos_list")}
          >
            <Info className="h-3.5 w-3.5 inline mr-1.5" weight="fill" />
            Thông tin SOS
            <Badge variant="secondary" className="text-sm h-5 px-1.5 ml-1.5">
              {panelSOSRequests.length}
            </Badge>
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm tracking-tighter font-medium border-b-2 transition-colors",
              activeTab === "plan"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-black",
            )}
            onClick={() => setActiveTab("plan")}
          >
            <Rocket className="h-3.5 w-3.5 inline mr-1.5" weight="fill" />
            Kế hoạch AI
            {aiStream.loading && (
              <CircleNotch className="h-3 w-3 inline ml-1.5 animate-spin" />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium tracking-tighter border-b-2 transition-colors",
              activeTab === "missions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-black",
            )}
            onClick={() => setActiveTab("missions")}
          >
            <ListChecks className="h-3.5 w-3.5 inline mr-1.5" weight="bold" />
            Nhiệm vụ đã tạo
            {missionsData?.missions && missionsData.missions.length > 0 && (
              <Badge variant="secondary" className="text-sm h-5 px-1.5 ml-1.5">
                {missionsData.missions.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Two-column content */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex">
          {/* LEFT COLUMN — Plan steps */}
          <div
            className="h-full overflow-hidden"
            style={{ width: showSidebar ? `${splitPercent}%` : "100%" }}
          >
            <ScrollArea ref={mainScrollAreaRef} className="h-full">
              <div className="p-4 space-y-4">
                {/* ═══ TAB: Missions ═══ */}
                {activeTab === "missions" && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <ListChecks className="h-3.5 w-3.5" weight="bold" />
                          Nhiệm vụ đã tạo cho cụm này
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-sm gap-1"
                        onClick={() => refetchMissions()}
                        disabled={isMissionsLoading}
                      >
                        <ArrowsClockwise className="h-3 w-3" />
                        Làm mới
                      </Button>
                    </div>
                    {isMissionsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton
                            key={i}
                            className="h-20 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    ) : sortedMissions.length > 0 ? (
                      <div className="space-y-3">
                        {sortedMissions.map((mission) => {
                          const activeMissionTeams =
                            getActiveMissionTeams(mission);
                          const hasAssignedTeams =
                            activeMissionTeams.length > 0;

                          const editableActivitiesCount =
                            mission.activities?.filter(
                              (activity) =>
                                isPlannedMissionActivityStatus(
                                  activity.status,
                                ) ||
                                (isOngoingMissionActivityStatus(
                                  activity.status,
                                ) &&
                                  isReturnAssemblyPointActivityType(
                                    activity.activityType,
                                  )),
                            ).length ?? 0;

                          return (
                            <Card
                              key={mission.id}
                              className={cn(
                                "overflow-hidden border-2 py-0",
                                hasAssignedTeams
                                  ? "border-emerald-300/70 dark:border-emerald-700/60"
                                  : "border-amber-300/70 dark:border-amber-700/60",
                              )}
                            >
                              <CardContent className="p-3 space-y-2">
                                {(() => {
                                  const missionStatus = getMissionStatusMeta(
                                    mission.status,
                                  );

                                  return (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Rocket
                                          className="h-4 w-4 text-emerald-500 shrink-0"
                                          weight="fill"
                                        />
                                        <span
                                          className="text-xl tracking-tighter font-bold leading-none"
                                          style={{ fontSize: "1.1rem" }}
                                        >
                                          {mission.suggestedMissionTitle ||
                                            `Nhiệm vụ số ${mission.id}`}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-sm h-6 px-2 shrink-0 font-semibold",
                                            getMissionTypeBadgeClassName(
                                              mission.missionType,
                                            ),
                                          )}
                                        >
                                          {formatMissionTypeLabel(
                                            mission.missionType,
                                          )}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {!readOnly ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-sm gap-1 px-2.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                            onClick={() => {
                                              if (
                                                editableActivitiesCount === 0
                                              ) {
                                                toast.info(
                                                  "Nhiệm vụ này không còn activity đủ điều kiện cập nhật.",
                                                );
                                                return;
                                              }

                                              enterEditFromMission(mission);
                                            }}
                                          >
                                            <PencilSimpleLine className="h-3.5 w-3.5" />
                                            Chỉnh sửa
                                          </Button>
                                        ) : null}
                                        <span
                                          className={cn(
                                            "text-sm font-semibold tracking-tighter",
                                            missionStatus.className
                                              .split(" ")
                                              .filter(
                                                (c) =>
                                                  c.startsWith("text-") ||
                                                  c.startsWith("dark:text-"),
                                              )
                                              .join(" "),
                                          )}
                                        >
                                          {missionStatus.label}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div
                                  className={cn(
                                    "rounded-lg border px-2.5 py-2",
                                    hasAssignedTeams
                                      ? "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-900/15"
                                      : "border-amber-200/80 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-900/15",
                                  )}
                                >
                                  {hasAssignedTeams && (
                                    <>
                                      <p className="text-sm tracking-tighter text-foreground/75 mt-1 line-clamp-2">
                                        {activeMissionTeams
                                          .map(
                                            (team) =>
                                              team.teamName ||
                                              `Đội #${team.rescueTeamId}`,
                                          )
                                          .join(" • ")}
                                      </p>
                                    </>
                                  )}
                                </div>

                                {/* AI assessment */}
                                {mission.overallAssessment && (
                                  <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                                    <p className="text-sm tracking-tighter text-foreground/80 leading-relaxed line-clamp-3">
                                      {mission.overallAssessment}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-0.5 text-sm font-semibold tracking-tighter text-foreground/80">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {formatMissionTimeRangeLabel(
                                      mission.startTime,
                                      mission.expectedEndTime,
                                    )}
                                  </span>
                                  {mission.estimatedDuration && (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-0.5 text-sm font-semibold tracking-tighter text-foreground/80">
                                      <ClockCounterClockwise className="h-3 w-3 shrink-0" />
                                      {mission.estimatedDuration}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-sm font-bold tracking-tighter text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-900/20 dark:text-indigo-300">
                                    Ưu tiên: {mission.priorityScore.toFixed(1)}
                                  </span>
                                  {mission.suggestedSeverityLevel &&
                                    (() => {
                                      const svCfg =
                                        severityConfig[
                                          mission.suggestedSeverityLevel as keyof typeof severityConfig
                                        ];
                                      const svVariant = svCfg?.variant;
                                      const svLabel =
                                        svCfg?.label ??
                                        mission.suggestedSeverityLevel;
                                      const svClass =
                                        svVariant === "p1"
                                          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300"
                                          : svVariant === "p2"
                                            ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700/50 dark:bg-orange-900/20 dark:text-orange-300"
                                            : svVariant === "p3"
                                              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                                              : "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/20 dark:text-slate-300";
                                      return (
                                        <span
                                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm font-semibold tracking-tighter ${svClass}`}
                                        >
                                          Mức độ: {svLabel}
                                        </span>
                                      );
                                    })()}
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-sm font-bold tracking-tighter text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    {mission.activityCount} bước
                                  </span>
                                  {mission.modelName && (
                                    <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-0.5 text-sm font-semibold tracking-tighter text-foreground/80">
                                      <Lightning
                                        className="h-3 w-3 shrink-0"
                                        weight="fill"
                                      />
                                      {mission.modelName}
                                    </span>
                                  )}
                                  {mission.aiConfidenceScore != null && (
                                    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/60 px-2 py-0.5 text-sm font-semibold tracking-tighter text-foreground/80">
                                      Tin cậy:{" "}
                                      {(
                                        mission.aiConfidenceScore * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  )}
                                </div>

                                {/* Suggested Resources */}
                                {mission.suggestedResources &&
                                  mission.suggestedResources.length > 0 && (
                                    <div className="mt-1">
                                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Cube
                                          className="h-3 w-3"
                                          weight="bold"
                                        />
                                        Tài nguyên cần thiết
                                      </p>
                                      <div className="space-y-1">
                                        {mission.suggestedResources.map(
                                          (resource, rIdx) => {
                                            const icon = resourceTypeIcons[
                                              resource.resourceType
                                            ] || (
                                              <Package className="h-3.5 w-3.5" />
                                            );
                                            return (
                                              <div
                                                key={rIdx}
                                                className="flex items-center gap-2 p-1.5 rounded border bg-background"
                                              >
                                                <div className="p-1 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                                  {icon}
                                                </div>
                                                <span className="text-sm font-medium truncate flex-1 min-w-0">
                                                  {resource.description}
                                                </span>
                                                <span className="text-sm font-bold text-primary shrink-0">
                                                  x{resource.quantity}
                                                </span>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Special Notes */}
                                {mission.specialNotes && (
                                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2">
                                    <p className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-0.5 flex items-center gap-1">
                                      <Warning
                                        className="h-3 w-3"
                                        weight="fill"
                                      />
                                      Lưu ý
                                    </p>
                                    <FormattedAINotes
                                      text={mission.specialNotes}
                                      textClassName="text-sm text-foreground/75 leading-relaxed"
                                    />
                                  </div>
                                )}

                                {/* Activities Grouped */}
                                {mission.activities.length > 0 && (
                                  <div className="space-y-4 mt-4">
                                    {(() => {
                                      const groups = [];
                                      const sortedActivities = [
                                        ...mission.activities,
                                      ].sort((a, b) => {
                                        if (a.step !== b.step) {
                                          return a.step - b.step;
                                        }
                                        return a.id - b.id;
                                      });

                                      for (const act of sortedActivities) {
                                        // Supply pickup/return steps belong to depot groups.
                                        // Delivery steps stay in SOS groups even if they contain depot info.
                                        const isDepot = isDepotSupplyStep(
                                          act.activityType,
                                        );
                                        let targetType = "sos";
                                        let sosRequestId = undefined;
                                        let depotName = undefined;
                                        const targetStr =
                                          act.depotName || act.target || "";

                                        if (isDepot) {
                                          depotName = targetStr;
                                          targetType = "depot";
                                        } else {
                                          sosRequestId =
                                            inferSOSRequestIdFromActivity(
                                              act,
                                              panelSOSRequests,
                                            ) ?? "unknown";
                                        }

                                        const key =
                                          targetType === "depot"
                                            ? `depot-${depotName}`
                                            : `sos-${sosRequestId}`;

                                        const last = groups[groups.length - 1];
                                        if (last && last.key === key) {
                                          last.activities.push(act);
                                        } else {
                                          groups.push({
                                            key,
                                            type: targetType,
                                            sosRequestId,
                                            depotName,
                                            activities: [act],
                                          });
                                        }
                                      }

                                      return groups.map((group, gIdx) => {
                                        const matchedSOS =
                                          group.type === "sos" &&
                                          group.sosRequestId
                                            ? panelSOSRequests.find(
                                                (s) =>
                                                  s.id ===
                                                  String(group.sosRequestId),
                                              )
                                            : null;

                                        return (
                                          <div
                                            key={gIdx}
                                            className={cn(
                                              "rounded-xl border overflow-hidden shadow-sm",
                                              group.type === "depot"
                                                ? "border-amber-300/50 dark:border-amber-700/40"
                                                : group.type === "sos" &&
                                                    matchedSOS?.priority ===
                                                      "P1"
                                                  ? "border-red-300/50 dark:border-red-700/40"
                                                  : group.type === "sos" &&
                                                      matchedSOS?.priority ===
                                                        "P2"
                                                    ? "border-orange-300/50 dark:border-orange-700/40"
                                                    : "border-border",
                                            )}
                                          >
                                            <div
                                              className={cn(
                                                "flex items-center gap-2.5 px-3.5 py-2.5",
                                                group.type === "depot"
                                                  ? "bg-amber-50 dark:bg-amber-900/15"
                                                  : group.type === "sos" &&
                                                      matchedSOS?.priority ===
                                                        "P1"
                                                    ? "bg-red-50 dark:bg-red-900/15"
                                                    : group.type === "sos" &&
                                                        matchedSOS?.priority ===
                                                          "P2"
                                                      ? "bg-orange-50 dark:bg-orange-900/15"
                                                      : "bg-muted/40",
                                              )}
                                            >
                                              {group.type === "depot" ? (
                                                <>
                                                  <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300 ring-1 ring-amber-400/40">
                                                    <WarehouseIcon
                                                      className="h-5 w-5"
                                                      weight="fill"
                                                    />
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                    <p className="text-xl font-bold text-amber-900 dark:text-amber-200 tracking-tighter">
                                                      Kho:{" "}
                                                      <span className="underline decoration-amber-400 decoration-2 underline-offset-2">
                                                        {group.depotName}
                                                      </span>
                                                    </p>
                                                  </div>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-sm h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
                                                  >
                                                    {group.activities.length}{" "}
                                                    bước
                                                  </Badge>
                                                </>
                                              ) : group.type === "sos" &&
                                                matchedSOS ? (
                                                <SOSGroupHeader
                                                  matchedSOS={matchedSOS}
                                                  groupActivitiesLength={
                                                    group.activities.length
                                                  }
                                                />
                                              ) : (
                                                <>
                                                  <div className="p-1.5 rounded-lg bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                                    <ListChecks
                                                      className="h-4 w-4"
                                                      weight="fill"
                                                    />
                                                  </div>
                                                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex-1">
                                                    {group.type === "sos"
                                                      ? `SOS ${group.sosRequestId ?? "unknown"}`
                                                      : "Cụm nhiệm vụ"}
                                                  </p>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-sm h-5 px-1.5 shrink-0"
                                                  >
                                                    {group.activities.length}{" "}
                                                    bước
                                                  </Badge>
                                                </>
                                              )}
                                            </div>

                                            <div className="bg-card p-3">
                                              <div
                                                className={cn(
                                                  "grid gap-3",
                                                  useCompactMissionCards
                                                    ? "grid-cols-1"
                                                    : "lg:grid-cols-2 lg:auto-rows-fr",
                                                )}
                                              >
                                                {group.activities.map(
                                                  (activity) => {
                                                    const assignedMissionTeams =
                                                      (
                                                        mission.teams ?? []
                                                      ).filter((team) => {
                                                        const normalizedStatus =
                                                          (team.status ?? "")
                                                            .trim()
                                                            .toLowerCase();
                                                        return (
                                                          team.unassignedAt ==
                                                            null &&
                                                          (normalizedStatus ===
                                                            "assigned" ||
                                                            normalizedStatus ===
                                                              "inprogress" ||
                                                            normalizedStatus ===
                                                              "in_progress" ||
                                                            normalizedStatus ===
                                                              "in progress")
                                                        );
                                                      });
                                                    const teamsForStep =
                                                      typeof activity.missionTeamId ===
                                                      "number"
                                                        ? (
                                                            mission.teams ?? []
                                                          ).filter(
                                                            (team) =>
                                                              team.missionTeamId ===
                                                              activity.missionTeamId,
                                                          )
                                                        : assignedMissionTeams.length >
                                                            0
                                                          ? assignedMissionTeams
                                                          : (mission.teams ??
                                                            []);
                                                    const config =
                                                      activityTypeConfig[
                                                        activity.activityType
                                                      ] ||
                                                      activityTypeConfig[
                                                        "ASSESS"
                                                      ];
                                                    const cleanDescription =
                                                      activity.description
                                                        .replace(
                                                          /\b\d{1,2}\.\d+,\s*\d{1,2}\.\d+\b\s*(\([^\)]*\))?/g,
                                                          "",
                                                        )
                                                        .replace(/\s+/g, " ")
                                                        .replace(/\(\s*\)/g, "")
                                                        .replace(/: \./g, ":")
                                                        .trim();
                                                    const supplyItems =
                                                      getSupplyDisplayItems(
                                                        activity,
                                                      );
                                                    const supplyExpandKey = `${mission.id}:${activity.id}`;
                                                    const isSupplyExpanded =
                                                      Boolean(
                                                        expandedMissionSupplyKeys[
                                                          supplyExpandKey
                                                        ],
                                                      );
                                                    const reportImageExpandKey = `${mission.id}:report:${activity.id}`;
                                                    const isReportImageExpanded =
                                                      Boolean(
                                                        expandedMissionReportImageKeys[
                                                          reportImageExpandKey
                                                        ],
                                                      );
                                                    const displayDescription =
                                                      supplyItems.length > 0
                                                        ? stripSupplyDetailsFromDescription(
                                                            cleanDescription,
                                                          )
                                                        : cleanDescription;
                                                    const stepStatus =
                                                      getActivityStatusMeta(
                                                        activity.status,
                                                      );
                                                    const activityReportImageUrl =
                                                      normalizeActivityReportImageUrl(
                                                        activity.imageUrl,
                                                      );

                                                    return (
                                                      <div
                                                        key={activity.id}
                                                        className="flex h-full flex-col rounded-2xl border border-border/70 bg-linear-to-b from-background via-background to-muted/20 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                                                      >
                                                        <div className="flex h-full items-start gap-2.5">
                                                          <div
                                                            className={cn(
                                                              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-4xl text-base font-extrabold",
                                                              config.bgColor,
                                                              config.color,
                                                            )}
                                                          >
                                                            {activity.step}
                                                          </div>
                                                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                            <div
                                                              className={cn(
                                                                "flex items-start justify-between gap-3",
                                                                useCompactMissionCards &&
                                                                  "flex-col",
                                                              )}
                                                            >
                                                              <div className="min-w-0 space-y-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                  <span
                                                                    className="text-xl font-bold text-foreground"
                                                                    style={{
                                                                      fontSize:
                                                                        "1rem",
                                                                    }}
                                                                  >
                                                                    Bước{" "}
                                                                    {
                                                                      activity.step
                                                                    }
                                                                  </span>
                                                                  <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                      "h-6 border-transparent px-2 text-sm font-semibold",
                                                                      config.color,
                                                                      config.bgColor,
                                                                    )}
                                                                  >
                                                                    {
                                                                      config.label
                                                                    }
                                                                  </Badge>
                                                                  <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                      "flex h-6 items-center gap-1 border px-2 text-sm font-semibold",
                                                                      stepStatus.className,
                                                                    )}
                                                                  >
                                                                    {
                                                                      stepStatus.icon
                                                                    }
                                                                    {
                                                                      stepStatus.label
                                                                    }
                                                                  </Badge>
                                                                </div>
                                                                <p className="line-clamp-4 text-base font-medium text-foreground/80">
                                                                  {
                                                                    displayDescription
                                                                  }
                                                                </p>
                                                              </div>
                                                              {typeof activity.estimatedTime ===
                                                              "number" ? (
                                                                <div
                                                                  className={cn(
                                                                    "shrink-0 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-right shadow-sm",
                                                                    useCompactMissionCards &&
                                                                      "self-start",
                                                                  )}
                                                                >
                                                                  <p className="text-sm font-medium leading-tight text-muted-foreground">
                                                                    Thời gian dự
                                                                    kiến đến
                                                                  </p>
                                                                  <p className="text-base font-semibold text-foreground">
                                                                    {
                                                                      activity.estimatedTime
                                                                    }{" "}
                                                                    phút
                                                                  </p>
                                                                </div>
                                                              ) : null}
                                                            </div>

                                                            {(activity.assemblyPointName ||
                                                              (activity.assemblyPointLatitude !=
                                                                null &&
                                                                activity.assemblyPointLongitude !=
                                                                  null)) && (
                                                              <div className="mt-2 p-2 rounded-md border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/15">
                                                                <p className="text-sm font-semibold uppercase tracking-tight text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                                                  <MapPin
                                                                    className="h-3 w-3"
                                                                    weight="fill"
                                                                  />
                                                                  Điểm tập kết
                                                                  hoạt động
                                                                </p>
                                                                {activity.assemblyPointName && (
                                                                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                                                    {
                                                                      activity.assemblyPointName
                                                                    }
                                                                  </p>
                                                                )}
                                                                {formatCoordinateLabel(
                                                                  activity.assemblyPointLatitude,
                                                                  activity.assemblyPointLongitude,
                                                                ) && (
                                                                  <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                                                                    Tọa độ:{" "}
                                                                    {formatCoordinateLabel(
                                                                      activity.assemblyPointLatitude,
                                                                      activity.assemblyPointLongitude,
                                                                    )}
                                                                  </p>
                                                                )}
                                                              </div>
                                                            )}

                                                            {teamsForStep.length >
                                                              0 && (
                                                              <div className="mt-2 p-2 rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-emerald-50/60 dark:bg-emerald-900/15">
                                                                <p className="text-sm font-semibold uppercase tracking-tight text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                                                                  <ShieldCheck
                                                                    className="h-3 w-3"
                                                                    weight="fill"
                                                                  />
                                                                  Đội phụ trách
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                  {teamsForStep.map(
                                                                    (team) => {
                                                                      return (
                                                                        <div
                                                                          key={
                                                                            team.missionTeamId
                                                                          }
                                                                          className="rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-background/80 px-2 py-1.5"
                                                                        >
                                                                          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                                                            {team.teamName ||
                                                                              `Đội #${team.rescueTeamId}`}
                                                                          </p>
                                                                          {team.assemblyPointName && (
                                                                            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                                                              Điểm
                                                                              tập
                                                                              kết:{" "}
                                                                              {
                                                                                team.assemblyPointName
                                                                              }
                                                                            </p>
                                                                          )}
                                                                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                            {team.teamCode && (
                                                                              <Badge
                                                                                variant="outline"
                                                                                className="h-5 px-1.5 text-sm border-emerald-300/70 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200"
                                                                              >
                                                                                {
                                                                                  team.teamCode
                                                                                }
                                                                              </Badge>
                                                                            )}
                                                                            {team.teamType && (
                                                                              <span className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                                                                                Loại:{" "}
                                                                                {formatTeamTypeLabel(
                                                                                  team.teamType,
                                                                                )}
                                                                              </span>
                                                                            )}
                                                                            {typeof team.memberCount ===
                                                                              "number" && (
                                                                              <Badge
                                                                                variant="outline"
                                                                                className="h-5 px-1.5 text-sm"
                                                                              >
                                                                                {
                                                                                  team.memberCount
                                                                                }{" "}
                                                                                thành
                                                                                viên
                                                                              </Badge>
                                                                            )}
                                                                          </div>
                                                                        </div>
                                                                      );
                                                                    },
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}
                                                            {supplyItems.length >
                                                              0 && (
                                                              <div className="mt-2.5 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                                <button
                                                                  type="button"
                                                                  className="flex w-full items-center justify-between gap-2 text-left"
                                                                  aria-expanded={
                                                                    isSupplyExpanded
                                                                  }
                                                                  onClick={() =>
                                                                    toggleMissionSupplyExpansion(
                                                                      mission.id,
                                                                      activity.id,
                                                                    )
                                                                  }
                                                                >
                                                                  <span className="text-sm font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400 flex items-center gap-1.5">
                                                                    <Package
                                                                      className="h-3 w-3"
                                                                      weight="fill"
                                                                    />
                                                                    {getSupplyStepTitle(
                                                                      activity.activityType,
                                                                    )}
                                                                  </span>
                                                                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-100/70 px-1.5 py-0.5 text-sm font-semibold text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    <span>
                                                                      {
                                                                        supplyItems.length
                                                                      }{" "}
                                                                      vật phẩm
                                                                    </span>
                                                                    {isSupplyExpanded ? (
                                                                      <CaretUp className="h-3 w-3" />
                                                                    ) : (
                                                                      <CaretDown className="h-3 w-3" />
                                                                    )}
                                                                  </span>
                                                                </button>

                                                                {isSupplyExpanded ? (
                                                                  <div className="mt-1.5 space-y-1">
                                                                    {supplyItems.map(
                                                                      (
                                                                        supply,
                                                                        sIdx,
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            sIdx
                                                                          }
                                                                          className="rounded border bg-background px-2 py-1.5 text-sm shadow-sm"
                                                                        >
                                                                          <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                              <Package className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                                              <span className="truncate font-medium">
                                                                                {
                                                                                  supply.name
                                                                                }
                                                                              </span>
                                                                            </div>
                                                                            <div className="flex shrink-0 items-center gap-1">
                                                                              {supply.bufferRatioLabel ? (
                                                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                                                                  Dự
                                                                                  trù{" "}
                                                                                  {
                                                                                    supply.bufferRatioLabel
                                                                                  }
                                                                                </span>
                                                                              ) : null}
                                                                              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                                                                {supply.quantityLabel ||
                                                                                  "-"}
                                                                              </span>
                                                                            </div>
                                                                          </div>

                                                                          {(supply.pickedQuantityLabel ||
                                                                            supply.deliveredQuantityLabel) && (
                                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                              {supply.pickedQuantityLabel ? (
                                                                                <span className="inline-flex items-center rounded border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-sm font-semibold text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-300">
                                                                                  Đã
                                                                                  lấy:{" "}
                                                                                  {
                                                                                    supply.pickedQuantityLabel
                                                                                  }
                                                                                </span>
                                                                              ) : null}
                                                                              {supply.deliveredQuantityLabel ? (
                                                                                <span className="inline-flex items-center rounded border border-sky-300/70 bg-sky-50 px-1.5 py-0.5 text-sm font-semibold text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/25 dark:text-sky-300">
                                                                                  Đã
                                                                                  giao:{" "}
                                                                                  {
                                                                                    supply.deliveredQuantityLabel
                                                                                  }
                                                                                </span>
                                                                              ) : null}
                                                                            </div>
                                                                          )}

                                                                          {supply
                                                                            .lotRows
                                                                            .length >
                                                                          0 ? (
                                                                            <div className="mt-1 rounded-md border border-blue-200/70 bg-blue-50/50 px-2 py-1 dark:border-blue-800/50 dark:bg-blue-900/20">
                                                                              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                                                                {supply.lotSourceLabel ??
                                                                                  "Theo dõi lô"}
                                                                              </p>
                                                                              <div className="mt-0.5 space-y-0.5">
                                                                                {supply.lotRows.map(
                                                                                  (
                                                                                    lotRow,
                                                                                    lotIdx,
                                                                                  ) => (
                                                                                    <p
                                                                                      key={`${sIdx}-lot-${lotIdx}`}
                                                                                      className="text-sm leading-relaxed text-blue-800/85 dark:text-blue-200/85"
                                                                                    >
                                                                                      {
                                                                                        lotRow
                                                                                      }
                                                                                    </p>
                                                                                  ),
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                          ) : null}

                                                                          {supply
                                                                            .lotReferenceRows
                                                                            .length >
                                                                          0 ? (
                                                                            <div className="mt-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-1 dark:border-slate-700/60 dark:bg-slate-900/35">
                                                                              <p className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                                                                                {supply.lotReferenceLabel ??
                                                                                  "Kế hoạch tham chiếu"}
                                                                              </p>
                                                                              <div className="mt-0.5 space-y-0.5">
                                                                                {supply.lotReferenceRows.map(
                                                                                  (
                                                                                    lotRow,
                                                                                    lotIdx,
                                                                                  ) => (
                                                                                    <p
                                                                                      key={`${sIdx}-plan-${lotIdx}`}
                                                                                      className="text-sm leading-relaxed text-slate-700/90 dark:text-slate-200/90"
                                                                                    >
                                                                                      {
                                                                                        lotRow
                                                                                      }
                                                                                    </p>
                                                                                  ),
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                          ) : null}
                                                                        </div>
                                                                      ),
                                                                    )}
                                                                  </div>
                                                                ) : null}
                                                              </div>
                                                            )}

                                                            {activityReportImageUrl && (
                                                              <div className="mt-2.5 p-2.5 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                                <button
                                                                  type="button"
                                                                  className="flex w-full items-center justify-between gap-2 text-left"
                                                                  aria-expanded={
                                                                    isReportImageExpanded
                                                                  }
                                                                  onClick={() =>
                                                                    toggleMissionReportImageExpansion(
                                                                      mission.id,
                                                                      activity.id,
                                                                    )
                                                                  }
                                                                >
                                                                  <span className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                                    <Camera
                                                                      className="h-3.5 w-3.5"
                                                                      weight="fill"
                                                                    />
                                                                    Ảnh báo cáo
                                                                    từ cứu hộ
                                                                    viên
                                                                  </span>
                                                                  <Badge
                                                                    variant="outline"
                                                                    className="h-5 px-1.5 text-sm border-amber-200 bg-amber-100/70 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                                  >
                                                                    {isReportImageExpanded ? (
                                                                      <CaretUp className="h-3 w-3" />
                                                                    ) : (
                                                                      <CaretDown className="h-3 w-3" />
                                                                    )}
                                                                  </Badge>
                                                                </button>

                                                                {isReportImageExpanded && (
                                                                  <div className="mt-2.5">
                                                                    <div
                                                                      className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted cursor-zoom-in group"
                                                                      onClick={() =>
                                                                        setActiveMissionReportImage(
                                                                          {
                                                                            src: activityReportImageUrl,
                                                                            step: activity.step,
                                                                            activityLabel:
                                                                              config.label,
                                                                          },
                                                                        )
                                                                      }
                                                                    >
                                                                      <img
                                                                        src={
                                                                          activityReportImageUrl
                                                                        }
                                                                        alt={`Báo cáo bước ${activity.step}`}
                                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                      />
                                                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                        <UserFocus
                                                                          className="h-8 w-8 text-white drop-shadow-md"
                                                                          weight="fill"
                                                                        />
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  },
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                                {/* Consolidated route for entire mission */}
                                <MissionTeamRoutePreview
                                  mission={mission}
                                  sosRequests={panelSOSRequests}
                                />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                        <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground/60">
                          Chưa có nhiệm vụ nào được tạo cho cụm này
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* ═══ TAB: SOS List ═══ */}
                {activeTab === "sos_list" && (
                  <ScrollArea className="h-full">
                    <div className="px-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          Danh sách yêu cầu SOS trong cụm
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {panelSOSRequests.map((sos) => (
                          <SOSRequestDetailedCard key={sos.id} sos={sos} />
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                )}

                {/* ═══ TAB: Plan ═══ */}
                {activeTab === "plan" && (
                  <>
                    {isEditMode && (
                      <>
                        {/* Edit mode banner */}
                        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <PencilSimpleLine
                              className="h-4 w-4 text-amber-600"
                              weight="fill"
                            />
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                              {activeSuggestion
                                ? "Chế độ chỉnh sửa kế hoạch"
                                : "Tạo kế hoạch cứu hộ thủ công"}
                            </span>
                          </div>
                          <p className="text-sm text-amber-700/70 dark:text-amber-400/70">
                            {activeSuggestion ? (
                              <>
                                Chỉnh sửa các bước, sau đó nhấn &quot;Xác nhận
                                nhiệm vụ&quot; để tạo kế hoạch.
                              </>
                            ) : (
                              <>
                                Thêm các bước thực hiện, sau đó nhấn &quot;Xác
                                nhận nhiệm vụ&quot; để tạo kế hoạch.
                              </>
                            )}
                          </p>
                        </div>

                        {/* Mission config */}
                        <section className="rounded-xl border bg-card p-4 space-y-3">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Rocket className="h-3.5 w-3.5" weight="fill" />
                            Cấu hình nhiệm vụ
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                                Loại nhiệm vụ
                              </Label>
                              <Select
                                value={editMissionType}
                                onValueChange={(v) =>
                                  setEditMissionType(v as MissionType)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-1200">
                                  <SelectItem value="RESCUE">Cứu hộ</SelectItem>
                                  <SelectItem value="RELIEF">
                                    Cứu trợ
                                  </SelectItem>
                                  <SelectItem value="RESCUER">
                                    Cứu hộ viên
                                  </SelectItem>
                                  <SelectItem value="MIXED">
                                    Tổng hợp
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                                Bắt đầu
                              </Label>
                              <Input
                                type="datetime-local"
                                value={editStartTime}
                                onChange={(e) =>
                                  setEditStartTime(e.target.value)
                                }
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground uppercase tracking-wider">
                                Kết thúc dự kiến
                              </Label>
                              <Input
                                type="datetime-local"
                                value={editExpectedEndTime}
                                onChange={(e) =>
                                  setEditExpectedEndTime(e.target.value)
                                }
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                          </div>
                        </section>

                        <Separator />

                        {/* Editable activities */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <ListChecks
                                className="h-3.5 w-3.5"
                                weight="bold"
                              />
                              Các bước thực hiện
                            </h3>
                            <div className="flex items-center gap-2 relative">
                              <Badge
                                variant="secondary"
                                className="text-sm h-5 px-2"
                              >
                                {editActivities.length} bước
                              </Badge>
                              <div className="relative">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-sm gap-1 border-dashed bg-background/50 hover:bg-background shadow-xs transition-all"
                                  onClick={addEditActivity}
                                >
                                  <Plus className="h-3 w-3" weight="bold" />
                                  Thêm bước
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {editActivityGroups.map((group, groupIdx) => {
                              const groupHasError = group.activities.some(
                                ({ activity }) =>
                                  editActivityErrors[activity._id] != null,
                              );
                              const isGroupedExecution =
                                group.activities.length > 1;
                              const groupStepIndexes = group.activities
                                .map(({ index }) => index)
                                .sort((a, b) => a - b);
                              const groupHasSequentialSteps =
                                areIndexesSequential(groupStepIndexes);
                              const groupStepLabel =
                                group.activities.length === 1
                                  ? `Bước ${group.startIndex + 1}`
                                  : groupHasSequentialSteps
                                    ? `Bước ${group.startIndex + 1}-${group.endIndex + 1}`
                                    : `Bước ${groupStepIndexes.map((index) => index + 1).join(", ")}`;
                              return (
                                <div
                                  key={group.id}
                                  onDragOver={
                                    isGroupedExecution
                                      ? (event) =>
                                          handleGroupDragOver(event, group.id)
                                      : undefined
                                  }
                                  onDrop={
                                    isGroupedExecution
                                      ? () => handleGroupDrop(group.id)
                                      : undefined
                                  }
                                  onDragEnd={
                                    isGroupedExecution
                                      ? handleGroupDragEnd
                                      : undefined
                                  }
                                  className={cn(
                                    "isGroupedExecution"
                                      ? "overflow-hidden rounded-xl border-2 shadow-sm transition-all"
                                      : "space-y-3",
                                    isGroupedExecution &&
                                      (groupHasError
                                        ? "border-red-400 bg-red-50/20 dark:border-red-800 dark:bg-red-950/10"
                                        : group.matchedSOS?.priority === "P1"
                                          ? "border-violet-400 bg-violet-50/20 dark:border-violet-700 dark:bg-violet-950/10"
                                          : group.matchedSOS?.priority === "P2"
                                            ? "border-orange-400 bg-orange-50/30 dark:border-orange-800 dark:bg-orange-950/10"
                                            : group.matchedSOS?.priority ===
                                                "P3"
                                              ? "border-amber-400 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
                                              : "border-border bg-card"),
                                    dragOverGroupId === group.id &&
                                      dragGroupId !== group.id &&
                                      "ring-2 ring-primary/30 ring-offset-2",
                                  )}
                                >
                                  {isGroupedExecution ? (
                                    <div
                                      className={cn(
                                        "flex flex-wrap items-start gap-3 border-b px-3 py-3",
                                        groupHasError
                                          ? "border-red-200/70 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/10"
                                          : "bg-linear-to-r from-background via-background to-muted/40",
                                      )}
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2">
                                        <div
                                          draggable={
                                            groupDragHandleId === group.id
                                          }
                                          onPointerDown={() =>
                                            armGroupDragHandle(group.id)
                                          }
                                          onPointerUp={releaseGroupDragHandle}
                                          onPointerCancel={
                                            releaseGroupDragHandle
                                          }
                                          onDragStart={() =>
                                            handleGroupDragStart(group.id)
                                          }
                                          onDragEnd={handleGroupDragEnd}
                                          className={cn(
                                            "mt-0.5 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary/70 shadow-xs active:cursor-grabbing",
                                            dragGroupId === group.id &&
                                              "scale-95 opacity-60",
                                          )}
                                          title="Kéo để đổi vị trí cả cụm bước"
                                        >
                                          <DotsSixVertical
                                            className="h-6 w-6"
                                            weight="bold"
                                          />
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                              variant="outline"
                                              className="h-6 border-primary/20 bg-primary/5 px-2 text-sm font-semibold text-primary"
                                            >
                                              {groupStepLabel}
                                            </Badge>
                                            {group.sosRequestId != null ? (
                                              <Badge
                                                variant="outline"
                                                className="h-6 px-2 text-sm font-semibold"
                                              >
                                                SOS {group.sosRequestId}
                                              </Badge>
                                            ) : null}
                                            <Badge
                                              variant="secondary"
                                              className="h-6 px-2 text-sm font-semibold"
                                            >
                                              Cụm thao tác{" "}
                                              {group.activities.length} bước
                                            </Badge>
                                            {groupHasError ? (
                                              <Badge className="h-6 bg-red-100 px-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                                                Cần rà soát
                                              </Badge>
                                            ) : null}
                                          </div>

                                          <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground">
                                              {group.locationName ||
                                                "Cùng một điểm thực hiện"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              Có thể kéo nguyên cụm lên trên
                                              thay vì kéo từng bước.
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 rounded-full border bg-background/80 p-1 shadow-sm">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full"
                                          onClick={() =>
                                            moveEditActivityGroup(group.id, -1)
                                          }
                                          disabled={groupIdx === 0}
                                        >
                                          <CaretUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full"
                                          onClick={() =>
                                            moveEditActivityGroup(group.id, 1)
                                          }
                                          disabled={
                                            groupIdx ===
                                            editActivityGroups.length - 1
                                          }
                                        >
                                          <CaretDown className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : null}

                                  <div
                                    className={cn(
                                      "space-y-3",
                                      isGroupedExecution && "p-3",
                                    )}
                                  >
                                    {group.activities.map(
                                      ({ activity, index: idx }) => {
                                        const config =
                                          activityTypeConfig[
                                            activity.activityType
                                          ] || activityTypeConfig["ASSESS"];
                                        const activityError =
                                          editActivityErrors[activity._id] ??
                                          null;
                                        const hasActivityError =
                                          activityError != null;
                                        const isManual =
                                          activity._id.startsWith("edit-new-");
                                        const activityNearbyTeams =
                                          getNearbyTeamsForActivity(activity);
                                        const parsedSuggestedTeamId = Number(
                                          activity.suggestedTeam?.teamId,
                                        );
                                        const hasValidSuggestedTeamId =
                                          Number.isFinite(
                                            parsedSuggestedTeamId,
                                          ) && parsedSuggestedTeamId > 0;
                                        const selectedTeamValue =
                                          hasValidSuggestedTeamId
                                            ? String(parsedSuggestedTeamId)
                                            : "";
                                        const selectedTeamInNearbyOptions =
                                          hasValidSuggestedTeamId &&
                                          activityNearbyTeams.some(
                                            (team) =>
                                              team.id === parsedSuggestedTeamId,
                                          );
                                        const isReturnAssemblyPointActivity =
                                          isReturnAssemblyPointActivityType(
                                            activity.activityType,
                                          );
                                        const isExistingMissionActivity =
                                          Boolean(
                                            editingMissionId &&
                                            typeof activity._missionActivityId ===
                                              "number" &&
                                            activity._missionActivityId > 0,
                                          );
                                        const isPlannedMissionActivity =
                                          isExistingMissionActivity &&
                                          isPlannedMissionActivityStatus(
                                            activity._missionStatus,
                                          );
                                        const isOngoingMissionActivity =
                                          isExistingMissionActivity &&
                                          isOngoingMissionActivityStatus(
                                            activity._missionStatus,
                                          );
                                        const canUpdateReturnAssemblyPointWhenOngoing =
                                          isOngoingMissionActivity &&
                                          isReturnAssemblyPointActivity;
                                        const isLockedExistingMissionActivity =
                                          isExistingMissionActivity &&
                                          !isPlannedMissionActivity;
                                        const lockGeneralActivityEdits =
                                          isLockedExistingMissionActivity;
                                        const isTeamEditingLocked =
                                          Boolean(editingMissionId);
                                        const canEditReturnAssemblyPoint =
                                          isReturnAssemblyPointActivity &&
                                          (!editingMissionId ||
                                            !isExistingMissionActivity ||
                                            isPlannedMissionActivity ||
                                            canUpdateReturnAssemblyPointWhenOngoing);
                                        const parsedAssemblyPointId = Number(
                                          activity.assemblyPointId,
                                        );
                                        const hasValidAssemblyPointId =
                                          Number.isFinite(
                                            parsedAssemblyPointId,
                                          ) && parsedAssemblyPointId > 0;
                                        const selectedAssemblyPointValue =
                                          hasValidAssemblyPointId
                                            ? String(parsedAssemblyPointId)
                                            : "";
                                        const selectedAssemblyPointInOptions =
                                          hasValidAssemblyPointId &&
                                          assemblyPointOptionById.has(
                                            parsedAssemblyPointId,
                                          );
                                        const selectedAssemblyPointOption =
                                          hasValidAssemblyPointId
                                            ? assemblyPointOptionById.get(
                                                parsedAssemblyPointId,
                                              )
                                            : undefined;
                                        const selectedAssemblyPointStatus =
                                          selectedAssemblyPointOption?.status ??
                                          null;
                                        const selectedAssemblyPointStatusLabel =
                                          getAssemblyPointTargetStatusLabel(
                                            selectedAssemblyPointStatus,
                                          );
                                        const isSelectedAssemblyPointRestricted =
                                          selectedAssemblyPointStatus !==
                                            null &&
                                          selectedAssemblyPointStatus !==
                                            "Available";
                                        const selectedAssemblyPointLabel =
                                          hasValidAssemblyPointId
                                            ? (assemblyPointOptionById.get(
                                                parsedAssemblyPointId,
                                              )?.name ??
                                              activity.assemblyPointName ??
                                              `Điểm tập kết #${parsedAssemblyPointId}`)
                                            : null;
                                        const isReturnSuppliesActivity =
                                          activity.activityType ===
                                          "RETURN_SUPPLIES";
                                        const isCollectSuppliesActivity =
                                          activity.activityType ===
                                          "COLLECT_SUPPLIES";
                                        const isAutoManagedSupplyStep =
                                          isReturnSuppliesActivity;
                                        const isAutoManagedTeamStep =
                                          isReturnSuppliesActivity ||
                                          isReturnAssemblyPointActivity;
                                        const selectedTeamDisplayName =
                                          activity.suggestedTeam?.teamName ||
                                          (hasValidSuggestedTeamId
                                            ? `Đội #${parsedSuggestedTeamId}`
                                            : isReturnSuppliesActivity
                                              ? "Chưa xác định đội thu gom vật phẩm"
                                              : isReturnAssemblyPointActivity
                                                ? "Chưa xác định đội thực thi trước đó"
                                                : "Chưa chọn đội");
                                        const defaultSupplyExpanded = false;
                                        const isSupplyExpanded =
                                          expandedEditSupplyKeys[
                                            activity._id
                                          ] ?? defaultSupplyExpanded;
                                        const supplyBalanceIssues =
                                          editSupplyBalanceAnalysis
                                            .issuesByActivityId[activity._id] ??
                                          [];
                                        const hasSupplyBalanceIssues =
                                          supplyBalanceIssues.length > 0;
                                        const primarySupplyBalanceIssue =
                                          supplyBalanceIssues[0] ?? null;

                                        return (
                                          <div
                                            key={activity._id}
                                            className="relative group/step"
                                            data-edit-activity-id={activity._id}
                                            onDragOver={
                                              lockGeneralActivityEdits
                                                ? undefined
                                                : (event) =>
                                                    handleDragOver(event, idx)
                                            }
                                            onDrop={
                                              lockGeneralActivityEdits
                                                ? undefined
                                                : () => handleDrop(idx)
                                            }
                                            onDragEnd={handleDragEnd}
                                          >
                                            <div
                                              className={cn(
                                                "space-y-3 rounded-xl border-2 bg-card p-4 transition-all shadow-sm",
                                                hasActivityError
                                                  ? "border-red-400 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10"
                                                  : hasSupplyBalanceIssues
                                                    ? "border-amber-400 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
                                                    : "border-border bg-card",
                                                dragIdx === idx
                                                  ? "scale-[0.98] opacity-50"
                                                  : "hover:border-primary/30 hover:shadow-md",
                                                dragOverIdx === idx &&
                                                  dragIdx !== idx &&
                                                  "border-primary ring-2 ring-primary/20",
                                              )}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className={cn(
                                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-xs",
                                                    hasActivityError
                                                      ? "bg-red-500 text-white"
                                                      : [
                                                          config.bgColor,
                                                          config.color,
                                                        ],
                                                  )}
                                                >
                                                  {idx + 1}
                                                </div>
                                                <div
                                                  draggable={
                                                    !lockGeneralActivityEdits &&
                                                    stepDragHandleId ===
                                                      activity._id
                                                  }
                                                  onPointerDown={() => {
                                                    if (
                                                      lockGeneralActivityEdits
                                                    ) {
                                                      return;
                                                    }

                                                    armStepDragHandle(
                                                      activity._id,
                                                    );
                                                  }}
                                                  onPointerUp={
                                                    releaseStepDragHandle
                                                  }
                                                  onPointerCancel={
                                                    releaseStepDragHandle
                                                  }
                                                  onDragStart={() => {
                                                    if (
                                                      lockGeneralActivityEdits
                                                    ) {
                                                      return;
                                                    }

                                                    handleDragStart(idx);
                                                  }}
                                                  onDragEnd={handleDragEnd}
                                                  className={cn(
                                                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                                    lockGeneralActivityEdits
                                                      ? "cursor-not-allowed opacity-30"
                                                      : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
                                                  )}
                                                >
                                                  <DotsSixVertical
                                                    className="h-4 w-4"
                                                    weight="bold"
                                                  />
                                                </div>
                                                {isManual ? (
                                                  <Select
                                                    value={
                                                      activity.activityType
                                                    }
                                                    onValueChange={(value) =>
                                                      updateEditActivity(
                                                        activity._id,
                                                        "activityType",
                                                        value,
                                                      )
                                                    }
                                                    disabled={
                                                      lockGeneralActivityEdits
                                                    }
                                                  >
                                                    <SelectTrigger className="h-7 w-35 text-sm font-semibold">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-1200">
                                                      {Object.entries(
                                                        activityTypeConfig,
                                                      )
                                                        .filter(
                                                          ([key]) =>
                                                            key !==
                                                              "RETURN_TO_ASSEMBLY_POINT" &&
                                                            key !==
                                                              "RETURN_ASSEMBLY",
                                                        )
                                                        .map(([key, cfg]) => (
                                                          <SelectItem
                                                            key={key}
                                                            value={key}
                                                            className="text-sm"
                                                          >
                                                            {cfg.label}
                                                          </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  <Badge
                                                    variant="outline"
                                                    className={cn(
                                                      "h-6 border-transparent px-2 py-0 text-sm font-semibold",
                                                      hasActivityError
                                                        ? "border-red-200 bg-red-100 text-red-700 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-300"
                                                        : [
                                                            config.color,
                                                            config.bgColor,
                                                          ],
                                                    )}
                                                  >
                                                    {config.label}
                                                  </Badge>
                                                )}
                                                {activityError ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="h-6 border-red-200 bg-red-100 px-2 text-sm font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-300"
                                                  >
                                                    <Warning
                                                      className="mr-1 h-3.5 w-3.5"
                                                      weight="fill"
                                                    />
                                                    Lỗi
                                                  </Badge>
                                                ) : null}
                                                {!activityError &&
                                                hasSupplyBalanceIssues ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="h-6 border-amber-300 bg-amber-100 px-2 text-sm font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300"
                                                  >
                                                    <Warning
                                                      className="mr-1 h-3.5 w-3.5"
                                                      weight="fill"
                                                    />
                                                    Lệch vật phẩm
                                                  </Badge>
                                                ) : null}
                                                <div className="flex-1" />
                                                <div className="flex items-center gap-0.5">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() =>
                                                      moveEditActivity(idx, -1)
                                                    }
                                                    disabled={
                                                      idx === 0 ||
                                                      lockGeneralActivityEdits
                                                    }
                                                  >
                                                    <CaretUp className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() =>
                                                      moveEditActivity(idx, 1)
                                                    }
                                                    disabled={
                                                      idx ===
                                                        editActivities.length -
                                                          1 ||
                                                      lockGeneralActivityEdits
                                                    }
                                                  >
                                                    <CaretDown className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() =>
                                                      handleRemoveActivityWithConfirm(
                                                        activity,
                                                        idx + 1,
                                                      )
                                                    }
                                                    disabled={
                                                      lockGeneralActivityEdits
                                                    }
                                                  >
                                                    <Trash className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </div>

                                              {activityError ? (
                                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/60 dark:bg-red-950/20">
                                                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                                    {getEditActivityErrorLabel(
                                                      activityError.matchedBy,
                                                    )}
                                                  </p>
                                                  <p className="mt-1 text-sm leading-relaxed text-red-700/90 dark:text-red-300/90">
                                                    {activityError.message}
                                                  </p>
                                                </div>
                                              ) : null}

                                              {lockGeneralActivityEdits ? (
                                                <div className="rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-2 dark:border-amber-700/60 dark:bg-amber-950/20">
                                                  <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                                                    {isReturnAssemblyPointActivity
                                                      ? canUpdateReturnAssemblyPointWhenOngoing
                                                        ? "Bước đang OnGoing, chỉ cho phép cập nhật điểm tập kết quay về khi có sự cố tại điểm tập kết hiện tại."
                                                        : "Bước quay về điểm tập kết chỉ được cập nhật khi activity ở trạng thái Planned hoặc OnGoing."
                                                      : `Chỉ có thể cập nhật activity Planned. Bước này hiện ở trạng thái ${activity._missionStatus || "không xác định"}.`}
                                                  </p>
                                                </div>
                                              ) : null}

                                              <div className="bg-muted/10 dark:bg-muted/5 p-2.5 rounded-lg border border-border/20 space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                                                  Mô tả chi tiết
                                                </Label>
                                                {isManual ? (
                                                  <textarea
                                                    value={activity.description}
                                                    onChange={(event) =>
                                                      updateEditActivity(
                                                        activity._id,
                                                        "description",
                                                        event.target.value,
                                                      )
                                                    }
                                                    disabled={
                                                      lockGeneralActivityEdits
                                                    }
                                                    placeholder="Mô tả hoạt động..."
                                                    rows={2}
                                                    className={cn(
                                                      "mt-1 w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                      hasActivityError
                                                        ? "border-red-200 bg-red-50/40 dark:border-red-800/60 dark:bg-red-950/10"
                                                        : "border-input",
                                                    )}
                                                  />
                                                ) : (
                                                  <p
                                                    className={cn(
                                                      "mt-1 rounded-md border px-3 py-1.5 text-sm leading-relaxed",
                                                      hasActivityError
                                                        ? "border-red-200 bg-red-50 text-red-700/90 dark:border-red-800/60 dark:bg-red-950/15 dark:text-red-200"
                                                        : "border-transparent bg-muted/40 text-foreground/80",
                                                    )}
                                                  >
                                                    {activity.description}
                                                  </p>
                                                )}
                                              </div>

                                              <ActivityExecutionMeta
                                                activity={activity}
                                                className="mt-1"
                                              />
                                              <ActivityExecutionWarningBlock
                                                activity={activity}
                                                compact
                                              />
                                              <TargetVictimsBlock
                                                activity={activity}
                                                compact
                                              />
                                              <CoordinationNotesBlock
                                                activity={activity}
                                              />

                                              <div className="space-y-1">
                                                <Label className="block min-h-5 text-sm uppercase tracking-wider text-muted-foreground">
                                                  Thời gian ước tính
                                                </Label>
                                                <Input
                                                  value={activity.estimatedTime}
                                                  onChange={(event) =>
                                                    updateEditActivity(
                                                      activity._id,
                                                      "estimatedTime",
                                                      event.target.value,
                                                    )
                                                  }
                                                  disabled={
                                                    lockGeneralActivityEdits
                                                  }
                                                  placeholder="VD: 30 phút"
                                                  className="h-10 w-full text-sm"
                                                />
                                              </div>

                                              {canEditReturnAssemblyPoint ? (
                                                <div className="space-y-1 rounded-lg border border-sky-200/80 bg-sky-50/70 p-2.5 dark:border-sky-700/60 dark:bg-sky-900/20">
                                                  <Label className="block min-h-5 text-sm font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                                    Điểm tập kết quay về
                                                  </Label>
                                                  <Select
                                                    value={
                                                      selectedAssemblyPointValue ||
                                                      undefined
                                                    }
                                                    onValueChange={(value) =>
                                                      updateEditActivityAssemblyPoint(
                                                        activity._id,
                                                        value,
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="h-9 bg-white/90 text-sm dark:bg-sky-950/25">
                                                      <SelectValue
                                                        placeholder={
                                                          isAssemblyPointsLoading ||
                                                          isAssemblyPointMetadataLoading
                                                            ? "Đang tải điểm tập kết..."
                                                            : "Chọn điểm tập kết quay về"
                                                        }
                                                      />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-1200">
                                                      {hasValidAssemblyPointId &&
                                                      !selectedAssemblyPointInOptions ? (
                                                        <SelectItem
                                                          value={
                                                            selectedAssemblyPointValue
                                                          }
                                                          className="text-sm"
                                                          disabled
                                                        >
                                                          {
                                                            selectedAssemblyPointLabel
                                                          }{" "}
                                                          (đang chọn)
                                                        </SelectItem>
                                                      ) : null}

                                                      {hasValidAssemblyPointId &&
                                                      selectedAssemblyPointOption &&
                                                      selectedAssemblyPointStatus !==
                                                        "Available" ? (
                                                        <SelectItem
                                                          value={
                                                            selectedAssemblyPointValue
                                                          }
                                                          className="text-sm"
                                                          disabled
                                                        >
                                                          {
                                                            selectedAssemblyPointLabel
                                                          }{" "}
                                                          (
                                                          {
                                                            selectedAssemblyPointStatusLabel
                                                          }
                                                          )
                                                        </SelectItem>
                                                      ) : null}

                                                      {availableAssemblyPointOptions.length ===
                                                      0 ? (
                                                        <div className="px-2 py-2 text-sm text-muted-foreground">
                                                          Không có điểm tập kết
                                                          sẵn sàng
                                                        </div>
                                                      ) : null}

                                                      {availableAssemblyPointOptions.map(
                                                        (point) => (
                                                          <SelectItem
                                                            key={point.id}
                                                            value={String(
                                                              point.id,
                                                            )}
                                                            className="text-sm"
                                                          >
                                                            {point.name}
                                                          </SelectItem>
                                                        ),
                                                      )}
                                                    </SelectContent>
                                                  </Select>
                                                  {activity.assemblyPointName ? (
                                                    <p className="text-sm text-sky-700/80 dark:text-sky-300/80">
                                                      Hiện tại:{" "}
                                                      {
                                                        activity.assemblyPointName
                                                      }
                                                    </p>
                                                  ) : null}
                                                  {formatCoordinateLabel(
                                                    activity.assemblyPointLatitude,
                                                    activity.assemblyPointLongitude,
                                                  ) ? (
                                                    <p className="text-sm text-sky-700/70 dark:text-sky-300/70">
                                                      Tọa độ:{" "}
                                                      {formatCoordinateLabel(
                                                        activity.assemblyPointLatitude,
                                                        activity.assemblyPointLongitude,
                                                      )}
                                                    </p>
                                                  ) : null}
                                                  {isSelectedAssemblyPointRestricted ? (
                                                    <p className="rounded-md border border-red-300 bg-red-50 px-2.5 py-2 text-sm leading-relaxed text-red-700 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-300">
                                                      Cảnh báo: Điểm tập kết
                                                      đang ở trạng thái{" "}
                                                      {
                                                        selectedAssemblyPointStatusLabel
                                                      }
                                                      . Điều phối viên nên chọn
                                                      điểm tập kết khác hoặc
                                                      điều chỉnh đội quay về để
                                                      đảm bảo an toàn.
                                                    </p>
                                                  ) : null}
                                                  {canEditReturnAssemblyPoint ? (
                                                    <p className="text-sm leading-relaxed text-sky-700/80 dark:text-sky-300/80">
                                                      {canUpdateReturnAssemblyPointWhenOngoing
                                                        ? "Bước đang OnGoing nên chỉ cho phép đổi điểm tập kết quay về để xử lý sự cố tại điểm hiện tại."
                                                        : "Bạn có thể cập nhật điểm tập kết quay về cho bước này."}
                                                    </p>
                                                  ) : null}
                                                </div>
                                              ) : null}

                                              <div
                                                className={cn(
                                                  "rounded-lg border p-2.5",
                                                  hasActivityError
                                                    ? "border-red-200 bg-red-50/60 dark:border-red-800/60 dark:bg-red-950/15"
                                                    : "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-700/50 dark:bg-emerald-900/15",
                                                )}
                                              >
                                                <div className="mb-2">
                                                  <p
                                                    className={cn(
                                                      "text-sm font-bold uppercase tracking-wider",
                                                      hasActivityError
                                                        ? "text-red-700 dark:text-red-300"
                                                        : "text-emerald-700 dark:text-emerald-300",
                                                    )}
                                                  >
                                                    Điều phối đội cứu hộ
                                                  </p>
                                                </div>

                                                <div>
                                                  <Select
                                                    value={
                                                      selectedTeamValue ||
                                                      undefined
                                                    }
                                                    onValueChange={(value) =>
                                                      handleSelectNearbyTeamForActivity(
                                                        activity._id,
                                                        value,
                                                      )
                                                    }
                                                    disabled={
                                                      isAutoManagedTeamStep ||
                                                      isTeamEditingLocked
                                                    }
                                                  >
                                                    <SelectTrigger
                                                      className={cn(
                                                        "h-9 bg-white/90 text-sm dark:bg-emerald-950/25",
                                                        (isAutoManagedTeamStep ||
                                                          isTeamEditingLocked) &&
                                                          "cursor-not-allowed opacity-80",
                                                      )}
                                                    >
                                                      <SelectValue
                                                        placeholder={
                                                          isNearbyTeamsByClusterLoading
                                                            ? "Đang tải đội gần cụm SOS..."
                                                            : isAutoManagedTeamStep
                                                              ? "Đội được tự đồng bộ"
                                                              : isTeamEditingLocked
                                                                ? "Đội bị khóa khi cập nhật nhiệm vụ đã tạo"
                                                                : "Chọn đội cứu hộ"
                                                        }
                                                      />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-1200">
                                                      {hasValidSuggestedTeamId &&
                                                      !selectedTeamInNearbyOptions ? (
                                                        <SelectItem
                                                          value={
                                                            selectedTeamValue
                                                          }
                                                          className="text-sm"
                                                        >
                                                          {
                                                            selectedTeamDisplayName
                                                          }{" "}
                                                          (đang chọn)
                                                        </SelectItem>
                                                      ) : null}

                                                      {activityNearbyTeams.map(
                                                        (team) => (
                                                          <SelectItem
                                                            key={team.id}
                                                            value={String(
                                                              team.id,
                                                            )}
                                                            className="text-sm"
                                                          >
                                                            {team.name} •{" "}
                                                            {formatDistanceKmLabel(
                                                              team.distanceKm,
                                                            )}
                                                          </SelectItem>
                                                        ),
                                                      )}

                                                      {!isAutoManagedTeamStep &&
                                                      !isTeamEditingLocked ? (
                                                        <SelectItem
                                                          value={
                                                            CLEAR_ACTIVITY_TEAM_VALUE
                                                          }
                                                          className="text-sm text-rose-700"
                                                        >
                                                          Bỏ gán đội cho bước
                                                          này
                                                        </SelectItem>
                                                      ) : null}
                                                    </SelectContent>
                                                  </Select>
                                                </div>

                                                {isReturnSuppliesActivity ? (
                                                  <p className="mt-2 text-sm leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                                                    Bước Hoàn trả vật phẩm được
                                                    tự động gán cùng đội đã thu
                                                    gom vật phẩm và không thể
                                                    thay đổi thủ công.
                                                  </p>
                                                ) : null}

                                                {isReturnAssemblyPointActivity ? (
                                                  <p className="mt-2 text-sm leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                                                    Bước quay về điểm tập kết
                                                    được tự động gán cùng đội
                                                    thực thi trước đó và không
                                                    thể thay đổi thủ công.
                                                  </p>
                                                ) : null}

                                                {isTeamEditingLocked ? (
                                                  <p className="mt-2 text-sm leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                                                    Cập nhật nhiệm vụ đã tạo
                                                    không cho phép đổi đội cứu
                                                    hộ ở bước này.
                                                  </p>
                                                ) : null}
                                              </div>

                                              {isSupplyStep(
                                                activity.activityType,
                                              ) ? (
                                                <div
                                                  className="mt-1"
                                                  onDragOver={(event) => {
                                                    if (
                                                      isAutoManagedSupplyStep ||
                                                      lockGeneralActivityEdits
                                                    ) {
                                                      return;
                                                    }
                                                    if (
                                                      event.dataTransfer.types.includes(
                                                        "application/inventory-item",
                                                      )
                                                    ) {
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
                                                    if (
                                                      lockGeneralActivityEdits
                                                    ) {
                                                      toast.info(
                                                        "Chỉ có thể chỉnh sửa vật phẩm ở activity Planned.",
                                                      );
                                                      return;
                                                    }
                                                    if (
                                                      isAutoManagedSupplyStep
                                                    ) {
                                                      toast.info(
                                                        "Vật phẩm ở bước Hoàn trả được tự động đồng bộ từ bước Thu gom vật phẩm nên không thể kéo thả thủ công.",
                                                      );
                                                      return;
                                                    }
                                                    const data =
                                                      event.dataTransfer.getData(
                                                        "application/inventory-item",
                                                      );
                                                    if (data) {
                                                      try {
                                                        const item =
                                                          JSON.parse(data);
                                                        handleAddSupply(
                                                          activity._id,
                                                          item,
                                                        );
                                                      } catch {
                                                        // Ignore invalid drag payload.
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <div className="flex justify-end">
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-8 gap-1.5 px-2 text-sm text-muted-foreground"
                                                      onClick={() =>
                                                        toggleEditSupplyExpansion(
                                                          activity._id,
                                                          defaultSupplyExpanded,
                                                        )
                                                      }
                                                    >
                                                      <Package className="h-3.5 w-3.5" />
                                                      Vật phẩm
                                                      <CaretDown
                                                        className={cn(
                                                          "h-4 w-4 transition-transform",
                                                          isSupplyExpanded &&
                                                            "rotate-180",
                                                        )}
                                                      />
                                                    </Button>
                                                  </div>

                                                  {isSupplyExpanded ? (
                                                    <div
                                                      className={cn(
                                                        "rounded-xl border-2 border-dashed px-3 py-2 transition-colors",
                                                        hasActivityError
                                                          ? "border-red-200 bg-red-50/60 dark:border-red-800/60 dark:bg-red-950/15"
                                                          : hasSupplyBalanceIssues
                                                            ? "border-amber-300 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/15"
                                                            : "border-blue-200 bg-blue-50/30 dark:border-blue-800/40 dark:bg-blue-900/10",
                                                        isReturnSuppliesActivity &&
                                                          "border-blue-300/70 bg-blue-100/40 dark:bg-blue-900/15",
                                                      )}
                                                    >
                                                      {hasSupplyBalanceIssues &&
                                                      primarySupplyBalanceIssue ? (
                                                        <button
                                                          type="button"
                                                          className="mb-2 w-full rounded-lg border border-amber-300/80 bg-amber-100/80 px-3 py-2 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                                          onClick={() =>
                                                            handleQuickFixSupplyIssue(
                                                              primarySupplyBalanceIssue,
                                                            )
                                                          }
                                                        >
                                                          <p className="flex items-center gap-1.5 font-semibold">
                                                            <Warning
                                                              className="h-3.5 w-3.5 shrink-0"
                                                              weight="fill"
                                                            />
                                                            Cân đối vật phẩm
                                                            chưa khớp
                                                          </p>
                                                          <p className="mt-1 leading-relaxed">
                                                            {
                                                              primarySupplyBalanceIssue.message
                                                            }
                                                          </p>
                                                          {supplyBalanceIssues.length >
                                                          1 ? (
                                                            <p className="mt-1 text-sm opacity-80">
                                                              +
                                                              {supplyBalanceIssues.length -
                                                                1}{" "}
                                                              cảnh báo tương tự
                                                            </p>
                                                          ) : null}
                                                          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
                                                            <ArrowsClockwise
                                                              className="h-3.5 w-3.5"
                                                              weight="bold"
                                                            />
                                                            Tự sửa vật phẩm
                                                          </span>
                                                        </button>
                                                      ) : null}

                                                      {isReturnSuppliesActivity ? (
                                                        <p className="mb-1.5 text-sm leading-relaxed text-blue-700/80 dark:text-blue-300/80">
                                                          Bước hoàn trả sẽ tự
                                                          đồng bộ vật phẩm tái
                                                          sử dụng từ bước tiếp
                                                          nhận vật phẩm cùng kho
                                                          và cùng đội.
                                                        </p>
                                                      ) : null}

                                                      {isSupplyExpanded ? (
                                                        activity.suppliesToCollect &&
                                                        activity
                                                          .suppliesToCollect
                                                          .length > 0 ? (
                                                          <div className="space-y-1">
                                                            {activity.suppliesToCollect.map(
                                                              (
                                                                supply,
                                                                sIdx,
                                                              ) => {
                                                                const isReusable =
                                                                  isReusableSupplyCollection(
                                                                    supply,
                                                                  );
                                                                const showBufferInput =
                                                                  isCollectSuppliesActivity &&
                                                                  !isReusable;

                                                                const supplyDisplay =
                                                                  buildSupplyDisplayItem(
                                                                    activity.activityType,
                                                                    {
                                                                      ...supply,
                                                                      quantity:
                                                                        toFiniteNumber(
                                                                          supply.quantity,
                                                                        ) ?? 0,
                                                                      unit: normalizeSupplyUnit(
                                                                        supply.unit,
                                                                      ),
                                                                    },
                                                                  );

                                                                return (
                                                                  <div
                                                                    key={sIdx}
                                                                    className="space-y-1"
                                                                  >
                                                                    <div
                                                                      className={cn(
                                                                        showBufferInput
                                                                          ? "grid min-w-0 grid-cols-[minmax(0,1fr)_76px_64px_44px_24px] items-center gap-2 rounded border px-2 py-1 text-sm shadow-sm"
                                                                          : "grid min-w-0 grid-cols-[minmax(0,1fr)_64px_44px_24px] items-center gap-2 rounded border px-2 py-1 text-sm shadow-sm",
                                                                        hasActivityError
                                                                          ? "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/10"
                                                                          : "bg-background",
                                                                      )}
                                                                    >
                                                                      <div className="flex min-w-0 items-center gap-1.5">
                                                                        <Package
                                                                          className={cn(
                                                                            "h-3 w-3 shrink-0",
                                                                            hasActivityError
                                                                              ? "text-red-500"
                                                                              : "text-blue-500",
                                                                          )}
                                                                        />
                                                                        <span
                                                                          className={cn(
                                                                            "truncate font-medium",
                                                                            hasActivityError
                                                                              ? "text-red-700 dark:text-red-200"
                                                                              : "text-foreground",
                                                                          )}
                                                                          title={
                                                                            supplyDisplay.name ||
                                                                            "Vật phẩm chưa rõ tên"
                                                                          }
                                                                        >
                                                                          {supplyDisplay.name ||
                                                                            "Vật phẩm chưa rõ tên"}
                                                                        </span>
                                                                      </div>
                                                                      {showBufferInput ? (
                                                                        <div className="relative min-w-0">
                                                                          <Input
                                                                            type="number"
                                                                            min={
                                                                              0
                                                                            }
                                                                            max={
                                                                              100
                                                                            }
                                                                            step={
                                                                              1
                                                                            }
                                                                            value={getSupplyBufferPercentInputValue(
                                                                              supply.bufferRatio,
                                                                            )}
                                                                            onChange={(
                                                                              event,
                                                                            ) =>
                                                                              handleUpdateSupplyBufferRatio(
                                                                                activity._id,
                                                                                sIdx,
                                                                                parseFloat(
                                                                                  event
                                                                                    .target
                                                                                    .value,
                                                                                ),
                                                                              )
                                                                            }
                                                                            disabled={
                                                                              lockGeneralActivityEdits
                                                                            }
                                                                            title="Dự trù (%)"
                                                                            className="h-6 w-full pr-4 pl-1 text-center text-sm"
                                                                          />
                                                                          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                                            %
                                                                          </span>
                                                                        </div>
                                                                      ) : null}
                                                                      <Input
                                                                        type="number"
                                                                        min={0}
                                                                        value={
                                                                          Number.isNaN(
                                                                            supply.quantity,
                                                                          )
                                                                            ? ""
                                                                            : supply.quantity
                                                                        }
                                                                        onChange={(
                                                                          event,
                                                                        ) =>
                                                                          handleUpdateSupplyQuantity(
                                                                            activity._id,
                                                                            sIdx,
                                                                            parseInt(
                                                                              event
                                                                                .target
                                                                                .value,
                                                                            ),
                                                                          )
                                                                        }
                                                                        disabled={
                                                                          isAutoManagedSupplyStep ||
                                                                          lockGeneralActivityEdits
                                                                        }
                                                                        className="h-6 w-full px-1 text-center text-sm"
                                                                      />
                                                                      <span className="text-right text-sm text-muted-foreground">
                                                                        {normalizeSupplyUnit(
                                                                          supply.unit,
                                                                        )}
                                                                      </span>
                                                                      <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 text-muted-foreground hover:text-red-500"
                                                                        onClick={() =>
                                                                          handleRemoveSupplyWithConfirm(
                                                                            activity._id,
                                                                            sIdx,
                                                                            supplyDisplay.name,
                                                                          )
                                                                        }
                                                                        disabled={
                                                                          isAutoManagedSupplyStep ||
                                                                          lockGeneralActivityEdits
                                                                        }
                                                                      >
                                                                        <X className="h-3 w-3" />
                                                                      </Button>
                                                                    </div>
                                                                  </div>
                                                                );
                                                              },
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <p className="py-1 text-center text-sm text-muted-foreground/60">
                                                            {isAutoManagedSupplyStep
                                                              ? "Vật phẩm tái sử dụng sẽ tự đồng bộ từ bước tiếp nhận vật phẩm cùng kho và cùng đội."
                                                              : "Kéo vật phẩm từ kho bên phải vào đây"}
                                                          </p>
                                                        )
                                                      ) : null}
                                                    </div>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {editActivities.length === 0 && (
                            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                              <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground/60">
                                Chưa có bước nào
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 gap-1.5 text-sm"
                                onClick={addEditActivity}
                              >
                                <Plus className="h-3 w-3" weight="bold" />
                                Thêm bước đầu tiên
                              </Button>
                            </div>
                          )}
                        </section>

                        <Separator />
                      </>
                    )}

                    {/* === Live mode content === */}
                    {activeSuggestion && !isEditMode && (
                      <>
                        {splitSuggestionDrafts.length > 0 ? (
                          <>
                            <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-800/40 dark:bg-rose-900/10">
                              <div className="flex items-start gap-2">
                                <Warning
                                  className="mt-0.5 h-4 w-4 text-rose-600 dark:text-rose-400"
                                  weight="fill"
                                />
                                <div>
                                  <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                    Tách nhiệm vụ theo cảnh báo an toàn
                                  </h3>
                                  <div className="mt-1">
                                    <FormattedAINotes
                                      text={
                                        effectiveSplitSuggestionPreview?.mixedRescueReliefWarning ||
                                        "AI đang gộp cứu hộ/cấp cứu với cứu trợ vật phẩm. Hãy chọn draft phù hợp để tạo từng nhiệm vụ riêng."
                                      }
                                      textClassName="text-sm text-rose-700/85 dark:text-rose-300/85 leading-relaxed"
                                    />
                                    {effectiveSplitSuggestionPreview?.specialNotes && (
                                      <div className="mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-800/50">
                                        <FormattedAINotes
                                          text={
                                            effectiveSplitSuggestionPreview.specialNotes
                                          }
                                          textClassName="text-sm text-rose-700/85 dark:text-rose-300/85 leading-relaxed"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-3 xl:grid-cols-2">
                                {splitSuggestionDrafts.map((draft) => (
                                  <SuggestionCard
                                    key={draft.id}
                                    suggestion={draft}
                                    editable={!readOnly}
                                    actionLabel="Chỉnh sửa draft này"
                                    onEdit={() =>
                                      applySuggestionPreviewToEditForm(draft)
                                    }
                                  />
                                ))}
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-sm"
                                  onClick={() => {
                                    setSplitSuggestionPreview(null);
                                    setDismissAutoSplitSuggestion(true);
                                  }}
                                >
                                  Xem kế hoạch gốc
                                </Button>
                              </div>
                            </section>

                            <Separator />
                          </>
                        ) : null}

                        {/* Overall Assessment */}
                        {activeSuggestion.overallAssessment && (
                          <>
                            <section>
                              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                                <Lightning
                                  className="h-3.5 w-3.5 text-yellow-500"
                                  weight="fill"
                                />
                                Đánh giá tổng quan
                              </h3>
                              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                  {activeSuggestion.overallAssessment}
                                </p>
                              </div>
                            </section>

                            <Separator />
                          </>
                        )}

                        {/* SOS Info — moved from right sidebar */}
                        <section>
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                            <Info className="h-3.5 w-3.5" weight="fill" />
                            Thông tin SOS
                          </h3>
                          <div className="space-y-2">
                            {panelSOSRequests.length > 0 ? (
                              panelSOSRequests.map((sos) => (
                                <SOSRequestSidebarCard key={sos.id} sos={sos} />
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                                Chưa đồng bộ được danh sách SOS của cụm.
                              </div>
                            )}
                          </div>
                        </section>

                        <Separator />
                      </>
                    )}

                    {/* AI Stream Loading State */}
                    {aiStream.loading && !activeSuggestion && !isEditMode && (
                      <section className="text-center py-8">
                        <CircleNotch className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
                        <p className="text-sm font-medium text-foreground/70">
                          {aiStream.status || "Đang phân tích..."}
                        </p>
                        {aiStream.thinkingText && (
                          <div className="mt-3 mx-auto max-w-md bg-muted/40 rounded-lg p-3 border">
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                              {aiStream.thinkingText.slice(-300)}
                            </p>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Saved AI Suggestions */}
                    {!activeSuggestion && !aiStream.loading && !isEditMode && (
                      <section className="space-y-3">
                        {splitSuggestionDrafts.length > 0 ? (
                          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-800/40 dark:bg-rose-900/10">
                            <div className="flex items-start gap-2">
                              <Warning
                                className="mt-0.5 h-4 w-4 text-rose-600 dark:text-rose-400"
                                weight="fill"
                              />
                              <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                  Tách nhiệm vụ theo cảnh báo an toàn
                                </h3>
                                <div className="mt-1">
                                  <FormattedAINotes
                                    text={
                                      effectiveSplitSuggestionPreview?.mixedRescueReliefWarning ||
                                      "Gợi ý AI đang gộp cứu hộ/cấp cứu với cứu trợ vật phẩm. Hãy chọn draft phù hợp để tạo từng nhiệm vụ riêng."
                                    }
                                    textClassName="text-sm text-rose-700/85 dark:text-rose-300/85 leading-relaxed"
                                  />
                                  {effectiveSplitSuggestionPreview?.specialNotes && (
                                    <div className="mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-800/50">
                                      <FormattedAINotes
                                        text={
                                          effectiveSplitSuggestionPreview.specialNotes
                                        }
                                        textClassName="text-sm text-rose-700/85 dark:text-rose-300/85 leading-relaxed"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-3 xl:grid-cols-2">
                              {splitSuggestionDrafts.map((draft) => (
                                <SuggestionCard
                                  key={draft.id}
                                  suggestion={draft}
                                  editable={!readOnly}
                                  actionLabel="Chỉnh sửa draft này"
                                  onEdit={() =>
                                    applySuggestionPreviewToEditForm(draft)
                                  }
                                />
                              ))}
                            </div>

                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-sm"
                                onClick={() => {
                                  setSplitSuggestionPreview(null);
                                  setDismissAutoSplitSuggestion(true);
                                }}
                              >
                                Quay lại danh sách gợi ý
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
                            <Lightning
                              className="h-3.5 w-3.5 text-yellow-500"
                              weight="fill"
                            />
                            Gợi ý từ AI
                          </h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-sm gap-1"
                              onClick={() => refetchSuggestions()}
                              disabled={isSuggestionsLoading}
                            >
                              <ArrowsClockwise className="h-3 w-3" />
                              Làm mới
                            </Button>
                            {!readOnly ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-sm gap-1.5"
                                onClick={handleStreamAnalyze}
                                disabled={!clusterId}
                              >
                                <Lightning
                                  className="h-3.5 w-3.5"
                                  weight="fill"
                                />
                                Phân tích bằng AI
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        {isSuggestionsLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton
                                key={i}
                                className="h-20 w-full rounded-lg"
                              />
                            ))}
                          </div>
                        ) : renderableSavedSuggestions.length > 0 ? (
                          <div className="space-y-3">
                            {renderableSavedSuggestions.map((suggestion) => (
                              <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                editable={!readOnly}
                                onEdit={() =>
                                  handleSuggestionEditRequest(suggestion)
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                            <Rocket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm tracking-tighter text-muted-foreground/60">
                              Chưa có gợi ý AI nào cho cụm này
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              {!readOnly ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-sm"
                                  onClick={handleStreamAnalyze}
                                  disabled={!clusterId}
                                >
                                  <Lightning
                                    className="h-3.5 w-3.5"
                                    weight="fill"
                                  />
                                  Phân tích bằng AI
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* DRAG HANDLE */}
          {showSidebar && (
            <div
              ref={handleRef}
              onMouseDown={handleMouseDown}
              className="h-full w-2 shrink-0 cursor-col-resize flex items-center justify-center bg-border/50 hover:bg-primary/20 active:bg-primary/30 transition-colors select-none z-20"
            >
              <DotsSixVertical
                className="h-5 w-5 text-muted-foreground"
                weight="bold"
              />
            </div>
          )}

          {/* RIGHT COLUMN — SOS Context Sidebar */}
          {showSidebar && (
            <div
              className="h-full min-w-0 overflow-hidden bg-muted/20"
              style={{ width: `${100 - splitPercent}%` }}
            >
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {null}

                  {/* Activity Steps — moved from left column */}
                  {activeSuggestion && !isEditMode && (
                    <>
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ListChecks className="h-3.5 w-3.5" weight="bold" />
                            Các bước thực hiện
                          </h3>
                          <div className="flex items-center gap-2">
                            {!readOnly ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-sm gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                onClick={enterEditMode}
                              >
                                <PencilSimpleLine className="h-3 w-3" />
                                Chỉnh sửa
                              </Button>
                            ) : null}
                            <Badge
                              variant="secondary"
                              className="text-sm h-5 px-2"
                            >
                              {
                                (activeSuggestion?.suggestedActivities ?? [])
                                  .length
                              }{" "}
                              bước
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {activityGroups.map((group, gIdx) => {
                            const matchedSOS =
                              group.type === "sos" && group.sosRequestId
                                ? panelSOSRequests.find(
                                    (s) => s.id === String(group.sosRequestId),
                                  )
                                : null;

                            return (
                              <div
                                key={gIdx}
                                className={cn(
                                  "rounded-xl border overflow-hidden",
                                  group.type === "depot"
                                    ? "border-amber-300/50 dark:border-amber-700/40"
                                    : group.type === "sos" &&
                                        matchedSOS?.priority === "P1"
                                      ? "border-red-300/50 dark:border-red-700/40"
                                      : group.type === "sos" &&
                                          matchedSOS?.priority === "P2"
                                        ? "border-orange-300/50 dark:border-orange-700/40"
                                        : "border-border",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-2.5 px-3.5 py-2.5",
                                    group.type === "depot"
                                      ? "bg-amber-50 dark:bg-amber-900/15"
                                      : group.type === "sos" &&
                                          matchedSOS?.priority === "P1"
                                        ? "bg-red-50 dark:bg-red-900/15"
                                        : group.type === "sos" &&
                                            matchedSOS?.priority === "P2"
                                          ? "bg-orange-50 dark:bg-orange-900/15"
                                          : "bg-muted/40",
                                  )}
                                >
                                  {group.type === "depot" ? (
                                    <>
                                      <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300 ring-1 ring-amber-400/40">
                                        <Storefront
                                          className="h-5 w-5"
                                          weight="fill"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 truncate tracking-tight">
                                          📦 Kho:{" "}
                                          <span className="underline decoration-amber-400 decoration-2 underline-offset-2">
                                            {group.depotName}
                                          </span>
                                        </p>
                                        {group.depotAddress && (
                                          <p className="text-sm text-amber-700/70 dark:text-amber-400/60 truncate mt-0.5">
                                            {group.depotAddress}
                                          </p>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-sm h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
                                      >
                                        {group.activities.length} bước
                                      </Badge>
                                    </>
                                  ) : group.type === "sos" && matchedSOS ? (
                                    <SOSGroupHeader
                                      matchedSOS={matchedSOS}
                                      groupActivitiesLength={
                                        group.activities.length
                                      }
                                    />
                                  ) : (
                                    <>
                                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                        <ListChecks
                                          className="h-4 w-4"
                                          weight="fill"
                                        />
                                      </div>
                                      <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                                        SOS {group.sosRequestId ?? "unknown"}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="text-sm h-5 px-1.5 shrink-0"
                                      >
                                        {group.activities.length} bước
                                      </Badge>
                                    </>
                                  )}
                                </div>

                                <div className="p-3 space-y-2 bg-card">
                                  {group.activities.map((activity, aIdx) => {
                                    const config =
                                      activityTypeConfig[
                                        activity.activityType
                                      ] || activityTypeConfig["ASSESS"];
                                    const cleanDescription =
                                      activity.description
                                        .replace(
                                          /\b\d{1,2}\.\d+,\s*\d{1,3}\.\d+\b\s*(\(.*?\))?/g,
                                          "",
                                        )
                                        .replace(/\s+/g, " ")
                                        .replace(/\(\s*\)/g, "")
                                        .replace(/: \./g, ":")
                                        .trim();
                                    const supplyItems =
                                      getSupplyDisplayItems(activity);
                                    const displayDescription =
                                      supplyItems.length > 0
                                        ? stripSupplyDetailsFromDescription(
                                            cleanDescription,
                                          )
                                        : cleanDescription;
                                    const stepStatus =
                                      getActivityStatusMeta("suggested");

                                    return (
                                      <div
                                        key={aIdx}
                                        className="rounded-lg border bg-background p-3 hover:bg-accent/20 transition-colors"
                                      >
                                        <div className="flex items-start gap-2.5">
                                          <div
                                            className={cn(
                                              "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                                              config.bgColor,
                                              config.color,
                                            )}
                                          >
                                            {activity.step}
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-sm font-semibold px-2 py-0 h-5",
                                                  config.color,
                                                  config.bgColor,
                                                  "border-transparent",
                                                )}
                                              >
                                                {config.label}
                                              </Badge>
                                              <span className="text-sm text-muted-foreground flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                <Clock className="h-3 w-3" />
                                                {activity.estimatedTime}
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-sm h-6 px-2 font-bold border flex items-center gap-1",
                                                  stepStatus.className,
                                                )}
                                              >
                                                {stepStatus.icon}
                                                {stepStatus.label}
                                              </Badge>
                                            </div>
                                            <p className="text-sm leading-relaxed text-foreground/80">
                                              {displayDescription}
                                            </p>
                                            <ActivityExecutionMeta
                                              activity={activity}
                                              className="mt-1.5"
                                            />
                                            <ActivityExecutionWarningBlock
                                              activity={activity}
                                            />
                                            <TargetVictimsBlock
                                              activity={activity}
                                              className="mt-2"
                                            />
                                            <CoordinationNotesBlock
                                              activity={activity}
                                            />

                                            {(activity.assemblyPointName ||
                                              (activity.assemblyPointLatitude !=
                                                null &&
                                                activity.assemblyPointLongitude !=
                                                  null)) && (
                                              <div className="mt-2 p-2 rounded-md border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/15">
                                                <div className="flex items-start justify-between gap-3">
                                                  <p className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1 shrink-0">
                                                    <MapPin
                                                      className="h-3 w-3"
                                                      weight="fill"
                                                    />
                                                    Điểm tập kết hoạt động
                                                  </p>
                                                  <div className="text-right min-w-0">
                                                    {activity.assemblyPointName && (
                                                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 truncate">
                                                        {
                                                          activity.assemblyPointName
                                                        }
                                                      </p>
                                                    )}
                                                    {formatCoordinateLabel(
                                                      activity.assemblyPointLatitude,
                                                      activity.assemblyPointLongitude,
                                                    ) && (
                                                      <p className="text-sm text-blue-700/80 dark:text-blue-300/80">
                                                        Tọa độ:{" "}
                                                        {formatCoordinateLabel(
                                                          activity.assemblyPointLatitude,
                                                          activity.assemblyPointLongitude,
                                                        )}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {supplyItems.length > 0 && (
                                              <div className="mt-2 p-2 rounded-md bg-muted/50 border border-dashed">
                                                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                                                  {getSupplyStepTitle(
                                                    activity.activityType,
                                                  )}
                                                </p>
                                                <div className="space-y-1">
                                                  {supplyItems.map(
                                                    (supply, sIdx) => (
                                                      <div
                                                        key={sIdx}
                                                        className="rounded border bg-background px-2 py-1.5 text-sm shadow-sm"
                                                      >
                                                        <div className="flex items-center justify-between gap-2">
                                                          <div className="flex min-w-0 items-center gap-1.5">
                                                            <Package className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                            <span className="truncate font-medium">
                                                              {supply.name}
                                                            </span>
                                                          </div>
                                                          <div className="flex shrink-0 items-center gap-1">
                                                            {supply.bufferRatioLabel ? (
                                                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                                                Dự trù{" "}
                                                                {
                                                                  supply.bufferRatioLabel
                                                                }
                                                              </span>
                                                            ) : null}
                                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                                              {supply.quantityLabel ||
                                                                "-"}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <Separator />
                    </>
                  )}

                  {/* Resources */}
                  {activeSuggestion && (
                    <>
                      <section>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                          <Cube className="h-3.5 w-3.5" weight="bold" />
                          Tài nguyên cần thiết
                        </h4>
                        <div className="space-y-1.5">
                          {activeSuggestion.suggestedResources.map(
                            (resource, index) => {
                              const icon = resourceTypeIcons[
                                resource.resourceType
                              ] || <Package className="h-4 w-4" />;
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                                >
                                  <div className="p-1.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                    {icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">
                                      {resource.description}
                                    </p>
                                  </div>
                                  <span className="text-sm font-bold text-primary shrink-0">
                                    x{resource.quantity}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-sm h-5 px-1.5 shrink-0"
                                  >
                                    {resource.priority}
                                  </Badge>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </section>

                      {(activeSuggestion.needsManualReview ||
                        activeSuggestion.errorMessage ||
                        activeSuggestion.lowConfidenceWarning ||
                        activeSuggestion.multiDepotRecommended ||
                        (!isEditMode &&
                          trimToNull(
                            activeSuggestion.mixedRescueReliefWarning,
                          )) ||
                        activeSuggestion.needsAdditionalDepot ||
                        (activeSuggestion.supplyShortages?.length ?? 0) >
                          0) && (
                        <>
                          <Separator />
                          <section className="space-y-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5" weight="fill" />
                              Cảnh báo hệ thống
                            </h4>
                            {!isEditMode &&
                            trimToNull(
                              activeSuggestion.mixedRescueReliefWarning,
                            ) ? (
                              <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-lg p-2.5">
                                <FormattedAINotes
                                  text={
                                    activeSuggestion.mixedRescueReliefWarning
                                  }
                                  textClassName="text-sm text-rose-800 dark:text-rose-300 leading-relaxed"
                                />
                              </div>
                            ) : null}
                            {activeSuggestion.errorMessage ? (
                              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-2.5">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                  Lỗi AI
                                </p>
                                <p className="mt-0.5 text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed">
                                  {activeSuggestion.errorMessage}
                                </p>
                              </div>
                            ) : null}
                            {activeSuggestion.needsManualReview && (
                              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
                                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                                  {activeSuggestion.lowConfidenceWarning ||
                                    "Kế hoạch cần kiểm tra thủ công trước khi phê duyệt."}
                                </p>
                              </div>
                            )}
                            {!activeSuggestion.needsManualReview &&
                              activeSuggestion.lowConfidenceWarning && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
                                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                                    {activeSuggestion.lowConfidenceWarning}
                                  </p>
                                </div>
                              )}
                            {activeSuggestion.multiDepotRecommended && (
                              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-2.5">
                                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                                  Kế hoạch đề xuất phối hợp nhiều kho để đáp ứng
                                  đủ vật phẩm.
                                </p>
                              </div>
                            )}
                            {(activeSuggestion.needsAdditionalDepot ||
                              (activeSuggestion.supplyShortages?.length ?? 0) >
                                0) && (
                              <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800/30 rounded-lg p-2.5">
                                <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                                  Kho hiện tại chưa đủ vật phẩm.
                                </p>
                                {activeSuggestion.supplyShortages?.length ? (
                                  <div className="mt-1.5 space-y-1">
                                    {activeSuggestion.supplyShortages.map(
                                      (shortage, index) => (
                                        <p
                                          key={`active-shortage-${index}`}
                                          className="text-sm text-sky-800/80 dark:text-sky-300/80"
                                        >
                                          {`${shortage.itemName} thiếu x${shortage.missingQuantity}${shortage.unit ? ` ${shortage.unit}` : ""}`}
                                          {shortage.selectedDepotName
                                            ? ` • Kho chính: ${shortage.selectedDepotName}`
                                            : ""}
                                        </p>
                                      ),
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </section>
                        </>
                      )}

                      {activeSuggestion.specialNotes ? (
                        <>
                          <Separator />
                          <section className="space-y-2.5">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                              <Warning
                                className="h-3.5 w-3.5 text-orange-500"
                                weight="fill"
                              />
                              Lưu ý đặc biệt
                            </h4>
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5">
                              <FormattedAINotes
                                text={activeSuggestion.specialNotes}
                                textClassName="text-sm text-foreground/75 leading-relaxed"
                              />
                            </div>
                          </section>
                        </>
                      ) : null}

                      {sidebarDepots.length > 0 &&
                        shouldShowAlternativeDepotPanel && (
                          <>
                            <Separator />
                            <section className="space-y-2.5">
                              <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-2.5 dark:border-sky-800/30 dark:bg-sky-950/10">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                      Kho thay thế gợi ý
                                    </p>
                                    <p className="mt-0.5 text-sm text-sky-800/80 dark:text-sky-200/80">
                                      AI đang rà shortage theo kho chính để gợi
                                      ý nguồn bổ sung gần cụm.
                                    </p>
                                  </div>
                                  {sidebarDepots.length > 1 ? (
                                    <div className="min-w-56">
                                      <Select
                                        value={
                                          effectiveSelectedShortageDepotId !=
                                          null
                                            ? String(
                                                effectiveSelectedShortageDepotId,
                                              )
                                            : undefined
                                        }
                                        onValueChange={(value) =>
                                          setSelectedShortageDepotId(
                                            Number(value),
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8 bg-white/90 text-sm dark:bg-slate-950/30">
                                          <SelectValue placeholder="Chọn kho chính đang thiếu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {sidebarDepots.map((depot) => (
                                            <SelectItem
                                              key={depot.depotId}
                                              value={String(depot.depotId)}
                                            >
                                              {depot.depotName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : null}
                                </div>

                                {selectedShortageDepot ? (
                                  <div className="mt-2 rounded-md border border-sky-200/70 bg-white/80 px-2.5 py-2 dark:border-sky-800/30 dark:bg-slate-950/20">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">
                                          Kho chính đang rà thiếu hụt:{" "}
                                          {selectedShortageDepot.depotName}
                                        </p>
                                        {selectedShortageDepot.depotAddress ? (
                                          <p className="text-sm text-muted-foreground">
                                            {selectedShortageDepot.depotAddress}
                                          </p>
                                        ) : null}
                                      </div>
                                      {isAlternativeDepotsFetching ? (
                                        <Badge
                                          variant="secondary"
                                          className="h-5 shrink-0 rounded-full px-2 text-sm"
                                        >
                                          Đang cập nhật
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}

                                {isAlternativeDepotsLoading ? (
                                  <div className="mt-2 space-y-2">
                                    {Array.from({ length: 2 }).map(
                                      (_, index) => (
                                        <Skeleton
                                          key={`alternative-depot-skeleton-${index}`}
                                          className="h-26 w-full rounded-lg"
                                        />
                                      ),
                                    )}
                                  </div>
                                ) : alternativeDepotsError ? (
                                  <div className="mt-2 rounded-md border border-dashed border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">
                                    {(
                                      alternativeDepotsError as AxiosError<{
                                        message?: string;
                                      }>
                                    )?.response?.data?.message ||
                                      alternativeDepotsError.message ||
                                      "Không tải được gợi ý kho thay thế. Hãy thử chọn kho khác hoặc phân tích lại AI."}
                                  </div>
                                ) : alternativeDepotsData ? (
                                  <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                      <Badge
                                        variant="outline"
                                        className="h-5 rounded-full px-2"
                                      >
                                        {
                                          alternativeDepotsData.totalShortageItems
                                        }{" "}
                                        loại thiếu
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className="h-5 rounded-full px-2"
                                      >
                                        {
                                          alternativeDepotsData.totalMissingQuantity
                                        }{" "}
                                        đơn vị thiếu
                                      </Badge>
                                    </div>

                                    {alternativeDepotRecommendations.map(
                                      (depot) => {
                                        const isPinned =
                                          visibleSidebarDepots.some(
                                            (item) =>
                                              item.depotId === depot.depotId,
                                          );

                                        return (
                                          <div
                                            key={depot.depotId}
                                            className="rounded-lg border border-sky-200/70 bg-white/90 p-2.5 dark:border-sky-800/30 dark:bg-slate-950/20"
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <p className="text-sm font-semibold text-foreground">
                                                    {depot.depotName}
                                                  </p>
                                                  {depot.coversAllShortages ? (
                                                    <Badge className="h-5 rounded-full bg-emerald-500 px-2 text-sm text-white hover:bg-emerald-500">
                                                      Đủ toàn bộ
                                                    </Badge>
                                                  ) : (
                                                    <Badge
                                                      variant="secondary"
                                                      className="h-5 rounded-full bg-amber-100 px-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                                    >
                                                      Cover một phần
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                  {depot.depotAddress}
                                                </p>
                                              </div>
                                              <Button
                                                type="button"
                                                variant={
                                                  isPinned
                                                    ? "outline"
                                                    : "default"
                                                }
                                                size="sm"
                                                className="h-7 shrink-0"
                                                onClick={() =>
                                                  togglePinnedAlternativeDepot(
                                                    depot,
                                                  )
                                                }
                                              >
                                                {isPinned
                                                  ? "Ẩn khỏi kho vật phẩm"
                                                  : "Hiện trong kho vật phẩm"}
                                              </Button>
                                            </div>

                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                              <div className="rounded-md border bg-slate-50/80 px-2 py-1.5 dark:bg-slate-900/40">
                                                <p className="text-sm uppercase tracking-wider text-muted-foreground">
                                                  Cover
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                  {(
                                                    depot.coveragePercent * 100
                                                  ).toFixed(0)}
                                                  %
                                                </p>
                                              </div>
                                              <div className="rounded-md border bg-slate-50/80 px-2 py-1.5 dark:bg-slate-900/40">
                                                <p className="text-sm uppercase tracking-wider text-muted-foreground">
                                                  Khối lượng
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                  {depot.coveredQuantity}/
                                                  {depot.totalMissingQuantity}
                                                </p>
                                              </div>
                                              <div className="rounded-md border bg-slate-50/80 px-2 py-1.5 dark:bg-slate-900/40">
                                                <p className="text-sm uppercase tracking-wider text-muted-foreground">
                                                  Khoảng cách
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                  {depot.distanceKm.toFixed(1)}{" "}
                                                  km
                                                </p>
                                              </div>
                                            </div>

                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                              {depot.reason}
                                            </p>

                                            {depot.itemCoverageDetails.length >
                                            0 ? (
                                              <div className="mt-2 space-y-1.5">
                                                {depot.itemCoverageDetails.map(
                                                  (item) => (
                                                    <div
                                                      key={`${depot.depotId}-${item.itemId ?? item.itemName}`}
                                                      className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5"
                                                    >
                                                      <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                          {item.itemName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                          Cần{" "}
                                                          {item.neededQuantity}
                                                          {item.unit
                                                            ? ` ${item.unit}`
                                                            : ""}{" "}
                                                          • Có{" "}
                                                          {
                                                            item.availableQuantity
                                                          }
                                                          {item.unit
                                                            ? ` ${item.unit}`
                                                            : ""}
                                                        </p>
                                                      </div>
                                                      <Badge
                                                        variant="outline"
                                                        className={cn(
                                                          "h-5 shrink-0 rounded-full px-2 text-sm font-semibold",
                                                          item.coverageStatus ===
                                                            "Full"
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                                            : item.coverageStatus ===
                                                                "Partial"
                                                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300"
                                                              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300",
                                                        )}
                                                      >
                                                        {item.coveredQuantity}/
                                                        {item.neededQuantity}
                                                      </Badge>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </section>
                          </>
                        )}
                    </>
                  )}
                  {editSuggestionSidebarSection}
                  {/* Depot Inventory — shown whenever depots are present */}
                  {depotInventorySidebarSection}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 bg-background">
          {isEditMode && editSupplyBalanceAnalysis.firstIssue ? (
            <button
              type="button"
              className="mb-3 w-full rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-amber-700/60 dark:bg-amber-950/25 dark:text-amber-200 dark:hover:bg-amber-900/35"
              onClick={() => {
                const firstIssue = editSupplyBalanceAnalysis.firstIssue;
                if (firstIssue) handleQuickFixSupplyIssue(firstIssue);
              }}
            >
              <p className="font-semibold">
                Cần xử lý cảnh báo vật phẩm trước khi xác nhận
              </p>
              <p className="mt-1 leading-relaxed">
                {editSupplyBalanceAnalysis.firstIssue.message}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 font-semibold">
                <ArrowsClockwise className="h-3.5 w-3.5" weight="bold" />
                Tự sửa vật phẩm
              </span>
            </button>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (isEditMode) {
                  exitEditMode();
                } else {
                  onOpenChange(false);
                }
              }}
            >
              {isEditMode
                ? "Quay lại xem"
                : !activeSuggestion
                  ? "Đóng"
                  : "Huỷ bỏ"}
            </Button>
            {isEditMode ? (
              <Button
                className="flex-1 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
                onClick={handleOpenSubmitConfirm}
                disabled={
                  isSubmittingMissionEdit || editSupplyBalanceAnalysis.hasIssues
                }
              >
                {isSubmittingMissionEdit ? (
                  <CircleNotch className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <FloppyDisk className="h-5 w-5 mr-2" weight="fill" />
                )}
                {isSubmittingMissionEdit
                  ? editingMissionId
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : editingMissionId
                    ? "Cập nhật nhiệm vụ"
                    : "Xác nhận nhiệm vụ"}
              </Button>
            ) : activeSuggestion && !readOnly ? (
              <Button
                className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                onClick={() => {
                  enterEditMode();
                }}
              >
                <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
                Chỉnh sửa
              </Button>
            ) : null}
          </div>
        </div>

        <Dialog
          open={removeConfirmOpen}
          onOpenChange={handleRemoveConfirmOpenChange}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{removeDialogTitle}</DialogTitle>
              <DialogDescription>{removeDialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleRemoveConfirmOpenChange(false)}
              >
                Giữ lại
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmRemove}
              >
                Xóa khỏi kế hoạch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(pendingMixedSuggestion)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setPendingMixedSuggestion(null);
              setPendingMixedOverrideReason("");
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Cảnh báo gộp cứu hộ và cứu trợ</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label
                htmlFor="mixed-mission-override-reason"
                className="text-sm font-semibold"
              >
                Lý do bỏ qua cảnh báo
              </Label>
              <textarea
                id="mixed-mission-override-reason"
                value={pendingMixedOverrideReason}
                onChange={(event) =>
                  setPendingMixedOverrideReason(event.target.value)
                }
                placeholder="Nhập lý do điều phối viên chấp nhận tiếp tục nhiệm vụ gộp..."
                maxLength={1000}
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={confirmMixedSuggestionAsSplitMission}
              >
                Tách thành nhiệm vụ riêng
              </Button>
              <Button onClick={confirmMixedSuggestionAsSingleMission}>
                Tiếp tục chỉnh sửa nhiệm vụ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMissionId
                  ? "Xác nhận cập nhật nhiệm vụ"
                  : "Xác nhận tạo nhiệm vụ"}
              </DialogTitle>
              <DialogDescription>
                {editingMissionId
                  ? "Bạn có chắc muốn lưu các thay đổi của nhiệm vụ hiện tại không? Hệ thống sẽ cập nhật kế hoạch đang giao cho đội cứu hộ."
                  : "Bạn có chắc muốn hoàn tất chỉnh sửa không? Sau khi tạo, nhiệm vụ sẽ được lưu vào danh sách nhiệm vụ đã tạo và gửi đến đội cứu hộ được chỉ định."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmSubmitOpen(false)}
                disabled={isSubmittingMissionEdit}
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                className="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleSubmitEdit}
                disabled={isSubmittingMissionEdit}
              >
                {isSubmittingMissionEdit
                  ? editingMissionId
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : editingMissionId
                    ? "Đồng ý cập nhật"
                    : "Đồng ý tạo nhiệm vụ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(activeMissionReportImage)}
          onOpenChange={handleMissionReportImageViewerOpenChange}
        >
          <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-transparent shadow-none">
            {activeMissionReportImage && (
              <div className="relative group flex items-center justify-center min-h-[400px]">
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                  <Badge className="bg-black/60 text-white border-none backdrop-blur-md px-3 py-1.5 text-base font-bold tracking-tighter">
                    Bước {activeMissionReportImage.step}:{" "}
                    {activeMissionReportImage.activityLabel}
                  </Badge>
                </div>
                <img
                  src={activeMissionReportImage.src}
                  alt="Báo cáo chi tiết"
                  className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default memo(RescuePlanPanel);
