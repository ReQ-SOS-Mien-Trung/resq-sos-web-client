"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import {
  ASSEMBLY_POINT_CHECKED_IN_RESCUERS_QUERY_KEY,
  ASSEMBLY_POINT_EVENTS_QUERY_KEY,
  ASSEMBLY_POINTS_QUERY_KEY,
} from "@/services/assembly_points/hooks";
import { DEPOTS_BY_CLUSTER_QUERY_KEY, DEPOTS_QUERY_KEY } from "@/services/depot/hooks";
import { INVENTORY_KEYS } from "@/services/inventory/hooks";
import {
  operationalRealtimeClient,
} from "@/services/operational_realtime/client";
import type {
  OperationalRealtimeConnectionState,
  ReceiveLogisticsUpdatePayload,
} from "@/services/operational_realtime/type";
import {
  ALTERNATIVE_DEPOTS_QUERY_KEY,
} from "@/services/sos_cluster/hooks";
import {
  RESCUE_TEAMS_BY_CLUSTER_QUERY_KEY,
  RESCUE_TEAMS_QUERY_KEY,
} from "@/services/rescue_teams/hooks";
import { useAuthStore } from "@/stores/auth.store";

interface UseOperationalRealtimeOptions {
  enabled?: boolean;
  depotId?: number | null;
  assemblyPointId?: number | null;
  clusterIds?: number[];
}

function isNegotiationAbortError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("stopped during negotiation") ||
    normalized.includes("aborterror")
  );
}

function matchesQueryPrefix(query: Query, prefix: readonly unknown[]): boolean {
  return prefix.every((part, index) => query.queryKey[index] === part);
}

function isDepotInventoryQuery(query: Query, depotId: number): boolean {
  const [rootKey, scopeKey, params] = query.queryKey;

  if (rootKey !== INVENTORY_KEYS.all[0] || scopeKey !== "depot") {
    return false;
  }

  if (!params || typeof params !== "object") {
    return false;
  }

  return (
    (params as { depotId?: unknown }).depotId === depotId
  );
}

function isAlternativeDepotQuery(query: Query, clusterId: number): boolean {
  return (
    query.queryKey[0] === ALTERNATIVE_DEPOTS_QUERY_KEY[0] &&
    query.queryKey[1] === clusterId
  );
}

function isClusterQuery(query: Query, prefix: readonly unknown[], clusterId: number): boolean {
  return matchesQueryPrefix(query, prefix) && query.queryKey[prefix.length] === clusterId;
}

