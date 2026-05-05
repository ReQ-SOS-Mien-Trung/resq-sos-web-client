"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminOperationsRealtimeClient } from "@/services/admin_operations_realtime/client";
import type {
  AdminMissionActivityRealtimeUpdate,
  AdminMissionExecutionProgressRealtimeUpdate,
  AdminMissionRealtimeUpdate,
} from "@/services/admin_operations_realtime/type";
import { INVENTORY_KEYS } from "@/services/inventory/hooks";
import {
  ACTIVITY_ROUTE_QUERY_KEY,
  MISSION_ACTIVITIES_QUERY_KEY,
  MISSION_TEAM_ROUTE_QUERY_KEY,
  MISSIONS_QUERY_KEY,
} from "@/services/mission/hooks";
import type {
  ActivityStatus,
  GetMissionsResponse,
  MissionActivity,
  MissionEntity,
  MissionStatus,
} from "@/services/mission/type";
import { useAuthStore } from "@/stores/auth.store";

export type MissionRealtimeActivityStatusUpdate = {
  missionId: number;
  activityId: number;
  status: string;
  changedAt?: string | null;
};

interface UseMissionRealtimeOptions {
  enabled?: boolean;
  clusterId?: number | null;
  missionIds?: number[];
  onActivityStatusUpdated?: (
    update: MissionRealtimeActivityStatusUpdate,
  ) => void;
}

function toPositiveId(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : null;
}

function toUniquePositiveIds(values?: number[]): number[] {
  return Array.from(
    new Set(
      (values ?? []).filter(
        (value): value is number => Number.isFinite(value) && value > 0,
      ),
    ),
  ).sort((left, right) => left - right);
}

function isMissionListResponse(value: unknown): value is GetMissionsResponse {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as GetMissionsResponse).missions)
  );
}

function isMissionEntity(value: unknown): value is MissionEntity {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as MissionEntity).id === "number" &&
    "status" in value &&
    !Array.isArray((value as GetMissionsResponse).missions)
  );
}

function patchActivityStatus(
  activities: MissionActivity[],
  activityId: number,
  status: string,
): MissionActivity[] {
  let changed = false;
  const nextActivities = activities.map((activity) => {
    if (activity.id !== activityId || activity.status === status) {
      return activity;
    }

    changed = true;
    return {
      ...activity,
      status: status as ActivityStatus,
    };
  });

  return changed ? nextActivities : activities;
}

function patchMissionActivityStatus(
  mission: MissionEntity,
  activityId: number,
  status: string,
): MissionEntity {
  if (!mission.activities || mission.activities.length === 0) {
    return mission;
  }

  const patchedActivities = patchActivityStatus(
    mission.activities,
    activityId,
    status,
  );

  if (patchedActivities === mission.activities) {
    return mission;
  }

  return {
    ...mission,
    activities: patchedActivities,
  };
}

function patchMissionStatusInCache(
  data: unknown,
  payload: AdminMissionRealtimeUpdate,
): unknown {
  if (!payload.status) {
    return data;
  }

  if (isMissionListResponse(data)) {
    let changed = false;
    const missions = data.missions.map((mission) => {
      if (mission.id !== payload.missionId || mission.status === payload.status) {
        return mission;
      }

      changed = true;
      return {
        ...mission,
        status: payload.status as MissionStatus,
      };
    });

    return changed ? { ...data, missions } : data;
  }

  if (isMissionEntity(data) && data.id === payload.missionId) {
    return data.status === payload.status
      ? data
      : { ...data, status: payload.status as MissionStatus };
  }

  return data;
}

function patchMissionActivityStatusInCache(
  data: unknown,
  update: MissionRealtimeActivityStatusUpdate,
): unknown {
  if (Array.isArray(data)) {
    return patchActivityStatus(
      data as MissionActivity[],
      update.activityId,
      update.status,
    );
  }

  if (isMissionListResponse(data)) {
    let changed = false;
    const missions = data.missions.map((mission) => {
      if (update.missionId !== mission.id) {
        return mission;
      }

      const patchedMission = patchMissionActivityStatus(
        mission,
        update.activityId,
        update.status,
      );
      changed = changed || patchedMission !== mission;
      return patchedMission;
    });

    return changed ? { ...data, missions } : data;
  }

  if (isMissionEntity(data) && data.id === update.missionId) {
    return patchMissionActivityStatus(data, update.activityId, update.status);
  }

  return data;
}

