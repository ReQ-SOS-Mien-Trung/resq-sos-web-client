import type { DepotClosureTransferStatusMetadata } from "@/services/depot/type";

export const DEPOT_CLOSURE_TRANSFER_STATUS_ORDER = [
  "AwaitingPreparation",
  "Preparing",
  "Shipping",
  "Completed",
  "Received",
  "Cancelled",
] as const;
const DEPOT_CLOSURE_TRANSFER_STATUS_ORDER_SET = new Set<string>(
  DEPOT_CLOSURE_TRANSFER_STATUS_ORDER,
);

export const DEPOT_CLOSURE_TRANSFER_STEP_KEYS = [
  "AwaitingPreparation",
  "Preparing",
  "Shipping",
  "Completed",
  "Received",
] as const;

export const DEPOT_CLOSURE_TRANSFER_TERMINAL_STATUSES = new Set([
  "Received",
  "Cancelled",
]);

const LEGACY_TRANSFER_STATUS_MAP: Record<string, string> = {
  "Chờ chuẩn bị": "AwaitingPreparation",
  "Chờ chuẩn bị hàng": "AwaitingPreparation",
  "Đang chuẩn bị": "Preparing",
  "Đang chuẩn bị hàng": "Preparing",
  "Đang vận chuyển": "Shipping",
  "Đã giao": "Completed",
  "Đã hoàn thành": "Completed",
  "Chờ xác nhận": "Completed",
  "Chờ xác nhận nhận": "Completed",
  "Đã giao hàng, chờ xác nhận nhận": "Completed",
  "Đã nhận": "Received",
  "Đã nhận hàng, hoàn tất": "Received",
  "Đã hủy": "Cancelled",
  "Đã huỷ": "Cancelled",
};

export const DEPOT_CLOSURE_TRANSFER_STATUS_FALLBACK_LABELS: Record<
  string,
  string
> = {
  AwaitingPreparation: "Chờ chuẩn bị hàng",
  Preparing: "Đang chuẩn bị hàng",
  Shipping: "Đang vận chuyển",
  Completed: "Đã giao hàng, chờ xác nhận nhận",
  Received: "Đã nhận hàng, hoàn tất",
  Cancelled: "Đã huỷ",
};

const DEPOT_CLOSURE_TRANSFER_STATUS_TONE_CLASSES: Record<string, string> = {
  AwaitingPreparation: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Preparing:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Shipping: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Received:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Cancelled: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400",
};

export function normalizeDepotClosureTransferStatus(
  raw: string | undefined | null,
): string {
  if (!raw) return "AwaitingPreparation";
  if (DEPOT_CLOSURE_TRANSFER_STATUS_ORDER_SET.has(raw)) return raw;
  return LEGACY_TRANSFER_STATUS_MAP[raw] ?? raw;
}

export function buildDepotClosureTransferStatusValueMap(
  metadata?: DepotClosureTransferStatusMetadata[],
): Record<string, string> {
  const baseMap = { ...DEPOT_CLOSURE_TRANSFER_STATUS_FALLBACK_LABELS };

  for (const item of metadata ?? []) {
    const key = normalizeDepotClosureTransferStatus(item?.key);
    const value = String(item?.value ?? "").trim();
    if (!key || !value) continue;
    baseMap[key] = value;
  }

  return baseMap;
}

export function getDepotClosureTransferStatusLabel(
  rawStatus: string | undefined | null,
  valueMap?: Record<string, string>,
): string {
  const normalizedStatus = normalizeDepotClosureTransferStatus(rawStatus);
  return (
    valueMap?.[normalizedStatus] ??
    DEPOT_CLOSURE_TRANSFER_STATUS_FALLBACK_LABELS[normalizedStatus] ??
    normalizedStatus
  );
}

export function getDepotClosureTransferStatusToneClass(
  rawStatus: string | undefined | null,
): string {
  const normalizedStatus = normalizeDepotClosureTransferStatus(rawStatus);
  return (
    DEPOT_CLOSURE_TRANSFER_STATUS_TONE_CLASSES[normalizedStatus] ??
    "bg-muted text-muted-foreground"
  );
}

export function buildDepotClosureTransferStatusOptions(
  metadata?: DepotClosureTransferStatusMetadata[],
): Array<{ value: string; label: string }> {
  const valueMap = buildDepotClosureTransferStatusValueMap(metadata);

  return DEPOT_CLOSURE_TRANSFER_STATUS_ORDER.map((status) => ({
    value: status,
    label: getDepotClosureTransferStatusLabel(status, valueMap),
  }));
}

export function buildDepotClosureTransferStepItems(
  metadata?: DepotClosureTransferStatusMetadata[],
): Array<{ key: string; label: string }> {
  const valueMap = buildDepotClosureTransferStatusValueMap(metadata);

  return DEPOT_CLOSURE_TRANSFER_STEP_KEYS.map((status) => ({
    key: status,
    label: getDepotClosureTransferStatusLabel(status, valueMap),
  }));
}
