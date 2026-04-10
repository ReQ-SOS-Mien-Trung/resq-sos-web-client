import api from "@/config/axios";
import {
  RescuerScoreVisibilityConfigEntity,
  SosPriorityRuleConfigEntity,
  SosPriorityRuleConfigValidationResponse,
  SosPriorityRuleConfigVersionSummary,
  UpdateRescuerScoreVisibilityConfigRequest,
  UpdateSosPriorityRuleConfigRequest,
  ValidateSosPriorityRuleConfigRequest,
} from "./type";

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
