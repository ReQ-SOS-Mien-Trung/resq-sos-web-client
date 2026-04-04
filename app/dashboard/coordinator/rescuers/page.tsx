"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type SplitRowLayout = {
  top: number;
  left: number;
};

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
  const [splitPanelOverrides, setSplitPanelOverrides] = useState<
    Record<string, SplitPanelSide>
  >({});
  const [splitPanelMoveOrderByRescuerId, setSplitPanelMoveOrderByRescuerId] =
    useState<Record<string, number>>({});
  const [latestDroppedRescuerId, setLatestDroppedRescuerId] = useState<
    string | null
  >(null);
  const splitDropSequenceRef = useRef(0);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const splitRowLayoutsRef = useRef<Record<string, SplitRowLayout>>({});
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

  useEffect(() => {
    setSplitPanelOverrides({});
    setSplitPanelMoveOrderByRescuerId({});
    setLatestDroppedRescuerId(null);
    splitDropSequenceRef.current = 0;
  }, [selectedAssemblyPointCode]);

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

  const baseSplitRescuerMap = useMemo(() => {
    const rescuerMap = new Map<string, RescuerEntity>();

    for (const rescuer of assignedInSelectedPointRescuers) {
      rescuerMap.set(rescuer.id, rescuer);
    }

    for (const rescuer of rightPanelRescuers) {
      if (!rescuerMap.has(rescuer.id)) {
        rescuerMap.set(rescuer.id, rescuer);
      }
    }

    return rescuerMap;
  }, [assignedInSelectedPointRescuers, rightPanelRescuers]);

  const baseLeftRescuerIdSet = useMemo(
    () => new Set(assignedInSelectedPointRescuers.map((rescuer) => rescuer.id)),
    [assignedInSelectedPointRescuers],
  );

  const baseRightRescuerIdSet = useMemo(
    () => new Set(rightPanelRescuers.map((rescuer) => rescuer.id)),
    [rightPanelRescuers],
  );

  const splitBaseAssemblyPointByRescuerId = useMemo(() => {
    const assemblyPointByRescuerId = new Map<string, number | null>();

    for (const rescuer of assignedCandidateRescuers) {
      assemblyPointByRescuerId.set(rescuer.id, rescuer.assemblyPointId ?? null);
    }

    for (const rescuer of assignedInSelectedPointRescuers) {
      assemblyPointByRescuerId.set(rescuer.id, rescuer.assemblyPointId ?? null);
    }

    for (const rescuer of unassignedRescuers) {
      assemblyPointByRescuerId.set(rescuer.id, null);
    }

    for (const rescuer of rightPanelRescuers) {
      if (!assemblyPointByRescuerId.has(rescuer.id)) {
        assemblyPointByRescuerId.set(
          rescuer.id,
          rescuer.assemblyPointId ?? null,
        );
      }
    }

    return assemblyPointByRescuerId;
  }, [
    assignedCandidateRescuers,
    assignedInSelectedPointRescuers,
    unassignedRescuers,
    rightPanelRescuers,
  ]);

  const splitLeftPanelRescuers = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return [];
    }

    const displayedIds = new Set<string>();
    const items: RescuerEntity[] = [];

    const movedIntoLeftRescuerIds = Object.entries(splitPanelOverrides)
      .filter(
        ([rescuerId, targetPanel]) =>
          targetPanel === "left" && !baseLeftRescuerIdSet.has(rescuerId),
      )
      .sort(
        ([leftRescuerId], [rightRescuerId]) =>
          (splitPanelMoveOrderByRescuerId[rightRescuerId] ?? 0) -
          (splitPanelMoveOrderByRescuerId[leftRescuerId] ?? 0),
      )
      .map(([rescuerId]) => rescuerId);

    for (const rescuerId of movedIntoLeftRescuerIds) {
      const rescuer = baseSplitRescuerMap.get(rescuerId);
      if (!rescuer || displayedIds.has(rescuer.id)) {
        continue;
      }

      items.push(rescuer);
      displayedIds.add(rescuer.id);
    }

    for (const rescuer of assignedInSelectedPointRescuers) {
      if (splitPanelOverrides[rescuer.id] === "right") {
        continue;
      }

      if (displayedIds.has(rescuer.id)) {
        continue;
      }

      items.push(rescuer);
      displayedIds.add(rescuer.id);
    }

    return items;
  }, [
    isSplitByAssemblyPointView,
    baseLeftRescuerIdSet,
    baseSplitRescuerMap,
    assignedInSelectedPointRescuers,
    splitPanelOverrides,
    splitPanelMoveOrderByRescuerId,
  ]);

  const splitRightPanelRescuers = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return [];
    }

    const displayedIds = new Set<string>();
    const items: RescuerEntity[] = [];

    const movedIntoRightRescuerIds = Object.entries(splitPanelOverrides)
      .filter(
        ([rescuerId, targetPanel]) =>
          targetPanel === "right" && !baseRightRescuerIdSet.has(rescuerId),
      )
      .sort(
        ([leftRescuerId], [rightRescuerId]) =>
          (splitPanelMoveOrderByRescuerId[rightRescuerId] ?? 0) -
          (splitPanelMoveOrderByRescuerId[leftRescuerId] ?? 0),
      )
      .map(([rescuerId]) => rescuerId);

    for (const rescuerId of movedIntoRightRescuerIds) {
      const rescuer = baseSplitRescuerMap.get(rescuerId);
      if (!rescuer || displayedIds.has(rescuer.id)) {
        continue;
      }

      items.push(rescuer);
      displayedIds.add(rescuer.id);
    }

    for (const rescuer of rightPanelRescuers) {
      if (splitPanelOverrides[rescuer.id] === "left") {
        continue;
      }

      if (displayedIds.has(rescuer.id)) {
        continue;
      }

      items.push(rescuer);
      displayedIds.add(rescuer.id);
    }

    return items;
  }, [
    isSplitByAssemblyPointView,
    baseRightRescuerIdSet,
    baseSplitRescuerMap,
    rightPanelRescuers,
    splitPanelOverrides,
    splitPanelMoveOrderByRescuerId,
  ]);

  const visibleRescuers = isSplitByAssemblyPointView
    ? splitLeftPanelRescuers
    : rescuers;
  const selectableRescuers = isSplitByAssemblyPointView
    ? splitRightPanelRescuers
    : visibleRescuers;
  const totalPages = rescuersData?.totalPages ?? 1;
  const splitUniqueRescuerCount = useMemo(() => {
    if (!isSplitByAssemblyPointView) {
      return 0;
    }

    const rescuerIds = new Set<string>([
      ...splitLeftPanelRescuers.map((rescuer) => rescuer.id),
      ...splitRightPanelRescuers.map((rescuer) => rescuer.id),
    ]);

    return rescuerIds.size;
  }, [
    isSplitByAssemblyPointView,
    splitLeftPanelRescuers,
    splitRightPanelRescuers,
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

  const splitPendingAssignmentEntries = useMemo(
    () =>
      isSplitByAssemblyPointView
        ? Object.entries(rowSelectedAssemblyPointIds).filter(
            ([rescuerId, selectedAssemblyPointId]) =>
              Boolean(selectedAssemblyPointId) &&
              baseSplitRescuerMap.has(rescuerId),
          )
        : [],
    [
      isSplitByAssemblyPointView,
      rowSelectedAssemblyPointIds,
      baseSplitRescuerMap,
    ],
  );

  const splitPendingSaveCount = splitPendingAssignmentEntries.length;

  const assignedCount = useMemo(() => {
    if (isSplitByAssemblyPointView) {
      return splitLeftPanelRescuers.length;
    }

    return rescuers.filter((rescuer) => rescuer.hasAssemblyPoint).length;
  }, [isSplitByAssemblyPointView, splitLeftPanelRescuers, rescuers]);

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
      setSplitPanelOverrides({});
      setSplitPanelMoveOrderByRescuerId({});
      setLatestDroppedRescuerId(null);
      splitDropSequenceRef.current = 0;
      return;
    }

    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;

    if (leftPanel) {
      gsap.to(leftPanel, {
        duration: 0.18,
        borderColor:
          activeDropPanel === "left" ? "#FF5722" : "rgba(14, 165, 233, 0.5)",
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
          activeDropPanel === "right" ? "#FF5722" : "rgba(255, 87, 34, 0.45)",
        boxShadow:
          activeDropPanel === "right"
            ? "0 0 0 2px rgba(255, 87, 34, 0.25)"
            : "0 0 0 0 rgba(255, 87, 34, 0)",
        ease: "power2.out",
      });
    }
  }, [isSplitByAssemblyPointView, activeDropPanel]);

  useLayoutEffect(() => {
    if (!isSplitByAssemblyPointView) {
      splitRowLayoutsRef.current = {};
      return;
    }

    const rowElements = [
      ...(leftPanelRef.current?.querySelectorAll<HTMLElement>(
        "[data-split-rescuer-id]",
      ) ?? []),
      ...(rightPanelRef.current?.querySelectorAll<HTMLElement>(
        "[data-split-rescuer-id]",
      ) ?? []),
    ];

    const previousLayouts = splitRowLayoutsRef.current;
    const nextLayouts: Record<string, SplitRowLayout> = {};

    for (const rowElement of rowElements) {
      const rescuerId = rowElement.dataset.splitRescuerId;
      if (!rescuerId) {
        continue;
      }

      const rowRect = rowElement.getBoundingClientRect();
      nextLayouts[rescuerId] = { top: rowRect.top, left: rowRect.left };

      const previousLayout = previousLayouts[rescuerId];
      if (previousLayout) {
        const deltaX = previousLayout.left - rowRect.left;
        const deltaY = previousLayout.top - rowRect.top;

        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          gsap.fromTo(
            rowElement,
            { x: deltaX, y: deltaY },
            {
              x: 0,
              y: 0,
              duration: 0.32,
              ease: "power2.out",
              clearProps: "transform",
              overwrite: "auto",
            },
          );
        }

        continue;
      }

      if (rescuerId === latestDroppedRescuerId) {
        gsap.fromTo(
          rowElement,
          { y: -18, opacity: 0.35, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.28,
            ease: "power2.out",
            clearProps: "transform,opacity",
            overwrite: "auto",
          },
        );
      }
    }

    splitRowLayoutsRef.current = nextLayouts;
  }, [
    isSplitByAssemblyPointView,
    splitLeftPanelRescuers,
    splitRightPanelRescuers,
    latestDroppedRescuerId,
  ]);

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
  const isAssignmentBusy = isUpdatingAssignment || isBulkUpdating;
  const shouldShowAssignmentToolbar =
    !isRescuerListLoading &&
    !isRescuerListError &&
    (selectableRescuers.length > 0 ||
      (isSplitByAssemblyPointView && splitPendingSaveCount > 0));

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
        await updateAssignment({ userIds: [userId], assemblyPointId: null });
        toast.success("Đã bỏ phân công rescuer khỏi điểm tập kết.");
      } else {
        const pointId = Number(selectedAssemblyPointId);
        if (Number.isNaN(pointId)) {
          toast.error("Điểm tập kết không hợp lệ.");
          return;
        }

        await updateAssignment({ userIds: [userId], assemblyPointId: pointId });
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
      setSplitPanelOverrides((previous) => {
        if (!previous[userId]) {
          return previous;
        }

        const nextOverrides = { ...previous };
        delete nextOverrides[userId];
        return nextOverrides;
      });
      setSplitPanelMoveOrderByRescuerId((previous) => {
        if (previous[userId] == null) {
          return previous;
        }

        const nextMoveOrder = { ...previous };
        delete nextMoveOrder[userId];
        return nextMoveOrder;
      });
      setLatestDroppedRescuerId((previous) =>
        previous === userId ? null : previous,
      );
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

  const handlePanelDrop = (
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

    const droppedRescuerId = draggingRescuerId;
    const shouldResetToBasePanel =
      (targetPanel === "left" && baseLeftRescuerIdSet.has(droppedRescuerId)) ||
      (targetPanel === "right" && baseRightRescuerIdSet.has(droppedRescuerId));

    if (dragSourcePanel === "right" && targetPanel === "left") {
      if (splitTargetAssemblyPointId === null) {
        toast.error("Không tìm thấy điểm tập kết đích để kéo thả.");
        resetDragState();
        return;
      }
    }

    setSplitPanelOverrides((previous) => {
      const nextOverrides = { ...previous };

      if (shouldResetToBasePanel) {
        delete nextOverrides[droppedRescuerId];
      } else {
        nextOverrides[droppedRescuerId] = targetPanel;
      }

      return nextOverrides;
    });

    if (shouldResetToBasePanel) {
      setSplitPanelMoveOrderByRescuerId((previous) => {
        if (previous[droppedRescuerId] == null) {
          return previous;
        }

        const nextMoveOrder = { ...previous };
        delete nextMoveOrder[droppedRescuerId];
        return nextMoveOrder;
      });
      setLatestDroppedRescuerId((previous) =>
        previous === droppedRescuerId ? null : previous,
      );
    } else {
      splitDropSequenceRef.current += 1;
      const nextMoveOrder = splitDropSequenceRef.current;
      setSplitPanelMoveOrderByRescuerId((previous) => ({
        ...previous,
        [droppedRescuerId]: nextMoveOrder,
      }));
      setLatestDroppedRescuerId(droppedRescuerId);
    }

    setRowSelectedAssemblyPointIds((previous) => {
      const nextSelections = { ...previous };

      if (shouldResetToBasePanel) {
        nextSelections[droppedRescuerId] = "";
        return nextSelections;
      }

      const currentAssemblyPointId =
        splitBaseAssemblyPointByRescuerId.get(droppedRescuerId) ?? null;

      if (targetPanel === "left") {
        nextSelections[droppedRescuerId] =
          splitTargetAssemblyPointId !== null &&
          currentAssemblyPointId !== splitTargetAssemblyPointId
            ? String(splitTargetAssemblyPointId)
            : "";
      } else {
        nextSelections[droppedRescuerId] =
          currentAssemblyPointId !== null ? UNASSIGN_SELECT_VALUE : "";
      }

      return nextSelections;
    });

    setSelectedRescuerIds((previous) =>
      previous.filter((rescuerId) => rescuerId !== droppedRescuerId),
    );

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

    resetDragState();
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

      await updateAssignment({
        userIds: targetRescuerIds,
        assemblyPointId: nextAssemblyPointId,
      });

      setRowSelectedAssemblyPointIds((previous) => {
        const nextSelections = { ...previous };

        for (const userId of targetRescuerIds) {
          nextSelections[userId] = "";
        }

        return nextSelections;
      });
      setSelectedRescuerIds([]);
      setSplitPanelOverrides((previous) => {
        let hasChange = false;
        const nextOverrides = { ...previous };

        for (const rescuerId of targetRescuerIds) {
          if (nextOverrides[rescuerId]) {
            delete nextOverrides[rescuerId];
            hasChange = true;
          }
        }

        return hasChange ? nextOverrides : previous;
      });
      setSplitPanelMoveOrderByRescuerId((previous) => {
        let hasChange = false;
        const nextMoveOrder = { ...previous };

        for (const rescuerId of targetRescuerIds) {
          if (nextMoveOrder[rescuerId] != null) {
            delete nextMoveOrder[rescuerId];
            hasChange = true;
          }
        }

        return hasChange ? nextMoveOrder : previous;
      });
      setLatestDroppedRescuerId((previous) =>
        previous && targetRescuerIds.includes(previous) ? null : previous,
      );
      if (!isSplitByAssemblyPointView) {
        setBulkSelectedAssemblyPointId("");
      }

      toast.success(
        nextAssemblyPointId === null
          ? `Đã bỏ gán ${targetRescuerIds.length} rescuer khỏi điểm tập kết.`
          : `Đã thêm ${targetRescuerIds.length} rescuer vào điểm tập kết.`,
      );
      await refetchCurrentView();
    } catch {
      toast.error("Không thể cập nhật phân công hàng loạt. Vui lòng thử lại.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleSaveAllSplitPendingAssignments = async () => {
    if (!isSplitByAssemblyPointView) {
      return;
    }

    if (splitPendingAssignmentEntries.length === 0) {
      toast.error("Không có thay đổi kéo-thả nào để lưu.");
      return;
    }

    const groupedPayloadByAssemblyPoint = new Map<
      string,
      { userIds: string[]; assemblyPointId: number | null }
    >();

    for (const [
      rescuerId,
      selectedAssemblyPointId,
    ] of splitPendingAssignmentEntries) {
      const nextAssemblyPointId =
        selectedAssemblyPointId === UNASSIGN_SELECT_VALUE
          ? null
          : Number(selectedAssemblyPointId);

      if (nextAssemblyPointId !== null && Number.isNaN(nextAssemblyPointId)) {
        toast.error("Có thay đổi không hợp lệ. Vui lòng kiểm tra lại.");
        return;
      }

      const groupKey =
        nextAssemblyPointId === null
          ? UNASSIGN_SELECT_VALUE
          : String(nextAssemblyPointId);
      const currentGroup = groupedPayloadByAssemblyPoint.get(groupKey);

      if (currentGroup) {
        currentGroup.userIds.push(rescuerId);
      } else {
        groupedPayloadByAssemblyPoint.set(groupKey, {
          userIds: [rescuerId],
          assemblyPointId: nextAssemblyPointId,
        });
      }
    }

    const groupedPayloads = Array.from(groupedPayloadByAssemblyPoint.values());

    if (groupedPayloads.length === 0) {
      toast.error("Không có thay đổi hợp lệ để lưu.");
      return;
    }

    try {
      setIsBulkUpdating(true);

      const results = await Promise.allSettled(
        groupedPayloads.map((payload) => updateAssignment(payload)),
      );

      const successfulRescuerIds: string[] = [];
      const failedRescuerIds: string[] = [];

      groupedPayloads.forEach((payload, index) => {
        if (results[index]?.status === "fulfilled") {
          successfulRescuerIds.push(...payload.userIds);
        } else {
          failedRescuerIds.push(...payload.userIds);
        }
      });

      if (successfulRescuerIds.length > 0) {
        const successfulRescuerIdSet = new Set(successfulRescuerIds);

        setRowSelectedAssemblyPointIds((previous) => {
          const nextSelections = { ...previous };

          for (const rescuerId of successfulRescuerIds) {
            nextSelections[rescuerId] = "";
          }

          return nextSelections;
        });

        setSplitPanelOverrides((previous) => {
          let hasChange = false;
          const nextOverrides = { ...previous };

          for (const rescuerId of successfulRescuerIds) {
            if (nextOverrides[rescuerId]) {
              delete nextOverrides[rescuerId];
              hasChange = true;
            }
          }

          return hasChange ? nextOverrides : previous;
        });

        setSplitPanelMoveOrderByRescuerId((previous) => {
          let hasChange = false;
          const nextMoveOrder = { ...previous };

          for (const rescuerId of successfulRescuerIds) {
            if (nextMoveOrder[rescuerId] != null) {
              delete nextMoveOrder[rescuerId];
              hasChange = true;
            }
          }

          return hasChange ? nextMoveOrder : previous;
        });

        setSelectedRescuerIds((previous) =>
          previous.filter(
            (rescuerId) => !successfulRescuerIdSet.has(rescuerId),
          ),
        );

        setLatestDroppedRescuerId((previous) =>
          previous && successfulRescuerIdSet.has(previous) ? null : previous,
        );

        toast.success(
          `Đã lưu ${successfulRescuerIds.length} thay đổi phân công.`,
        );
        await refetchCurrentView();
      }

      if (failedRescuerIds.length > 0) {
        toast.error(
          `Có ${failedRescuerIds.length} rescuer chưa được cập nhật. Vui lòng thử lại.`,
        );
      }
    } catch {
      toast.error("Không thể lưu tất cả thay đổi kéo-thả. Vui lòng thử lại.");
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
    const isRecentlyDraggedRow =
      isSplitByAssemblyPointView &&
      Boolean(rawRowSelectedAssemblyPointId) &&
      (splitPanelMoveOrderByRescuerId[rescuer.id] != null ||
        latestDroppedRescuerId === rescuer.id);

    return (
      <div
        key={rescuer.id}
        data-split-rescuer-id={draggableSide ? rescuer.id : undefined}
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
          isSplitByAssemblyPointView &&
            draggableSide &&
            "will-change-transform",
          isRecentlyDraggedRow &&
            "border-[#FF5722]/65 bg-[#FFF7F2] shadow-[0_0_0_2px_rgba(255,87,34,0.2)]",
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

                {rawRowSelectedAssemblyPointId ? (
                  <Badge
                    variant="outline"
                    className="border-[#FF5722]/35 bg-[#FF5722]/10 px-2 py-0.5 text-xs text-[#C2410C]"
                  >
                    Chưa lưu
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
              <SelectTrigger className="h-8 w-55 border-white bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
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

            {!isSplitByAssemblyPointView ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-[#FF5722]/35 text-[#FF5722] hover:bg-[#FF5722]/10"
                onClick={() =>
                  handleSaveAssignment(
                    rescuer.id,
                    rawRowSelectedAssemblyPointId,
                  )
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
            ) : null}
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
            {shouldShowAssignmentToolbar ? (
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
                          ? "Tất cả"
                          : "Chọn tất cả trên danh sách hiện tại"}
                      </span>
                    </label>

                    <Badge
                      variant="outline"
                      className="border-[#FF5722]/25 bg-white text-[#C2410C]"
                    >
                      {selectedVisibleRescuerCount} rescuer đã chọn
                    </Badge>

                    {isSplitByAssemblyPointView && splitPendingSaveCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-[#FF5722]/25 bg-white text-[#C2410C]"
                      >
                        {splitPendingSaveCount} thay đổi chờ lưu
                      </Badge>
                    ) : null}

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

                  <div
                    className={cn(
                      "w-full gap-2 xl:max-w-2xl",
                      isSplitByAssemblyPointView
                        ? "flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-stretch"
                        : "flex flex-col sm:flex-row",
                    )}
                  >
                    {isSplitByAssemblyPointView ? (
                      <div
                        className="flex min-h-9 min-w-0 items-center rounded-md border border-[#FF5722]/30 bg-white px-3 py-1.5 text-sm font-medium text-foreground sm:h-full"
                        title={selectedAssemblyPointLabel ?? "Đang tải..."}
                      >
                        <span className="leading-5">
                          {selectedAssemblyPointLabel ?? "Đang tải..."}
                        </span>
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
                      className={cn(
                        "h-9 gap-2 bg-[#FF5722] text-white hover:bg-[#FF5722]/90",
                        isSplitByAssemblyPointView && "sm:h-full",
                      )}
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

                    {isSplitByAssemblyPointView ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 gap-2 border-[#FF5722]/35 text-[#FF5722] hover:bg-[#FF5722]/10",
                          "sm:h-full",
                        )}
                        onClick={handleSaveAllSplitPendingAssignments}
                        disabled={
                          isAssignmentBusy || splitPendingSaveCount === 0
                        }
                      >
                        <MapPin className="h-4 w-4" />
                        Lưu tất cả thay đổi ({splitPendingSaveCount})
                      </Button>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {isSplitByAssemblyPointView
                    ? "Danh sách bên phải gồm rescuer chưa có điểm tập kết hoặc đã có điểm tập kết nhưng chưa xác nhận có mặt. Kéo-thả chỉ di chuyển tạm thời giữa hai cột, cần bấm Lưu tất cả thay đổi hoặc Áp dụng để cập nhật chính thức."
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
                  className="rounded-lg border border-sky-200 bg-sky-50/55"
                >
                  <div className="border-b border-sky-200/90 bg-sky-50/70 px-3 py-2">
                    <p className="text-sm font-semibold tracking-tight text-sky-900">
                      Rescuer trong điểm tập kết {selectedAssemblyPointLabel}
                    </p>
                    <p className="text-xs text-sky-800/80">
                      {assignedCount} rescuer đang thuộc điểm tập kết này. Kéo
                      từ bên phải qua để thêm tạm, rồi bấm Lưu tất cả thay đổi.
                    </p>
                  </div>

                  <div className="space-y-2 p-3">
                    {splitLeftPanelRescuers.length === 0 ? (
                      <div className="rounded-md border border-dashed border-sky-200 bg-white/90 p-3 text-sm text-sky-900/70">
                        Chưa có rescuer nào trong điểm tập kết này.
                      </div>
                    ) : (
                      splitLeftPanelRescuers.map((rescuer) =>
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
                  className="rounded-lg border border-[#FF5722]/40 bg-[#FF5722]/10"
                >
                  <div className="border-b border-[#FF5722]/25 bg-[#FF5722]/8 px-3 py-2">
                    <p className="text-sm font-semibold tracking-tight text-[#7C2D12]">
                      Chưa xác nhận có mặt hoặc chưa có điểm tập kết
                    </p>
                    <p className="text-xs text-[#9A3412]/80">
                      {splitRightPanelRescuers.length} rescuer có thể thêm vào
                      điểm tập kết. Kéo ngược từ trái qua để bỏ gán tạm.
                    </p>
                  </div>

                  <div className="space-y-2 p-3">
                    {splitRightPanelRescuers.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[#FF5722]/35 bg-white/90 p-3 text-sm text-[#9A3412]/80">
                        Không còn rescuer phù hợp với điều kiện chưa xác nhận có
                        mặt hoặc chưa có điểm tập kết theo bộ lọc hiện tại.
                      </div>
                    ) : (
                      splitRightPanelRescuers.map((rescuer) =>
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
                ? "Gợi ý: rescuer mới kéo-thả sẽ lên đầu cột đích và chỉ cập nhật backend khi bấm Lưu tất cả thay đổi hoặc Áp dụng."
                : "Gợi ý: ô tìm kiếm và các bộ lọc đang gửi trực tiếp lên backend, danh sách hiện tại là kết quả đã được backend lọc sẵn."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
