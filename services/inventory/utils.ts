import type {
  ConsumableItemEntity,
  InventoryItemEntity,
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
