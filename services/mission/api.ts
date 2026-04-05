import api from "@/config/axios";
import {
  CreateActivityResponse,
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
  const { data } = await api.put(`/operations/missions/${missionId}`, request);
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
  const { data } = await api.patch(
    `/operations/missions/${missionId}/activities/${activityId}/status`,
    request,
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
