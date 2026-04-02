export const BROADCAST_NOTIFICATION_TYPES = [
  "FLOOD_WARNING",
  "FLOOD_EMERGENCY",
  "EVACUATION",
] as const;

export type BroadcastNotificationType =
  (typeof BROADCAST_NOTIFICATION_TYPES)[number];

export interface BroadcastNotificationLocation {
  city: string;
  lat: number;
  lon: number;
}

export interface BroadcastNotificationAlert {
  id: string;
  eventType: string;
  title: string;
  severity: string;
  areasAffected: string[];
  startTime: string;
  endTime: string;
  description: string;
  instructionChecklist: string[];
  source: string;
}

export interface BroadcastNotificationPayload {
  location: BroadcastNotificationLocation;
  activeAlerts: BroadcastNotificationAlert[];
}

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
}

export interface UserNotificationItem {
  userNotificationId: number;
  title: string;
  type: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: UserNotificationItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export type NotificationRealtimePayload = UserNotificationItem;

export interface RegisterFcmTokenPayload {
  token: string;
}
