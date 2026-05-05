"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEPOT_FUNDS_QUERY_KEY } from "@/services/depot/hooks";
import { operationalRealtimeClient } from "@/services/operational_realtime/client";
import { useAuthStore } from "@/stores/auth.store";

function toPositiveId(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : null;
}

function payloadMatchesDepot(
  payloadDepotId: number | null | undefined,
  activeDepotId: number | null,
) {
  if (activeDepotId == null || payloadDepotId == null) return true;
  return payloadDepotId === activeDepotId;
}

export function useDepotFundsRealtime({
  depotId,
  enabled = true,
}: {
  depotId?: number | null;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeDepotId = toPositiveId(depotId);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    operationalRealtimeClient.retainConnection();
    void operationalRealtimeClient.subscribeDepotFunds().catch((error) => {
      console.warn("Failed to subscribe depot funds realtime:", error);
    });

    if (activeDepotId != null) {
      void operationalRealtimeClient
        .subscribeDepotFund(activeDepotId)
        .catch((error) => {
          console.warn("Failed to subscribe depot fund realtime:", error);
        });
    }

    const unsubscribe = operationalRealtimeClient.onDepotFundsUpdate(
      (payload) => {
        const payloadDepotId = payload.depotId ?? payload.scope?.depotId;
        if (!payloadMatchesDepot(payloadDepotId, activeDepotId)) return;

        void queryClient.invalidateQueries({
          queryKey: DEPOT_FUNDS_QUERY_KEY,
        });
      },
    );

    return () => {
      unsubscribe();
      void operationalRealtimeClient.unsubscribeDepotFunds().catch(() => null);
      if (activeDepotId != null) {
        void operationalRealtimeClient
          .unsubscribeDepotFund(activeDepotId)
          .catch(() => null);
      }
      void operationalRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, activeDepotId, enabled, queryClient]);
}
