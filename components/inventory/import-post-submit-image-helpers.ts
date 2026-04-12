import { getMyDepotInventory } from "@/services/inventory/api";
import type { GetMyDepotInventoryParams, InventoryItemEntity } from "@/services/inventory/type";

export type DeferredImportImageRow = {
  key: string;
  itemName: string;
  categoryCode: string;
  itemType: string;
  targetGroups: string[];
};

function normalizeValue(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeGroups(groups: string[]): string {
  return [...groups]
    .map((group) => normalizeValue(group))
    .filter(Boolean)
    .sort()
    .join("|");
}

function buildSignature(parts: Array<string | null | undefined>): string {
  return parts.map((part) => normalizeValue(part)).join("::");
}

function buildCategoryAwareSignature(
  itemName: string,
  categoryName: string,
  itemType: string,
  targetGroups: string[],
): string {
  return buildSignature([
    itemName,
    categoryName,
    itemType,
    normalizeGroups(targetGroups),
  ]);
}

function buildLooseSignature(
  itemName: string,
  categoryName: string,
  itemType: string,
): string {
  return buildSignature([itemName, categoryName, itemType]);
}

function buildNameOnlySignature(itemName: string, categoryName: string): string {
  return buildSignature([itemName, categoryName]);
}

function buildTypeSignature(itemName: string, itemType: string): string {
  return buildSignature([itemName, itemType]);
}

function buildItemNameSignature(itemName: string): string {
  return buildSignature([itemName]);
}

function sortItems(items: InventoryItemEntity[]): InventoryItemEntity[] {
  return [...items].sort((a, b) => a.itemModelId - b.itemModelId);
}

function shiftMatchingItem(
  row: DeferredImportImageRow,
  groups: {
    exact: Map<string, InventoryItemEntity[]>;
    loose: Map<string, InventoryItemEntity[]>;
    nameOnly: Map<string, InventoryItemEntity[]>;
    typeOnly: Map<string, InventoryItemEntity[]>;
    itemNameOnly: Map<string, InventoryItemEntity[]>;
  },
  resolveCategoryName: (categoryCode: string) => string,
): InventoryItemEntity | null {
  const categoryName = resolveCategoryName(row.categoryCode);
  const exactKey = buildCategoryAwareSignature(
    row.itemName,
    categoryName,
    row.itemType,
    row.targetGroups,
  );
  const looseKey = buildLooseSignature(row.itemName, categoryName, row.itemType);
  const nameOnlyKey = buildNameOnlySignature(row.itemName, categoryName);
  const typeOnlyKey = buildTypeSignature(row.itemName, row.itemType);
  const itemNameOnlyKey = buildItemNameSignature(row.itemName);

  const exactMatches = groups.exact.get(exactKey);
  if (exactMatches?.length) return exactMatches.shift() ?? null;

  const looseMatches = groups.loose.get(looseKey);
  if (looseMatches?.length) return looseMatches.shift() ?? null;

  const nameOnlyMatches = groups.nameOnly.get(nameOnlyKey);
  if (nameOnlyMatches?.length) return nameOnlyMatches.shift() ?? null;

  const typeOnlyMatches = groups.typeOnly.get(typeOnlyKey);
  if (typeOnlyMatches?.length) return typeOnlyMatches.shift() ?? null;

  const itemNameOnlyMatches = groups.itemNameOnly.get(itemNameOnlyKey);
  if (itemNameOnlyMatches?.length) return itemNameOnlyMatches.shift() ?? null;

  return null;
}

export async function fetchInventorySnapshotByCategoryCodes(
  categoryCodes: string[],
): Promise<InventoryItemEntity[]> {
  const uniqueCategoryCodes = Array.from(
    new Set(categoryCodes.map((code) => code.trim()).filter(Boolean)),
  );

  if (uniqueCategoryCodes.length === 0) return [];

  const pageSize = 200;
  const firstPage = await getMyDepotInventory({
    categoryCode: uniqueCategoryCodes,
    pageNumber: 1,
    pageSize,
  } satisfies GetMyDepotInventoryParams);

  const totalPages = Math.max(firstPage.totalPages ?? 1, 1);
  const remainingPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            getMyDepotInventory({
              categoryCode: uniqueCategoryCodes,
              pageNumber: index + 2,
              pageSize,
            } satisfies GetMyDepotInventoryParams).then((page) => page.items ?? []),
          ),
        )
      : [];

  return [...(firstPage.items ?? []), ...remainingPages.flat()];
}

export function assignCreatedInventoryItemsToRows(
  rows: DeferredImportImageRow[],
  beforeItems: InventoryItemEntity[],
  afterItems: InventoryItemEntity[],
  resolveCategoryName: (categoryCode: string) => string,
): Map<string, InventoryItemEntity> {
  const previousIds = new Set(beforeItems.map((item) => item.itemModelId));
  const createdItems = sortItems(
    afterItems.filter((item) => !previousIds.has(item.itemModelId)),
  );

  const exactGroups = new Map<string, InventoryItemEntity[]>();
  const looseGroups = new Map<string, InventoryItemEntity[]>();
  const nameOnlyGroups = new Map<string, InventoryItemEntity[]>();
  const typeOnlyGroups = new Map<string, InventoryItemEntity[]>();
  const itemNameOnlyGroups = new Map<string, InventoryItemEntity[]>();

  createdItems.forEach((item) => {
    const exactKey = buildCategoryAwareSignature(
      item.itemModelName,
      item.categoryName,
      item.itemType,
      item.targetGroups ?? [],
    );
    const looseKey = buildLooseSignature(
      item.itemModelName,
      item.categoryName,
      item.itemType,
    );
    const nameOnlyKey = buildNameOnlySignature(
      item.itemModelName,
      item.categoryName,
    );
    const typeOnlyKey = buildTypeSignature(item.itemModelName, item.itemType);
    const itemNameOnlyKey = buildItemNameSignature(item.itemModelName);

    exactGroups.set(exactKey, [...(exactGroups.get(exactKey) ?? []), item]);
    looseGroups.set(looseKey, [...(looseGroups.get(looseKey) ?? []), item]);
    nameOnlyGroups.set(nameOnlyKey, [...(nameOnlyGroups.get(nameOnlyKey) ?? []), item]);
    typeOnlyGroups.set(typeOnlyKey, [...(typeOnlyGroups.get(typeOnlyKey) ?? []), item]);
    itemNameOnlyGroups.set(itemNameOnlyKey, [
      ...(itemNameOnlyGroups.get(itemNameOnlyKey) ?? []),
      item,
    ]);
  });

  const assignments = new Map<string, InventoryItemEntity>();
  rows.forEach((row) => {
    const match = shiftMatchingItem(
      row,
      {
        exact: exactGroups,
        loose: looseGroups,
        nameOnly: nameOnlyGroups,
        typeOnly: typeOnlyGroups,
        itemNameOnly: itemNameOnlyGroups,
      },
      resolveCategoryName,
    );

    if (match) {
      assignments.set(row.key, match);
    }
  });

  return assignments;
}
