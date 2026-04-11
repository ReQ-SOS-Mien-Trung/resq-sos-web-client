import { getDashboardPathByRole, ROLES } from "@/lib/roles";
import type { NotificationRouteData } from "./type";

function normalizeType(type: string): string {
  return String(type ?? "")
    .trim()
    .toLowerCase();
}

function toPositiveInt(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildDepotClosureTransferRoute(
  data?: NotificationRouteData | null,
): string | null {
  const closureId = toPositiveInt(data?.closureId);
  const transferId = toPositiveInt(data?.transferId);

  if (!closureId && !transferId) {
    return null;
  }

  const params = new URLSearchParams();
  if (closureId) {
    params.set("closureId", String(closureId));
  }
  if (transferId) {
    params.set("transferId", String(transferId));
  }

  return `/dashboard/inventory/depot-closure?${params.toString()}`;
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
  data?: NotificationRouteData | null,
): string {
  const explicitUrl = typeof data?.url === "string" ? data.url.trim() : "";
  if (explicitUrl) {
    return explicitUrl;
  }

  const depotClosureRoute = buildDepotClosureTransferRoute(data);
  if (depotClosureRoute) {
    return depotClosureRoute;
  }

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
