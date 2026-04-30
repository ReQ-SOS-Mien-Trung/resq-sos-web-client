"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import {
  DEPOT_TRANSFER_QUERY_KEY,
  DEPOTS_QUERY_KEY,
  MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
  MY_DEPOT_CLOSURES_QUERY_KEY,
  MY_DEPOT_TRANSFERS_QUERY_KEY,
} from "@/services/depot/hooks";
import { INVENTORY_KEYS } from "@/services/inventory/hooks";
import { operationalRealtimeClient } from "@/services/operational_realtime/client";
import {
  OperationalRealtimeConnectionState,
  ReceiveDepotActivityUpdatePayload,
  ReceiveDepotClosureUpdatePayload,
  ReceiveSupplyRequestUpdatePayload,
  ReceiveUpcomingReturnsUpdatePayload,
} from "@/services/operational_realtime/type";
import { useAuthStore } from "@/stores/auth.store";
import { useState } from "react";

interface InventoryOperationalRealtimeOptions {
  enabled?: boolean;
  supplyRequests?: {
    depotId?: number | null;
    requestId?: number | null;
  };
  depotActivities?: {
    depotId?: number | null;
    activityId?: number | null;
  };
  depotClosures?: {
    depotId?: number | null;
    closureId?: number | null;
    transferId?: number | null;
  };
  depotInventory?: {
    depotId?: number | null;
  };
  upcomingReturns?: {
    depotId?: number | null;
  };
}

function toPositiveId(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : null;
}

function getQueryParamDepotId(query: Query): number | null {
  const params = query.queryKey[2];
  if (!params || typeof params !== "object") {
    return null;
  }

  const depotId = (params as { depotId?: unknown }).depotId;
  if (typeof depotId === "number" && Number.isFinite(depotId)) {
    return depotId;
  }

  if (typeof depotId === "string" && depotId.trim().length > 0) {
    const parsed = Number(depotId);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function invalidateSupplyRequestQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  depotId: number,
): void {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === INVENTORY_KEYS.all[0] &&
      query.queryKey[1] === "supplyRequests" &&
      getQueryParamDepotId(query) === depotId,
  });
}

function invalidateDepotActivityQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  depotId: number,
): void {
  const activityScopes = new Set([
    "upcomingPickups",
    "pickupHistory",
    "upcomingReturns",
    "returnHistory",
  ]);

  void queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.queryKey[0] !== INVENTORY_KEYS.all[0]) {
        return false;
      }

      const scope = query.queryKey[1];
      if (typeof scope !== "string") {
        return false;
      }

      if (activityScopes.has(scope)) {
        return getQueryParamDepotId(query) === depotId;
      }

      if (scope === "upcomingReturnsByStatuses") {
        const lastPart = query.queryKey[query.queryKey.length - 1];
        return lastPart === depotId;
      }

      return false;
    },
  });
}

function invalidateDepotClosureQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  depotId: number,
  closureId?: number | null,
  transferId?: number | null,
): void {
  void queryClient.invalidateQueries({
    queryKey: [...MY_DEPOT_CLOSURES_QUERY_KEY, depotId],
  });
  void queryClient.invalidateQueries({
    queryKey: [...MY_DEPOT_TRANSFERS_QUERY_KEY, depotId],
  });
  void queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
  void queryClient.invalidateQueries({
    queryKey: [...DEPOTS_QUERY_KEY, depotId],
  });

  if (toPositiveId(closureId) != null) {
    void queryClient.invalidateQueries({
      queryKey: [...MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY, depotId, closureId],
    });
  }

  if (toPositiveId(transferId) != null) {
    void queryClient.invalidateQueries({
      queryKey: [...DEPOT_TRANSFER_QUERY_KEY, depotId, transferId],
    });
  }
}

function invalidateDepotInventoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  depotId: number,
): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.queryKey[0] !== INVENTORY_KEYS.all[0]) {
        return false;
      }

      const scope = query.queryKey[1];
      if (typeof scope !== "string") {
        return false;
      }

      if (
        scope === "myDepot" ||
        scope === "depot" ||
        scope === "lowStock" ||
        scope === "inventoryLowStock"
      ) {
        return getQueryParamDepotId(query) === depotId;
      }

      if (scope === "quantityByCategory" || scope === "thresholds") {
        const params = query.queryKey[2];
        if (!params || typeof params !== "object") {
          return false;
        }

        return (params as { depotId?: unknown }).depotId === depotId;
      }

      return false;
    },
  });
}

