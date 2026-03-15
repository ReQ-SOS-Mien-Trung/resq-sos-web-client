"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  type DragOverEvent,
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
import { activityTypeConfig } from "@/lib/constants";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS } from "@/lib/priority";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  Lightning,
  CircleNotch,
  Warning,
  PencilSimpleLine,
  CopySimple,
  CheckCircle,
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
import type { MissionActivity } from "@/services/mission/type";

// ── Types ──

interface ManualActivity {
  id: string;
  activityType: ClusterActivityType;
  description: string;
  target: string;
  items: string;
  targetLatitude: number;
  targetLongitude: number;
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
  "MIXED",
];

const PALETTE_PREFIX = "palette-";
const TIMELINE_PREFIX = "timeline-";
const DROPPABLE_ID = "timeline-drop-zone";

// ── Preset templates ──

const TEMPLATES: { label: string; types: ClusterActivityType[] }[] = [
  { label: "Giải cứu cơ bản", types: ["ASSESS", "RESCUE", "EVACUATE"] },
  {
    label: "Y tế khẩn cấp",
    types: ["ASSESS", "MEDICAL_AID", "EVACUATE"],
  },
  {
    label: "Tiếp tế vật tư",
    types: ["ASSESS", "DELIVER_SUPPLIES", "EVACUATE"],
  },
];

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
  onUpdate,
  onRemove,
  onCopyLocation,
  clusterSOSRequests,
}: {
  activity: ManualActivity;
  index: number;
  isLast: boolean;
  onUpdate: (
    id: string,
    field: keyof ManualActivity,
    value: string | number,
  ) => void;
  onRemove: (id: string) => void;
  onCopyLocation: (lat: number, lng: number) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card transition-all duration-150",
        isDragging && "opacity-50 shadow-lg z-50",
      )}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle + step number */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted/60 transition-colors"
          >
            <DotsSixVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-offset-2 ring-offset-card mt-1",
              config.bgColor,
              config.color,
              config.color.includes("blue")
                ? "ring-blue-400/40"
                : config.color.includes("red")
                  ? "ring-red-400/40"
                  : config.color.includes("emerald")
                    ? "ring-emerald-400/40"
                    : config.color.includes("orange")
                      ? "ring-orange-400/40"
                      : config.color.includes("purple")
                        ? "ring-purple-400/40"
                        : "ring-indigo-400/40",
            )}
          >
            {index + 1}
          </div>
          {!isLast && (
            <div className="w-px flex-1 min-h-[1rem] bg-border mt-1" />
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Type badge + remove */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold px-2 py-0 h-5",
                config.color,
                config.bgColor,
                "border-transparent",
              )}
            >
              {config.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-red-500"
              onClick={() => onRemove(activity.id)}
            >
              <Trash className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Description */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Mô tả
            </Label>
            <Input
              placeholder="Mô tả hoạt động..."
              value={activity.description || ""}
              onChange={(e) =>
                onUpdate(activity.id, "description", e.target.value)
              }
              className="h-8 text-xs mt-0.5"
            />
          </div>

          {/* Target */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Mục tiêu
            </Label>
            <Input
              placeholder="Tên địa điểm / mục tiêu..."
              value={activity.target || ""}
              onChange={(e) => onUpdate(activity.id, "target", e.target.value)}
              className="h-8 text-xs mt-0.5"
            />
          </div>

          {/* Location */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Liên kết yêu cầu SOS
            </Label>
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
              <SelectTrigger className="h-8 text-xs mt-0.5">
                <SelectValue placeholder="Chọn một yêu cầu SOS để gán tọa độ..." />
              </SelectTrigger>
              <SelectContent className="z-[1200]">
                {clusterSOSRequests.map((sos) => (
                  <SelectItem key={sos.id} value={sos.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">
                        #{sos.id}
                      </span>
                      <span className="truncate max-w-[200px]">
                        {sos.message}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Vật tư / Thiết bị
            </Label>
            <Input
              placeholder="VD: Áo phao x5, Lương khô x10..."
              value={activity.items || ""}
              onChange={(e) => onUpdate(activity.id, "items", e.target.value)}
              className="h-8 text-xs mt-0.5"
            />
          </div>
        </div>
      </div>
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
        "min-h-[200px] rounded-xl border-2 border-dashed transition-all duration-200 p-3",
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
  const [activities, setActivities] = useState<ManualActivity[]>([]);
  const [missionType, setMissionType] = useState<"RESCUE" | "RESCUER">(
    "RESCUE",
  );
  const [priorityScore, setPriorityScore] = useState(5);
  const [startTime, setStartTime] = useState("");
  const [expectedEndTime, setExpectedEndTime] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] =
    useState<ClusterActivityType | null>(null);
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);

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

  const isEditingExisting = !!existingMissionId;

  // ── Pre-fill from existing mission ──
  useEffect(() => {
    if (!existingMission || !open || hasLoadedExisting) return;
    setMissionType(existingMission.missionType || "RESCUE");
    setPriorityScore(existingMission.priorityScore || 5);
    setStartTime(existingMission.startTime?.slice(0, 16) || "");
    setExpectedEndTime(existingMission.expectedEndTime?.slice(0, 16) || "");

    const acts = existingMission.activities ?? existingActivities ?? [];
    if (acts.length > 0) {
      setActivities(
        acts.map((a: MissionActivity) => ({
          id: `${TIMELINE_PREFIX}existing-${a.id}-${Date.now()}`,
          activityType: (a.activityType || "ASSESS") as ClusterActivityType,
          description: a.description || "",
          target: a.target || "",
          items: typeof a.items === "string" ? a.items : "",
          targetLatitude: a.targetLatitude || 0,
          targetLongitude: a.targetLongitude || 0,
        })),
      );
    }
    setHasLoadedExisting(true);
  }, [existingMission, existingActivities, open, hasLoadedExisting]);

  // Reset loaded flag when closing or changing mission
  useEffect(() => {
    if (!open) setHasLoadedExisting(false);
  }, [open]);

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
    (id: string, field: keyof ManualActivity, value: string | number) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
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
            const reqData = {
              step,
              activityCode,
              activityType: a.activityType,
              description: a.description,
              target: a.target,
              items: a.items || "",
              targetLatitude: a.targetLatitude,
              targetLongitude: a.targetLongitude,
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
          activities: activities.map((a, i) => ({
            step: i + 1,
            activityCode: `${a.activityType}_${i + 1}`,
            activityType: a.activityType,
            description: a.description,
            target: a.target,
            items: a.items || "",
            targetLatitude: a.targetLatitude,
            targetLongitude: a.targetLongitude,
          })),
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
    onOpenChange,
    onCreated,
  ]);

  // ── Sortable IDs ──
  const sortableIds = useMemo(() => activities.map((a) => a.id), [activities]);

  if (!clusterId) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1100] transition-opacity duration-500 ease-out",
        open
          ? "opacity-100 visible"
          : "opacity-0 invisible pointer-events-none",
      )}
    >
      <div className="h-full bg-background/98 backdrop-blur-sm border-t shadow-2xl flex flex-col">
        {/* ── Header ── */}
        <div className="p-4 pb-3 border-b shrink-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 shadow-sm">
                <PencilSimpleLine
                  className="h-6 w-6 text-amber-600 dark:text-amber-400"
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
                    className="text-[10px] px-1.5 py-0 h-5 gap-1"
                  >
                    <TreeStructure className="h-3 w-3" weight="fill" />
                    {clusterSOSRequests.length} SOS
                  </Badge>
                  {cluster?.severityLevel && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5"
                    >
                      {cluster.severityLevel}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 gap-1"
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
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* ── Left Panel: Palette + SOS + Templates ── */}
            <div className="w-[240px] shrink-0 border-r flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* Activity palette */}
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
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
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Rocket className="h-3 w-3" weight="fill" />
                      Mẫu có sẵn
                    </h3>
                    <div className="space-y-1.5">
                      {TEMPLATES.map((tpl) => (
                        <Button
                          key={tpl.label}
                          variant="outline"
                          size="sm"
                          className="w-full h-auto py-2 px-3 text-left justify-start text-[11px]"
                          onClick={() => applyTemplate(tpl.types)}
                        >
                          <div>
                            <div className="font-semibold">{tpl.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
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

                  {/* SOS requests reference */}
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Warning className="h-3 w-3 text-red-500" weight="fill" />
                      SOS trong cụm ({clusterSOSRequests.length})
                    </h3>
                    <div className="space-y-1.5">
                      {clusterSOSRequests.map((sos) => (
                        <div
                          key={sos.id}
                          className="rounded-lg border p-2 cursor-pointer hover:bg-accent/50 transition-colors group"
                          onClick={() =>
                            handleSOSLocationFill(
                              sos.location.lat,
                              sos.location.lng,
                            )
                          }
                          title="Click để gán tọa độ cho bước tiếp theo"
                        >
                          <div className="flex items-center gap-1.5">
                            <MapPin
                              className={cn(
                                "h-3 w-3 shrink-0",
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
                            <Badge
                              variant={PRIORITY_BADGE_VARIANT[sos.priority]}
                              className="text-[9px] h-3.5 px-1"
                            >
                              {PRIORITY_LABELS[sos.priority]}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{sos.id}
                            </span>
                            <CopySimple className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 ml-auto transition-colors" />
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                            {sos.message}
                          </p>
                          <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                            {sos.location.lat.toFixed(4)},{" "}
                            {sos.location.lng.toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </div>

            {/* ── Right Panel: Timeline + Mission Config ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Timeline header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5" weight="bold" />
                      Kế hoạch thực hiện
                    </h3>
                    <Badge variant="secondary" className="text-[10px] h-5 px-2">
                      {activities.length} bước
                    </Badge>
                  </div>

                  {/* Timeline drop zone */}
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
                          onUpdate={handleUpdateActivity}
                          onRemove={handleRemoveActivity}
                          onCopyLocation={handleSOSLocationFill}
                          clusterSOSRequests={clusterSOSRequests}
                        />
                      ))}
                    </SortableContext>
                  </TimelineDropZone>

                  <Separator />

                  {/* ── Mission Configuration ── */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                      <Rocket className="h-3.5 w-3.5" weight="fill" />
                      Cấu hình nhiệm vụ
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Mission Type */}
                      <div>
                        <Label className="text-xs">Loại nhiệm vụ</Label>
                        <Select
                          value={missionType}
                          onValueChange={(v) =>
                            setMissionType(v as "RESCUE" | "RESCUER")
                          }
                        >
                          <SelectTrigger className="h-9 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RESCUE">
                              Cứu hộ (RESCUE)
                            </SelectItem>
                            <SelectItem value="RESCUER">
                              Cứu hộ viên (RESCUER)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority Score */}
                      <div>
                        <Label className="text-xs">Điểm ưu tiên (1-10)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={priorityScore}
                          onChange={(e) =>
                            setPriorityScore(
                              Math.max(
                                1,
                                Math.min(10, parseInt(e.target.value) || 1),
                              ),
                            )
                          }
                          className="h-9 text-xs mt-1"
                        />
                      </div>

                      {/* Start Time */}
                      <div>
                        <Label className="text-xs">Thời gian bắt đầu</Label>
                        <Input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-9 text-xs mt-1"
                        />
                      </div>

                      {/* Expected End Time */}
                      <div>
                        <Label className="text-xs">
                          Thời gian kết thúc dự kiến
                        </Label>
                        <Input
                          type="datetime-local"
                          value={expectedEndTime}
                          onChange={(e) => setExpectedEndTime(e.target.value)}
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>

              {/* ── Footer Actions ── */}
              <div className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-9"
                >
                  Hủy bỏ
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {activities.length} hoạt động
                  </span>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || activities.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <CircleNotch className="h-4 w-4 animate-spin" />
                        {isEditingExisting ? "Đang cập nhật..." : "Đang tạo..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" weight="fill" />
                        {isEditingExisting
                          ? "Cập nhật nhiệm vụ"
                          : "Tạo nhiệm vụ"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Drag Overlay ── */}
          <DragOverlay>
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
