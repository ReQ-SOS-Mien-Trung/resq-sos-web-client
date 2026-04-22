"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ArrowsLeftRight,
  CheckFat,
  HourglassHigh,
  Truck,
  WarningCircle,
  Spinner,
  XCircle,
  ArrowClockwise,
  DownloadSimple,
  UploadSimple,
  FileXls,
  PaperPlaneTilt,
  Trash,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepotById,
  useDepotExternalResolutionState,
  useMyDepotClosures,
  useMyDepotClosureDetail,
  useMyDepotTransfers,
  usePrepareDepotTransfer,
  useShipDepotTransfer,
  useCompleteDepotTransfer,
  useReceiveDepotTransfer,
  useDownloadDepotClosureExportTemplate,
  useSubmitDepotExternalResolution,
  useDepotClosureTransferStatuses,
} from "@/services/depot/hooks";
import type {
  DepotExternalResolutionItem,
  DepotTransferListItem,
} from "@/services/depot/type";
import { AxiosError } from "axios";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { useInventoryOperationalRealtime } from "@/hooks/useInventoryOperationalRealtime";
import { notificationRealtimeClient } from "@/services/noti_alert/realtime";
import type { NotificationRealtimePayload } from "@/services/noti_alert/type";
import { DepotTransfersListTable } from "@/components/inventory/DepotTransfersListTable";
import {
  buildDepotClosureTransferStepItems,
  buildDepotClosureTransferStatusValueMap,
  getDepotClosureTransferStatusLabel,
  getDepotClosureTransferStatusToneClass,
  normalizeDepotClosureTransferStatus,
  DEPOT_CLOSURE_TRANSFER_TERMINAL_STATUSES,
} from "@/lib/depot-closure-transfer-status";

/* ── helpers ──────────────────────────────────────────────────── */
function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
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

function computeCountdown(deadline: string | null | undefined): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Đã hết hạn";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return h > 0
    ? `${h}g ${String(m).padStart(2, "0")}p ${String(s).padStart(2, "0")}s`
    : `${m}p ${String(s).padStart(2, "0")}s`;
}

function useCountdown(deadline: string | null | undefined): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setTick((tick) => tick + 1), 1_000);
    return () => clearInterval(id);
  }, [deadline]);
  return computeCountdown(deadline);
}

type ExternalResolutionColumnKey =
  | "ROW_NUMBER"
  | "ITEM_NAME"
  | "CATEGORY_NAME"
  | "TARGET_GROUP"
  | "ITEM_TYPE"
  | "UNIT"
  | "RECEIVED_DATE"
  | "EXPIRED_DATE"
  | "QUANTITY"
  | "UNIT_PRICE"
  | "TOTAL_PRICE"
  | "HANDLING_METHOD"
  | "RECIPIENT"
  | "NOTE"
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
  IMAGE_URL: ["anh", "hinh anh", "imageurl", "image url"],
};

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
      const normalizedCell = normalizeExcelText(cell);
      if (!normalizedCell) return;
      const matchedKey = (
        Object.keys(
          EXTERNAL_RESOLUTION_COLUMN_ALIASES,
        ) as ExternalResolutionColumnKey[]
      ).find((key) =>
        EXTERNAL_RESOLUTION_COLUMN_ALIASES[key].includes(normalizedCell),
      );
      if (matchedKey && columnIndexes[matchedKey] === undefined) {
        columnIndexes[matchedKey] = columnIndex;
      }
    });
    if (
      columnIndexes.ROW_NUMBER !== undefined &&
      columnIndexes.ITEM_NAME !== undefined &&
      columnIndexes.HANDLING_METHOD !== undefined
    ) {
      return { headerRowIndex: rowIndex, columnIndexes };
    }
  }
  return null;
}

