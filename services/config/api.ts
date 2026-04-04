import api from "@/config/axios";
import {
  RescuerScoreVisibilityConfigEntity,
  SosPriorityRuleConfigEntity,
  UpdateRescuerScoreVisibilityConfigRequest,
  UpdateSosPriorityRuleConfigRequest,
} from "./type";

/**
 * Get SOS priority rule config
 * GET /system/sos-priority-rule-config
 */
export async function getSosPriorityRuleConfig(): Promise<SosPriorityRuleConfigEntity> {
  const { data } = await api.get("/system/sos-priority-rule-config");
  return data;
}

/**
 * Update SOS priority rule config
 * PUT /system/sos-priority-rule-config/{id}
 */
export async function updateSosPriorityRuleConfig(
  id: number,
  request: UpdateSosPriorityRuleConfigRequest,
): Promise<void> {
  await api.put(`/system/sos-priority-rule-config/${id}`, request);
}

/**
 * Get rescuer score visibility config
 * GET /system/rescuer-score-visibility-config
 */
export async function getRescuerScoreVisibilityConfig(): Promise<RescuerScoreVisibilityConfigEntity> {
  const { data } = await api.get("/system/rescuer-score-visibility-config");
  return data;
}

/**
 * Update rescuer score visibility config
 * PUT /system/rescuer-score-visibility-config
 */
export async function updateRescuerScoreVisibilityConfig(
  request: UpdateRescuerScoreVisibilityConfigRequest,
): Promise<void> {
  await api.put("/system/rescuer-score-visibility-config", request);
}
