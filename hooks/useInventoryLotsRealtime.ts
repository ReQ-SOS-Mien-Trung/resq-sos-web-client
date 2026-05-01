"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { operationalRealtimeClient } from "@/services/operational_realtime/client";
import { useAuthStore } from "@/stores/auth.store";

function toPositiveId(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : null;
}

export function useInventoryLotsRealtime({
  depotId,
  itemModelId,
  enabled = true,
}: {
  depotId?: number | null;
  itemModelId?: number | null;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeDepotId = toPositiveId(depotId);
  const activeItemModelId = toPositiveId(itemModelId);

  useEffect(() => {
    if (
      !enabled ||
      !accessToken ||
      activeDepotId == null ||
      activeItemModelId == null
    ) {
      return;
    }

    operationalRealtimeClient.retainConnection();
    void operationalRealtimeClient
      .subscribeInventoryLots(activeDepotId, activeItemModelId)
      .catch((error) => {
        console.error("Failed to subscribe inventory lots realtime:", error);
      });

    const unsubscribe = operationalRealtimeClient.onInventoryLotsUpdate(
      (payload) => {
        if (
          payload.depotId !== activeDepotId ||
          payload.itemModelId !== activeItemModelId
        ) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: ["inventory-lots", payload.depotId, payload.itemModelId],
        });
      },
    );

    return () => {
      unsubscribe();
      void operationalRealtimeClient
        .unsubscribeInventoryLots(activeDepotId, activeItemModelId)
        .catch(() => null);
      void operationalRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, activeDepotId, activeItemModelId, enabled, queryClient]);
}
