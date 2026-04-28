"use client";

import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sosRequestRealtimeClient } from "@/services/sos_request_realtime/client";
import {
  SOS_REQUESTS_QUERY_KEY,
} from "@/services/sos_request/hooks";
import { SOS_CLUSTERS_QUERY_KEY } from "@/services/sos_cluster/hooks";
import type { SosRequestRealtimeConnectionState } from "@/services/sos_request_realtime/type";
import { useAuthStore } from "@/stores/auth.store";

interface UseSosRequestRealtimeOptions {
  enabled?: boolean;
  sosRequestIds?: number[];
  clusterIds?: number[];
  subscribeUnclustered?: boolean;
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

export function useSosRequestRealtime({
  enabled = true,
  sosRequestIds = [],
  clusterIds = [],
  subscribeUnclustered = false,
}: UseSosRequestRealtimeOptions): SosRequestRealtimeConnectionState {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [connectionState, setConnectionState] =
    useState<SosRequestRealtimeConnectionState>(
      sosRequestRealtimeClient.getConnectionState(),
    );

  const sosRequestIdsRef = useRef<number[]>([]);
  const clusterIdsRef = useRef<number[]>([]);
  const subscribeUnclusteredRef = useRef(false);

  useEffect(() => {
    sosRequestIdsRef.current = sosRequestIds;
    clusterIdsRef.current = clusterIds;
    subscribeUnclusteredRef.current = subscribeUnclustered;
  }, [sosRequestIds, clusterIds, subscribeUnclustered]);

  useEffect(() => {
    const unsubscribe = sosRequestRealtimeClient.subscribeConnectionState(
      (nextState) => {
        setConnectionState(nextState);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    sosRequestRealtimeClient.retainConnection();
    void sosRequestRealtimeClient.start().catch((error) => {
      if (isNegotiationAbortError(error)) {
        return;
      }

      console.error("Failed to connect SOS request hub:", error);
    });

    return () => {
      void sosRequestRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const invalidateQueries = () => {
      void queryClient.invalidateQueries({
        queryKey: SOS_REQUESTS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: SOS_CLUSTERS_QUERY_KEY,
      });
    };

    const unsubscribeUpdate = sosRequestRealtimeClient.onSosRequestUpdate(
      (payload) => {
        const { requestId, snapshot, clusterId, previousClusterId } = payload;

        // 1. Update the individual SOS request query
        queryClient.setQueryData(
          [...SOS_REQUESTS_QUERY_KEY, requestId],
          (old: any) => {
            if (!old) return old;
            return { ...old, sosRequest: snapshot };
          },
        );

        // 2. Update SOS request lists (map, sidebar, etc.)
        queryClient.setQueriesData(
          { queryKey: SOS_REQUESTS_QUERY_KEY },
          (old: any) => {
            if (!old) return old;

            // Handle array (like in useSOSRequestsInBounds)
            if (Array.isArray(old)) {
              return old.map((item: any) =>
                item.id === requestId ? snapshot : item,
              );
            }

            // Handle paginated response (like in useSOSRequests)
            if (old.items && Array.isArray(old.items)) {
              return {
                ...old,
                items: old.items.map((item: any) =>
                  item.id === requestId ? snapshot : item,
                ),
              };
            }

            return old;
          },
        );

        // 3. Update specific clusters if they are in the cache
        const affectedClusterIds = new Set<number>();
        if (clusterId) affectedClusterIds.add(clusterId);
        if (previousClusterId) affectedClusterIds.add(previousClusterId);

        affectedClusterIds.forEach((cId) => {
          // Invalidate cluster-specific data as it's more complex (contains list of IDs)
          // but we can try to update the cluster list if it's just a status change.
          void queryClient.invalidateQueries({
            queryKey: [...SOS_CLUSTERS_QUERY_KEY, cId],
          });
        });

        // 4. Update the clusters list
        queryClient.setQueriesData(
          { queryKey: SOS_CLUSTERS_QUERY_KEY },
          (old: any) => {
            if (!old) return old;

            // Handle paginated or full list
            const items = Array.isArray(old) ? old : old.items;
            if (!Array.isArray(items)) return old;

            const updatedItems = items.map((cluster: any) => {
              const isAffected =
                cluster.id === clusterId || cluster.id === previousClusterId;
              if (!isAffected) return cluster;

              // If it's a cluster update, we might need more data, but we can at least
              // trigger a refetch for the affected clusters while keeping the list alive.
              return cluster;
            });

            return Array.isArray(old) ? updatedItems : { ...old, items: updatedItems };
          },
        );

        // For structural changes (new request, request moved between clusters), 
        // we still invalidate the lists to ensure correct sorting/grouping.
        if (payload.action === "Created" || payload.action === "Deleted" || clusterId !== previousClusterId) {
           void queryClient.invalidateQueries({ queryKey: SOS_REQUESTS_QUERY_KEY, exact: false });
           void queryClient.invalidateQueries({ queryKey: SOS_CLUSTERS_QUERY_KEY, exact: false });
        }
      },
    );

    const unsubscribeReconnected =
      sosRequestRealtimeClient.subscribeReconnected(invalidateQueries);

    return () => {
      unsubscribeUpdate();
      unsubscribeReconnected();
    };
  }, [accessToken, enabled, queryClient]);

  // Subscription management for individual SOS requests
  useEffect(() => {
    if (!enabled || !accessToken || sosRequestIds.length === 0) {
      return;
    }

    let disposed = false;
    const activeIds = [...sosRequestIds];

    const subscribeAll = async () => {
      for (const id of activeIds) {
        await sosRequestRealtimeClient.subscribeSosRequest(id);
      }
    };

    void subscribeAll().catch((error) => {
      if (isNegotiationAbortError(error)) return;
      if (!disposed) console.error("Failed to subscribe SOS requests:", error);
    });

    return () => {
      disposed = true;
      activeIds.forEach((id) => {
        void sosRequestRealtimeClient.unsubscribeSosRequest(id).catch(() => null);
      });
    };
  }, [accessToken, enabled, sosRequestIds]);

  // Subscription management for clusters
  useEffect(() => {
    if (!enabled || !accessToken || clusterIds.length === 0) {
      return;
    }

    let disposed = false;
    const activeIds = [...clusterIds];

    const subscribeAll = async () => {
      for (const id of activeIds) {
        await sosRequestRealtimeClient.subscribeSosCluster(id);
      }
    };

    void subscribeAll().catch((error) => {
      if (isNegotiationAbortError(error)) return;
      if (!disposed) console.error("Failed to subscribe SOS clusters:", error);
    });

    return () => {
      disposed = true;
      activeIds.forEach((id) => {
        void sosRequestRealtimeClient.unsubscribeSosCluster(id).catch(() => null);
      });
    };
  }, [accessToken, enabled, clusterIds]);

  // Subscription management for unclustered requests
  useEffect(() => {
    if (!enabled || !accessToken || !subscribeUnclustered) {
      return;
    }

    let disposed = false;

    void sosRequestRealtimeClient.subscribeUnclusteredSosRequests().catch((error) => {
      if (isNegotiationAbortError(error)) return;
      if (!disposed) console.error("Failed to subscribe unclustered SOS requests:", error);
    });

    return () => {
      disposed = true;
      void sosRequestRealtimeClient.unsubscribeUnclusteredSosRequests().catch(() => null);
    };
  }, [accessToken, enabled, subscribeUnclustered]);

  return connectionState;
}