export function useOperationalRealtime({
  enabled = true,
  depotId,
  assemblyPointId,
  clusterIds,
}: UseOperationalRealtimeOptions): OperationalRealtimeConnectionState {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [connectionState, setConnectionState] =
    useState<OperationalRealtimeConnectionState>(
      operationalRealtimeClient.getConnectionState(),
    );
  const assemblyPointIdRef = useRef<number | null>(null);
  const clusterIdsRef = useRef<number[]>([]);
  const activeClusterIds = useMemo(
    () =>
      Array.from(
        new Set(
          (clusterIds ?? []).filter(
            (id): id is number => Number.isFinite(id) && id > 0,
          ),
        ),
      ).sort((left, right) => left - right),
    [clusterIds],
  );
  const activeDepotId =
    Number.isFinite(depotId) && (depotId ?? 0) > 0 ? depotId : null;
  const activeAssemblyPointId =
    Number.isFinite(assemblyPointId) && (assemblyPointId ?? 0) > 0
      ? assemblyPointId
      : null;

  useEffect(() => {
    assemblyPointIdRef.current = activeAssemblyPointId;
  }, [activeAssemblyPointId]);

  useEffect(() => {
    clusterIdsRef.current = activeClusterIds;
  }, [activeClusterIds]);

  useEffect(() => {
    const unsubscribe = operationalRealtimeClient.subscribeConnectionState(
      (nextState) => {
        setConnectionState(nextState);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      void operationalRealtimeClient.stop().catch(() => null);
      return;
    }

    void operationalRealtimeClient.start().catch((error) => {
      if (isNegotiationAbortError(error)) {
        return;
      }

      console.error("Failed to connect operational hub:", error);
    });

    return () => {
      void operationalRealtimeClient.stop().catch(() => null);
    };
  }, [accessToken, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const unsubscribeAssemblyPointList =
      operationalRealtimeClient.onAssemblyPointListUpdate(() => {
        void queryClient.invalidateQueries({
          queryKey: ASSEMBLY_POINTS_QUERY_KEY,
        });

        const selectedAssemblyPointId = assemblyPointIdRef.current;
        if (!selectedAssemblyPointId) {
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, selectedAssemblyPointId],
        });
        void queryClient.invalidateQueries({
          predicate: (query) =>
            isClusterQuery(
              query,
              ASSEMBLY_POINT_EVENTS_QUERY_KEY,
              selectedAssemblyPointId,
            ),
        });
        void queryClient.invalidateQueries({
          queryKey: ASSEMBLY_POINT_CHECKED_IN_RESCUERS_QUERY_KEY,
        });
      });

    const unsubscribeDepotInventory =
      operationalRealtimeClient.onDepotInventoryUpdate(({ depotId: nextDepotId }) => {
        void queryClient.invalidateQueries({
          predicate: (query) => isDepotInventoryQuery(query, nextDepotId),
        });

        clusterIdsRef.current.forEach((clusterId) => {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              isClusterQuery(query, DEPOTS_BY_CLUSTER_QUERY_KEY, clusterId),
          });
        });
      });

    const invalidateLogisticsClusterQueries = (
      payload: ReceiveLogisticsUpdatePayload,
    ) => {
      if (payload.resourceType === "rescue-teams") {
        void queryClient.invalidateQueries({ queryKey: RESCUE_TEAMS_QUERY_KEY });

        if (payload.clusterId != null) {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              isClusterQuery(
                query,
                RESCUE_TEAMS_BY_CLUSTER_QUERY_KEY,
                payload.clusterId as number,
              ),
          });
        }

        return;
      }

      void queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });

      if (payload.clusterId != null) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            isClusterQuery(
              query,
              DEPOTS_BY_CLUSTER_QUERY_KEY,
              payload.clusterId as number,
            ),
        });
        void queryClient.invalidateQueries({
          predicate: (query) =>
            isAlternativeDepotQuery(query, payload.clusterId as number),
        });
      }
    };

    const unsubscribeLogistics =
      operationalRealtimeClient.onLogisticsUpdate(invalidateLogisticsClusterQueries);

    return () => {
      unsubscribeAssemblyPointList();
      unsubscribeDepotInventory();
      unsubscribeLogistics();
    };
  }, [accessToken, enabled, queryClient]);

  useEffect(() => {
    if (!enabled || !accessToken || activeDepotId == null) {
      return;
    }

    let disposed = false;

    void operationalRealtimeClient.subscribeDepot(activeDepotId).catch((error) => {
      if (isNegotiationAbortError(error)) {
        return;
      }

      if (!disposed) {
        console.error("Failed to subscribe depot operational updates:", error);
      }
    });

    return () => {
      disposed = true;
      void operationalRealtimeClient.unsubscribeDepot(activeDepotId).catch(
        () => null,
      );
    };
  }, [accessToken, activeDepotId, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken || activeClusterIds.length === 0) {
      return;
    }

    let disposed = false;

    const subscribeAll = async () => {
      for (const clusterId of activeClusterIds) {
        await operationalRealtimeClient.subscribeCluster(clusterId);
      }
    };

    void subscribeAll().catch((error) => {
      if (isNegotiationAbortError(error)) {
        return;
      }

      if (!disposed) {
        console.error("Failed to subscribe cluster operational updates:", error);
      }
    });

    return () => {
      disposed = true;
      activeClusterIds.forEach((clusterId) => {
        void operationalRealtimeClient.unsubscribeCluster(clusterId).catch(
          () => null,
        );
      });
    };
  }, [accessToken, activeClusterIds, enabled]);

  return connectionState;
}
