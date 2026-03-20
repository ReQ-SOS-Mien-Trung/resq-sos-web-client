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
