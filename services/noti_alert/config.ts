export const NOTIFICATION_ENDPOINTS = {
  list: "/notifications",
  readAll: "/notifications/read-all",
  broadcast: "/notifications/broadcast",
  fcmToken: "/identity/user/me/fcm-token",
} as const;

export const NOTIFICATION_DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
} as const;

export const NOTIFICATION_RECENT_QUERY = {
  page: 1,
  pageSize: 10,
} as const;

export const NOTIFICATION_HUB_CONFIG = {
  path: "/hubs/notifications",
  events: {
    receive: "ReceiveNotification",
  },
  reconnectDelaysMs: [0, 1000, 3000, 5000, 10000] as const,
} as const;

export const ROLE_NOTIFICATION_TYPES: Record<number, readonly string[]> = {
  1: [],
  2: ["chat_message"],
  4: [
    "fund_allocation",
    "supply_request",
    "supply_request_urgent",
    "supply_request_high_escalation",
    "supply_request_urgent_escalation",
    "supply_request_auto_rejected",
    "supply_accepted",
    "supply_rejected",
    "supply_preparing",
    "supply_shipped",
    "supply_completed",
  ],
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  fund_allocation: "Cấp quỹ chiến dịch",
  supply_request: "Yêu cầu tiếp tế mới",
  supply_request_urgent: "Yêu cầu tiếp tế khẩn cấp",
  supply_request_high_escalation: "Yêu cầu tiếp tế cần xử lý ngay",
  supply_request_urgent_escalation: "Yêu cầu tiếp tế đã quá ngưỡng khẩn",
  supply_request_auto_rejected: "Yêu cầu tiếp tế tự động từ chối",
  supply_accepted: "Yêu cầu tiếp tế đã được chấp nhận",
  supply_rejected: "Yêu cầu tiếp tế đã bị từ chối",
  supply_preparing: "Đơn hàng đang được chuẩn bị",
  supply_shipped: "Đơn hàng đã được vận chuyển",
  supply_completed: "Đơn hàng đã hoàn tất",
  chat_message: "Tin nhắn mới",
  flood_alert: "Cảnh báo lũ",
  flood_warning: "Cảnh báo lũ",
  flood_emergency: "Cảnh báo lũ khẩn cấp",
  evacuation: "Lệnh sơ tán",
};

export type NotificationTone =
  | "danger"
  | "warning"
  | "info"
  | "success"
  | "neutral";

const NOTIFICATION_TYPE_TONES: Record<string, NotificationTone> = {
  fund_allocation: "info",
  supply_request: "warning",
  supply_request_urgent: "danger",
  supply_request_high_escalation: "danger",
  supply_request_urgent_escalation: "danger",
  supply_request_auto_rejected: "danger",
  supply_accepted: "success",
  supply_rejected: "danger",
  supply_preparing: "info",
  supply_shipped: "info",
  supply_completed: "success",
  chat_message: "info",
  flood_alert: "warning",
  flood_warning: "warning",
  flood_emergency: "danger",
  evacuation: "danger",
};

function toTitleCase(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNotificationTypeLabel(type: string): string {
  const normalizedType = String(type ?? "")
    .trim()
    .toLowerCase();

  return (
    NOTIFICATION_TYPE_LABELS[normalizedType] ?? toTitleCase(normalizedType)
  );
}

export function getNotificationTypeTone(type: string): NotificationTone {
  const normalizedType = String(type ?? "")
    .trim()
    .toLowerCase();

  return NOTIFICATION_TYPE_TONES[normalizedType] ?? "neutral";
}
