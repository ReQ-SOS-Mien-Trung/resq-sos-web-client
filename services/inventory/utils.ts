import type {
  ConsumableItemEntity,
  InventoryItemEntity,
  LowStockItem,
  ReusableItemEntity,
} from "./type";

function getConsumableReserved(item: ConsumableItemEntity): number {
  return item.totalReservedQuantity ?? item.reservedQuantity ?? 0;
}

function getReusableReserved(item: ReusableItemEntity): number {
  return item.totalReservedUnits ?? item.reservedUnit ?? 0;
}

export function getInventoryTotal(item: InventoryItemEntity): number {
  return item.itemType === "Reusable" ? item.unit : item.quantity;
}

export function getInventoryAvailable(item: InventoryItemEntity): number {
  return item.itemType === "Reusable" ? item.availableUnit : item.availableQuantity;
}

export function getInventoryTotalReserved(item: InventoryItemEntity): number {
  return item.itemType === "Reusable"
    ? getReusableReserved(item)
    : getConsumableReserved(item);
}

export function getInventoryReservedForMission(item: InventoryItemEntity): number {
  if (item.itemType === "Reusable") {
    return item.reservedForMissionUnits ?? item.reservedForMissionUnit ?? 0;
  }

  return item.reservedForMissionQuantity ?? 0;
}

export function getInventoryReservedForTransfer(item: InventoryItemEntity): number {
  if (item.itemType === "Reusable") {
    return item.reservedForTransferUnits ?? item.reservedForTransferUnit ?? 0;
  }

  return item.reservedForTransferQuantity ?? 0;
}

export function formatInventoryTargetGroups(item: InventoryItemEntity): string {
  return item.targetGroups?.join(", ") || "—";
}

const WARNING_LEVEL_PRIORITY = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "OK",
  "UNCONFIGURED",
] as const;

export function normalizeWarningLevel(level?: string | null): string {
  return level?.toUpperCase() || "UNCONFIGURED";
}

export function getWarningLevelPriority(level?: string | null): number {
  const normalized = normalizeWarningLevel(level);
  const index = WARNING_LEVEL_PRIORITY.indexOf(
    normalized as (typeof WARNING_LEVEL_PRIORITY)[number],
  );
  return index === -1 ? WARNING_LEVEL_PRIORITY.length : index;
}

export function getLowStockWarningLevel(item: Pick<LowStockItem, "warningLevel" | "alertLevel">): string {
  return normalizeWarningLevel(item.warningLevel ?? item.alertLevel);
}

export function getLowStockSeverityRatio(item: Pick<LowStockItem, "severityRatio" | "availableRatio">): number {
  return item.severityRatio ?? item.availableRatio ?? 0;
}

export function compareLowStockItems(a: LowStockItem, b: LowStockItem): number {
  const levelDiff =
    getWarningLevelPriority(getLowStockWarningLevel(a)) -
    getWarningLevelPriority(getLowStockWarningLevel(b));

  if (levelDiff !== 0) {
    return levelDiff;
  }

  return getLowStockSeverityRatio(a) - getLowStockSeverityRatio(b);
}

export function getLowStockWarningLabel(level?: string | null): string {
  const normalized = normalizeWarningLevel(level);

  if (normalized === "UNCONFIGURED") {
    return "Chưa cấu hình";
  }

  return normalized;
}

export function getResolvedThresholdScopeLabel(scope?: string | null): string {
  switch (scope) {
    case "Global":
      return "Toàn hệ thống";
    case "Depot":
      return "Kho";
    case "DepotCategory":
      return "Danh mục";
    case "DepotItem":
      return "Vật phẩm";
    case "None":
      return "Chưa cấu hình";
    default:
      return scope || "—";
  }
}
