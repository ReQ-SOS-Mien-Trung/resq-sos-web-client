import { useMutation } from "@tanstack/react-query";
import { broadcastNotification } from "./api";
import { BroadcastNotificationPayload } from "./type";

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: (payload: BroadcastNotificationPayload) =>
      broadcastNotification(payload),
  });
}
