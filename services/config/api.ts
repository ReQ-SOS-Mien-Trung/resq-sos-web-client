import api from "@/config/axios";
import {
  SosPriorityRuleConfigEntity,
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
