"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_DASHBOARD_KEYS } from "@/services/admin_dashboard/hooks";
import { adminDepotRealtimeClient } from "@/services/admin_depot_realtime/client";
import { adminFinanceRealtimeClient } from "@/services/admin_finance_realtime/client";
import { ChartInvalidation } from "@/services/chart_invalidation/type";
import { dashboardRealtimeClient } from "@/services/dashboard_realtime/client";
import { operationalRealtimeClient } from "@/services/operational_realtime/client";
import { useAuthStore } from "@/stores/auth.store";

const DASHBOARD_CHART_QUERY_KEYS: Record<string, readonly unknown[]> = {
  "victims-by-period": [...ADMIN_DASHBOARD_KEYS.all, "victims-by-period"],
  "rescuers-daily-statistics":
    ADMIN_DASHBOARD_KEYS.rescuersDailyStatistics(),
  "mission-success-rate-summary":
    ADMIN_DASHBOARD_KEYS.missionSuccessRateSummary(),
  "sos-requests-summary": ADMIN_DASHBOARD_KEYS.sosRequestsSummary(),
  "mission-team-reports-summary":
    ADMIN_DASHBOARD_KEYS.missionTeamReportsSummary(),
  "rescuer-overview": [...ADMIN_DASHBOARD_KEYS.all, "rescuer-overview"],
};

const DEPOT_CHART_QUERY_KEYS: Record<string, (id: number) => unknown[]> = {
  "depot-capacity": (depotId) => ["depot-capacity-chart", depotId],
  "depot-inventory-movement": (depotId) => [
    "depot-inventory-movement-chart",
    depotId,
  ],
};

const DEPOT_FUND_CHART_QUERY_KEYS: Record<string, (id: number) => unknown[]> = {
  "depot-fund-movement": (depotId) => ["depot-fund-movement-chart", depotId],
  "depot-fund-movement-multi-line": (depotId) => [
    "depot-fund-movement-multi-line-chart",
    depotId,
  ],
};

function toPositiveId(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : null;
}

function scopeMatches(
  scope: Record<string, unknown> | undefined,
  scopeKey: "depotId" | "campaignId",
  expectedId: number,
): boolean {
  const value = scope?.[scopeKey];
  if (value == null) return true;

  if (typeof value === "number") {
    return value === expectedId;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value) === expectedId;
  }

  return true;
}

export function useAdminDashboardChartInvalidation(options?: {
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken) return;

    dashboardRealtimeClient.retainConnection();
    void dashboardRealtimeClient.start().catch((error) => {
      console.error("Failed to connect dashboard chart realtime:", error);
    });

    const unsubscribe = dashboardRealtimeClient.onChartInvalidation(
      (event: ChartInvalidation) => {
        const queryKey = DASHBOARD_CHART_QUERY_KEYS[event.chartKey];
        if (!queryKey) return;

        void queryClient.invalidateQueries({ queryKey });
      },
    );

    return () => {
      unsubscribe();
      void dashboardRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, options?.enabled, queryClient]);
}

export function useOperationalDepotChartInvalidation(
  depotId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeDepotId = toPositiveId(depotId);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeDepotId == null) {
      return;
    }

    operationalRealtimeClient.retainConnection();
    void operationalRealtimeClient.subscribeDepotCharts(activeDepotId).catch(
      (error) => {
        console.error("Failed to subscribe operational depot charts:", error);
      },
    );

    const unsubscribe = operationalRealtimeClient.onChartInvalidation(
      (event) => {
        if (!scopeMatches(event.scope, "depotId", activeDepotId)) return;

        const getQueryKey = DEPOT_CHART_QUERY_KEYS[event.chartKey];
        if (!getQueryKey) return;

        void queryClient.invalidateQueries({
          queryKey: getQueryKey(activeDepotId),
        });
      },
    );

    return () => {
      unsubscribe();
      void operationalRealtimeClient
        .unsubscribeDepotCharts(activeDepotId)
        .catch(() => null);
      void operationalRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, activeDepotId, options?.enabled, queryClient]);
}

export function useAdminOperationsDepotChartInvalidation(
  depotId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeDepotId = toPositiveId(depotId);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeDepotId == null) {
      return;
    }

    adminDepotRealtimeClient.retainConnection();
    void adminDepotRealtimeClient.subscribeDepotCharts(activeDepotId).catch(
      (error) => {
        console.error("Failed to subscribe admin depot charts:", error);
      },
    );

    const unsubscribe = adminDepotRealtimeClient.onChartInvalidation(
      (event) => {
        if (!scopeMatches(event.scope, "depotId", activeDepotId)) return;

        const getQueryKey = DEPOT_CHART_QUERY_KEYS[event.chartKey];
        if (!getQueryKey) return;

        void queryClient.invalidateQueries({
          queryKey: getQueryKey(activeDepotId),
        });
      },
    );

    return () => {
      unsubscribe();
      void adminDepotRealtimeClient
        .unsubscribeDepotCharts(activeDepotId)
        .catch(() => null);
      void adminDepotRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, activeDepotId, options?.enabled, queryClient]);
}

export function useAdminFinanceDepotFundChartInvalidation(
  depotId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeDepotId = toPositiveId(depotId);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeDepotId == null) {
      return;
    }

    void adminFinanceRealtimeClient
      .subscribeDepotFundCharts(activeDepotId)
      .catch((error) => {
        console.error("Failed to subscribe depot fund charts:", error);
      });

    const unsubscribe = adminFinanceRealtimeClient.onChartInvalidation(
      (event) => {
        if (!scopeMatches(event.scope, "depotId", activeDepotId)) return;

        const getQueryKey = DEPOT_FUND_CHART_QUERY_KEYS[event.chartKey];
        if (!getQueryKey) return;

        void queryClient.invalidateQueries({
          queryKey: getQueryKey(activeDepotId),
        });
      },
    );

    return () => {
      unsubscribe();
      void adminFinanceRealtimeClient
        .unsubscribeDepotFundCharts(activeDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeDepotId, options?.enabled, queryClient]);
}

export function useAdminFinanceCampaignFundFlowInvalidation(
  campaignId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeCampaignId = toPositiveId(campaignId);

  useEffect(() => {
    if (
      !(options?.enabled ?? true) ||
      !accessToken ||
      activeCampaignId == null
    ) {
      return;
    }

    void adminFinanceRealtimeClient
      .subscribeCampaignFundFlow(activeCampaignId)
      .catch((error) => {
        console.error("Failed to subscribe campaign fund-flow chart:", error);
      });

    const unsubscribe = adminFinanceRealtimeClient.onChartInvalidation(
      (event) => {
        if (event.chartKey !== "campaign-fund-flow") return;
        if (!scopeMatches(event.scope, "campaignId", activeCampaignId)) return;

        void queryClient.invalidateQueries({
          queryKey: ["campaign-fund-flow-chart", activeCampaignId],
        });
      },
    );

    return () => {
      unsubscribe();
      void adminFinanceRealtimeClient
        .unsubscribeCampaignFundFlow(activeCampaignId)
        .catch(() => null);
    };
  }, [accessToken, activeCampaignId, options?.enabled, queryClient]);
}
