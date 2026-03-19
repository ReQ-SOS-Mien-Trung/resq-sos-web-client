import api from "@/config/axios";
import { BroadcastNotificationPayload } from "./type";

/**
 * Broadcast a push notification to all users
 * POST /notifications/broadcast
 */
export async function broadcastNotification(
  payload: BroadcastNotificationPayload,
): Promise<void> {
  await api.post("/notifications/broadcast", payload);
}
