export const BROADCAST_NOTIFICATION_TYPES = [
  "FLOOD_WARNING",
  "FLOOD_EMERGENCY",
  "EVACUATION",
] as const;

export type BroadcastNotificationType =
  (typeof BROADCAST_NOTIFICATION_TYPES)[number];

export interface BroadcastNotificationPayload {
  title: string;
  body: string;
  type: BroadcastNotificationType;
}
