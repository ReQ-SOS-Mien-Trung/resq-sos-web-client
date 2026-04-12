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

export interface NotificationRouteData {
  url?: string | null;
  sourceDepotId?: string | number | null;
  closureId?: string | number | null;
  transferId?: string | number | null;
  [key: string]: unknown;
}

export interface UserNotificationItem {
  userNotificationId: number;
  title: string;
  type: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: NotificationRouteData | null;
}

export interface NotificationListResponse {
  items: UserNotificationItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export type NotificationRealtimePayload = UserNotificationItem;

export interface BroadcastAlertRealtimePayload {
  title: string;
  type: string;
  body: string;
  location?: {
    city: string;
    lat: number;
    lon: number;
  };
  activeAlerts?: unknown[];
  sentAt?: string;
}

export interface RegisterFcmTokenPayload {
  token: string;
}