export function useInventoryOperationalRealtime(
  options?: InventoryOperationalRealtimeOptions,
): OperationalRealtimeConnectionState {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [connectionState, setConnectionState] =
    useState<OperationalRealtimeConnectionState>(
      operationalRealtimeClient.getConnectionState(),
    );
  const activeSupplyDepotId = toPositiveId(options?.supplyRequests?.depotId);
  const activeSupplyRequestId = toPositiveId(options?.supplyRequests?.requestId);
  const activeActivityDepotId = toPositiveId(options?.depotActivities?.depotId);
  const activeActivityId = toPositiveId(options?.depotActivities?.activityId);
  const activeClosureDepotId = toPositiveId(options?.depotClosures?.depotId);
  const activeClosureId = toPositiveId(options?.depotClosures?.closureId);
  const activeTransferId = toPositiveId(options?.depotClosures?.transferId);
  const activeInventoryDepotId = toPositiveId(options?.depotInventory?.depotId);
  const activeUpcomingReturnsDepotId = toPositiveId(options?.upcomingReturns?.depotId);

  const hasActiveScope = useMemo(
    () =>
      [
        activeSupplyDepotId,
        activeSupplyRequestId,
        activeActivityDepotId,
        activeActivityId,
        activeClosureDepotId,
        activeClosureId,
        activeTransferId,
        activeInventoryDepotId,
        activeUpcomingReturnsDepotId,
      ].some((value) => value != null),
    [
      activeActivityDepotId,
      activeActivityId,
      activeClosureDepotId,
      activeClosureId,
      activeInventoryDepotId,
      activeSupplyDepotId,
      activeSupplyRequestId,
      activeTransferId,
      activeUpcomingReturnsDepotId,
    ],
  );

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || !hasActiveScope) {
      return;
    }

    operationalRealtimeClient.retainConnection();
    void operationalRealtimeClient.start().catch((error) => {
      console.error("Failed to connect operational inventory realtime:", error);
    });

    return () => {
      void operationalRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, hasActiveScope, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeSupplyDepotId == null) {
      return;
    }

    void operationalRealtimeClient.subscribeSupplyRequests(activeSupplyDepotId).catch((error) => {
      console.error("Failed to subscribe supply requests realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeSupplyRequests(activeSupplyDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeSupplyDepotId, options?.enabled]);

  useEffect(() => {
    if (
      !(options?.enabled ?? true) ||
      !accessToken ||
      activeSupplyRequestId == null
    ) {
      return;
    }

    void operationalRealtimeClient.subscribeSupplyRequest(activeSupplyRequestId).catch((error) => {
      console.error("Failed to subscribe supply request realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeSupplyRequest(activeSupplyRequestId)
        .catch(() => null);
    };
  }, [accessToken, activeSupplyRequestId, options?.enabled]);

  useEffect(() => {
    if (
      !(options?.enabled ?? true) ||
      !accessToken ||
      activeActivityDepotId == null
    ) {
      return;
    }

    void operationalRealtimeClient.subscribeDepotActivities(activeActivityDepotId).catch((error) => {
      console.error("Failed to subscribe depot activities realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeDepotActivities(activeActivityDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeActivityDepotId, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeActivityId == null) {
      return;
    }

    void operationalRealtimeClient.subscribeActivity(activeActivityId).catch((error) => {
      console.error("Failed to subscribe activity realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeActivity(activeActivityId)
        .catch(() => null);
    };
  }, [accessToken, activeActivityId, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeClosureDepotId == null) {
      return;
    }

    void operationalRealtimeClient.subscribeDepotClosures(activeClosureDepotId).catch((error) => {
      console.error("Failed to subscribe depot closures realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeDepotClosures(activeClosureDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeClosureDepotId, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeClosureId == null) {
      return;
    }

    void operationalRealtimeClient.subscribeClosure(activeClosureId).catch((error) => {
      console.error("Failed to subscribe closure realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeClosure(activeClosureId)
        .catch(() => null);
    };
  }, [accessToken, activeClosureId, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || activeTransferId == null) {
      return;
    }

    void operationalRealtimeClient.subscribeTransfer(activeTransferId).catch((error) => {
      console.error("Failed to subscribe transfer realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeTransfer(activeTransferId)
        .catch(() => null);
    };
  }, [accessToken, activeTransferId, options?.enabled]);

  useEffect(() => {
    if (
      !(options?.enabled ?? true) ||
      !accessToken ||
      activeInventoryDepotId == null
    ) {
      return;
    }

    void operationalRealtimeClient.subscribeDepot(activeInventoryDepotId).catch((error) => {
      console.error("Failed to subscribe depot inventory realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeDepot(activeInventoryDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeInventoryDepotId, options?.enabled]);

  useEffect(() => {
    if (
      !(options?.enabled ?? true) ||
      !accessToken ||
      activeUpcomingReturnsDepotId == null
    ) {
      return;
    }

    void operationalRealtimeClient.subscribeUpcomingReturns(activeUpcomingReturnsDepotId).catch((error) => {
      console.error("Failed to subscribe upcoming returns realtime:", error);
    });

    return () => {
      void operationalRealtimeClient
        .unsubscribeUpcomingReturns(activeUpcomingReturnsDepotId)
        .catch(() => null);
    };
  }, [accessToken, activeUpcomingReturnsDepotId, options?.enabled]);

  useEffect(() => {
    if (!(options?.enabled ?? true) || !accessToken || !hasActiveScope) {
      return;
    }

    const invalidateSupply = () => {
      if (activeSupplyDepotId != null) {
        invalidateSupplyRequestQueries(queryClient, activeSupplyDepotId);
      }
    };

    const invalidateActivities = () => {
      if (activeActivityDepotId != null) {
        invalidateDepotActivityQueries(queryClient, activeActivityDepotId);
      }
    };

    const invalidateClosures = () => {
      if (activeClosureDepotId != null) {
        invalidateDepotClosureQueries(
          queryClient,
          activeClosureDepotId,
          activeClosureId,
          activeTransferId,
        );
      }
    };

    const invalidateInventory = () => {
      if (activeInventoryDepotId != null) {
        invalidateDepotInventoryQueries(queryClient, activeInventoryDepotId);
      }
    };

    const handleSupplyRequestUpdate = (
      payload: ReceiveSupplyRequestUpdatePayload,
    ) => {
      if (
        activeSupplyRequestId != null &&
        payload.requestId === activeSupplyRequestId
      ) {
        invalidateSupply();
        return;
      }

      if (
        activeSupplyDepotId != null &&
        (payload.requestingDepotId === activeSupplyDepotId ||
          payload.sourceDepotId === activeSupplyDepotId)
      ) {
        invalidateSupply();
      }
    };

    const handleDepotActivityUpdate = (
      payload: ReceiveDepotActivityUpdatePayload,
    ) => {
      if (
        activeActivityId != null &&
        payload.activityId === activeActivityId
      ) {
        invalidateActivities();
        return;
      }

      if (
        activeActivityDepotId != null &&
        payload.depotId === activeActivityDepotId
      ) {
        invalidateActivities();
      }
    };

    const handleDepotClosureUpdate = (
      payload: ReceiveDepotClosureUpdatePayload,
    ) => {
      if (
        activeTransferId != null &&
        payload.transferId != null &&
        payload.transferId === activeTransferId
      ) {
        invalidateClosures();
        return;
      }

      if (
        activeClosureId != null &&
        payload.closureId != null &&
        payload.closureId === activeClosureId
      ) {
        invalidateClosures();
        return;
      }

      if (
        activeClosureDepotId != null &&
        (payload.sourceDepotId === activeClosureDepotId ||
          payload.targetDepotId === activeClosureDepotId)
      ) {
        invalidateClosures();
      }
    };

    const unsubscribeSupply =
      activeSupplyDepotId != null || activeSupplyRequestId != null
        ? operationalRealtimeClient.onSupplyRequestUpdate(
            handleSupplyRequestUpdate,
          )
        : null;

    const unsubscribeActivities =
      activeActivityDepotId != null || activeActivityId != null
        ? operationalRealtimeClient.onDepotActivityUpdate(
            handleDepotActivityUpdate,
          )
        : null;

    const unsubscribeClosures =
      activeClosureDepotId != null ||
      activeClosureId != null ||
      activeTransferId != null
        ? operationalRealtimeClient.onDepotClosureUpdate(
            handleDepotClosureUpdate,
          )
        : null;

    const unsubscribeInventory =
      activeInventoryDepotId != null
        ? operationalRealtimeClient.onDepotInventoryUpdate(({ depotId }) => {
            if (depotId === activeInventoryDepotId) {
              invalidateInventory();
            }
          })
        : null;

    const invalidateUpcomingReturns = () => {
      if (activeUpcomingReturnsDepotId != null) {
        invalidateDepotActivityQueries(queryClient, activeUpcomingReturnsDepotId);
      }
    };

    const handleUpcomingReturnsUpdate = (
      payload: ReceiveUpcomingReturnsUpdatePayload,
    ) => {
      if (
        activeUpcomingReturnsDepotId != null &&
        payload.depotId === activeUpcomingReturnsDepotId
      ) {
        invalidateUpcomingReturns();
      }
    };

    const unsubscribeUpcomingReturns =
      activeUpcomingReturnsDepotId != null
        ? operationalRealtimeClient.onUpcomingReturnsUpdate(
            handleUpcomingReturnsUpdate,
          )
        : null;

    const unsubscribeReconnected = operationalRealtimeClient.subscribeReconnected(
      () => {
        invalidateSupply();
        invalidateActivities();
        invalidateClosures();
        invalidateInventory();
        invalidateUpcomingReturns();
      },
    );

    return () => {
      unsubscribeSupply?.();
      unsubscribeActivities?.();
      unsubscribeClosures?.();
      unsubscribeInventory?.();
      unsubscribeUpcomingReturns?.();
      unsubscribeReconnected();
    };
  }, [
    accessToken,
    activeActivityDepotId,
    activeActivityId,
    activeClosureDepotId,
    activeClosureId,
    activeInventoryDepotId,
    activeSupplyDepotId,
    activeSupplyRequestId,
    activeTransferId,
    activeUpcomingReturnsDepotId,
    hasActiveScope,
    options?.enabled,
    queryClient,
  ]);

  useEffect(() => {
    const unsubscribe = operationalRealtimeClient.subscribeConnectionState(
      (nextState) => {
        setConnectionState(nextState);
      },
    );

    return unsubscribe;
  }, []);

  return connectionState;
}
