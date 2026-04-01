"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { INVENTORY_KEYS } from "@/services/inventory/hooks";
import { depotRealtimeClient } from "@/services/depot_realtime/client";
import type { GetDepotInventoryParams } from "@/services/inventory/type";

interface UseDepotInventoryRealtimeOptions {
  depotIds: number[];
  missionId: number | null;
  enabled?: boolean;
}

function isDepotInventoryQuery(
  query: Query,
  depotId: number,
): boolean {
  const [rootKey, scopeKey, params] = query.queryKey;

  if (rootKey !== INVENTORY_KEYS.all[0] || scopeKey !== "depot") {
    return false;
  }

  if (!params || typeof params !== "object") {
    return false;
  }

  return (params as GetDepotInventoryParams).depotId === depotId;
}

export function useDepotInventoryRealtime({
  depotIds,
  missionId,
  enabled = true,
}: UseDepotInventoryRealtimeOptions): void {
  const queryClient = useQueryClient();
  const uniqueDepotIds = useMemo(
    () =>
      Array.from(new Set(depotIds))
        .filter((depotId) => Number.isFinite(depotId) && depotId > 0)
        .sort((a, b) => a - b),
    [depotIds],
  );

  useEffect(() => {
    if (!enabled || uniqueDepotIds.length === 0) {
      return;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];

    const requeryDepot = (depotId: number) => {
      void queryClient.invalidateQueries({
        predicate: (query) => isDepotInventoryQuery(query, depotId),
      });
    };

    const bootstrap = async () => {
      await depotRealtimeClient.start();
      if (disposed) return;

      for (const depotId of uniqueDepotIds) {
        await depotRealtimeClient.joinDepotGroup(missionId, depotId);
        if (disposed) {
          void depotRealtimeClient.leaveDepotGroup(missionId, depotId);
          continue;
        }

        cleanups.push(
          depotRealtimeClient.onDepotUpdated(missionId, depotId, {
            onApplyFull: async () => {
              requeryDepot(depotId);
            },
            onApplyDelta: async () => {
              requeryDepot(depotId);
            },
            onVersionGap: async () => {
              requeryDepot(depotId);
            },
          }),
        );
      }
    };

    const unsubscribeReconnected = depotRealtimeClient.onReconnected(() => {
      uniqueDepotIds.forEach((depotId) => {
        requeryDepot(depotId);
      });
    });

    void bootstrap().catch((error) => {
      console.error("Failed to start depot realtime subscription", error);
    });

    return () => {
      disposed = true;
      unsubscribeReconnected();
      cleanups.forEach((cleanup) => cleanup());
      uniqueDepotIds.forEach((depotId) => {
        void depotRealtimeClient.leaveDepotGroup(missionId, depotId);
      });
    };
  }, [enabled, missionId, queryClient, uniqueDepotIds]);
}
