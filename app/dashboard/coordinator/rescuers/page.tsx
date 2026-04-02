"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  MagnifyingGlass,
  MapPin,
  UsersThree,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  useRescuerAssemblyPointMetadata,
  useRescuers,
} from "@/services/rescuers/hooks";
import type {
  GetRescuersParams,
  RescuerEntity,
} from "@/services/rescuers/type";
import {
  useAssemblyPointMetadata,
  useUpdateRescuerAssemblyPointAssignment,
} from "@/services/assembly_points/hooks";

const DEFAULT_RESCUER_AVATAR =
  "https://res.cloudinary.com/dezgwdrfs/image/upload/v1773504004/611251674_1432765175119052_6622750233977483141_n_sgxqxd.png";
const ASSIGNED_SELECT_VALUE = "__assigned__";
const UNASSIGN_SELECT_VALUE = "__unassign__";
const ALL_ASSEMBLY_POINT_FILTER_VALUE = "__all_assembly_points__";

type AssignmentFilter = "all" | "assigned" | "unassigned";
type TeamFilter = "all" | "inTeam" | "notInTeam";
type RescuerTypeFilter = "all" | "Core" | "Volunteer";
type SplitPanelSide = "left" | "right";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function isRescuerPresenceConfirmed(rescuer: RescuerEntity) {
  if (typeof rescuer.attendanceConfirmed === "boolean") {
    return rescuer.attendanceConfirmed;
  }

  return rescuer.hasTeam;
}

