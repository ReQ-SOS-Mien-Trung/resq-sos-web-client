import api from "@/config/axios";
import { AxiosError } from "axios";
import {
  RescuerScoreVisibilityConfigEntity,
  RescueTeamRadiusConfigEntity,
  SosClusterGroupingConfigEntity,
  SosPriorityRuleConfigEntity,
  SosPriorityRuleConfigValidationResponse,
  SosPriorityRuleConfigVersionSummary,
  UpdateRescueTeamRadiusConfigRequest,
  UpdateRescuerScoreVisibilityConfigRequest,
  UpdateSosClusterGroupingConfigRequest,
  UpdateSosPriorityRuleConfigRequest,
  ValidateSosPriorityRuleConfigRequest,
} from "./type";

type RawSosClusterGroupingConfigResponse = {
  maximumDistanceKm?: number | null;
  maxImumDistanceKm?: number | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  lastUpdatedAt?: string | null;
};

type RawRescueTeamRadiusConfigResponse = {
  maxRadiusKm?: number | null;
  maximumRadiusKm?: number | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  lastUpdatedAt?: string | null;
};

function normalizeSosClusterGroupingConfig(
  raw: RawSosClusterGroupingConfigResponse | number | null | undefined,
): SosClusterGroupingConfigEntity {
  if (typeof raw === "number") {
    return {
      maximumDistanceKm: raw,
      updatedBy: null,
      updatedAt: null,
    };
  }

  return {
    maximumDistanceKm:
      raw?.maximumDistanceKm ?? raw?.maxImumDistanceKm ?? 0,
    updatedBy: raw?.updatedBy ?? null,
    updatedAt: raw?.updatedAt ?? raw?.lastUpdatedAt ?? null,
  };
}

function normalizeRescueTeamRadiusConfig(
  raw: RawRescueTeamRadiusConfigResponse | number | null | undefined,
  isDefaultValue = false,
): RescueTeamRadiusConfigEntity {
  if (typeof raw === "number") {
    return {
      maxRadiusKm: raw,
      updatedBy: null,
      updatedAt: null,
      isDefaultValue,
    };
  }

  return {
    maxRadiusKm: raw?.maxRadiusKm ?? raw?.maximumRadiusKm ?? 10,
    updatedBy: raw?.updatedBy ?? null,
    updatedAt: raw?.updatedAt ?? raw?.lastUpdatedAt ?? null,
    isDefaultValue,
  };
}

export async function getSosPriorityRuleConfig(): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.get("/system/sos-priority-rule-config");
  return data;
}

export async function getSosPriorityRuleConfigById(
  id: number,
): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.get(`/system/sos-priority-rule-config/${id}`);
  return data;
}

export async function getSosPriorityRuleConfigVersions(): Promise<
  SosPriorityRuleConfigVersionSummary[]
> {
  const { data } = await api.get("/system/sos-priority-rule-config/versions");
  return data;
}

export async function createSosPriorityRuleConfigDraft(
  sourceConfigId?: number | null,
): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.post("/system/sos-priority-rule-config/drafts", undefined, {
    params:
      typeof sourceConfigId === "number"
        ? { sourceConfigId }
        : undefined,
  });
  return data;
}

export async function deleteSosPriorityRuleConfigDraft(id: number): Promise<void> {
  await api.delete(`/system/sos-priority-rule-config/drafts/${id}`);
}

export async function updateSosPriorityRuleConfigDraft(
  id: number,
  request: UpdateSosPriorityRuleConfigRequest,
): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.put(`/system/sos-priority-rule-config/drafts/${id}`, request);
  return data;
}

export async function validateSosPriorityRuleConfig(
  request: ValidateSosPriorityRuleConfigRequest,
): Promise<SosPriorityRuleConfigValidationResponse> {
  const { data } = await api.post("/system/sos-priority-rule-config/validate", request);
  return data;
}

export async function activateSosPriorityRuleConfig(
  id: number,
): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.post(`/system/sos-priority-rule-config/${id}/activate`);
  return data;
}

export async function getRescuerScoreVisibilityConfig(): Promise<RescuerScoreVisibilityConfigEntity> {
  const { data } = await api.get("/system/rescuer-score-visibility-config");
  return data;
}

export async function updateRescuerScoreVisibilityConfig(
  request: UpdateRescuerScoreVisibilityConfigRequest,
): Promise<void> {
  await api.put("/system/rescuer-score-visibility-config", request);
}

export async function getSosClusterGroupingConfig(): Promise<SosClusterGroupingConfigEntity> {
  const { data } = await api.get("/system/sos-cluster-grouping-config");
  return normalizeSosClusterGroupingConfig(data);
}

export async function updateSosClusterGroupingConfig(
  request: UpdateSosClusterGroupingConfigRequest,
): Promise<void> {
  await api.put("/system/sos-cluster-grouping-config", {
    maxImumDistanceKm: request.maximumDistanceKm,
  });
}

export async function getRescueTeamRadiusConfig(): Promise<RescueTeamRadiusConfigEntity> {
  try {
    const { data } = await api.get("/system/rescue-team-radius-config");
    return normalizeRescueTeamRadiusConfig(data);
  } catch (error) {
    if (
      error instanceof AxiosError &&
      error.response?.status === 404
    ) {
      return normalizeRescueTeamRadiusConfig(undefined, true);
    }

    throw error;
  }
}

export async function updateRescueTeamRadiusConfig(
  request: UpdateRescueTeamRadiusConfigRequest,
): Promise<void> {
  await api.put("/system/rescue-team-radius-config", request);
}
