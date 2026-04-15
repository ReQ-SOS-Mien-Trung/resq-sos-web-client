import api from "@/config/axios";
import {
  BroadcastNotificationPayload,
  NotificationListParams,
  NotificationListResponse,
  RegisterFcmTokenPayload,
  UserNotificationItem,
} from "./type";
import { NOTIFICATION_DEFAULT_QUERY, NOTIFICATION_ENDPOINTS } from "./config";
import { normalizeNotificationItem, toFiniteNumber } from "./normalize";

function normalizeNotificationList(
  raw: unknown,
  fallbackParams: Required<NotificationListParams>,
): NotificationListResponse {
  const record = (raw ?? {}) as Partial<NotificationListResponse> & {
    pageNumber?: number;
    items?: unknown[];
  };

  const normalizedItems = Array.isArray(record.items)
    ? record.items
        .map((item) => normalizeNotificationItem(item))
        .filter((item): item is UserNotificationItem => Boolean(item))
    : [];

  const unreadCount = toFiniteNumber(
    record.unreadCount,
    normalizedItems.filter((item) => !item.isRead).length,
  );

  return {
    items: normalizedItems,
    totalCount: toFiniteNumber(record.totalCount, normalizedItems.length),
    page: toFiniteNumber(record.page ?? record.pageNumber, fallbackParams.page),
    pageSize: toFiniteNumber(record.pageSize, fallbackParams.pageSize),
    unreadCount,
  };
}

/**
 * Get paginated notifications of current user
 * GET /notifications?page=1&pageSize=20
 */
export async function getNotifications(
  params?: NotificationListParams,
): Promise<NotificationListResponse> {
  const mergedParams: Required<NotificationListParams> = {
    page: params?.page ?? NOTIFICATION_DEFAULT_QUERY.page,
    pageSize: params?.pageSize ?? NOTIFICATION_DEFAULT_QUERY.pageSize,
  };

  const { data } = await api.get(NOTIFICATION_ENDPOINTS.list, {
    params: mergedParams,
  });

  return normalizeNotificationList(data, mergedParams);
}

/**
 * Mark one notification as read
 * PATCH /notifications/{userNotificationId}/read
 */
export async function markNotificationAsRead(
  userNotificationId: number,
): Promise<void> {
  await api.patch(`${NOTIFICATION_ENDPOINTS.list}/${userNotificationId}/read`);
}

/**
 * Mark all notifications as read
 * PATCH /notifications/read-all
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await api.patch(NOTIFICATION_ENDPOINTS.readAll);
}

/**
 * Register browser FCM token for push notifications
 * POST /identity/user/me/fcm-token
 */
export async function registerFcmToken(
  payload: RegisterFcmTokenPayload,
): Promise<void> {
  await api.post(NOTIFICATION_ENDPOINTS.fcmToken, payload);
}

/**
 * Remove registered browser FCM token
 * DELETE /identity/user/me/fcm-token
 */
export async function unregisterFcmToken(token?: string): Promise<void> {
  if (token) {
    await api.delete(NOTIFICATION_ENDPOINTS.fcmToken, {
      data: { token },
    });
    return;
  }

  await api.delete(NOTIFICATION_ENDPOINTS.fcmToken);
}

/**
 * Broadcast a push notification to all users
 * POST /notifications/broadcast
 */
export async function broadcastNotification(
  payload: BroadcastNotificationPayload,
): Promise<void> {
  await api.post(NOTIFICATION_ENDPOINTS.broadcast, payload);
}
