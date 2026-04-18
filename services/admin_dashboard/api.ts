import api from "@/config/axios";
import {
  SosStatusOption,
  VictimsByPeriodParams,
  VictimsByPeriodResponse,
  RescuersDailyStatisticsResponse,
  MissionSuccessRateSummaryResponse,
  SosRequestsSummaryResponse,
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

/**
 * GET /personnel/dashboard/rescuers/daily-statistics
 */
export async function getRescuersDailyStatistics(): Promise<RescuersDailyStatisticsResponse> {
  const { data } = await api.get(
    "/personnel/dashboard/rescuers/daily-statistics",
  );
  return data;
}

/**
 * GET /personnel/dashboard/missions/success-rate/summary
 */
export async function getMissionSuccessRateSummary(): Promise<MissionSuccessRateSummaryResponse> {
  const { data } = await api.get(
    "/personnel/dashboard/missions/success-rate/summary",
  );
  return data;
}

/**
 * GET /personnel/dashboard/sos-requests/summary
 */
export async function getSosRequestsSummary(): Promise<SosRequestsSummaryResponse> {
  const { data } = await api.get("/personnel/dashboard/sos-requests/summary");
  return data;
}