export default function CoordinatorRescuerManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [rescuerTypeFilter, setRescuerTypeFilter] =
    useState<RescuerTypeFilter>("all");
  const [selectedAssemblyPointCode, setSelectedAssemblyPointCode] = useState(
    ALL_ASSEMBLY_POINT_FILTER_VALUE,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [rowSelectedAssemblyPointIds, setRowSelectedAssemblyPointIds] =
    useState<Record<string, string>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectedRescuerIds, setSelectedRescuerIds] = useState<string[]>([]);
  const [bulkSelectedAssemblyPointId, setBulkSelectedAssemblyPointId] =
    useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [draggingRescuerId, setDraggingRescuerId] = useState<string | null>(
    null,
  );
  const [dragSourcePanel, setDragSourcePanel] = useState<SplitPanelSide | null>(
    null,
  );
  const [activeDropPanel, setActiveDropPanel] = useState<SplitPanelSide | null>(
    null,
  );
  const [isDragUpdating, setIsDragUpdating] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const isSplitByAssemblyPointView =
    selectedAssemblyPointCode !== ALL_ASSEMBLY_POINT_FILTER_VALUE;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const rescuerParams = useMemo<
    Omit<GetRescuersParams, "pageNumber" | "pageSize">
  >(() => {
    const params: Omit<GetRescuersParams, "pageNumber" | "pageSize"> = {};

    if (assignmentFilter !== "all") {
      params.hasAssemblyPoint = assignmentFilter === "assigned";
    }

    if (teamFilter !== "all") {
      params.hasTeam = teamFilter === "inTeam";
    }

    if (rescuerTypeFilter !== "all") {
      params.rescuerType = rescuerTypeFilter;
    }

    if (selectedAssemblyPointCode !== ALL_ASSEMBLY_POINT_FILTER_VALUE) {
      params.assemblyPointCodes = [selectedAssemblyPointCode];
    }

    if (debouncedSearchQuery) {
      params.search = debouncedSearchQuery;
    }

    return params;
  }, [
    assignmentFilter,
    teamFilter,
    rescuerTypeFilter,
    selectedAssemblyPointCode,
    debouncedSearchQuery,
  ]);

  const splitSharedRescuerParams = useMemo<
    Pick<GetRescuersParams, "hasTeam" | "rescuerType" | "search">
  >(() => {
    const params: Pick<
      GetRescuersParams,
      "hasTeam" | "rescuerType" | "search"
    > = {};

    if (teamFilter !== "all") {
      params.hasTeam = teamFilter === "inTeam";
    }

    if (rescuerTypeFilter !== "all") {
      params.rescuerType = rescuerTypeFilter;
    }

    if (debouncedSearchQuery) {
      params.search = debouncedSearchQuery;
    }

    return params;
  }, [teamFilter, rescuerTypeFilter, debouncedSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    assignmentFilter,
    teamFilter,
    rescuerTypeFilter,
    selectedAssemblyPointCode,
    pageSize,
    debouncedSearchQuery,
  ]);

  useEffect(() => {
    if (isSplitByAssemblyPointView && assignmentFilter !== "all") {
      setAssignmentFilter("all");
    }
  }, [isSplitByAssemblyPointView, assignmentFilter]);

  const {
    data: rescuerAssemblyPointOptions,
    isLoading: isRescuerAssemblyPointLoading,
  } = useRescuerAssemblyPointMetadata({ enabled: true });

  const {
    data: rescuersData,
    isLoading: isRescuersLoading,
    isError: isRescuersError,
    refetch,
    isRefetching,
  } = useRescuers({
    params: {
      ...rescuerParams,
      pageNumber: currentPage,
      pageSize,
    },
    enabled: !isSplitByAssemblyPointView,
  });

  const {
    data: assignedInSelectedPointData,
    isLoading: isAssignedInSelectedPointLoading,
    isError: isAssignedInSelectedPointError,
    refetch: refetchAssignedInSelectedPoint,
    isRefetching: isRefetchingAssignedInSelectedPoint,
  } = useRescuers({
    params: {
      ...splitSharedRescuerParams,
      hasAssemblyPoint: true,
      assemblyPointCodes: [selectedAssemblyPointCode],
      pageNumber: 1,
      pageSize: 500,
    },
    enabled: isSplitByAssemblyPointView,
  });

  const {
    data: unassignedRescuersData,
    isLoading: isUnassignedRescuersLoading,
    isError: isUnassignedRescuersError,
    refetch: refetchUnassignedRescuers,
    isRefetching: isRefetchingUnassignedRescuers,
  } = useRescuers({
    params: {
      ...splitSharedRescuerParams,
      hasAssemblyPoint: false,
      pageNumber: 1,
      pageSize: 500,
    },
    enabled: isSplitByAssemblyPointView,
  });

  const {
    data: assignedCandidateRescuersData,
    isLoading: isAssignedCandidateRescuersLoading,
    isError: isAssignedCandidateRescuersError,
    refetch: refetchAssignedCandidateRescuers,
    isRefetching: isRefetchingAssignedCandidateRescuers,
  } = useRescuers({
    params: {
      ...splitSharedRescuerParams,
      hasAssemblyPoint: true,
      pageNumber: 1,
      pageSize: 500,
    },
    enabled: isSplitByAssemblyPointView,
  });

  const { data: assemblyPointOptions, isLoading: isAssemblyPointLoading } =
    useAssemblyPointMetadata({ enabled: true });

  const { mutateAsync: updateAssignment, isPending: isUpdatingAssignment } =
    useUpdateRescuerAssemblyPointAssignment();

  const rescuers = useMemo(() => rescuersData?.items ?? [], [rescuersData]);
  const assignedInSelectedPointRescuers = useMemo(
    () => assignedInSelectedPointData?.items ?? [],
    [assignedInSelectedPointData],
  );
  const unassignedRescuers = useMemo(
    () => unassignedRescuersData?.items ?? [],
    [unassignedRescuersData],
  );
  const assignedCandidateRescuers = useMemo(
    () => assignedCandidateRescuersData?.items ?? [],
    [assignedCandidateRescuersData],
  );

  const assignedWithoutConfirmationRescuers = useMemo(
    () =>
      assignedCandidateRescuers.filter(
        (rescuer) => !isRescuerPresenceConfirmed(rescuer),
      ),
    [assignedCandidateRescuers],
  );

  const rightPanelRescuers = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return [];
    }

    const mergedRescuers = [
      ...unassignedRescuers,
      ...assignedWithoutConfirmationRescuers,
    ];
    const rescuerMap = new Map<string, RescuerEntity>();

    for (const rescuer of mergedRescuers) {
      rescuerMap.set(rescuer.id, rescuer);
    }

    return Array.from(rescuerMap.values());
  }, [
    isSplitByAssemblyPointView,
    unassignedRescuers,
    assignedWithoutConfirmationRescuers,
  ]);

  const visibleRescuers = isSplitByAssemblyPointView
    ? assignedInSelectedPointRescuers
    : rescuers;
  const selectableRescuers = isSplitByAssemblyPointView
    ? rightPanelRescuers
    : visibleRescuers;
  const totalPages = rescuersData?.totalPages ?? 1;
  const splitUniqueRescuerCount = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return 0;
    }

    const rescuerIds = new Set<string>([
      ...assignedInSelectedPointRescuers.map((rescuer) => rescuer.id),
      ...rightPanelRescuers.map((rescuer) => rescuer.id),
    ]);

    return rescuerIds.size;
  }, [
    isSplitByAssemblyPointView,
    assignedInSelectedPointRescuers,
    rightPanelRescuers,
  ]);

  const totalCount = isSplitByAssemblyPointView
    ? splitUniqueRescuerCount
    : (rescuersData?.totalCount ?? rescuers.length);

  useEffect(() => {
    const visibleRescuerIds = new Set(
      selectableRescuers.map((rescuer) => rescuer.id),
    );

    setSelectedRescuerIds((previous) =>
      previous.filter((rescuerId) => visibleRescuerIds.has(rescuerId)),
    );
  }, [selectableRescuers]);

  const assemblyPointNameById = useMemo(() => {
    const entries = (assemblyPointOptions ?? [])
      .map((option) => {
        const pointId = Number(option.key);
        if (Number.isNaN(pointId)) {
          return null;
        }

        return [pointId, option.value] as const;
      })
      .filter((entry): entry is readonly [number, string] => entry !== null);

    return new Map<number, string>(entries);
  }, [assemblyPointOptions]);

  const selectedAssemblyPointLabel = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return null;
    }

    const selectedPoint = (rescuerAssemblyPointOptions ?? []).find(
      (point) => point.key === selectedAssemblyPointCode,
    );

    return selectedPoint?.value ?? selectedAssemblyPointCode;
  }, [
    isSplitByAssemblyPointView,
    rescuerAssemblyPointOptions,
    selectedAssemblyPointCode,
  ]);

  const splitTargetAssemblyPointId = useMemo(() => {
    if (!isSplitByAssemblyPointView || !bulkSelectedAssemblyPointId) {
      return null;
    }

    const parsedPointId = Number(bulkSelectedAssemblyPointId);
    return Number.isNaN(parsedPointId) ? null : parsedPointId;
  }, [isSplitByAssemblyPointView, bulkSelectedAssemblyPointId]);

  const assignedCount = useMemo(() => {
    if (isSplitByAssemblyPointView) {
      return (
        assignedInSelectedPointData?.totalCount ??
        assignedInSelectedPointRescuers.length
      );
    }

    return rescuers.filter((rescuer) => rescuer.hasAssemblyPoint).length;
  }, [
    isSplitByAssemblyPointView,
    assignedInSelectedPointData,
    assignedInSelectedPointRescuers,
    rescuers,
  ]);

  const unassignedCount = useMemo(() => {
    if (isSplitByAssemblyPointView) {
      return unassignedRescuersData?.totalCount ?? unassignedRescuers.length;
    }

    return Math.max(
      0,
      (rescuersData?.totalCount ?? rescuers.length) - assignedCount,
    );
  }, [
    isSplitByAssemblyPointView,
    unassignedRescuersData,
    unassignedRescuers,
    rescuersData,
    rescuers,
    assignedCount,
  ]);

  const isRescuerListLoading = isSplitByAssemblyPointView
    ? isAssignedInSelectedPointLoading ||
      isUnassignedRescuersLoading ||
      isAssignedCandidateRescuersLoading
    : isRescuersLoading;
  const isRescuerListError = isSplitByAssemblyPointView
    ? isAssignedInSelectedPointError ||
      isUnassignedRescuersError ||
      isAssignedCandidateRescuersError
    : isRescuersError;
  const isRescuerListRefetching = isSplitByAssemblyPointView
    ? isRefetchingAssignedInSelectedPoint ||
      isRefetchingUnassignedRescuers ||
      isRefetchingAssignedCandidateRescuers
    : isRefetching;

  useEffect(() => {
    if (!isSplitByAssemblyPointView) {
      setDraggingRescuerId(null);
      setDragSourcePanel(null);
      setActiveDropPanel(null);
      return;
    }

    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;

    if (leftPanel) {
      gsap.to(leftPanel, {
        duration: 0.18,
        borderColor:
          activeDropPanel === "left" ? "#FF5722" : "rgba(15, 23, 42, 0.12)",
        boxShadow:
          activeDropPanel === "left"
            ? "0 0 0 2px rgba(255, 87, 34, 0.25)"
            : "0 0 0 0 rgba(255, 87, 34, 0)",
        ease: "power2.out",
      });
    }

    if (rightPanel) {
      gsap.to(rightPanel, {
        duration: 0.18,
        borderColor:
          activeDropPanel === "right" ? "#FF5722" : "rgba(255, 87, 34, 0.2)",
        boxShadow:
          activeDropPanel === "right"
            ? "0 0 0 2px rgba(255, 87, 34, 0.25)"
            : "0 0 0 0 rgba(255, 87, 34, 0)",
        ease: "power2.out",
      });
    }
  }, [isSplitByAssemblyPointView, activeDropPanel]);

  const selectedRescuerIdSet = useMemo(
    () => new Set(selectedRescuerIds),
    [selectedRescuerIds],
  );

  const selectedVisibleRescuerCount = useMemo(
    () =>
      selectableRescuers.reduce(
        (count, rescuer) =>
          count + (selectedRescuerIdSet.has(rescuer.id) ? 1 : 0),
        0,
      ),
    [selectableRescuers, selectedRescuerIdSet],
  );

  const areAllVisibleRescuersSelected =
    selectableRescuers.length > 0 &&
    selectedVisibleRescuerCount === selectableRescuers.length;
  const hasPartialVisibleSelection =
    selectedVisibleRescuerCount > 0 && !areAllVisibleRescuersSelected;
  const isAssignmentBusy =
    isUpdatingAssignment || isBulkUpdating || isDragUpdating;

  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | "dots-left" | "dots-right"> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      pages.push("dots-left");
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push("dots-right");
    }

    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  const handleSaveAssignment = async (
    userId: string,
    selectedAssemblyPointId: string,
  ) => {
    if (!selectedAssemblyPointId) {
      toast.error("Vui lòng chọn thao tác trước khi lưu.");
      return;
    }

    try {
      setPendingUserId(userId);

      if (selectedAssemblyPointId === UNASSIGN_SELECT_VALUE) {
        await updateAssignment({ userId, assemblyPointId: null });
        toast.success("Đã bỏ phân công rescuer khỏi điểm tập kết.");
      } else {
        const pointId = Number(selectedAssemblyPointId);
        if (Number.isNaN(pointId)) {
          toast.error("Điểm tập kết không hợp lệ.");
          return;
        }

        await updateAssignment({ userId, assemblyPointId: pointId });
        toast.success("Đã lưu rescuer vào điểm tập kết.");
      }

      setRowSelectedAssemblyPointIds((previous) => ({
        ...previous,
        [userId]: "",
      }));
      setSelectedRescuerIds((previous) =>
        previous.filter((rescuerId) => rescuerId !== userId),
      );
      await refetchCurrentView();
    } catch {
      toast.error("Không thể cập nhật phân công. Vui lòng thử lại.");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleToggleRescuerSelection = (
    rescuerId: string,
    shouldSelect: boolean,
  ) => {
    setSelectedRescuerIds((previous) => {
      if (shouldSelect) {
        return previous.includes(rescuerId)
          ? previous
          : [...previous, rescuerId];
      }

      return previous.filter((id) => id !== rescuerId);
    });
  };

  const handleToggleSelectAllVisible = (shouldSelect: boolean) => {
    setSelectedRescuerIds(
      shouldSelect ? selectableRescuers.map((rescuer) => rescuer.id) : [],
    );
  };

  const refetchCurrentView = async () => {
    if (isSplitByAssemblyPointView) {
      await Promise.all([
        refetchAssignedInSelectedPoint(),
        refetchUnassignedRescuers(),
        refetchAssignedCandidateRescuers(),
      ]);
      return;
    }

    await refetch();
  };

  const resetDragState = () => {
    setDraggingRescuerId(null);
    setDragSourcePanel(null);
    setActiveDropPanel(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    rescuer: RescuerEntity,
    sourcePanel: SplitPanelSide,
  ) => {
    if (!isSplitByAssemblyPointView || isAssignmentBusy) {
      event.preventDefault();
      return;
    }

    setDraggingRescuerId(rescuer.id);
    setDragSourcePanel(sourcePanel);
    setActiveDropPanel(sourcePanel === "left" ? "right" : "left");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", rescuer.id);

    gsap.to(event.currentTarget, {
      scale: 0.98,
      opacity: 0.72,
      duration: 0.16,
      ease: "power2.out",
    });
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    gsap.to(event.currentTarget, {
      scale: 1,
      opacity: 1,
      duration: 0.16,
      ease: "power2.out",
    });
    resetDragState();
  };

  const handlePanelDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetPanel: SplitPanelSide,
  ) => {
    if (
      !draggingRescuerId ||
      !dragSourcePanel ||
      dragSourcePanel === targetPanel
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (activeDropPanel !== targetPanel) {
      setActiveDropPanel(targetPanel);
    }
  };

  const handlePanelDragLeave = (targetPanel: SplitPanelSide) => {
    setActiveDropPanel((previous) =>
      previous === targetPanel ? null : previous,
    );
  };

  const handlePanelDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetPanel: SplitPanelSide,
  ) => {
    event.preventDefault();

    if (
      !draggingRescuerId ||
      !dragSourcePanel ||
      dragSourcePanel === targetPanel ||
      isAssignmentBusy
    ) {
      resetDragState();
      return;
    }

    let nextAssemblyPointId: number | null = null;

    if (dragSourcePanel === "right" && targetPanel === "left") {
      if (splitTargetAssemblyPointId === null) {
        toast.error("Không tìm thấy điểm tập kết đích để kéo thả.");
        resetDragState();
        return;
      }

      nextAssemblyPointId = splitTargetAssemblyPointId;
    }

    try {
      setIsDragUpdating(true);

      await updateAssignment({
        userId: draggingRescuerId,
        assemblyPointId: nextAssemblyPointId,
      });

      toast.success(
        nextAssemblyPointId === null
          ? "Đã đưa rescuer về nhóm chưa có điểm tập kết."
          : "Đã thêm rescuer vào điểm tập kết.",
      );

      setRowSelectedAssemblyPointIds((previous) => ({
        ...previous,
        [draggingRescuerId]: "",
      }));
      setSelectedRescuerIds((previous) =>
        previous.filter((rescuerId) => rescuerId !== draggingRescuerId),
      );
      await refetchCurrentView();

      const targetPanelElement =
        targetPanel === "left" ? leftPanelRef.current : rightPanelRef.current;
      if (targetPanelElement) {
        gsap.fromTo(
          targetPanelElement,
          { boxShadow: "0 0 0 0 rgba(255, 87, 34, 0.35)" },
          {
            boxShadow: "0 0 0 14px rgba(255, 87, 34, 0)",
            duration: 0.45,
            ease: "power2.out",
          },
        );
      }
    } catch {
      toast.error(
        "Không thể cập nhật phân công bằng kéo thả. Vui lòng thử lại.",
      );
    } finally {
      setIsDragUpdating(false);
      resetDragState();
    }
  };

  useEffect(() => {
    if (!isSplitByAssemblyPointView) {
      return;
    }

    const matchedAssemblyPoint = (assemblyPointOptions ?? []).find(
      (point) =>
        point.key === selectedAssemblyPointCode ||
        point.value === selectedAssemblyPointLabel,
    );

    setBulkSelectedAssemblyPointId(matchedAssemblyPoint?.key ?? "");
  }, [
    isSplitByAssemblyPointView,
    selectedAssemblyPointCode,
    selectedAssemblyPointLabel,
    assemblyPointOptions,
  ]);

  const handleBulkSaveAssignment = async () => {
    if (selectedRescuerIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một rescuer.");
      return;
    }

    if (!bulkSelectedAssemblyPointId) {
      toast.error("Vui lòng chọn thao tác trước khi áp dụng hàng loạt.");
      return;
    }

    const nextAssemblyPointId =
      bulkSelectedAssemblyPointId === UNASSIGN_SELECT_VALUE
        ? null
        : Number(bulkSelectedAssemblyPointId);

    if (nextAssemblyPointId !== null && Number.isNaN(nextAssemblyPointId)) {
      toast.error("Điểm tập kết không hợp lệ.");
      return;
    }

    const targetRescuerIds = [...selectedRescuerIds];

    try {
      setIsBulkUpdating(true);

      const results = await Promise.allSettled(
        targetRescuerIds.map((userId) =>
          updateAssignment({
            userId,
            assemblyPointId: nextAssemblyPointId,
          }),
        ),
      );

      const failedRescuerIds = results.flatMap((result, index) =>
        result.status === "rejected" ? [targetRescuerIds[index]] : [],
      );
      const successCount = results.length - failedRescuerIds.length;

      setRowSelectedAssemblyPointIds((previous) => {
        const nextSelections = { ...previous };

        for (const userId of targetRescuerIds) {
          nextSelections[userId] = "";
        }

        return nextSelections;
      });
      setSelectedRescuerIds(failedRescuerIds);
      if (!isSplitByAssemblyPointView) {
        setBulkSelectedAssemblyPointId("");
      }

      if (successCount > 0) {
        toast.success(
          nextAssemblyPointId === null
            ? `Đã bỏ gán ${successCount} rescuer khỏi điểm tập kết.`
            : `Đã thêm ${successCount} rescuer vào điểm tập kết.`,
        );
        await refetchCurrentView();
      }

      if (failedRescuerIds.length > 0) {
        toast.error(
          `Có ${failedRescuerIds.length} rescuer chưa được cập nhật. Vui lòng thử lại.`,
        );
      }
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const renderRescuerRow = (
    rescuer: RescuerEntity,
    options?: {
      showSelection?: boolean;
      draggableSide?: SplitPanelSide;
    },
  ) => {
    const showSelection = options?.showSelection ?? true;
    const draggableSide = options?.draggableSide;
    const isRowDraggable = Boolean(draggableSide) && !isAssignmentBusy;
    const isRowPending = pendingUserId === rescuer.id;
    const isRowSelected = showSelection && selectedRescuerIdSet.has(rescuer.id);
    const isRowBeingDragged = draggingRescuerId === rescuer.id;
    const fullName = `${rescuer.firstName} ${rescuer.lastName}`;
    const assemblyPointName =
      rescuer.assemblyPointId != null
        ? (assemblyPointNameById.get(rescuer.assemblyPointId) ??
          `Điểm tập kết #${rescuer.assemblyPointId}`)
        : null;
    const hasAssemblyPointOption =
      rescuer.assemblyPointId != null &&
      assemblyPointNameById.has(rescuer.assemblyPointId);
    const rawRowSelectedAssemblyPointId =
      rowSelectedAssemblyPointIds[rescuer.id] ?? "";
    const assignedAssemblyPointValue =
      rescuer.assemblyPointId != null
        ? String(rescuer.assemblyPointId)
        : ASSIGNED_SELECT_VALUE;
    const rowSelectedAssemblyPointId =
      rawRowSelectedAssemblyPointId ||
      (rescuer.hasAssemblyPoint ? assignedAssemblyPointValue : "");

    return (
      <div
        key={rescuer.id}
        draggable={isRowDraggable}
        onDragStart={
          isRowDraggable && draggableSide
            ? (event) => handleDragStart(event, rescuer, draggableSide)
            : undefined
        }
        onDragEnd={isRowDraggable ? handleDragEnd : undefined}
        className={cn(
          "rounded-lg border border-border bg-card p-2.5 transition-colors md:p-3",
          isRowDraggable && "cursor-grab active:cursor-grabbing",
          isRowSelected && "border-[#FF5722]/35 bg-[#FF5722]/3",
          isRowBeingDragged && "opacity-70",
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {showSelection ? (
              <div className="flex h-9 items-center">
                <Checkbox
                  checked={isRowSelected}
                  onCheckedChange={(checked) =>
                    handleToggleRescuerSelection(rescuer.id, checked === true)
                  }
                  disabled={isAssignmentBusy}
                  aria-label={`Chọn rescuer ${fullName}`}
                  className="border-[#FF5722]/40 data-[state=checked]:border-[#FF5722] data-[state=checked]:bg-[#FF5722]"
                />
              </div>
            ) : null}

            <Avatar className="h-9 w-9 border border-black/10">
              <AvatarImage
                src={rescuer.avatarUrl ?? DEFAULT_RESCUER_AVATAR}
                alt={fullName}
              />
              <AvatarFallback>
                {getInitials(rescuer.firstName, rescuer.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                {fullName}
              </p>

              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {rescuer.phone ? <span>{rescuer.phone}</span> : null}
                {rescuer.email ? <span>{rescuer.email}</span> : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-2 py-0.5 text-xs",
                    rescuer.hasAssemblyPoint
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-amber-300 bg-amber-50 text-amber-700",
                  )}
                >
                  {rescuer.hasAssemblyPoint
                    ? "Đã có điểm tập kết"
                    : "Chưa có điểm tập kết"}
                </Badge>

                <Badge
                  variant="outline"
                  className={cn(
                    "border px-2 py-0.5 text-xs",
                    rescuer.hasTeam
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 bg-slate-50 text-slate-700",
                  )}
                >
                  {rescuer.hasTeam ? "Đã vào team" : "Chưa vào team"}
                </Badge>

                {rescuer.rescuerType ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2 py-0.5 text-xs font-semibold",
                      rescuer.rescuerType === "Core"
                        ? "border-sky-300 bg-sky-50 text-sky-700"
                        : "border-[#FF5722]/40 bg-[#FF5722]/10 text-[#C2410C]",
                    )}
                  >
                    {rescuer.rescuerType === "Core"
                      ? "Nhân viên cố định"
                      : "Tình nguyện"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Select
              value={rowSelectedAssemblyPointId}
              onValueChange={(value) =>
                setRowSelectedAssemblyPointIds((previous) => ({
                  ...previous,
                  [rescuer.id]: value,
                }))
              }
              disabled={isAssignmentBusy}
            >
              <SelectTrigger className="h-8 w-55">
                <SelectValue
                  placeholder={
                    isAssemblyPointLoading
                      ? "Đang tải điểm tập kết..."
                      : "Chọn điểm tập kết"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {rescuer.hasAssemblyPoint &&
                !rawRowSelectedAssemblyPointId &&
                !hasAssemblyPointOption ? (
                  <SelectItem value={assignedAssemblyPointValue} disabled>
                    {assemblyPointName ?? "Đã có điểm tập kết"}
                  </SelectItem>
                ) : null}
                <SelectItem value={UNASSIGN_SELECT_VALUE}>
                  Bỏ gán khỏi điểm tập kết
                </SelectItem>
                {(assemblyPointOptions ?? []).map((point) => (
                  <SelectItem key={point.key} value={point.key}>
                    {point.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-[#FF5722]/35 text-[#FF5722] hover:bg-[#FF5722]/10"
              onClick={() =>
                handleSaveAssignment(rescuer.id, rawRowSelectedAssemblyPointId)
              }
              disabled={
                isAssignmentBusy ||
                isRowPending ||
                !rawRowSelectedAssemblyPointId
              }
            >
              <MapPin className="mr-1 h-3.5 w-3.5" />
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-[#FF5722]">
              Coordinator Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Quản lý rescuer theo điểm tập kết
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gán hoặc bỏ gán rescuer vào assembly point bằng dữ liệu thời gian
              thực.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/coordinator">
              <ArrowLeft className="h-4 w-4" />
              Quay về bản đồ điều phối
            </Link>
          </Button>
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  Tổng rescuer đã tải
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {totalCount}
                </p>
              </div>
              <UsersThree className="h-6 w-6 text-black/70" />
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  Đã có điểm tập kết
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {assignedCount}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  Chưa phân công
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {unassignedCount}
                </p>
              </div>
              <WarningCircle className="h-6 w-6 text-[#FF5722]" />
            </CardContent>
          </Card>
        </div>

        <Card className="border-black/10 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Tìm kiếm và bộ lọc rescuer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#FF5722]"
                weight="bold"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 border-[#FF5722]/30 pl-10 focus-visible:ring-[#FF5722]/25"
                placeholder="Tìm theo tên hoặc email"
              />
            </div>

            <Select
              value={assignmentFilter}
              onValueChange={(value) =>
                setAssignmentFilter(value as AssignmentFilter)
              }
              disabled={isSplitByAssemblyPointView}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc phân công" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả rescuer</SelectItem>
                <SelectItem value="assigned">Đã có điểm tập kết</SelectItem>
                <SelectItem value="unassigned">Chưa có điểm tập kết</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedAssemblyPointCode}
              onValueChange={setSelectedAssemblyPointCode}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue
                  placeholder={
                    isRescuerAssemblyPointLoading
                      ? "Đang tải điểm tập kết..."
                      : "Lọc theo điểm tập kết"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ASSEMBLY_POINT_FILTER_VALUE}>
                  Tất cả điểm tập kết
                </SelectItem>
                {(rescuerAssemblyPointOptions ?? []).map((point) => (
                  <SelectItem key={point.key} value={point.key}>
                    {point.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={teamFilter}
              onValueChange={(value) => setTeamFilter(value as TeamFilter)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc theo team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="inTeam">Đã vào team</SelectItem>
                <SelectItem value="notInTeam">Chưa vào team</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={rescuerTypeFilter}
              onValueChange={(value) =>
                setRescuerTypeFilter(value as RescuerTypeFilter)
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc theo loại rescuer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="Core">Nhân viên cố định</SelectItem>
                <SelectItem value="Volunteer">Tình nguyện</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-black/10 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base tracking-tight">
              Danh sách rescuer ({totalCount})
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={refetchCurrentView}
              disabled={isRescuerListRefetching}
            >
              <ArrowsClockwise
                className={cn(
                  "h-4 w-4",
                  isRescuerListRefetching && "animate-spin",
                )}
              />
              Làm mới
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {!isRescuerListLoading &&
            !isRescuerListError &&
            selectableRescuers.length > 0 ? (
              <div className="rounded-lg border border-[#FF5722]/15 bg-[#FF5722]/4 p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="select-all-visible-rescuers"
                      className="flex items-center gap-2 text-base font-medium tracking-tight"
                    >
                      <Checkbox
                        id="select-all-visible-rescuers"
                        checked={
                          areAllVisibleRescuersSelected
                            ? true
                            : hasPartialVisibleSelection
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) =>
                          handleToggleSelectAllVisible(checked === true)
                        }
                        disabled={isAssignmentBusy}
                        className="border-[#FF5722]/40 data-[state=checked]:border-[#FF5722] data-[state=checked]:bg-[#FF5722]"
                      />
                      <span>
                        {isSplitByAssemblyPointView
                          ? "Chọn tất cả rescuer cần bổ sung/điều phối"
                          : "Chọn tất cả trên danh sách hiện tại"}
                      </span>
                    </label>

                    <Badge
                      variant="outline"
                      className="border-[#FF5722]/25 bg-white text-[#C2410C]"
                    >
                      {selectedVisibleRescuerCount} rescuer đã chọn
                    </Badge>

                    {selectedVisibleRescuerCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRescuerIds([])}
                        disabled={isAssignmentBusy}
                        className="h-8 px-2 text-muted-foreground"
                      >
                        Bỏ chọn
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
                    {isSplitByAssemblyPointView ? (
                      <div className="flex h-9 items-center rounded-md border border-[#FF5722]/30 bg-white px-3 text-sm text-foreground sm:flex-1">
                        Điểm tập kết đích:{" "}
                        {selectedAssemblyPointLabel ?? "Đang tải..."}
                      </div>
                    ) : (
                      <Select
                        value={bulkSelectedAssemblyPointId}
                        onValueChange={setBulkSelectedAssemblyPointId}
                        disabled={
                          isAssignmentBusy || selectedVisibleRescuerCount === 0
                        }
                      >
                        <SelectTrigger className="h-9 w-full sm:flex-1">
                          <SelectValue
                            placeholder={
                              isAssemblyPointLoading
                                ? "Đang tải điểm tập kết..."
                                : "Chọn điểm tập kết cho nhóm đã chọn"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGN_SELECT_VALUE}>
                            Bỏ gán khỏi điểm tập kết
                          </SelectItem>
                          {(assemblyPointOptions ?? []).map((point) => (
                            <SelectItem key={point.key} value={point.key}>
                              {point.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      type="button"
                      className="h-9 gap-2 bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
                      onClick={handleBulkSaveAssignment}
                      disabled={
                        isAssignmentBusy ||
                        selectedVisibleRescuerCount === 0 ||
                        !bulkSelectedAssemblyPointId
                      }
                    >
                      <MapPin className="h-4 w-4" />
                      {isSplitByAssemblyPointView
                        ? "Thêm vào điểm tập kết đang chọn"
                        : "Áp dụng cho nhóm đã chọn"}
                    </Button>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {isSplitByAssemblyPointView
                    ? "Danh sách bên phải gồm rescuer chưa có điểm tập kết hoặc đã có điểm tập kết nhưng chưa xác nhận có mặt. Bạn có thể kéo-thả qua lại giữa hai cột hoặc chọn nhiều người để gán nhanh."
                    : "Coordinator có thể tick nhiều rescuer rồi gán chung vào cùng một assembly point ngay trên trang hiện tại."}
                </p>
              </div>
            ) : null}

            {isRescuerListLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-20 w-full" />
                ))}
              </div>
            ) : isRescuerListError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Không thể tải danh sách rescuer.
              </div>
            ) : visibleRescuers.length === 0 && !isSplitByAssemblyPointView ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Không tìm thấy rescuer phù hợp với điều kiện hiện tại.
              </div>
            ) : isSplitByAssemblyPointView ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <div
                  ref={leftPanelRef}
                  onDragOver={(event) => handlePanelDragOver(event, "left")}
                  onDragLeave={() => handlePanelDragLeave("left")}
                  onDrop={(event) => {
                    void handlePanelDrop(event, "left");
                  }}
                  className="rounded-lg border border-border/70 bg-muted/10"
                >
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      Bên trái: Rescuer trong điểm tập kết{" "}
                      {selectedAssemblyPointLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignedCount} rescuer đang thuộc điểm tập kết này. Kéo
                      từ bên phải qua để thêm ngay.
                    </p>
                  </div>

                  <div className="space-y-2 p-3">
                    {assignedInSelectedPointRescuers.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                        Chưa có rescuer nào trong điểm tập kết này.
                      </div>
                    ) : (
                      assignedInSelectedPointRescuers.map((rescuer) =>
                        renderRescuerRow(rescuer, {
                          showSelection: false,
                          draggableSide: "left",
                        }),
                      )
                    )}
                  </div>
                </div>

                <div
                  ref={rightPanelRef}
                  onDragOver={(event) => handlePanelDragOver(event, "right")}
                  onDragLeave={() => handlePanelDragLeave("right")}
                  onDrop={(event) => {
                    void handlePanelDrop(event, "right");
                  }}
                  className="rounded-lg border border-[#FF5722]/20 bg-[#FF5722]/3"
                >
                  <div className="border-b border-[#FF5722]/15 px-3 py-2">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      Bên phải: Chưa xác nhận có mặt hoặc chưa có điểm tập kết
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rightPanelRescuers.length} rescuer có thể thêm vào điểm
                      tập kết. Kéo ngược từ trái qua để bỏ gán.
                    </p>
                  </div>

                  <div className="space-y-2 p-3">
                    {rightPanelRescuers.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                        Không còn rescuer phù hợp với điều kiện chưa xác nhận có
                        mặt hoặc chưa có điểm tập kết theo bộ lọc hiện tại.
                      </div>
                    ) : (
                      rightPanelRescuers.map((rescuer) =>
                        renderRescuerRow(rescuer, { draggableSide: "right" }),
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {visibleRescuers.map((rescuer) => renderRescuerRow(rescuer))}

                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Trang {currentPage}/{Math.max(totalPages, 1)} • Tổng{" "}
                        {totalCount} rescuer
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">
                          Hiển thị
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => setPageSize(Number(value))}
                        >
                          <SelectTrigger className="h-8 w-22">
                            <SelectValue placeholder="20" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={String(option)}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">
                          / trang
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((previous) =>
                            Math.max(1, previous - 1),
                          )
                        }
                        disabled={currentPage <= 1 || isRescuerListRefetching}
                      >
                        Trước
                      </Button>

                      {pageItems.map((item) => {
                        if (item === "dots-left" || item === "dots-right") {
                          return (
                            <span
                              key={item}
                              className="px-2 text-sm text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }

                        const isActive = item === currentPage;

                        return (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={cn(
                              "min-w-9 px-2",
                              isActive &&
                                "bg-[#FF5722] text-white hover:bg-[#FF5722]/90",
                            )}
                            onClick={() => setCurrentPage(item)}
                            disabled={isRescuerListRefetching}
                          >
                            {item}
                          </Button>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((previous) =>
                            Math.min(Math.max(totalPages, 1), previous + 1),
                          )
                        }
                        disabled={
                          currentPage >= totalPages || isRescuerListRefetching
                        }
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <p className="text-xs text-muted-foreground">
              {isSplitByAssemblyPointView
                ? "Gợi ý: kéo từ phải sang trái để thêm vào điểm tập kết, kéo từ trái sang phải để bỏ gán về nhóm chờ điều phối."
                : "Gợi ý: ô tìm kiếm và các bộ lọc đang gửi trực tiếp lên backend, danh sách hiện tại là kết quả đã được backend lọc sẵn."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