function isRouteForMission(
  queryKey: readonly unknown[],
  rootKey: string,
  missionId: number,
): boolean {
  return queryKey[0] === rootKey && queryKey[1] === missionId;
}

function isActivityRouteForMissionActivity(
  queryKey: readonly unknown[],
  missionId: number,
  activityId: number,
): boolean {
  return (
    queryKey[0] === ACTIVITY_ROUTE_QUERY_KEY[0] &&
    queryKey[1] === missionId &&
    queryKey[2] === activityId
  );
}

export function useMissionRealtime({
  enabled = true,
  clusterId,
  missionIds,
  onActivityStatusUpdated,
}: UseMissionRealtimeOptions): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const activeClusterId = toPositiveId(clusterId);
  const activeMissionIds = useMemo(
    () => toUniquePositiveIds(missionIds),
    [missionIds],
  );
  const activeMissionIdsRef = useRef(activeMissionIds);
  const activeClusterIdRef = useRef(activeClusterId);
  const onActivityStatusUpdatedRef = useRef(onActivityStatusUpdated);
  const hasActiveScope = activeClusterId != null || activeMissionIds.length > 0;

  useEffect(() => {
    activeMissionIdsRef.current = activeMissionIds;
  }, [activeMissionIds]);

  useEffect(() => {
    activeClusterIdRef.current = activeClusterId;
  }, [activeClusterId]);

  useEffect(() => {
    onActivityStatusUpdatedRef.current = onActivityStatusUpdated;
  }, [onActivityStatusUpdated]);

  useEffect(() => {
    if (!enabled || !accessToken || !hasActiveScope) {
      return;
    }

    adminOperationsRealtimeClient.retainConnection();
    void adminOperationsRealtimeClient.start().catch((error) => {
      console.error("Failed to connect mission realtime:", error);
    });

    return () => {
      void adminOperationsRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, enabled, hasActiveScope]);

  useEffect(() => {
    if (!enabled || !accessToken || activeClusterId == null) {
      return;
    }

    let disposed = false;

    void adminOperationsRealtimeClient
      .subscribeSOSCluster(activeClusterId)
      .catch((error) => {
        if (!disposed) {
          console.error("Failed to subscribe mission cluster realtime:", error);
        }
      });

    return () => {
      disposed = true;
      void adminOperationsRealtimeClient
        .unsubscribeSOSCluster(activeClusterId)
        .catch(() => null);
    };
  }, [accessToken, activeClusterId, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken || activeMissionIds.length === 0) {
      return;
    }

    let disposed = false;

    const subscribeAll = async () => {
      for (const missionId of activeMissionIds) {
        await adminOperationsRealtimeClient.subscribeMissionActivities(
          missionId,
        );
        await adminOperationsRealtimeClient.subscribeMissionExecution(missionId);
      }
    };

    void subscribeAll().catch((error) => {
      if (!disposed) {
        console.error("Failed to subscribe mission activity realtime:", error);
      }
    });

    return () => {
      disposed = true;
      activeMissionIds.forEach((missionId) => {
        void adminOperationsRealtimeClient
          .unsubscribeMissionActivities(missionId)
          .catch(() => null);
        void adminOperationsRealtimeClient
          .unsubscribeMissionExecution(missionId)
          .catch(() => null);
      });
    };
  }, [accessToken, activeMissionIds, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken || !hasActiveScope) {
      return;
    }

    const invalidateMission = (missionId: number) => {
      void queryClient.invalidateQueries({
        queryKey: [...MISSION_ACTIVITIES_QUERY_KEY, missionId],
      });
      void queryClient.invalidateQueries({
        predicate: (query) =>
          isRouteForMission(
            query.queryKey,
            MISSION_TEAM_ROUTE_QUERY_KEY[0],
            missionId,
          ),
      });
    };

    const invalidateActivity = (
      missionId: number,
      activityId: number,
      depotId?: number | null,
    ) => {
      invalidateMission(missionId);
      void queryClient.invalidateQueries({
        predicate: (query) =>
          isActivityRouteForMissionActivity(
            query.queryKey,
            missionId,
            activityId,
          ),
      });

      if (depotId != null) {
        void queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
      }
    };

    const applyActivityStatus = (
      update: MissionRealtimeActivityStatusUpdate,
    ) => {
      queryClient.setQueriesData(
        { queryKey: MISSION_ACTIVITIES_QUERY_KEY },
        (oldData) => patchMissionActivityStatusInCache(oldData, update),
      );
      queryClient.setQueriesData(
        { queryKey: MISSIONS_QUERY_KEY },
        (oldData) => patchMissionActivityStatusInCache(oldData, update),
      );
      onActivityStatusUpdatedRef.current?.(update);
    };

    const handleMissionUpdate = (payload: AdminMissionRealtimeUpdate) => {
      queryClient.setQueriesData(
        { queryKey: MISSIONS_QUERY_KEY },
        (oldData) => patchMissionStatusInCache(oldData, payload),
      );

      if (
        payload.clusterId === activeClusterIdRef.current ||
        activeMissionIdsRef.current.includes(payload.missionId)
      ) {
        const targetClusterId = payload.clusterId ?? activeClusterIdRef.current;
        if (targetClusterId != null) {
          void queryClient.invalidateQueries({
            queryKey: [...MISSIONS_QUERY_KEY, targetClusterId],
          });
        }
        invalidateMission(payload.missionId);
      }
    };

    const handleMissionActivityUpdate = (
      payload: AdminMissionActivityRealtimeUpdate,
    ) => {
      if (!payload.status || payload.missionId == null) {
        return;
      }

      applyActivityStatus({
        missionId: payload.missionId,
        activityId: payload.activityId,
        status: payload.status,
        changedAt: payload.changedAt,
      });
      invalidateActivity(payload.missionId, payload.activityId, payload.depotId);
    };

    const handleMissionExecutionProgress = (
      payload: AdminMissionExecutionProgressRealtimeUpdate,
    ) => {
      const primaryStatus = payload.effectiveStatus ?? payload.status;

      if (payload.activityId != null && primaryStatus) {
        applyActivityStatus({
          missionId: payload.missionId,
          activityId: payload.activityId,
          status: primaryStatus,
          changedAt: payload.changedAt,
        });
      }

      for (const activity of payload.affectedActivities ?? []) {
        if (!activity.status) {
          continue;
        }

        applyActivityStatus({
          missionId: payload.missionId,
          activityId: activity.missionActivityId,
          status: activity.status,
          changedAt: payload.changedAt,
        });
      }

      if (payload.requeryRecommended) {
        if (payload.activityId != null) {
          invalidateActivity(
            payload.missionId,
            payload.activityId,
            payload.depotId,
          );
        } else {
          invalidateMission(payload.missionId);
        }
      }
    };

    const invalidateActiveQueries = () => {
      if (activeClusterIdRef.current != null) {
        void queryClient.invalidateQueries({
          queryKey: [...MISSIONS_QUERY_KEY, activeClusterIdRef.current],
        });
      }

      activeMissionIdsRef.current.forEach((missionId) => {
        invalidateMission(missionId);
      });
    };

    const unsubscribeMission =
      adminOperationsRealtimeClient.onMissionUpdate(handleMissionUpdate);
    const unsubscribeMissionActivity =
      adminOperationsRealtimeClient.onMissionActivityUpdate(
        handleMissionActivityUpdate,
      );
    const unsubscribeMissionExecution =
      adminOperationsRealtimeClient.onMissionExecutionProgress(
        handleMissionExecutionProgress,
      );
    const unsubscribeReconnected =
      adminOperationsRealtimeClient.onReconnected(invalidateActiveQueries);

    return () => {
      unsubscribeMission();
      unsubscribeMissionActivity();
      unsubscribeMissionExecution();
      unsubscribeReconnected();
    };
  }, [
    accessToken,
    activeClusterId,
    enabled,
    hasActiveScope,
    queryClient,
  ]);
}
