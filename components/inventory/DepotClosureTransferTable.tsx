"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import * as XLSX from "xlsx";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useInventoryItemTypes } from "@/services/inventory/hooks";
import {
  useMyDepotTransfers,
  useDepotClosureTransfer,
  usePrepareDepotTransfer,
  useShipDepotTransfer,
  useCompleteDepotTransfer,
  useReceiveDepotTransfer,
  useDepotClosureTransferStatuses,
  useDepotExternalResolutionState,
  useDownloadDepotClosureExportTemplate,
  useSubmitDepotExternalResolution,
} from "@/services/depot/hooks";
import {
  DepotExternalResolutionItem,
  DepotTransferListItem,
} from "@/services/depot/type";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ArrowsLeftRight,
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  CheckFat,
  Truck,
  Spinner,
  HourglassHigh,
  DownloadSimple,
  UploadSimple,
  FileXls,
  PaperPlaneTilt,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { notificationRealtimeClient } from "@/services/noti_alert/realtime";
import type { NotificationRealtimePayload } from "@/services/noti_alert/type";
import {
  buildDepotClosureTransferStepItems,
  buildDepotClosureTransferStatusValueMap,
  getDepotClosureTransferStatusLabel,
  getDepotClosureTransferStatusToneClass,
  normalizeDepotClosureTransferStatus,
} from "@/lib/depot-closure-transfer-status";
import { useInventoryOperationalRealtime } from "@/hooks/useInventoryOperationalRealtime";

// ── Helpers ────────────────────────────────────────────────────────────────

function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | {
          message?: unknown;
          title?: unknown;
          error?: unknown;
          errors?: unknown;
        }
      | undefined;
    const directMessage = data?.message ?? data?.title ?? data?.error;
    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage.trim();
    }
    if (data?.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors as Record<string, unknown>)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
      if (messages.length > 0) return messages.join("\n");
    }
  }
  return fallback;
}

function getExternalResolutionSubmitError(err: unknown): string {
  const apiMessage = getApiError(err, "");
  if (err instanceof AxiosError) {
    if (err.response?.status === 400) {
      return [
        "File Excel không khớp tồn kho hiện hành.",
        apiMessage ||
          "Vui lòng tải lại template mới nhất và kiểm tra Lot ID, Serial Number.",
      ].join(" ");
    }
    if (err.response?.status === 409) {
      return [
        "Không thể xử lý vì tồn kho đã thay đổi hoặc vật phẩm tái sử dụng không ở trạng thái Available.",
        apiMessage || "Vui lòng tải lại template rồi kiểm tra serial trước khi gửi.",
      ].join(" ");
    }
  }
  return apiMessage || "Gửi kết quả xử lý thất bại.";
}

