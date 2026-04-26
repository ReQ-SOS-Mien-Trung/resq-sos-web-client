"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FUNDING_REQUEST_ITEMS_QUERY_KEY,
  FUNDING_REQUESTS_QUERY_KEY,
} from "@/services/funding_request/hooks";
import { adminFinanceRealtimeClient } from "@/services/admin_finance_realtime/client";
import type { FundingRequestRealtimeUpdate } from "@/services/admin_finance_realtime/type";
import { useAuthStore } from "@/stores/auth.store";

interface UseFundingRequestRealtimeOptions {
  enabled?: boolean;
  requestId?: number | null;
  subscribeDetail?: boolean;
  subscribeList?: boolean;
  onUpdate?: (payload: FundingRequestRealtimeUpdate) => void;
}

function isValidRequestId(requestId: number | null | undefined): requestId is number {
  return Number.isFinite(requestId) && (requestId ?? 0) > 0;
}

function isFundingRequestUpdate(payload: FundingRequestRealtimeUpdate): boolean {
  return !payload.entityType || payload.entityType === "FundingRequest";
}

export function useFundingRequestRealtime({
  enabled = true,
  requestId,
  subscribeDetail = false,
  subscribeList = false,
  onUpdate,
}: UseFundingRequestRealtimeOptions): void {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const onUpdateRef = useRef(onUpdate);
  const activeRequestId = isValidRequestId(requestId) ? requestId : null;

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    adminFinanceRealtimeClient.retainConnection();
    void adminFinanceRealtimeClient.start().catch((error) => {
      console.error("Failed to connect admin finance hub:", error);
    });

    return () => {
      void adminFinanceRealtimeClient.releaseConnection().catch(() => null);
    };
  }, [accessToken, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    return adminFinanceRealtimeClient.onFundingRequestUpdate((payload) => {
      if (!isFundingRequestUpdate(payload)) return;

      void queryClient.invalidateQueries({
        queryKey: FUNDING_REQUESTS_QUERY_KEY,
      });

      if (isValidRequestId(payload.requestId)) {
        void queryClient.invalidateQueries({
          queryKey: [...FUNDING_REQUEST_ITEMS_QUERY_KEY, payload.requestId],
        });
      }

      onUpdateRef.current?.(payload);
    });
  }, [accessToken, enabled, queryClient]);

  useEffect(() => {
    if (!enabled || !accessToken || !subscribeList) return;

    void adminFinanceRealtimeClient
      .subscribeFundingRequests()
      .catch((error) => {
        console.error("Failed to subscribe funding request list:", error);
      });

    return () => {
      void adminFinanceRealtimeClient
        .unsubscribeFundingRequests()
        .catch(() => null);
    };
  }, [accessToken, enabled, subscribeList]);

  useEffect(() => {
    if (!enabled || !accessToken || !subscribeDetail || activeRequestId == null) {
      return;
    }

    void adminFinanceRealtimeClient
      .subscribeFundingRequest(activeRequestId)
      .catch((error) => {
        console.error("Failed to subscribe funding request detail:", error);
      });

    return () => {
      void adminFinanceRealtimeClient
        .unsubscribeFundingRequest(activeRequestId)
        .catch(() => null);
    };
  }, [accessToken, activeRequestId, enabled, subscribeDetail]);
}
