import { getDashboardPathByRole, ROLES } from "@/lib/roles";
import type { NotificationRouteData } from "./type";

function normalizeType(type: string): string {
  return String(type ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
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

function buildCoordinatorChatRoute(
  data?: NotificationRouteData | null,
): string | null {
  const conversationId = toPositiveInt(data?.conversationId);
  if (!conversationId) {
    return null;
  }

  return `/dashboard/coordinator/chat?conversationId=${conversationId}`;
}

function buildInventoryRequestRoute(
  tab: "incoming" | "shipments",
  data?: NotificationRouteData | null,
): string {
  const requestId = toPositiveInt(data?.requestId ?? data?.supplyRequestId);
  const params = new URLSearchParams({ tab });

  if (requestId) {
    params.set("requestId", String(requestId));
  }

  return `/dashboard/inventory?${params.toString()}`;
}

function buildAssemblyPointRoute(data?: NotificationRouteData | null): string {
  const assemblyPointId = toPositiveInt(data?.assemblyPointId);
  if (!assemblyPointId) {
    return "/dashboard/admin/assembly-points";
  }

  return `/dashboard/admin/assembly-points?assemblyPointId=${assemblyPointId}`;
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

  const coordinatorChatRoute = buildCoordinatorChatRoute(data);
  if (coordinatorChatRoute) {
    return coordinatorChatRoute;
  }

  const depotClosureRoute = buildDepotClosureTransferRoute(data);
  if (depotClosureRoute) {
    return depotClosureRoute;
  }

  const normalizedType = normalizeType(type);

  if (normalizedType === "chat_message") {
    return buildCoordinatorChatRoute(data) ?? "/dashboard/coordinator/chat";
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
    return buildInventoryRequestRoute("incoming", data);
  }

  if (
    normalizedType === "supply_accepted" ||
    normalizedType === "supply_rejected" ||
    normalizedType === "supply_preparing" ||
    normalizedType === "supply_shipped" ||
    normalizedType === "supply_completed"
  ) {
    return buildInventoryRequestRoute("shipments", data);
  }

  if (
    normalizedType === "depot_closure_transfer_assigned" ||
    normalizedType === "depot_closure_transfer_ready" ||
    normalizedType === "depot_closure_transfer_completed" ||
    normalizedType === "depot_closure_transfer_received" ||
    normalizedType === "depot_closure_processing_required" ||
    normalizedType === "depot_closure_processing" ||
    normalizedType === "depot_closure_completed"
  ) {
    return depotClosureRoute ?? "/dashboard/inventory/depot-closure";
  }

  if (
    normalizedType === "assembly_checkin" ||
    normalizedType === "assembly_checkout" ||
    normalizedType === "assembly_gathering" ||
    normalizedType === "assembly_point_assignment"
  ) {
    return buildAssemblyPointRoute(data);
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