function getExternalResolutionRows(
  workbook: XLSX.WorkBook,
): DepotExternalResolutionItem[] {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });
    const headerLayout = findExternalResolutionHeaderLayout(rawRows);
    if (!headerLayout) continue;
    return rawRows
      .slice(headerLayout.headerRowIndex + 1)
      .map((row, index) => {
        const rowArray = Array.isArray(row) ? row : [];
        const getCell = (key: ExternalResolutionColumnKey) => {
          const columnIndex = headerLayout.columnIndexes[key];
          return columnIndex === undefined ? "" : (rowArray[columnIndex] ?? "");
        };
        const quantity = parseExcelNumber(getCell("QUANTITY"));
        const unitPrice = parseExcelNumber(getCell("UNIT_PRICE"));
        const totalPrice =
          parseExcelNumber(getCell("TOTAL_PRICE")) || quantity * unitPrice;
        return {
          rowNumber: parseExcelNumber(getCell("ROW_NUMBER")) || index + 1,
          itemName: String(getCell("ITEM_NAME") ?? "").trim(),
          categoryName: String(getCell("CATEGORY_NAME") ?? "").trim(),
          targetGroup: String(getCell("TARGET_GROUP") ?? "").trim(),
          itemType: String(getCell("ITEM_TYPE") ?? "").trim(),
          unit: String(getCell("UNIT") ?? "").trim(),
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
  return [];
}

const TERMINAL_CLOSURE_STATUSES = new Set(["Completed", "Cancelled"]);

/* ── Props ──────────────────────────────────────────────────────── */
interface DepotClosurePanelProps {
  /** Optional: called when the user clicks the close/back button */
  onClose?: () => void;
  /** Optional: show a compact inline header (title + close button). Default true when onClose is provided */
  showHeader?: boolean;
  /** Optional closureId from URL param */
  closureId?: number | null;
  /** Optional transferId from URL param */
  transferId?: number | null;
}

/* ── Component ──────────────────────────────────────────────────── */
export function DepotClosurePanel({
  onClose,
  showHeader,
  closureId: routeClosureId = null,
  transferId: routeTransferId = null,
}: DepotClosurePanelProps) {
  const { selectedDepotId } = useManagerDepot();
  const depotId = selectedDepotId ?? 0;

  /* ── Data ── */
  const {
    data: depot,
    isLoading: depotLoading,
    refetch: refetchDepot,
  } = useDepotById(depotId);

  const { data: closureList = [], refetch: refetchClosures } =
    useMyDepotClosures(depotId, { enabled: !!depotId });
  const {
    data: transferList = [],
    refetch: refetchTransfers,
    isLoading: transfersLoading,
    isFetching: transfersFetching,
  } = useMyDepotTransfers(depotId, { enabled: !!depotId });
  const { data: transferStatusMetadata = [] } = useDepotClosureTransferStatuses({
    enabled: !!depotId,
  });
  const transferStatusValueMap = useMemo(
    () => buildDepotClosureTransferStatusValueMap(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const transferSteps = useMemo(
    () => buildDepotClosureTransferStepItems(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const transferStepOrder = useMemo(
    () => transferSteps.map((step) => step.key),
    [transferSteps],
  );

  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(
    routeTransferId,
  );

  useEffect(() => {
    setSelectedTransferId(routeTransferId);
  }, [routeTransferId]);

  const selectedTransfer = useMemo<DepotTransferListItem | null>(() => {
    const sortedTransfers = [...transferList].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const preferredTransferId = selectedTransferId ?? routeTransferId;

    if (preferredTransferId) {
      const preferredTransfer =
        transferList.find((item) => item.transferId === preferredTransferId) ??
        null;
      if (preferredTransfer) return preferredTransfer;
    }

    return (
      sortedTransfers.find(
        (item) =>
          !DEPOT_CLOSURE_TRANSFER_TERMINAL_STATUSES.has(
            normalizeDepotClosureTransferStatus(item.status),
          ),
      ) ??
      sortedTransfers[0] ??
      null
    );
  }, [routeTransferId, selectedTransferId, transferList]);

  const selectedClosureSummary = useMemo(() => {
    if (routeClosureId) {
      return closureList.find((item) => item.id === routeClosureId) ?? null;
    }
    if (selectedTransfer?.closureId) {
      const linkedClosure = closureList.find(
        (item) => item.id === selectedTransfer.closureId,
      );
      if (linkedClosure) return linkedClosure;
    }
    return (
      [...closureList]
        .sort(
          (a, b) =>
            new Date(b.initiatedAt).getTime() -
            new Date(a.initiatedAt).getTime(),
        )
        .find((item) => !TERMINAL_CLOSURE_STATUSES.has(item.status)) ??
      closureList[0] ??
      null
    );
  }, [routeClosureId, closureList, selectedTransfer]);

  const activeClosureId =
    routeClosureId ??
    selectedTransfer?.closureId ??
    selectedClosureSummary?.id ??
    null;
  const { data: activeClosureDetail, refetch: refetchClosureDetail } =
    useMyDepotClosureDetail(activeClosureId ?? 0, depotId, {
      enabled: !!activeClosureId,
    });
  const {
    data: externalResolutionState,
    refetch: refetchExternalResolutionState,
  } = useDepotExternalResolutionState(depotId, {
    enabled: !!depotId,
  });

  const activeTransferId = selectedTransfer?.transferId ?? null;
  const activeTransfer = activeClosureDetail?.transferDetail ?? null;
  const effectiveClosingTimeoutAt = null;

  useInventoryOperationalRealtime({
    depotClosures: {
      depotId,
      closureId: activeClosureId,
      transferId: activeTransferId,
    },
    enabled: depotId > 0,
  });

  const currentTransferStatus = normalizeDepotClosureTransferStatus(
    selectedTransfer?.status ?? activeTransfer?.status,
  );
  const sourceDepotName =
    selectedTransfer?.sourceDepotName ??
    activeClosureDetail?.depotName ??
    (activeTransfer?.sourceDepotId
      ? `Kho #${activeTransfer.sourceDepotId}`
      : null);
  const targetDepotName =
    selectedTransfer?.targetDepotName ??
    activeClosureDetail?.targetDepotName ??
    (activeTransfer?.targetDepotId
      ? `Kho #${activeTransfer.targetDepotId}`
      : null);
  const snapshotConsumableUnits =
    activeTransfer?.snapshotConsumableUnits ??
    selectedTransfer?.snapshotConsumableUnits ??
    activeClosureDetail?.snapshotConsumableUnits ??
    0;
  const snapshotReusableUnits =
    activeTransfer?.snapshotReusableUnits ??
    selectedTransfer?.snapshotReusableUnits ??
    activeClosureDetail?.snapshotReusableUnits ??
    0;

  const isSourceManager =
    selectedTransfer?.userRole === "Source" ||
    selectedTransfer?.sourceDepotId === depotId;
  const isTargetManager =
    selectedTransfer?.userRole === "Target" ||
    selectedTransfer?.targetDepotId === depotId;
  const hasExternalResolutionInstruction = Boolean(
    externalResolutionState?.hasActiveExternalResolution ||
      externalResolutionState?.canDownloadExternalTemplate ||
      externalResolutionState?.canUploadExternalResolution ||
      externalResolutionState?.resolutionType === "ExternalResolution" ||
      activeClosureDetail?.resolutionType === "ExternalResolution",
  );
  const canDownloadExternalTemplate =
    externalResolutionState?.canDownloadExternalTemplate ?? false;
  const canUploadExternalResolution =
    externalResolutionState?.canUploadExternalResolution ?? false;
  const externalResolutionNote =
    externalResolutionState?.externalNote ?? activeClosureDetail?.externalNote;
  const externalResolutionRemainingItemCount =
    externalResolutionState?.remainingItemCount ?? null;

  /* ── State ── */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transferAction, setTransferAction] = useState<
    "prepare" | "ship" | "complete" | "receive" | null
  >(null);
  const [transferNote, setTransferNote] = useState("");
  const [externalResolutionFileName, setExternalResolutionFileName] =
    useState("");
  const [externalResolutionItems, setExternalResolutionItems] = useState<
    DepotExternalResolutionItem[]
  >([]);
  const [isParsingExternalFile, setIsParsingExternalFile] = useState(false);
  const externalResolutionInputRef = useRef<HTMLInputElement>(null);

  /* ── Mutations ── */
  const prepareMutation = usePrepareDepotTransfer();
  const shipMutation = useShipDepotTransfer();
  const completeMutation = useCompleteDepotTransfer();
  const receiveMutation = useReceiveDepotTransfer();
  const submitExternalResolutionMutation = useSubmitDepotExternalResolution();
  const {
    mutateAsync: downloadExternalResolutionTemplate,
    isPending: isDownloadingExternalResolutionTemplate,
  } = useDownloadDepotClosureExportTemplate();

  const isActionPending =
    prepareMutation.isPending ||
    shipMutation.isPending ||
    completeMutation.isPending ||
    receiveMutation.isPending;
  const isSubmittingExternalResolution =
    submitExternalResolutionMutation.isPending;
  const closingTimeoutCountdown = useCountdown(effectiveClosingTimeoutAt);

  /* ── Handlers ── */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([
      refetchDepot(),
      refetchClosures(),
      refetchTransfers(),
      refetchExternalResolutionState(),
      ...(activeClosureId ? [refetchClosureDetail()] : []),
    ]).finally(() => setIsRefreshing(false));
  }, [
    activeClosureId,
    refetchClosureDetail,
    refetchClosures,
    refetchDepot,
    refetchExternalResolutionState,
    refetchTransfers,
  ]);

  function handleTransferAction() {
    if (!activeTransferId || !transferAction) return;
    const action = transferAction;
    const payload = {
      transferId: activeTransferId,
      depotId,
      ...(selectedTransfer?.sourceDepotId
        ? { sourceDepotId: selectedTransfer.sourceDepotId }
        : {}),
      ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
    };
    const labels: Record<typeof action, string> = {
      prepare: "Đã xác nhận chuẩn bị hàng.",
      ship: "Đã xác nhận xuất hàng.",
      complete: "Đã xác nhận hoàn tất giao hàng.",
      receive: "Đã xác nhận nhận hàng.",
    };
    function onDone() {
      toast.success(labels[action]);
      setTransferAction(null);
      setTransferNote("");
      handleRefresh();
    }
    function onFail(err: unknown) {
      toast.error(getApiError(err, "Thao tác thất bại."));
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
              `Đã nhận hàng. Còn ${res.remainingItemCount ?? "một số"} vật phẩm chưa được giải quyết — admin cần tạo batch tiếp theo hoặc chọn xử lý bên ngoài.`,
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
    if (!depotId) {
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

        if (payloadDepotId && payloadDepotId !== depotId) {
          return;
        }

        void refetchExternalResolutionState();
      },
    );

    return unsubscribe;
  }, [depotId, refetchExternalResolutionState]);

  const handleDownloadExternalResolutionTemplate = useCallback(async () => {
    try {
      const { blob, filename } = await downloadExternalResolutionTemplate(
        depotId,
      );
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
  }, [depotId, downloadExternalResolutionTemplate]);

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
      { depotId, items: externalResolutionItems },
      {
        onSuccess: (res) => {
          toast.success(
            res.message || "Đã ghi nhận kết quả xử lý tồn kho bên ngoài.",
          );
          resetExternalResolutionState();
          void refetchExternalResolutionState();
          handleRefresh();
        },
        onError: (err) => {
          toast.error(getApiError(err, "Gửi kết quả xử lý thất bại."));
        },
      },
    );
  }, [
    depotId,
    externalResolutionItems,
    handleRefresh,
    refetchExternalResolutionState,
    resetExternalResolutionState,
    submitExternalResolutionMutation,
  ]);

  /* ── No depot ── */
  if (!depotId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground tracking-tighter">
          Bạn chưa được phân công quản lý kho nào.
        </p>
      </div>
    );
  }

  /* ── Loading ── */
  if (depotLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const hasActiveTransferPanel = Boolean(activeTransferId && selectedTransfer);
  const effectiveClosureStatus =
    activeClosureDetail?.status ??
    selectedClosureSummary?.status ??
    (depot?.status === "Closing" ? "InProgress" : null);

  const shouldShowHeader = showHeader ?? !!onClose;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inline panel header ── */}
      {shouldShowHeader && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tighter">
              Đóng kho &amp; Chuyển hàng
            </h2>
            <p className="text-sm text-muted-foreground tracking-tighter mt-0.5">
              {depot?.name ?? `Kho #${depotId}`}
              {isTargetManager && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 text-xs font-semibold">
                  Kho nhận hàng
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <ArrowClockwise
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={onClose}
              >
                <X size={15} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Closure detail card ── */}
      {activeClosureDetail && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tighter">
                Phiên đóng kho #{activeClosureDetail.id}
              </h2>
              <p className="text-sm text-muted-foreground tracking-tight mt-0.5">
                {activeClosureDetail.closeReason || "Không có lý do chi tiết."}
              </p>
            </div>
            <Badge variant="outline" className="text-sm tracking-tight">
              {activeClosureDetail.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Phương án xử lý
              </p>
              <p className="mt-1 text-sm font-bold tracking-tight text-blue-700 dark:text-blue-400">
                {activeClosureDetail.resolutionType || "Chưa chọn"}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Kho nhận
              </p>
              <p className="mt-1 text-sm font-bold tracking-tight">
                {activeClosureDetail.targetDepotName ||
                  (activeClosureDetail.targetDepotId
                    ? `Kho #${activeClosureDetail.targetDepotId}`
                    : "—")}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Vật phẩm tiêu thụ
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-red-600 dark:text-red-400 tabular-nums">
                {activeClosureDetail.snapshotConsumableUnits.toLocaleString(
                  "vi-VN",
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Vật phẩm tái sử dụng
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
                {activeClosureDetail.snapshotReusableUnits.toLocaleString(
                  "vi-VN",
                )}
              </p>
            </div>
          </div>

          {(externalResolutionNote ||
            activeClosureDetail.driftNote ||
            activeClosureDetail.failureReason) && (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Ghi chú bổ sung
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                {externalResolutionNote && (
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground tracking-tight">
                      Xử lý bên ngoài
                    </p>
                    <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap wrap-break-word">
                      {externalResolutionNote}
                    </p>
                  </div>
                )}
                {activeClosureDetail.driftNote && (
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground tracking-tight">
                      Ghi chú chênh lệch
                    </p>
                    <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap wrap-break-word">
                      {activeClosureDetail.driftNote}
                    </p>
                  </div>
                )}
                {activeClosureDetail.failureReason && (
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 tracking-tight">
                      Nguyên nhân thất bại
                    </p>
                    <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap wrap-break-word text-red-700 dark:text-red-300">
                      {activeClosureDetail.failureReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeClosureDetail.externalItems.length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/60">
                <p className="text-base font-bold tracking-tighter">
                  Kết quả xử lý bên ngoài
                </p>
                <p className="text-sm text-muted-foreground tracking-tight">
                  {activeClosureDetail.externalItems.length.toLocaleString(
                    "vi-VN",
                  )}{" "}
                  mục đã được ghi nhận.
                </p>
              </div>
              <div className="w-full">
                <div className="px-5 py-3.5 grid-cols-1 md:grid-cols-[1.5fr_3fr_2fr_1fr] gap-4 items-center bg-muted/40 border-b border-border/60 text-xs font-medium text-muted-foreground tracking-tight hidden md:grid">
                  <div>Vật phẩm</div>
                  <div>Cách xử lý</div>
                  <div>Người nhận</div>
                  <div>Tổng tiền</div>
                </div>
                <div className="divide-y divide-border/60">
                  {activeClosureDetail.externalItems.slice(0, 5).map((item) => {
                    const hm = item.handlingMethod || "";
                    const hmBadgeCls =
                      hm === "DonatedToOrganization"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                        : hm === "Liquidated"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                          : hm === "Destroyed" || hm === "Expired"
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                            : hm === "Disposed"
                              ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-700 dark:text-zinc-400"
                              : "bg-muted border-border text-muted-foreground";
                    return (
                      <div
                        key={item.id}
                        className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[1.5fr_3fr_2fr_1fr] gap-4 items-start hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground tracking-tight mb-1 md:hidden">
                            Vật phẩm
                          </p>
                          <p className="text-sm font-semibold tracking-tight">
                            {item.itemName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground tracking-tight mb-1.5 md:hidden">
                            Cách xử lý
                          </p>
                          <span
                            className={cn(
                              "text-[11px] font-bold px-1.5 py-0.5 rounded-md border tracking-tighter",
                              hmBadgeCls,
                            )}
                          >
                            {item.handlingMethodDisplay || item.handlingMethod}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground tracking-tight mb-1 md:hidden">
                            Người nhận
                          </p>
                          <p className="text-sm font-semibold tracking-tight">
                            {item.recipient || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground tracking-tight mb-1 md:hidden">
                            Tổng tiền
                          </p>
                          <p className="text-sm font-semibold tracking-tight">
                            {item.totalPrice.toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <DepotTransfersListTable
        transfers={transferList}
        selectedTransferId={selectedTransfer?.transferId ?? null}
        onSelectTransfer={setSelectedTransferId}
        isLoading={transfersLoading}
        isRefreshing={isRefreshing || transfersFetching}
        onRefresh={handleRefresh}
        title="Danh sách transfer đóng kho"
        description="Hiển thị toàn bộ transfer liên quan đến kho hiện tại dưới dạng table list. Chọn một dòng để xem chi tiết và thao tác bên dưới."
      />

      {/* ── Active Transfer Panel ── */}
      {hasActiveTransferPanel ? (
        <div className="overflow-hidden rounded-2xl border-2 border-dashed border-orange-200/80 bg-white shadow-sm dark:border-orange-800/50 dark:bg-background">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-dashed border-orange-200/70 bg-white px-5 py-4 dark:border-orange-800/40 dark:bg-background">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tighter">
                    Transfer #{activeTransferId}
                  </span>
                  {(() => {
                    const s = currentTransferStatus;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-semibold tracking-tighter",
                          getDepotClosureTransferStatusToneClass(s),
                        )}
                      >
                        {getDepotClosureTransferStatusLabel(
                          s,
                          transferStatusValueMap,
                        )}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm tracking-tighter mt-1">
                  Khởi tạo lúc{" "}
                  {new Date(
                    selectedTransfer?.createdAt ?? Date.now(),
                  ).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-base tracking-tighter">
              {isSourceManager && targetDepotName ? (
                <>
                  <span className="font-semibold text-foreground">
                    {depot?.name ?? `Kho #${depotId}`}
                  </span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <ArrowsLeftRight size={11} className="text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">
                    {targetDepotName}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {sourceDepotName ?? "Kho nguồn"}
                  </span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <ArrowsLeftRight size={11} className="text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">
                    {depot?.name ?? `Kho #${depotId}`}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Step Progress */}
            <div className="flex items-start">
              {transferSteps.map((step, i) => {
                const cur = transferStepOrder.indexOf(currentTransferStatus);
                const me = transferStepOrder.indexOf(step.key);
                const done = me < cur;
                const active = me === cur;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mt-3.5 mx-1 rounded-full transition-colors",
                          done
                            ? "bg-gradient-to-r from-orange-400 to-amber-400"
                            : active
                              ? "bg-orange-200/80 dark:bg-orange-800/50"
                              : "bg-orange-100/80 dark:bg-orange-900/30",
                        )}
                      />
                    )}
                    <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 md:w-28">
                      <div
                        className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm",
                          done
                            ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                            : active
                              ? "border-2 border-orange-400 bg-orange-50 text-orange-700 ring-4 ring-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900/30"
                              : "border-2 border-orange-100 bg-white text-orange-400 dark:border-orange-900/40 dark:bg-orange-950/10 dark:text-orange-700",
                        )}
                      >
                        {active && (
                          <>
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-[-7px] rounded-full border border-orange-400/60 dark:border-orange-400/40 animate-[ping_2s_ease-out_infinite]"
                            />
                            <span
                              aria-hidden="true"
                              style={{ animationDelay: "0.9s" }}
                              className="pointer-events-none absolute inset-[-11px] rounded-full border border-orange-300/45 dark:border-orange-300/30 animate-[ping_2s_ease-out_infinite]"
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
                              : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  label: "Vật phẩm tiêu thụ",
                  value: snapshotConsumableUnits.toLocaleString("vi-VN"),
                  tone: "border-orange-200/70 bg-orange-50/70 dark:border-orange-800/40 dark:bg-orange-950/10",
                },
                {
                  label: "Vật phẩm tái sử dụng",
                  value: snapshotReusableUnits.toLocaleString("vi-VN"),
                  tone: "border-violet-200/70 bg-violet-50/70 dark:border-violet-800/40 dark:bg-violet-950/10",
                },
                {
                  label: isTargetManager ? "Kho nguồn" : "Kho nhận",
                  value: isTargetManager
                    ? (sourceDepotName ?? "—")
                    : (targetDepotName ?? "—"),
                  tone: "border-blue-200/70 bg-blue-50/70 dark:border-blue-800/40 dark:bg-blue-950/10",
                },
                {
                  label: "Trạng thái",
                  value: getDepotClosureTransferStatusLabel(
                    currentTransferStatus,
                    transferStatusValueMap,
                  ),
                  tone: "border-orange-200/80 bg-orange-50/90 dark:border-orange-800/50 dark:bg-orange-950/15",
                  accent: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-xl border border-dashed px-3.5 py-3 shadow-sm",
                    item.tone,
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-default tracking-tighter",
                      item.accent
                        ? "text-orange-700/70 dark:text-orange-300/70"
                        : "text-black",
                    )}
                  >
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
                </div>
              ))}
            </div>

            {/* Timestamps */}
            {activeTransfer &&
              (activeTransfer.shippedAt || activeTransfer.receivedAt) && (
                <div className="flex flex-wrap gap-2">
                  {activeTransfer.shippedAt && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-orange-200/70 bg-white px-3 py-1.5 text-xs tracking-tighter text-orange-700/90 dark:border-orange-800/40 dark:bg-background dark:text-orange-300/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>
                        Thời gian xuất hàng:{" "}
                        <strong className="text-foreground">
                          {new Date(activeTransfer.shippedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </strong>
                      </span>
                      {activeTransfer.shipNote && (
                        <span className="italic text-orange-700/70 dark:text-orange-300/70">
                          - {activeTransfer.shipNote}
                        </span>
                      )}
                    </div>
                  )}
                  {activeTransfer.receivedAt && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-200/70 bg-white px-3 py-1.5 text-xs tracking-tighter text-emerald-700/90 dark:border-emerald-800/40 dark:bg-background dark:text-emerald-300/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>
                        Thời gian nhận hàng:{" "}
                        <strong className="text-foreground">
                          {new Date(activeTransfer.receivedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </strong>
                      </span>
                      {activeTransfer.receiveNote && (
                        <span className="italic text-emerald-700/70 dark:text-emerald-300/70">
                          - {activeTransfer.receiveNote}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Action */}
            {(() => {
              const sourceCfgMap: Record<
                string,
                { label: string; action: "prepare" | "ship" | "complete" }
              > = {
                AwaitingPreparation: {
                  label: "Bắt đầu chuẩn bị hàng",
                  action: "prepare",
                },
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
              const cfg = isSourceManager
                ? sourceCfgMap[currentTransferStatus]
                : isTargetManager
                  ? targetCfgMap[currentTransferStatus]
                  : undefined;

              if (!cfg) {
                if (isTargetManager && currentTransferStatus !== "Received") {
                  const waitLabel: Record<string, string> = {
                    AwaitingPreparation: "Đang chờ kho nguồn chuẩn bị hàng…",
                    Preparing: "Kho nguồn đang chuẩn bị hàng…",
                    Shipping: "Hàng đang được vận chuyển đến kho bạn…",
                  };
                  const msg = waitLabel[currentTransferStatus];
                  if (msg)
                    return (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-orange-200/70 bg-white px-3 py-2 text-sm tracking-tighter text-orange-700 dark:border-orange-800/40 dark:bg-background dark:text-orange-300">
                        <HourglassHigh size={14} className="animate-pulse" />
                        <span>{msg}</span>
                      </div>
                    );
                }
                return null;
              }

              const isEmerald = "emerald" in cfg && cfg.emerald;
              return (
                <div className="flex items-center justify-end gap-2 border-t border-dashed border-orange-200/70 pt-3 dark:border-orange-800/30">
                  {transferAction === cfg.action ? (
                    <>
                      <Input
                        placeholder="Ghi chú (tuỳ chọn)..."
                        value={transferNote}
                        onChange={(e) => setTransferNote(e.target.value)}
                        className="h-9 flex-1 max-w-sm bg-background text-sm"
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
                        {cfg.label}
                      </Button>
                    </>
                  ) : (
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
                        setTransferAction(cfg.action);
                      }}
                    >
                      <Truck size={14} />
                      {cfg.label}
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ) : effectiveClosureStatus === "Processing" ? (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Spinner
                size={18}
                className="animate-spin text-blue-600 dark:text-blue-400"
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold tracking-tighter text-blue-900 dark:text-blue-200">
                Hệ thống đang xử lý phiên đóng kho
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 tracking-tighter">
                Đang chờ server hoàn tất xử lý. Màn hình sẽ tự cập nhật khi
                chuyển sang bước tiếp theo.
              </p>
              {effectiveClosingTimeoutAt && (
                <p className="text-xs text-blue-700 dark:text-blue-300 tracking-tighter">
                  Hết hạn:{" "}
                  <strong>
                    {new Date(effectiveClosingTimeoutAt).toLocaleString(
                      "vi-VN",
                    )}
                  </strong>
                  {closingTimeoutCountdown && (
                    <span className="ml-1.5 font-mono font-semibold">
                      ({closingTimeoutCountdown})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : hasExternalResolutionInstruction ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <WarningCircle
                  size={16}
                  className="text-amber-500 shrink-0"
                  weight="fill"
                />
                <p className="text-base font-bold tracking-tighter text-amber-800 dark:text-amber-300">
                  Admin đã chọn xử lý tồn kho bên ngoài hệ thống
                </p>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                Tải template xử lý, điền kết quả theo từng dòng vật phẩm, rồi
                tải file Excel lên để gửi vào hệ thống.
              </p>
              {externalResolutionNote && (
                <p className="text-sm text-amber-800 dark:text-amber-200 tracking-tighter whitespace-pre-wrap">
                  {externalResolutionNote}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canDownloadExternalTemplate && (
                <Button
                  variant="outline"
                  className="gap-2 tracking-tighter border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  onClick={handleDownloadExternalResolutionTemplate}
                  disabled={isDownloadingExternalResolutionTemplate}
                >
                  <DownloadSimple size={16} />
                  Tải file mẫu
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
                  {isParsingExternalFile
                    ? "Đang đọc file..."
                    : "Tải file kết quả"}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Tồn kho cần xử lý",
                value:
                  externalResolutionRemainingItemCount != null
                    ? `${externalResolutionRemainingItemCount.toLocaleString("vi-VN")} dòng`
                    : `${(snapshotConsumableUnits + snapshotReusableUnits).toLocaleString("vi-VN")} mục`,
              },
              {
                label: "File đã nạp",
                value: externalResolutionFileName || "Chưa chọn file",
                small: true,
              },
              {
                label: "Dòng hợp lệ đã đọc",
                value: externalResolutionItems.length.toLocaleString("vi-VN"),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-amber-950/10 p-3"
              >
                <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "font-bold tracking-tighter text-amber-900 dark:text-amber-100",
                    s.small ? "text-base break-all" : "text-xl",
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {effectiveClosingTimeoutAt && (
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
              <HourglassHigh size={14} className="shrink-0" />
              <span>
                Hết hạn:{" "}
                <strong>
                  {new Date(effectiveClosingTimeoutAt).toLocaleString("vi-VN")}
                </strong>
                {closingTimeoutCountdown && (
                  <span className="ml-1.5 font-mono font-semibold">
                    ({closingTimeoutCountdown})
                  </span>
                )}
              </span>
            </div>
          )}

          {canUploadExternalResolution && externalResolutionItems.length > 0 && (
            <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-amber-950/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200/70 dark:border-amber-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileXls size={18} className="text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold tracking-tighter text-amber-900 dark:text-amber-100">
                      Xem nhanh dữ liệu đã nạp
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 tracking-tighter">
                      Hiển thị 5 dòng đầu để kiểm tra trước khi gửi.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 tracking-tighter text-amber-700 dark:text-amber-300"
                  onClick={resetExternalResolutionState}
                >
                  <Trash size={14} />
                  Bỏ file
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-375 w-full text-sm">
                  <thead className="bg-amber-50/80 dark:bg-amber-950/20">
                    <tr className="border-b border-amber-200/70 dark:border-amber-800/60">
                      {[
                        "Dòng",
                        "Vật phẩm",
                        "Danh mục",
                        "Đối tượng",
                        "Loại vật phẩm",
                        "Đơn vị",
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
                          className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-amber-700 dark:text-amber-300 whitespace-nowrap"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {externalResolutionItems.slice(0, 5).map((item) => (
                      <tr
                        key={`${item.rowNumber}-${item.itemName}`}
                        className="border-b border-amber-200/70 dark:border-amber-800/60 align-top"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                          #{item.rowNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground min-w-44">
                          {item.itemName || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground min-w-32">
                          {item.categoryName || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground min-w-64">
                          {item.targetGroup || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {item.itemType || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {item.unit || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {formatExcelPreviewDate(item.receivedDate)}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {formatExcelPreviewDate(item.expiredDate)}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {item.quantity.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {item.unitPrice.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {item.totalPrice.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-foreground min-w-72">
                          {formatHandlingMethodLabel(item.handlingMethod)}
                        </td>
                        <td className="px-4 py-3 text-foreground min-w-64">
                          {item.recipient || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground min-w-40">
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
        </div>
      ) : depot?.status === "Closing" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <div className="flex items-center gap-2">
            <WarningCircle
              size={15}
              className="text-amber-500 shrink-0"
              weight="fill"
            />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-tighter">
              Kho đang trong quy trình đóng. Đang chờ admin chọn phương án xử lý
              tồn kho.
            </span>
          </div>
          {effectiveClosingTimeoutAt && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 tracking-tighter">
              <HourglassHigh size={13} className="shrink-0" />
              <span>
                Hết hạn:{" "}
                <strong>
                  {new Date(effectiveClosingTimeoutAt).toLocaleString("vi-VN")}
                </strong>
                {closingTimeoutCountdown && (
                  <span className="ml-1.5 font-mono font-semibold text-amber-700 dark:text-amber-300">
                    ({closingTimeoutCountdown})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      ) : depot?.status !== "Closed" ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
          <ArrowsLeftRight
            size={40}
            className="text-muted-foreground/20 mb-3"
          />
          <p className="text-base font-medium text-muted-foreground tracking-tighter">
            Kho đang hoạt động bình thường
          </p>
          <p className="text-sm text-muted-foreground/60 tracking-tighter mt-1">
            Không có quy trình đóng kho hay chuyển hàng đang diễn ra.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
          <XCircle size={40} className="text-muted-foreground/20 mb-3" />
          <p className="text-base font-medium text-muted-foreground tracking-tighter">
            Kho đã đóng
          </p>
        </div>
      )}
    </div>
  );
}
