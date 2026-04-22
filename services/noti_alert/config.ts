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
    receiveBroadcast: "ReceiveBroadcastAlert",
  },
  reconnectDelaysMs: [0, 1000, 3000, 5000, 10000] as const,
} as const;

export const DEPOT_CLOSURE_NOTIFICATION_TYPES = [
  "depot_closure_external_marked",
  "depot_closure_transfer_assigned",
  "depot_closure_transfer_ready",
  "depot_closure_transfer_completed",
  "depot_closure_transfer_received",
  "depot_closure_processing_required",
  "depot_closure_processing",
  "depot_closure_completed",
] as const;

export const ROLE_NOTIFICATION_TYPES: Record<number, readonly string[]> = {
  1: [],
  2: [
    "chat_message",
    "assembly_checkin",
    "assembly_checkout",
    "assembly_gathering",
    "assembly_point_assignment",
  ],
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
    ...DEPOT_CLOSURE_NOTIFICATION_TYPES,
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
  depot_closure_external_marked: "Đã đánh dấu xử lý bên ngoài khi đóng kho",
  depot_closure_transfer_assigned: "Phân công nhận hàng đóng kho",
  depot_closure_transfer_ready: "Phiên chuyển kho sẵn sàng",
  depot_closure_transfer_completed: "Phiên chuyển kho hoàn tất",
  depot_closure_transfer_received: "Kho đích đã nhận hàng",
  depot_closure_processing_required: "Cần xử lý tồn kho khi đóng kho",
  depot_closure_processing: "Phiên đóng kho đang xử lý",
  depot_closure_completed: "Phiên đóng kho hoàn tất",
  chat_message: "Tin nhắn chat",
  assembly_checkin: "Thành viên đến điểm tập kết",
  assembly_checkout: "Thành viên rời điểm tập kết",
  assembly_gathering: "Lịch tập kết",
  assembly_point_assignment: "Phân công điểm tập kết",
  flood_alert: "Cảnh báo lũ",
  flood_warning: "Cảnh báo lũ",
  flood_emergency: "Cảnh báo lũ khẩn cấp",
  evacuation: "Lệnh sơ tán",
  inventory_maintenance_alert: "Cảnh báo bảo trì kho",
  inventory_maintenance: "Bảo trì kho",
  sos_request_new: "Yêu cầu SOS mới",
  sos_request_assigned: "Yêu cầu SOS được phân công",
  sos_request_resolved: "Yêu cầu SOS đã giải quyết",
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
  depot_closure_external_marked: "warning",
  depot_closure_transfer_assigned: "warning",
  depot_closure_transfer_ready: "info",
  depot_closure_transfer_completed: "success",
  depot_closure_transfer_received: "success",
  depot_closure_processing_required: "danger",
  depot_closure_processing: "info",
  depot_closure_completed: "success",
  chat_message: "info",
  assembly_checkin: "success",
  assembly_checkout: "warning",
  assembly_gathering: "info",
  assembly_point_assignment: "info",
  flood_alert: "warning",
  flood_warning: "warning",
  flood_emergency: "danger",
  evacuation: "danger",
  inventory_maintenance_alert: "warning",
  inventory_maintenance: "warning",
  sos_request_new: "danger",
  sos_request_assigned: "info",
  sos_request_resolved: "success",
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
