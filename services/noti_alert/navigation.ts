import { getDashboardPathByRole, ROLES } from "@/lib/roles";

function normalizeType(type: string): string {
  return String(type ?? "")
    .trim()
    .toLowerCase();
}

function resolveFloodRouteByRole(roleId?: number): string {
  if (roleId === ROLES.ADMIN) {
    return "/dashboard/admin/weather-flood";
  }

  if (roleId === ROLES.COORDINATOR) {
    return "/dashboard/coordinator?mode=weather";
  }

  return "/dashboard/inventory";
}

export function resolveNotificationRoute(
  type: string,
  roleId?: number,
): string {
  const normalizedType = normalizeType(type);

  if (normalizedType === "chat_message") {
    return "/dashboard/coordinator/chat";
  }

  if (normalizedType === "fund_allocation") {
    return "/dashboard/inventory/funding-request";
  }

  if (
    normalizedType === "supply_request" ||
    normalizedType === "supply_request_urgent" ||
    normalizedType === "supply_request_high_escalation" ||
    normalizedType === "supply_request_urgent_escalation" ||
    normalizedType === "supply_request_auto_rejected"
  ) {
    return "/dashboard/inventory?tab=incoming";
  }

  if (
    normalizedType === "supply_accepted" ||
    normalizedType === "supply_rejected" ||
    normalizedType === "supply_preparing" ||
    normalizedType === "supply_shipped" ||
    normalizedType === "supply_completed"
  ) {
    return "/dashboard/inventory?tab=shipments";
  }

  if (
    normalizedType === "flood_alert" ||
    normalizedType === "flood_warning" ||
    normalizedType === "flood_emergency" ||
    normalizedType === "evacuation"
  ) {
    return resolveFloodRouteByRole(roleId);
  }

  return getDashboardPathByRole(roleId ?? 0) ?? "/";
}
