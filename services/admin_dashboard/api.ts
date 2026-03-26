import api from "@/config/axios";
import {
  SosStatusOption,
  VictimsByPeriodParams,
  VictimsByPeriodResponse,
} from "./type";

/**
 * Get SOS status list for dropdown filter
 * GET /dashboard/metadata/sos-statuses
 */
export async function getSosStatuses(): Promise<SosStatusOption[]> {
  const { data } = await api.get("/dashboard/metadata/sos-statuses");
  return data;
}

/**
 * Get victims by period for bar chart
 * GET /dashboard/victims-by-period
 */
export async function getVictimsByPeriod(
  params?: VictimsByPeriodParams,
): Promise<VictimsByPeriodResponse> {
  const { statuses, ...rest } = params ?? {};
  const { data } = await api.get("/dashboard/victims-by-period", {
    params: { ...rest, statuses },
    paramsSerializer: {
      indexes: null, // ?statuses=Pending&statuses=Resolved
    },
  });
  return data;
}
