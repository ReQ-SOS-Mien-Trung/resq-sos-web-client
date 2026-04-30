"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { adminOperationsRealtimeClient } from "@/services/admin_operations_realtime/client";
import { TEAM_OVERVIEW_KEYS } from "@/services/admin_dashboard/team-overview.hooks";

interface UseRescueTeamRealtimeOptions {
  enabled?: boolean;
  /** Subscribe to the rescue-teams list channel */
  subscribeList?: boolean;
  /** Subscribe to a specific rescue-team detail channel */
  teamId?: number | null;
  /** Subscribe to a specific rescuer-scores channel */
  rescuerId?: string | null;
  onTeamUpdate?: () => void;
  onScoresUpdate?: () => void;
}

export function useRescueTeamRealtime({
  enabled = true,
  subscribeList = false,
  teamId,
  rescuerId,
  onTeamUpdate,
  onScoresUpdate,
}: UseRescueTeamRealtimeOptions): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const onTeamUpdateRef = useRef(onTeamUpdate);
  const onScoresUpdateRef = useRef(onScoresUpdate);

  useEffect(() => {
    onTeamUpdateRef.current = onTeamUpdate;
  }, [onTeamUpdate]);

  useEffect(() => {
    onScoresUpdateRef.current = onScoresUpdate;
  }, [onScoresUpdate]);

  // ─── Retain connection ───
  useEffect(() => {
    if (!enabled || !accessToken) return;

    adminOperationsRealtimeClient.retainConnection();
    void adminOperationsRealtimeClient.start().catch((error) => {
      console.error("Failed to connect admin-operations hub:", error);
    });

    return () => {
      void adminOperationsRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, enabled]);

  // ─── Listen for ReceiveRescueTeamUpdate ───
  useEffect(() => {
    if (!enabled || !accessToken) return;

    return adminOperationsRealtimeClient.onRescueTeamUpdate(() => {
      void queryClient.invalidateQueries({
        queryKey: TEAM_OVERVIEW_KEYS.all,
      });

      onTeamUpdateRef.current?.();
    });
  }, [accessToken, enabled, queryClient]);

  // ─── Listen for ReceiveRescuerScoresUpdate ───
  useEffect(() => {
    if (!enabled || !accessToken) return;

    return adminOperationsRealtimeClient.onRescuerScoresUpdate(() => {
      void queryClient.invalidateQueries({
        queryKey: TEAM_OVERVIEW_KEYS.all,
      });

      onScoresUpdateRef.current?.();
    });
  }, [accessToken, enabled, queryClient]);

  // ─── Subscribe list ───
  useEffect(() => {
    if (!enabled || !accessToken || !subscribeList) return;

    void adminOperationsRealtimeClient
      .subscribeRescueTeams()
      .catch((error) => {
        console.error("Failed to subscribe rescue teams list:", error);
      });

    return () => {
      void adminOperationsRealtimeClient
        .unsubscribeRescueTeams()
        .catch(() => null);
    };
  }, [accessToken, enabled, subscribeList]);

  // ─── Subscribe team detail ───
  useEffect(() => {
    const activeTeamId =
      Number.isFinite(teamId) && (teamId ?? 0) > 0 ? teamId! : null;

    if (!enabled || !accessToken || activeTeamId == null) return;

    void adminOperationsRealtimeClient
      .subscribeRescueTeam(activeTeamId)
      .catch((error) => {
        console.error("Failed to subscribe rescue team detail:", error);
      });

    return () => {
      void adminOperationsRealtimeClient
        .unsubscribeRescueTeam(activeTeamId)
        .catch(() => null);
    };
  }, [accessToken, enabled, teamId]);

  // ─── Subscribe rescuer scores ───
  useEffect(() => {
    const activeRescuerId = rescuerId || null;

    if (!enabled || !accessToken || !activeRescuerId) return;

    void adminOperationsRealtimeClient
      .subscribeRescuerScores(activeRescuerId)
      .catch((error) => {
        console.error("Failed to subscribe rescuer scores:", error);
      });

    return () => {
      void adminOperationsRealtimeClient
        .unsubscribeRescuerScores(activeRescuerId)
        .catch(() => null);
    };
  }, [accessToken, enabled, rescuerId]);
}