function normalizeNotificationType(type: unknown): string {
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

function getInventoryItemTypeLabel(
  value: string | null | undefined,
  itemTypeValueMap: Record<string, string>,
): string {
  if (!value) return "—";
  return itemTypeValueMap[String(value)] ?? value;
}

type ExternalResolutionColumnKey =
  | "ROW_NUMBER"
  | "ITEM_NAME"
  | "CATEGORY_NAME"
  | "TARGET_GROUP"
  | "ITEM_TYPE"
  | "UNIT"
  | "SERIAL_NUMBER"
  | "RECEIVED_DATE"
  | "EXPIRED_DATE"
  | "QUANTITY"
  | "UNIT_PRICE"
  | "TOTAL_PRICE"
  | "HANDLING_METHOD"
  | "RECIPIENT"
  | "NOTE"
  | "ITEM_MODEL_ID"
  | "LOT_ID"
  | "REUSABLE_ITEM_ID"
  | "IMAGE_URL";

const EXTERNAL_RESOLUTION_COLUMN_ALIASES: Record<
  ExternalResolutionColumnKey,
  string[]
> = {
  ROW_NUMBER: ["stt", "rownumber", "row number"],
  ITEM_NAME: ["ten vat pham", "itemname", "item name"],
  CATEGORY_NAME: ["danh muc", "categoryname", "category name"],
  TARGET_GROUP: ["doi tuong", "targetgroup", "target group"],
  ITEM_TYPE: ["loai vat pham", "itemtype", "item type"],
  UNIT: ["don vi", "unit"],
  SERIAL_NUMBER: ["so serial", "serial", "serialnumber", "serial number"],
  RECEIVED_DATE: [
    "ngay nhan",
    "ngay nhap",
    "ngay nhap kho",
    "receiveddate",
    "received date",
    "importdate",
    "import date",
  ],
  EXPIRED_DATE: [
    "ngay het han",
    "han su dung",
    "han dung",
    "expireddate",
    "expired date",
    "expirydate",
    "expiry date",
  ],
  QUANTITY: ["so luong", "quantity"],
  UNIT_PRICE: ["don gia", "don gia vnd", "unitprice", "unit price"],
  TOTAL_PRICE: ["thanh tien", "tong tien", "totalprice", "total price"],
  HANDLING_METHOD: [
    "cach xu ly",
    "hinh thuc xu ly",
    "phuong thuc xu ly",
    "handlingmethod",
    "handling method",
  ],
  RECIPIENT: ["nguoi nhan", "don vi nhan", "noi nhan", "recipient"],
  NOTE: ["ghi chu", "note"],
  ITEM_MODEL_ID: ["itemmodelid", "item model id", "ma mau vat pham"],
  LOT_ID: ["lotid", "lot id", "ma lo"],
  REUSABLE_ITEM_ID: [
    "reusableitemid",
    "reusable item id",
    "ma vat pham tai su dung",
  ],
  IMAGE_URL: ["anh", "hinh anh", "imageurl", "image url"],
};

const EXTERNAL_RESOLUTION_FIXED_COLUMN_INDEXES: Record<
  ExternalResolutionColumnKey,
  number
> = {
  ROW_NUMBER: 0,
  ITEM_NAME: 1,
  CATEGORY_NAME: 2,
  TARGET_GROUP: 3,
  ITEM_TYPE: 4,
  UNIT: 5,
  SERIAL_NUMBER: 6,
  RECEIVED_DATE: 7,
  EXPIRED_DATE: 8,
  QUANTITY: 9,
  UNIT_PRICE: 10,
  TOTAL_PRICE: 11,
  HANDLING_METHOD: 12,
  RECIPIENT: 13,
  NOTE: 14,
  ITEM_MODEL_ID: 15,
  LOT_ID: 16,
  REUSABLE_ITEM_ID: 17,
  IMAGE_URL: 18,
};

const EXTERNAL_RESOLUTION_FALLBACK_DATA_ROW_INDEX = 3;

function normalizeExcelText(value: unknown): string {
  return String(value ?? "")
    .replace(/[Đđ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseExcelNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableExcelNumber(value: unknown): number | null {
  const parsed = parseExcelNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseExcelDateTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(
      Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H ?? 0,
        parsed.M ?? 0,
        Math.floor(parsed.S ?? 0),
      ),
    ).toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(raw.replace(/\//g, "-"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return raw;
}

function formatExcelPreviewDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("vi-VN");
}

const HANDLING_METHOD_LABELS: Record<string, string> = {
  DonatedToOrganization: "Quyên góp cho tổ chức / nhân đạo",
  Liquidated: "Thanh lý",
  Disposed: "Tiêu hủy",
  Other: "Khác",
};

function normalizeHandlingMethod(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const englishKey = raw.split(" - ")[0]?.trim() || raw;
  if (HANDLING_METHOD_LABELS[englishKey]) return englishKey;
  const normalized = normalizeExcelText(raw);
  if (
    normalized.includes("quyen gop") ||
    normalized.includes("to chuc") ||
    normalized.includes("nhan dao")
  )
    return "DonatedToOrganization";
  if (normalized.includes("thanh ly")) return "Liquidated";
  if (normalized.includes("tieu huy")) return "Disposed";
  if (normalized.includes("khac")) return "Other";
  return englishKey;
}

function formatHandlingMethodLabel(value: string | null | undefined): string {
  const key = String(value ?? "").trim();
  if (!key) return "—";
  return HANDLING_METHOD_LABELS[key] ?? key;
}

function findExternalResolutionHeaderLayout(rows: unknown[][]): {
  headerRowIndex: number;
  columnIndexes: Partial<Record<ExternalResolutionColumnKey, number>>;
} | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;
    const columnIndexes: Partial<Record<ExternalResolutionColumnKey, number>> =
      {};
    row.forEach((cell, columnIndex) => {
      const normalized = normalizeExcelText(cell);
      if (!normalized) return;

      (
        Object.keys(
          EXTERNAL_RESOLUTION_COLUMN_ALIASES,
        ) as ExternalResolutionColumnKey[]
      ).forEach((key) => {
        if (columnIndexes[key] != null) return;
        if (EXTERNAL_RESOLUTION_COLUMN_ALIASES[key].includes(normalized)) {
          columnIndexes[key] = columnIndex;
        }
      });
    });

    if (
      columnIndexes.ITEM_NAME != null &&
      columnIndexes.CATEGORY_NAME != null &&
      columnIndexes.HANDLING_METHOD != null &&
      columnIndexes.RECIPIENT != null
    ) {
      return { headerRowIndex: rowIndex, columnIndexes };
    }
  }

  return null;
}

function resolveExternalResolutionLayout(rows: unknown[][]): {
  dataRowIndex: number;
  columnIndexes: Partial<Record<ExternalResolutionColumnKey, number>>;
} | null {
  const headerLayout = findExternalResolutionHeaderLayout(rows);
  if (headerLayout) {
    return {
      dataRowIndex: headerLayout.headerRowIndex + 1,
      columnIndexes: {
        ...EXTERNAL_RESOLUTION_FIXED_COLUMN_INDEXES,
        ...headerLayout.columnIndexes,
      },
    };
  }

  if (rows.length <= EXTERNAL_RESOLUTION_FALLBACK_DATA_ROW_INDEX) {
    return null;
  }

  return {
    dataRowIndex: EXTERNAL_RESOLUTION_FALLBACK_DATA_ROW_INDEX,
    columnIndexes: EXTERNAL_RESOLUTION_FIXED_COLUMN_INDEXES,
  };
}

function getExternalResolutionRows(
  workbook: XLSX.WorkBook,
): DepotExternalResolutionItem[] {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  const layout = resolveExternalResolutionLayout(rows);
  if (!layout) return [];

  const { dataRowIndex, columnIndexes } = layout;
  const dataRows = rows.slice(dataRowIndex);

  return dataRows
    .map((row, index) => {
      const getCell = (key: ExternalResolutionColumnKey): unknown =>
        columnIndexes[key] != null ? row[columnIndexes[key]!] : "";

      const quantity = parseExcelNumber(getCell("QUANTITY"));
      const unitPrice = parseExcelNumber(getCell("UNIT_PRICE"));
      const totalPriceCell = parseExcelNumber(getCell("TOTAL_PRICE"));
      const totalPrice =
        totalPriceCell > 0 ? totalPriceCell : quantity * unitPrice;

      return {
        rowNumber:
          parseExcelNumber(getCell("ROW_NUMBER")) || dataRowIndex + index + 1,
        itemModelId: parseNullableExcelNumber(getCell("ITEM_MODEL_ID")) ?? 0,
        itemName: String(getCell("ITEM_NAME") ?? "").trim(),
        categoryName: String(getCell("CATEGORY_NAME") ?? "").trim(),
        targetGroup: String(getCell("TARGET_GROUP") ?? "").trim(),
        itemType: String(getCell("ITEM_TYPE") ?? "").trim(),
        unit: String(getCell("UNIT") ?? "").trim(),
        lotId: parseNullableExcelNumber(getCell("LOT_ID")),
        reusableItemId: parseNullableExcelNumber(getCell("REUSABLE_ITEM_ID")),
        serialNumber: String(getCell("SERIAL_NUMBER") ?? "").trim() || null,
        receivedDate: parseExcelDateTime(getCell("RECEIVED_DATE")),
        expiredDate: parseExcelDateTime(getCell("EXPIRED_DATE")),
        quantity,
        unitPrice,
        totalPrice,
        handlingMethod: normalizeHandlingMethod(getCell("HANDLING_METHOD")),
        recipient: String(getCell("RECIPIENT") ?? "").trim(),
        note: String(getCell("NOTE") ?? "").trim() || null,
        imageUrl: String(getCell("IMAGE_URL") ?? "").trim() || null,
      };
    })
    .filter(
      (item) =>
        item.itemName ||
        item.categoryName ||
        item.handlingMethod ||
        item.recipient ||
        item.quantity > 0 ||
        item.totalPrice > 0,
    );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  statusValueMap,
}: {
  status: string;
  statusValueMap: Record<string, string>;
}) {
  return (
    <Badge
      className={cn(
        "font-medium tracking-tighter",
        getDepotClosureTransferStatusToneClass(status),
      )}
    >
      {getDepotClosureTransferStatusLabel(status, statusValueMap)}
    </Badge>
  );
}

// ── Transfer Detail Panel ──────────────────────────────────────────────────

interface TransferDetailPanelProps {
  depotId: number;
  transferItem: DepotTransferListItem;
  onRefreshList: () => void;
  statusValueMap: Record<string, string>;
  transferSteps: Array<{ key: string; label: string }>;
}

function TransferDetailPanel({
  depotId,
  transferItem,
  onRefreshList,
  statusValueMap,
  transferSteps,
}: TransferDetailPanelProps) {
  const { data: itemTypes = [] } = useInventoryItemTypes();
  const itemTypeValueMap = useMemo(
    () =>
      Object.fromEntries(
        itemTypes.map((itemType) => [String(itemType.key), itemType.value]),
      ),
    [itemTypes],
  );
  const {
    data: transfer,
    isLoading,
    refetch,
  } = useDepotClosureTransfer(depotId, transferItem.transferId, {
    enabled: true,
  });

  const [transferAction, setTransferAction] = useState<
    "prepare" | "ship" | "complete" | "receive" | null
  >(null);
  const [transferNote, setTransferNote] = useState("");

  const prepareMutation = usePrepareDepotTransfer();
  const shipMutation = useShipDepotTransfer();
  const completeMutation = useCompleteDepotTransfer();
  const receiveMutation = useReceiveDepotTransfer();

  const isActionPending =
    prepareMutation.isPending ||
    shipMutation.isPending ||
    completeMutation.isPending ||
    receiveMutation.isPending;

  const currentStatus = normalizeDepotClosureTransferStatus(
    transfer?.status ?? transferItem.status ?? "AwaitingPreparation",
  );

  const isSourceManager =
    transferItem.userRole === "Source" ||
    transferItem.sourceDepotId === depotId;
  const isTargetManager =
    transferItem.userRole === "Target" ||
    transferItem.targetDepotId === depotId;

  const handleRefresh = useCallback(() => {
    refetch();
    onRefreshList();
  }, [refetch, onRefreshList]);

  function handleTransferAction() {
    if (!transferAction) return;
    const action = transferAction;
    const payload = {
      transferId: transferItem.transferId,
      depotId,
      sourceDepotId: transferItem.sourceDepotId,
      ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
    };

    function onFail(err: unknown) {
      toast.error(getApiError(err, "Thao tác thất bại."));
    }
    const successMsg: Record<typeof action, string> = {
      prepare: "Đã xác nhận chuẩn bị hàng.",
      ship: "Đã xác nhận xuất hàng.",
      complete: "Đã xác nhận hoàn tất giao hàng.",
      receive: "Đã xác nhận nhận hàng.",
    };
    function onDone() {
      toast.success(successMsg[action]);
      setTransferAction(null);
      setTransferNote("");
      handleRefresh();
    }

    if (action === "prepare")
      prepareMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else if (action === "ship")
      shipMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else if (action === "complete")
      completeMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else
      receiveMutation.mutate(payload, {
        onSuccess: (res) => {
          if (res.requiresFurtherResolution) {
            toast.info(
              `Đã nhận hàng. Còn ${res.remainingItemCount ?? "một số"} vật phẩm — admin cần tạo batch tiếp theo hoặc chọn xử lý bên ngoài.`,
            );
          } else {
            toast.success("Đã xác nhận nhận hàng — kho đã đóng chính thức.");
          }
          setTransferAction(null);
          setTransferNote("");
          handleRefresh();
        },
        onError: onFail,
      });
  }

  if (isLoading) {
    return (
      <div className="px-5 py-5 space-y-3 border-t border-dashed border-orange-200/70 dark:border-orange-800/40">
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const snapshotConsumable =
    transfer?.snapshotConsumableUnits ??
    transferItem.snapshotConsumableUnits ??
    0;
  const snapshotReusable =
    transfer?.snapshotReusableUnits ?? transferItem.snapshotReusableUnits ?? 0;
  const transferItems =
    transfer?.items && transfer.items.length > 0
      ? transfer.items
      : (transferItem.items ?? []);

  const sourceCfgMap: Record<
    string,
    { label: string; action: "prepare" | "ship" | "complete" }
  > = {
    AwaitingPreparation: { label: "Bắt đầu chuẩn bị hàng", action: "prepare" },
    Preparing: { label: "Xác nhận xuất hàng", action: "ship" },
    Shipping: { label: "Hoàn tất giao hàng", action: "complete" },
  };
  const targetCfgMap: Record<
    string,
    { label: string; action: "receive"; emerald: boolean }
  > = {
    Completed: {
      label: "Xác nhận đã nhận hàng",
      action: "receive",
      emerald: true,
    },
  };

  const actionCfg = isSourceManager
    ? sourceCfgMap[currentStatus]
    : isTargetManager
      ? targetCfgMap[currentStatus]
      : undefined;
  const stepOrder = transferSteps.map((item) => item.key);

  return (
    <div className="bg-muted/20 border-t border-border/40 px-5 py-5 space-y-5">
      {/* Step Progress */}
      <div className="flex items-start">
        {transferSteps.map((step, i) => {
          const cur = stepOrder.indexOf(currentStatus);
          const me = stepOrder.indexOf(step.key);
          const isReceived = currentStatus === "Received";
          const done = me < cur || (isReceived && me === cur);
          const active = me === cur && !isReceived;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.07,
                    ease: "easeOut",
                  }}
                  style={{ originX: 0 }}
                  className={cn(
                    "h-0.5 flex-1 mt-3.5 mx-1 rounded-full",
                    done
                      ? "bg-linear-to-r from-orange-400 to-amber-400"
                      : active
                        ? "bg-orange-200/80 dark:bg-orange-800/50"
                        : "bg-border/50",
                  )}
                />
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.28,
                  delay: i * 0.07,
                  ease: "easeOut",
                }}
                className="flex w-24 shrink-0 flex-col items-center gap-1.5 md:w-28"
              >
                <div
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm",
                    done
                      ? "bg-linear-to-br from-orange-500 to-amber-500 text-white"
                      : active
                        ? "border-2 border-orange-400 bg-orange-50 text-orange-700 ring-4 ring-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900/30"
                        : "border-2 border-border bg-background text-muted-foreground",
                  )}
                >
                  {active && (
                    <>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-1.75 rounded-full border border-orange-400/60 dark:border-orange-400/40 animate-[ping_2s_ease-out_infinite]"
                      />
                      <span
                        aria-hidden="true"
                        style={{ animationDelay: "0.9s" }}
                        className="pointer-events-none absolute -inset-2.75 rounded-full border border-orange-300/45 dark:border-orange-300/30 animate-[ping_2s_ease-out_infinite]"
                      />
                    </>
                  )}
                  {done ? <CheckFat size={11} weight="fill" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center leading-tight tracking-tighter whitespace-normal",
                    active
                      ? "font-semibold text-orange-700 dark:text-orange-300"
                      : done
                        ? "text-orange-600/80 dark:text-orange-400/80"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            label: "Vật phẩm tiêu thụ",
            value: snapshotConsumable.toLocaleString("vi-VN"),
            tone: "border-orange-200/70 bg-orange-50/70 dark:border-orange-800/40 dark:bg-orange-950/10",
          },
          {
            label: "Vật phẩm tái sử dụng",
            value: snapshotReusable.toLocaleString("vi-VN"),
            tone: "border-violet-200/70 bg-violet-50/70 dark:border-violet-800/40 dark:bg-violet-950/10",
          },
          {
            label: isTargetManager ? "Kho nguồn" : "Kho nhận",
            value: isTargetManager
              ? (transfer?.sourceDepotName ??
                transferItem.sourceDepotName ??
                "—")
              : (transfer?.targetDepotName ??
                transferItem.targetDepotName ??
                "—"),
            tone: "border-blue-200/70 bg-blue-50/70 dark:border-blue-800/40 dark:bg-blue-950/10",
          },
          {
            label: "Trạng thái",
            value: getDepotClosureTransferStatusLabel(
              currentStatus,
              statusValueMap,
            ),
            tone: "border-orange-200/80 bg-orange-50/90 dark:border-orange-800/50 dark:bg-orange-950/15",
            accent: true,
          },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: 0.1 + idx * 0.05,
              ease: "easeOut",
            }}
            className={cn(
              "rounded-xl border border-dashed px-3.5 py-3",
              item.tone,
            )}
          >
            <p className="text-xs tracking-tighter text-muted-foreground">
              {item.label}
            </p>
            <p
              className={cn(
                "text-sm font-semibold tracking-tighter mt-1 truncate",
                item.accent
                  ? "text-orange-700 dark:text-orange-300"
                  : "text-foreground",
              )}
            >
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Timestamps */}
      {transfer &&
        (transfer.shippedAt || transfer.receivedAt || transfer.cancelledAt) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.25, ease: "easeOut" }}
            className="flex flex-wrap gap-2"
          >
            {transfer.shippedAt && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-orange-200/70 bg-white px-3 py-1.5 text-xs tracking-tighter text-orange-700/90 dark:border-orange-800/40 dark:bg-background dark:text-orange-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>
                  Thời gian:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(transfer.shippedAt).toLocaleString("vi-VN")}
                  </span>
                </span>
                {transfer.shipNote && (
                  <span className="italic text-orange-700/70 dark:text-orange-300/70">
                    — {transfer.shipNote}
                  </span>
                )}
              </div>
            )}
            {transfer.receivedAt && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-200/70 bg-white px-3 py-1.5 text-xs tracking-tighter text-emerald-700/90 dark:border-emerald-800/40 dark:bg-background dark:text-emerald-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Nhận hàng:{" "}
                  <strong className="text-foreground">
                    {new Date(transfer.receivedAt).toLocaleString("vi-VN")}
                  </strong>
                </span>
                {transfer.receiveNote && (
                  <span className="italic text-emerald-700/70 dark:text-emerald-300/70">
                    — {transfer.receiveNote}
                  </span>
                )}
              </div>
            )}
            {transfer.cancelledAt && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-red-200/70 bg-white px-3 py-1.5 text-xs tracking-tighter text-red-700/90 dark:border-red-800/40 dark:bg-background dark:text-red-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>
                  Hủy:{" "}
                  <strong className="text-foreground">
                    {new Date(transfer.cancelledAt).toLocaleString("vi-VN")}
                  </strong>
                </span>
                {transfer.cancellationReason && (
                  <span className="italic text-red-700/70 dark:text-red-300/70">
                    — {transfer.cancellationReason}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}

      {transferItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.3, ease: "easeOut" }}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-tighter text-muted-foreground">
              Danh sách vật phẩm
            </p>
            <span className="text-xs tracking-tighter text-muted-foreground">
              {transferItems.length} dòng
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/40 bg-background">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border/30 bg-muted/10">
                  <th className="px-4 py-2 text-left text-xs font-semibold tracking-tighter text-foreground">
                    Vật phẩm
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold tracking-tighter text-foreground">
                    Loại
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold tracking-tighter text-foreground">
                    Số Serial
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold tracking-tighter text-foreground">
                    Số lượng
                  </th>
                </tr>
              </thead>
              <tbody>
                {transferItems.map((item) => (
                  <tr
                    key={`${transfer?.id ?? transferItem.transferId}-${item.itemModelId}-${item.reusableItemId ?? item.serialNumber ?? item.itemType}`}
                    className="border-b border-border/20 last:border-0"
                  >
                    <td className="px-4 py-2 text-sm tracking-tighter text-foreground">
                      {item.itemName || `Vật phẩm #${item.itemModelId}`}
                    </td>
                    <td className="px-4 py-2 text-sm tracking-tighter text-muted-foreground">
                      {getInventoryItemTypeLabel(
                        item.itemType,
                        itemTypeValueMap,
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm tracking-tighter text-muted-foreground">
                      {item.serialNumber || "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-sm tracking-tighter text-foreground">
                      {item.quantity.toLocaleString("vi-VN")} {item.unit || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Action */}
      {(() => {
        if (!actionCfg) {
          if (
            isTargetManager &&
            currentStatus !== "Received" &&
            currentStatus !== "Cancelled"
          ) {
            const waitLabel: Record<string, string> = {
              AwaitingPreparation: "Đang chờ kho nguồn chuẩn bị hàng…",
              Preparing: "Kho nguồn đang chuẩn bị hàng…",
              Shipping: "Hàng đang được vận chuyển đến kho bạn…",
            };
            const msg = waitLabel[currentStatus];
            if (msg)
              return (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-orange-200/70 bg-white px-3 py-2 text-sm tracking-tighter text-orange-700 dark:border-orange-800/40 dark:bg-background dark:text-orange-300"
                >
                  <HourglassHigh size={14} className="animate-pulse" />
                  <span>{msg}</span>
                </motion.div>
              );
          }
          return null;
        }

        const isEmerald = "emerald" in actionCfg && actionCfg.emerald;
        return (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.15 }}
            className="flex items-center justify-end gap-2 border-t border-border/40 pt-3"
          >
            <AnimatePresence mode="wait" initial={false}>
              {transferAction === actionCfg.action ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-2 justify-end"
                >
                  <Input
                    placeholder="Ghi chú (tuỳ chọn)..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="h-9 w-64 bg-background text-sm border-orange-400 focus-visible:ring-orange-400/30 placeholder:text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="tracking-tighter"
                    onClick={() => {
                      setTransferAction(null);
                      setTransferNote("");
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      "tracking-tighter gap-1.5",
                      isEmerald
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "",
                    )}
                    disabled={isActionPending}
                    onClick={handleTransferAction}
                  >
                    {isActionPending && (
                      <Spinner size={13} className="animate-spin" />
                    )}
                    {actionCfg.label}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <Button
                    size="sm"
                    className={cn(
                      "gap-1.5 tracking-tighter",
                      isEmerald
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "",
                    )}
                    onClick={() => {
                      setTransferNote("");
                      setTransferAction(actionCfg.action);
                    }}
                  >
                    <Truck size={14} />
                    {actionCfg.label}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}
    </div>
  );
}

// ── Main Table ─────────────────────────────────────────────────────────────

interface DepotClosureTransferTableProps {
  depotId: number;
  defaultExpandedTransferId?: number | null;
}

export function DepotClosureTransferTable({
  depotId,
  defaultExpandedTransferId,
}: DepotClosureTransferTableProps) {
  const { selectedDepotId } = useManagerDepot();
  const resolvedDepotId = depotId > 0 ? depotId : (selectedDepotId ?? 0);

  const [expandedId, setExpandedId] = useState<number | null>(
    defaultExpandedTransferId ?? null,
  );

  const {
    data: transfers,
    isLoading,
    isFetching,
    refetch,
  } = useMyDepotTransfers(resolvedDepotId, { enabled: resolvedDepotId > 0 });
  useInventoryOperationalRealtime({
    depotClosures: {
      depotId: resolvedDepotId,
      transferId: expandedId,
    },
    enabled: resolvedDepotId > 0,
  });
  const {
    data: externalResolutionState,
    refetch: refetchExternalResolutionState,
  } = useDepotExternalResolutionState(resolvedDepotId, {
    enabled: resolvedDepotId > 0,
  });
  const { data: transferStatusMetadata = [] } = useDepotClosureTransferStatuses(
    {
      enabled: resolvedDepotId > 0,
    },
  );
  const { data: itemTypes = [] } = useInventoryItemTypes();
  const itemTypeValueMap = useMemo(
    () =>
      Object.fromEntries(
        itemTypes.map((itemType) => [String(itemType.key), itemType.value]),
      ),
    [itemTypes],
  );
  const {
    mutateAsync: downloadExternalResolutionTemplate,
    isPending: isDownloadingExternalResolutionTemplate,
  } = useDownloadDepotClosureExportTemplate();
  const submitExternalResolutionMutation = useSubmitDepotExternalResolution();
  const transferSteps = useMemo(
    () => buildDepotClosureTransferStepItems(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const statusValueMap = useMemo(
    () => buildDepotClosureTransferStatusValueMap(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const [externalResolutionFileName, setExternalResolutionFileName] =
    useState("");
  const [externalResolutionItems, setExternalResolutionItems] = useState<
    DepotExternalResolutionItem[]
  >([]);
  const [isParsingExternalFile, setIsParsingExternalFile] = useState(false);
  const externalResolutionInputRef = useRef<HTMLInputElement>(null);

  const hasExternalResolutionInstruction = Boolean(
    externalResolutionState?.hasActiveExternalResolution ||
    externalResolutionState?.canDownloadExternalTemplate ||
    externalResolutionState?.canUploadExternalResolution ||
    externalResolutionState?.resolutionType === "ExternalResolution",
  );
  const canDownloadExternalTemplate =
    externalResolutionState?.canDownloadExternalTemplate ?? false;
  const canUploadExternalResolution =
    externalResolutionState?.canUploadExternalResolution ?? false;
  const externalResolutionNote = externalResolutionState?.externalNote ?? null;
  const externalResolutionRemainingItemCount =
    externalResolutionState?.remainingItemCount ?? null;
  const isSubmittingExternalResolution =
    submitExternalResolutionMutation.isPending;

  const resetExternalResolutionState = useCallback(() => {
    setExternalResolutionFileName("");
    setExternalResolutionItems([]);
    if (externalResolutionInputRef.current)
      externalResolutionInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (canUploadExternalResolution) {
      return;
    }

    resetExternalResolutionState();
  }, [canUploadExternalResolution, resetExternalResolutionState]);

  useEffect(() => {
    if (resolvedDepotId <= 0) {
      return;
    }

    const unsubscribe = notificationRealtimeClient.subscribe(
      (payload: NotificationRealtimePayload) => {
        if (
          normalizeNotificationType(payload?.type) !==
          "depot_closure_external_marked"
        ) {
          return;
        }

        const routeData = payload?.data;
        const payloadDepotId = toPositiveInt(
          routeData?.depotId ?? routeData?.sourceDepotId,
        );

        if (payloadDepotId && payloadDepotId !== resolvedDepotId) {
          return;
        }

        void refetchExternalResolutionState();
      },
    );

    return unsubscribe;
  }, [refetchExternalResolutionState, resolvedDepotId]);

  const handleRefresh = useCallback(() => {
    void Promise.all([refetch(), refetchExternalResolutionState()]);
  }, [refetch, refetchExternalResolutionState]);

  const handleDownloadExternalTemplate = useCallback(async () => {
    try {
      const { blob, filename } =
        await downloadExternalResolutionTemplate(resolvedDepotId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file mẫu xử lý bên ngoài.");
    } catch (err) {
      toast.error(getApiError(err, "Không thể tải file mẫu xử lý bên ngoài."));
    }
  }, [downloadExternalResolutionTemplate, resolvedDepotId]);

  const parseExternalResolutionFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Chỉ chấp nhận file .xlsx hoặc .xls");
      return;
    }
    setIsParsingExternalFile(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const items = getExternalResolutionRows(workbook);
      if (items.length === 0) {
        toast.error("File Excel không có dữ liệu xử lý hợp lệ.");
        return;
      }
      setExternalResolutionItems(items);
      setExternalResolutionFileName(file.name);
      toast.success(`Đã đọc ${items.length} dòng xử lý từ file Excel.`);
    } catch {
      toast.error("Không thể đọc file Excel xử lý bên ngoài.");
    } finally {
      setIsParsingExternalFile(false);
    }
  }, []);

  const handleExternalResolutionFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await parseExternalResolutionFile(file);
      event.target.value = "";
    },
    [parseExternalResolutionFile],
  );

  const handleSubmitExternalResolution = useCallback(() => {
    if (!externalResolutionItems.length) {
      toast.error("Vui lòng tải lên file kết quả xử lý trước khi gửi.");
      return;
    }

    submitExternalResolutionMutation.mutate(
      { depotId: resolvedDepotId, items: externalResolutionItems },
      {
        onSuccess: (res) => {
          toast.success(
            res.message || "Đã ghi nhận kết quả xử lý tồn kho bên ngoài.",
          );
          resetExternalResolutionState();
          void Promise.all([refetch(), refetchExternalResolutionState()]);
        },
        onError: (err) => {
          toast.error(getExternalResolutionSubmitError(err));
        },
      },
    );
  }, [
    externalResolutionItems,
    refetch,
    refetchExternalResolutionState,
    resetExternalResolutionState,
    resolvedDepotId,
    submitExternalResolutionMutation,
  ]);

  function toggleRow(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const items: DepotTransferListItem[] = transfers ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tighter">
            Danh sách đơn đóng kho
          </h2>
          <p className="text-muted-foreground tracking-tighter text-sm mt-0.5">
            {items.length > 0
              ? `${items.length} đơn liên quan đến kho của bạn`
              : "Chưa có đơn nào."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 tracking-tighter"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <ArrowsClockwise
            size={14}
            className={isFetching ? "animate-spin" : ""}
          />
          Làm mới
        </Button>
      </div>

      {hasExternalResolutionInstruction && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20 py-0">
          <CardContent className="p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <WarningCircle
                    size={16}
                    className="text-amber-500 shrink-0"
                    weight="fill"
                  />
                  <p className="text-base font-semibold tracking-tighter text-amber-800 dark:text-amber-300">
                    Quản trị viên đã chọn xử lý tồn kho bên ngoài hệ thống
                  </p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                  Dùng file mẫu Excel để cập nhật kết quả xử lý ngoài cho kho
                  hiện tại.
                </p>
                {externalResolutionNote && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 tracking-tighter whitespace-pre-wrap">
                    Note:{" "}
                    <span className="font-semibold">
                      {externalResolutionNote}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {canDownloadExternalTemplate && (
                  <Button
                    variant="outline"
                    className="gap-2 tracking-tighter border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                    onClick={handleDownloadExternalTemplate}
                    disabled={isDownloadingExternalResolutionTemplate}
                  >
                    <DownloadSimple size={16} />
                    Tải danh sách vật phẩm cần xử lý
                  </Button>
                )}
                {canUploadExternalResolution && (
                  <Button
                    variant="outline"
                    className="gap-2 tracking-tighter border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                    onClick={() => externalResolutionInputRef.current?.click()}
                    disabled={isParsingExternalFile}
                  >
                    <UploadSimple size={16} />
                    {isParsingExternalFile ? "Đang đọc file..." : "Upload file"}
                  </Button>
                )}
                <input
                  ref={externalResolutionInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExternalResolutionFileChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Tồn kho cần xử lý",
                  value:
                    externalResolutionRemainingItemCount != null
                      ? `${externalResolutionRemainingItemCount.toLocaleString("vi-VN")} vật phẩm`
                      : "—",
                },
                {
                  label: "File đã nhập",
                  value: externalResolutionFileName || "Chưa chọn file",
                  small: true,
                },
                {
                  label: "Dòng hợp lệ đã đọc",
                  value: externalResolutionItems.length.toLocaleString("vi-VN"),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-amber-200/70 bg-white/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/10"
                >
                  <p className="text-sm font-medium tracking-tighter mb-1">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "font-semibold tracking-tighter text-amber-900 dark:text-amber-100",
                      item.small ? "text-sm break-all" : "text-base",
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {canUploadExternalResolution &&
              externalResolutionItems.length > 0 && (
                <div className="rounded-xl border border-blue-200/70 bg-white/70 overflow-hidden dark:border-blue-800/60 dark:bg-blue-950/10">
                  <div className="px-4 py-3 border-b border-blue-200/70 dark:border-blue-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileXls size={18} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold tracking-tighter text-blue-900 dark:text-blue-100">
                          Xem nhanh dữ liệu đã nhập
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 tracking-tighter">
                          Hiển thị toàn bộ dữ liệu đã đọc từ file trong khung
                          cuộn cố định.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 tracking-tighter text-blue-700 dark:text-blue-300"
                      onClick={resetExternalResolutionState}
                    >
                      <Trash size={14} />
                      Bỏ file
                    </Button>
                  </div>
                  <div className="h-[420px] overflow-auto">
                    <table className="min-w-375 w-full text-sm">
                      <thead className="sticky top-0 bg-blue-50/95 dark:bg-blue-950/95">
                        <tr className="border-b border-blue-200/70 dark:border-blue-800/60">
                          {[
                            "STT",
                            "Vật phẩm",
                            "Danh mục",
                            "Đối tượng",
                            "Loại vật phẩm",
                            "Đơn vị",
                            "Số Serial",
                            "Ngày nhập",
                            "Hạn sử dụng",
                            "Số lượng",
                            "Đơn giá",
                            "Thành tiền",
                            "Cách xử lý",
                            "Người nhận / đơn vị nhận",
                            "Ghi chú",
                          ].map((label) => (
                            <th
                              key={label}
                              className="px-4 py-3 text-left text-xs font-semibold tracking-tighter text-blue-700 dark:text-blue-300 whitespace-nowrap"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {externalResolutionItems.map((item) => (
                          <tr
                            key={`${item.rowNumber}-${item.itemModelId}-${item.lotId ?? item.reusableItemId ?? item.itemName}`}
                            className="border-b border-blue-200/70 dark:border-blue-800/60 align-top"
                          >
                            <td className="px-4 py-3 font-medium text-foreground tracking-tighter whitespace-nowrap">
                              {item.rowNumber}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground tracking-tighter  min-w-64">
                              {item.itemName || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter min-w-48">
                              {item.categoryName || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter min-w-64">
                              {item.targetGroup || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {getInventoryItemTypeLabel(
                                item.itemType,
                                itemTypeValueMap,
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {item.unit || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {item.serialNumber || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {formatExcelPreviewDate(item.receivedDate)}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {formatExcelPreviewDate(item.expiredDate)}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {item.quantity.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {item.unitPrice.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter whitespace-nowrap">
                              {item.totalPrice.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter min-w-72">
                              {formatHandlingMethodLabel(item.handlingMethod)}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter min-w-64">
                              {item.recipient || "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground tracking-tighter min-w-40">
                              {item.note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {canUploadExternalResolution && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-2 tracking-tighter"
                  onClick={resetExternalResolutionState}
                  disabled={
                    isSubmittingExternalResolution ||
                    (!externalResolutionFileName &&
                      externalResolutionItems.length === 0)
                  }
                >
                  <Trash size={15} />
                  Xóa dữ liệu đã nạp
                </Button>
                <Button
                  className="gap-2 tracking-tighter bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSubmitExternalResolution}
                  disabled={
                    isSubmittingExternalResolution ||
                    externalResolutionItems.length === 0
                  }
                >
                  <PaperPlaneTilt size={15} />
                  {isSubmittingExternalResolution
                    ? "Đang gửi kết quả..."
                    : "Gửi kết quả xử lý"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border border-border/50 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowsLeftRight
                size={36}
                className="text-muted-foreground/20 mb-3"
              />
              <p className="text-sm font-medium text-muted-foreground tracking-tight">
                Không có transfer nào
              </p>
              <p className="text-sm text-muted-foreground/60 tracking-tight mt-1">
                Khi có phiên đóng kho, các transfer sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground w-14">
                      #
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Kho nguồn
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Kho nhận
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Thời gian tạo
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Số lượng
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Trạng thái
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isExpanded = expandedId === item.transferId;
                    return (
                      <React.Fragment key={item.transferId}>
                        <motion.tr
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: idx * 0.04,
                            ease: "easeOut",
                          }}
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors select-none",
                            isExpanded ? "bg-muted/40" : "hover:bg-muted/30",
                          )}
                          onClick={() => toggleRow(item.transferId)}
                        >
                          <td className="p-3 text-sm font-medium tracking-tighter text-muted-foreground">
                            #{item.transferId}
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-medium tracking-tighter text-foreground">
                              {item.sourceDepotName}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm tracking-tighter text-foreground/80">
                                {item.targetDepotName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-sm tracking-tighter text-foreground/60">
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="p-3">
                            <div className="text-sm tracking-tighter space-y-0.5">
                              <p>
                                <span className="text-muted-foreground">
                                  Tiêu thụ:{" "}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {item.snapshotConsumableUnits.toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Tái sử dụng:{" "}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {item.snapshotReusableUnits.toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <StatusBadge
                              status={item.status}
                              statusValueMap={statusValueMap}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end">
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{
                                  duration: 0.2,
                                  ease: "easeInOut",
                                }}
                              >
                                {isExpanded ? (
                                  <CaretUp
                                    size={15}
                                    className="text-orange-500"
                                  />
                                ) : (
                                  <CaretDown
                                    size={15}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </motion.div>
                            </div>
                          </td>
                        </motion.tr>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr key={`detail-${item.transferId}`}>
                              <td colSpan={7} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.28,
                                    ease: [0.4, 0, 0.2, 1],
                                  }}
                                  style={{ overflow: "hidden" }}
                                >
                                  <TransferDetailPanel
                                    depotId={resolvedDepotId}
                                    transferItem={item}
                                    onRefreshList={handleRefresh}
                                    statusValueMap={statusValueMap}
                                    transferSteps={transferSteps}
                                  />
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
