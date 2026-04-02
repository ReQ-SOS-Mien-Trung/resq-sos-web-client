import { useEffect, useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import {
  broadcastNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerFcmToken,
  unregisterFcmToken,
} from "./api";
import { NOTIFICATION_DEFAULT_QUERY } from "./config";
import { notificationRealtimeClient } from "./realtime";
import {
  BroadcastNotificationPayload,
  NotificationListParams,
  NotificationListResponse,
  NotificationRealtimePayload,
  RegisterFcmTokenPayload,
  UserNotificationItem,
} from "./type";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (params: Required<NotificationListParams>) =>
    [...NOTIFICATION_KEYS.all, "list", params] as const,
};

type NotificationCenterOptions = {
  params?: NotificationListParams;
  enabled?: boolean;
};

function normalizeParams(
  params?: NotificationListParams,
): Required<NotificationListParams> {
  return {
    page: params?.page ?? NOTIFICATION_DEFAULT_QUERY.page,
    pageSize: params?.pageSize ?? NOTIFICATION_DEFAULT_QUERY.pageSize,
  };
}

function normalizeRealtimeNotification(
  payload: NotificationRealtimePayload,
): UserNotificationItem | null {
  const id = Number(payload?.userNotificationId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    userNotificationId: id,
    title: String(payload.title ?? "Thông báo"),
    type: String(payload.type ?? "general"),
    body: String(payload.body ?? ""),
    isRead: Boolean(payload.isRead),
    createdAt: String(payload.createdAt ?? new Date().toISOString()),
  };
}

function createEmptyList(
  params: Required<NotificationListParams>,
): NotificationListResponse {
  return {
    items: [],
    totalCount: 0,
    page: params.page,
    pageSize: params.pageSize,
    unreadCount: 0,
  };
}

function upsertNotificationIntoList(
  current: NotificationListResponse | undefined,
  incoming: UserNotificationItem,
  fallbackParams: Required<NotificationListParams>,
): NotificationListResponse {
  const safeCurrent = current ?? createEmptyList(fallbackParams);
  const existing = safeCurrent.items.find(
    (item) => item.userNotificationId === incoming.userNotificationId,
  );

  const nextItems = [incoming]
    .concat(
      safeCurrent.items.filter(
        (item) => item.userNotificationId !== incoming.userNotificationId,
      ),
    )
    .slice(0, Math.max(1, safeCurrent.pageSize));

  let nextUnreadCount = safeCurrent.unreadCount;
  if (!existing && !incoming.isRead) {
    nextUnreadCount += 1;
  } else if (existing && existing.isRead && !incoming.isRead) {
    nextUnreadCount += 1;
  } else if (existing && !existing.isRead && incoming.isRead) {
    nextUnreadCount = Math.max(0, nextUnreadCount - 1);
  }

  return {
    ...safeCurrent,
    items: nextItems,
    totalCount: existing ? safeCurrent.totalCount : safeCurrent.totalCount + 1,
    unreadCount: nextUnreadCount,
  };
}

function markOneAsReadInList(
  current: NotificationListResponse,
  userNotificationId: number,
): NotificationListResponse {
  let hasChanged = false;

  const nextItems = current.items.map((item) => {
    if (item.userNotificationId !== userNotificationId || item.isRead) {
      return item;
    }

    hasChanged = true;
    return { ...item, isRead: true };
  });

  if (!hasChanged) {
    return current;
  }

  return {
    ...current,
    items: nextItems,
    unreadCount: Math.max(0, current.unreadCount - 1),
  };
}

function markAllAsReadInList(
  current: NotificationListResponse,
): NotificationListResponse {
  const hasUnreadItem = current.items.some((item) => !item.isRead);
  if (!hasUnreadItem && current.unreadCount === 0) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((item) => ({ ...item, isRead: true })),
    unreadCount: 0,
  };
}

export function useNotifications(
  params?: NotificationListParams,
  options?: Omit<
    UseQueryOptions<NotificationListResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const normalizedParams = useMemo(() => normalizeParams(params), [params]);

  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(normalizedParams),
    queryFn: () => getNotifications(normalizedParams),
    ...options,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userNotificationId: number) =>
      markNotificationAsRead(userNotificationId),
    onSuccess: (_, userNotificationId) => {
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (current) => {
          if (!current) {
            return current;
          }

          return markOneAsReadInList(current, userNotificationId);
        },
      );
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (current) => {
          if (!current) {
            return current;
          }

          return markAllAsReadInList(current);
        },
      );
    },
  });
}

export function useRegisterFcmToken() {
  return useMutation({
    mutationFn: (payload: RegisterFcmTokenPayload) => registerFcmToken(payload),
  });
}

export function useUnregisterFcmToken() {
  return useMutation({
    mutationFn: (token?: string) => unregisterFcmToken(token),
  });
}

export function useNotificationRealtimeSync(
  options?: NotificationCenterOptions,
) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const normalizedParams = useMemo(
    () => normalizeParams(options?.params),
    [options?.params],
  );

  useEffect(() => {
    const isEnabled =
      (options?.enabled ?? true) && isAuthenticated && !!accessToken;
    if (!isEnabled) {
      return;
    }

    const targetKey = NOTIFICATION_KEYS.list(normalizedParams);

    const unsubscribe = notificationRealtimeClient.subscribe((payload) => {
      const incoming = normalizeRealtimeNotification(payload);
      if (!incoming) {
        return;
      }

      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: NOTIFICATION_KEYS.all },
        (current) => {
          if (!current) {
            return current;
          }

          return upsertNotificationIntoList(
            current,
            incoming,
            normalizedParams,
          );
        },
      );

      const targetData =
        queryClient.getQueryData<NotificationListResponse>(targetKey);

      if (!targetData) {
        queryClient.setQueryData<NotificationListResponse>(
          targetKey,
          (current) =>
            upsertNotificationIntoList(current, incoming, normalizedParams),
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    accessToken,
    isAuthenticated,
    normalizedParams,
    options?.enabled,
    queryClient,
  ]);
}

export function useNotificationCenter(options?: NotificationCenterOptions) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const normalizedParams = useMemo(
    () => normalizeParams(options?.params),
    [options?.params],
  );

  const isEnabled =
    (options?.enabled ?? true) && isAuthenticated && !!accessToken;

  const notificationsQuery = useNotifications(normalizedParams, {
    enabled: isEnabled,
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  useNotificationRealtimeSync({
    enabled: isEnabled,
    params: normalizedParams,
  });

  return {
    ...notificationsQuery,
    notifications: notificationsQuery.data?.items ?? [],
    unreadCount: notificationsQuery.data?.unreadCount ?? 0,
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadAsync: markAllAsReadMutation.mutateAsync,
    isMarkingOne: markAsReadMutation.isPending,
    isMarkingAll: markAllAsReadMutation.isPending,
  };
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: (payload: BroadcastNotificationPayload) =>
      broadcastNotification(payload),
  });
}
