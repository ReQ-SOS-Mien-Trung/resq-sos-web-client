import api from "@/config/axios";
import {
  CreateMissionRequest,
  CreateMissionResponse,
  GetMissionsParams,
  GetMissionsResponse,
  MissionActivity,
  MissionEntity,
  UpdateActivityStatusRequest,
  UpdateActivityStatusResponse,
  UpdateMissionRequest,
  UpdateMissionResponse,
  UpdateMissionStatusRequest,
  UpdateMissionStatusResponse,
} from "./type";

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
  const { data } = await api.post("/operations/missions", request);
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
