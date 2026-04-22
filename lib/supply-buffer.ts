export const DEFAULT_SUPPLY_BUFFER_RATIO = 0.1;

const BUFFER_PERCENT_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function normalizeSupplyBufferRatio(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const nonNegative = Math.max(0, parsed);
  return nonNegative > 1 ? nonNegative / 100 : nonNegative;
}

export function resolveSupplyBufferRatio(value: unknown): number {
  return normalizeSupplyBufferRatio(value) ?? DEFAULT_SUPPLY_BUFFER_RATIO;
}

export function supplyBufferPercentToRatio(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, parsed)) / 100;
}

export function getSupplyBufferPercentInputValue(value: unknown): number {
  return Number((resolveSupplyBufferRatio(value) * 100).toFixed(2));
}

export function formatSupplyBufferPercent(value: unknown): string {
  return `${BUFFER_PERCENT_FORMATTER.format(resolveSupplyBufferRatio(value) * 100)}%`;
}
