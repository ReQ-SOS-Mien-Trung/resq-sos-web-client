import api from "@/config/axios";
import {
  CreateActivityResponse,
  ActivityStatus,
  CreateMissionActivityRequest,
  CreateMissionRequest,
  CreateMissionResponse,
  GetMissionsParams,
  GetMissionsResponse,
  MissionActivity,
  MissionEntity,
  UpdateActivityRequest,
  UpdateActivityResponse,
  UpdateActivityStatusRequest,
  UpdateActivityStatusResponse,
  UpdateMissionRequest,
  UpdateMissionResponse,
  UpdateMissionStatusRequest,
  UpdateMissionStatusResponse,
  ActivityRouteResponse,
  GetActivityRouteParams,
  GetMissionTeamRouteParams,
  MissionTeamRouteLeg,
  MissionTeamRouteResponse,
  ConfirmReturnSuppliesRequest,
} from "./type";

function toNumberOrZero(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumberOrNull(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function toTrimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function normalizeMissionTeamRouteLeg(
  leg: MissionTeamRouteLeg,
): MissionTeamRouteLeg {
  const distanceMeters = toNumberOrZero(leg?.distanceMeters);
  const durationSeconds = toNumberOrZero(leg?.durationSeconds);
  const overviewPolyline = toTrimmedStringOrNull(leg?.overviewPolyline);

  return {
    ...leg,
    segmentIndex: toNumberOrNull(leg?.segmentIndex),
    fromStep: toNumberOrNull(leg?.fromStep),
    toStep: toNumberOrNull(leg?.toStep),
    fromLatitude: toNumberOrNull(leg?.fromLatitude),
    fromLongitude: toNumberOrNull(leg?.fromLongitude),
    toLatitude: toNumberOrNull(leg?.toLatitude),
    toLongitude: toNumberOrNull(leg?.toLongitude),
    distanceMeters,
    distanceText:
      toTrimmedStringOrNull(leg?.distanceText) ??
      formatRouteDistanceText(distanceMeters),
    durationSeconds,
    durationText:
      toTrimmedStringOrNull(leg?.durationText) ??
      formatRouteDurationText(durationSeconds),
    overviewPolyline,
    vehicleUsed: toTrimmedStringOrNull(leg?.vehicleUsed),
    status:
      toTrimmedStringOrNull(leg?.status) ??
      (overviewPolyline ? "OK" : "NO_ROUTE"),
    errorMessage: toTrimmedStringOrNull(leg?.errorMessage),
  };
}

function normalizeActivityRouteResponse(
  response: ActivityRouteResponse,
): ActivityRouteResponse {
  const normalizedStatus =
    typeof response?.status === "string" && response.status.trim()
      ? response.status.trim()
      : response?.route
        ? "OK"
        : "NO_ROUTE";

  const normalizedErrorMessage =
    typeof response?.errorMessage === "string" &&
    response.errorMessage.trim().length > 0
      ? response.errorMessage.trim()
      : null;

  return {
    ...response,
    status: normalizedStatus,
    errorMessage: normalizedErrorMessage,
    route: response?.route ?? null,
  };
}

function normalizeMissionTeamRouteResponse(
  response: MissionTeamRouteResponse,
): MissionTeamRouteResponse {
  const normalizedLegs = Array.isArray(response?.legs)
    ? response.legs.map(normalizeMissionTeamRouteLeg)
    : [];

  const legDistanceMeters = normalizedLegs.reduce(
    (sum, leg) => sum + toNumberOrZero(leg.distanceMeters),
    0,
  );
  const legDurationSeconds = normalizedLegs.reduce(
    (sum, leg) => sum + toNumberOrZero(leg.durationSeconds),
    0,
  );

  const hasLegPolyline = normalizedLegs.some(
    (leg) =>
      typeof leg.overviewPolyline === "string" &&
      leg.overviewPolyline.trim().length > 0,
  );

  const normalizedOverviewPolyline =
    typeof response?.overviewPolyline === "string"
      ? response.overviewPolyline
      : null;

  const normalizedStatus =
    typeof response?.status === "string" && response.status.trim()
      ? response.status.trim()
      : normalizedOverviewPolyline || hasLegPolyline
        ? "OK"
        : "NO_ROUTE";

  const normalizedErrorMessage =
    typeof response?.errorMessage === "string" &&
    response.errorMessage.trim().length > 0
      ? response.errorMessage.trim()
      : null;

  return {
    ...response,
    status: normalizedStatus,
    errorMessage: normalizedErrorMessage,
    totalDistanceMeters:
      toNumberOrZero(response?.totalDistanceMeters) || legDistanceMeters,
    totalDurationSeconds:
      toNumberOrZero(response?.totalDurationSeconds) || legDurationSeconds,
    overviewPolyline: normalizedOverviewPolyline,
    waypoints: Array.isArray(response?.waypoints) ? response.waypoints : [],
    legs: normalizedLegs,
  };
}

function normalizeCreateMissionRequest(
  request: CreateMissionRequest,
): CreateMissionRequest {
  return {
    clusterId: toNumberOrZero(request.clusterId),
    missionType: String(request.missionType || "RESCUE").toUpperCase(),
    priorityScore: toNumberOrZero(request.priorityScore),
    startTime: request.startTime,
    expectedEndTime: request.expectedEndTime,
    activities: (request.activities ?? []).map((activity, index) => ({
      step: toNumberOrZero(activity.step) || index + 1,
      activityCode:
        typeof activity.activityCode === "string" && activity.activityCode
          ? activity.activityCode
          : `${String(activity.activityType || "TASK").toUpperCase()}_${index + 1}`,
      activityType: String(activity.activityType || "ASSESS").toUpperCase(),
      description: String(activity.description || "").trim(),
      priority: String(activity.priority || "Medium"),
      estimatedTime: toNumberOrZero(activity.estimatedTime),
      sosRequestId:
        activity.sosRequestId == null
          ? null
          : toNumberOrZero(activity.sosRequestId),
      depotId:
        activity.depotId == null ? null : toNumberOrZero(activity.depotId),
      depotName: activity.depotName ? String(activity.depotName) : null,
      depotAddress: activity.depotAddress
        ? String(activity.depotAddress)
        : null,
      assemblyPointId:
        activity.assemblyPointId == null
          ? null
          : toNumberOrZero(activity.assemblyPointId),
      assemblyPointName: activity.assemblyPointName
        ? String(activity.assemblyPointName)
        : null,
      assemblyPointLatitude:
        activity.assemblyPointLatitude == null
          ? null
          : toNumberOrZero(activity.assemblyPointLatitude),
      assemblyPointLongitude:
        activity.assemblyPointLongitude == null
          ? null
          : toNumberOrZero(activity.assemblyPointLongitude),
      suppliesToCollect: (activity.suppliesToCollect ?? []).map((supply) => ({
        id: supply.id == null ? null : toNumberOrZero(supply.id),
        name: supply.name ? String(supply.name) : null,
        quantity: toNumberOrZero(supply.quantity),
        unit: String(supply.unit || "").trim(),
      })),
      target: String(activity.target || "").trim(),
      targetLatitude: toNumberOrZero(activity.targetLatitude),
      targetLongitude: toNumberOrZero(activity.targetLongitude),
      rescueTeamId:
        activity.rescueTeamId == null
          ? null
          : toNumberOrZero(activity.rescueTeamId),
    })),
  };
}

type UpdateMissionActivityPayload = NonNullable<
  UpdateMissionRequest["activities"]
>[number];
type UpdateMissionActivityItemPayload =
  UpdateMissionActivityPayload["items"][number];
type UpdateMissionLotAllocationPayload = NonNullable<
  UpdateMissionActivityItemPayload["plannedPickupLotAllocations"]
>[number];
type UpdateMissionReusableUnitPayload = NonNullable<
  UpdateMissionActivityItemPayload["plannedPickupReusableUnits"]
>[number];

function normalizeMissionLotAllocation(
  allocation: UpdateMissionLotAllocationPayload,
): UpdateMissionLotAllocationPayload {
  return {
    lotId: toNumberOrZero(allocation?.lotId),
    quantityTaken: toNumberOrZero(allocation?.quantityTaken),
    receivedDate: String(allocation?.receivedDate ?? ""),
    expiredDate: String(allocation?.expiredDate ?? ""),
    remainingQuantityAfterExecution: toNumberOrZero(
      allocation?.remainingQuantityAfterExecution,
    ),
  };
}

function normalizeMissionReusableUnit(
  unit: UpdateMissionReusableUnitPayload,
): UpdateMissionReusableUnitPayload {
  return {
    reusableItemId: toNumberOrZero(unit?.reusableItemId),
    itemModelId: toNumberOrZero(unit?.itemModelId),
    itemName: String(unit?.itemName ?? "").trim(),
    serialNumber: String(unit?.serialNumber ?? "").trim(),
    condition: String(unit?.condition ?? "").trim(),
    note: toTrimmedStringOrNull(unit?.note),
  };
}

function normalizeUpdateMissionActivityItem(
  item: UpdateMissionActivityItemPayload,
): UpdateMissionActivityItemPayload {
  return {
    itemId: toNumberOrNull(item?.itemId),
    itemName: toTrimmedStringOrNull(item?.itemName),
    imageUrl: toTrimmedStringOrNull(item?.imageUrl),
    quantity: toNumberOrZero(item?.quantity),
    unit: String(item?.unit ?? "").trim(),
    plannedPickupLotAllocations: Array.isArray(
      item?.plannedPickupLotAllocations,
    )
      ? item.plannedPickupLotAllocations.map(normalizeMissionLotAllocation)
      : [],
    plannedPickupReusableUnits: Array.isArray(item?.plannedPickupReusableUnits)
      ? item.plannedPickupReusableUnits.map(normalizeMissionReusableUnit)
      : [],
    pickupLotAllocations: Array.isArray(item?.pickupLotAllocations)
      ? item.pickupLotAllocations.map(normalizeMissionLotAllocation)
      : [],
    pickedReusableUnits: Array.isArray(item?.pickedReusableUnits)
      ? item.pickedReusableUnits.map(normalizeMissionReusableUnit)
      : [],
    expectedReturnUnits: Array.isArray(item?.expectedReturnUnits)
      ? item.expectedReturnUnits.map(normalizeMissionReusableUnit)
      : [],
    returnedReusableUnits: Array.isArray(item?.returnedReusableUnits)
      ? item.returnedReusableUnits.map(normalizeMissionReusableUnit)
      : [],
    actualReturnedQuantity: toNumberOrZero(item?.actualReturnedQuantity),
    bufferRatio: toNumberOrZero(item?.bufferRatio),
    bufferQuantity: toNumberOrZero(item?.bufferQuantity),
    bufferUsedQuantity: toNumberOrZero(item?.bufferUsedQuantity),
    bufferUsedReason: toTrimmedStringOrNull(item?.bufferUsedReason),
    actualDeliveredQuantity: toNumberOrZero(item?.actualDeliveredQuantity),
  };
}

function normalizeUpdateMissionRequest(
  request: UpdateMissionRequest,
): UpdateMissionRequest {
  const normalizedActivities = Array.isArray(request.activities)
    ? request.activities.map((activity, index) => ({
        activityId: toNumberOrZero(activity?.activityId),
        step: toNumberOrZero(activity?.step) || index + 1,
        description: String(activity?.description ?? "").trim(),
        target: String(activity?.target ?? "").trim(),
        targetLatitude: toNumberOrZero(activity?.targetLatitude),
        targetLongitude: toNumberOrZero(activity?.targetLongitude),
        items: Array.isArray(activity?.items)
          ? activity.items.map(normalizeUpdateMissionActivityItem)
          : [],
      }))
    : undefined;

  return {
    missionType: String(request.missionType || "RESCUE").toUpperCase(),
    priorityScore: toNumberOrZero(request.priorityScore),
    startTime: request.startTime,
    expectedEndTime: request.expectedEndTime,
    ...(normalizedActivities ? { activities: normalizedActivities } : {}),
  };
}

function normalizeActivityStatusInput(status: string): ActivityStatus | string {
  const normalizedStatus = status
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (
    normalizedStatus === "succeed" ||
    normalizedStatus === "success" ||
    normalizedStatus === "succeeded" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "complete" ||
    normalizedStatus === "done"
  ) {
    return "Succeed";
  }

  if (
    normalizedStatus === "ongoing" ||
    normalizedStatus === "inprogress" ||
    normalizedStatus === "progressing"
  ) {
    return "OnGoing";
  }

  if (
    normalizedStatus === "pendingconfirmation" ||
    normalizedStatus === "pending"
  ) {
    return "PendingConfirmation";
  }

  if (
    normalizedStatus === "failed" ||
    normalizedStatus === "fail" ||
    normalizedStatus === "failure"
  ) {
    return "Failed";
  }

  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "cancel"
  ) {
    return "Cancelled";
  }

  if (normalizedStatus === "planned" || normalizedStatus === "plan") {
    return "Planned";
  }

  return status;
}

export async function getMissions(
  params: GetMissionsParams,
): Promise<GetMissionsResponse> {
  const { data } = await api.get("/operations/missions", {
    params: { clusterId: params.clusterId },
  });
  return data;
}

export async function createMission(
  request: CreateMissionRequest,
): Promise<CreateMissionResponse> {
  const payload = normalizeCreateMissionRequest(request);
  const { data } = await api.post("/operations/missions", payload);
  return data;
}

export async function getMissionById(
  missionId: number,
): Promise<MissionEntity> {
  const { data } = await api.get(`/operations/missions/${missionId}`);
  return data;
}

export async function updateMission(
  missionId: number,
  request: UpdateMissionRequest,
): Promise<UpdateMissionResponse> {
  const payload = normalizeUpdateMissionRequest(request);
  const { data } = await api.put(`/operations/missions/${missionId}`, payload);
  return data;
}

export async function updateMissionStatus(
  missionId: number,
  request: UpdateMissionStatusRequest,
): Promise<UpdateMissionStatusResponse> {
  const { data } = await api.patch(
    `/operations/missions/${missionId}/status`,
    request,
  );
  return data;
}

export async function getMissionActivities(
  missionId: number,
): Promise<MissionActivity[]> {
  const { data } = await api.get(
    `/operations/missions/${missionId}/activities`,
  );
  return data;
}

export async function createActivity(
  missionId: number,
  request: CreateMissionActivityRequest,
): Promise<CreateActivityResponse> {
  const { data } = await api.post(
    `/operations/missions/${missionId}/activities`,
    request,
  );
  return data;
}

export async function updateActivityStatus(
  missionId: number,
  activityId: number,
  request: UpdateActivityStatusRequest,
): Promise<UpdateActivityStatusResponse> {
  const payload = {
    ...request,
    // Accept status aliases from different UIs before sending to backend.
    status: normalizeActivityStatusInput(String(request.status ?? "")),
  };
  const { data } = await api.patch(
    `/operations/missions/${missionId}/activities/${activityId}/status`,
    payload,
  );
  return data;
}

export async function updateActivity(
  missionId: number,
  activityId: number,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResponse> {
  const { data } = await api.put(
    `/operations/missions/${missionId}/activities/${activityId}`,
    request,
  );
  return data;
}

export async function getActivityRoute(
  params: GetActivityRouteParams,
): Promise<ActivityRouteResponse> {
  const { missionId, activityId, ...query } = params;
  const { data } = await api.get(
    `/operations/missions/${missionId}/activities/${activityId}/route`,
    {
      params: {
        originLat: query.originLat,
        originLng: query.originLng,
        vehicle: query.vehicle ?? "car",
      },
    },
  );
  return normalizeActivityRouteResponse(data as ActivityRouteResponse);
}

export async function getMissionTeamRoute(
  params: GetMissionTeamRouteParams,
): Promise<MissionTeamRouteResponse> {
  const { missionId, missionTeamId, originLat, originLng, vehicle } = params;
  const { data } = await api.get(
    `/operations/missions/${missionId}/teams/${missionTeamId}/route`,
    {
      params: {
        originLat,
        originLng,
        vehicle: vehicle ?? "car",
      },
    },
  );

  return normalizeMissionTeamRouteResponse(data as MissionTeamRouteResponse);
}

export async function confirmReturnSupplies(
  missionId: number,
  activityId: number,
  request: ConfirmReturnSuppliesRequest,
): Promise<void> {
  await api.post(
    `/operations/missions/${missionId}/activities/${activityId}/confirm-return`,
    request,
  );
}
