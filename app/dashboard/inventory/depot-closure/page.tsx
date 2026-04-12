"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowsLeftRight,
  CheckFat,
  HourglassHigh,
  Truck,
  WarningCircle,
  Spinner,
  XCircle,
  ArrowClockwise,
  Package,
  Warehouse,
  DownloadSimple,
  UploadSimple,
  FileXls,
  PaperPlaneTilt,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import {
  useDepotById,
  useMyDepotClosures,
  useMyDepotClosureDetail,
  useMyDepotTransfers,
  usePrepareDepotTransfer,
  useShipDepotTransfer,
  useCompleteDepotTransfer,
  useReceiveDepotTransfer,
  useDownloadDepotClosureExportTemplate,
  useSubmitDepotExternalResolution,
  useDepotStatuses,
} from "@/services/depot/hooks";
import type { DepotExternalResolutionItem } from "@/services/depot/type";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";

const TERMINAL_TRANSFER_STATUSES = new Set(["Received", "Cancelled"]);
const TERMINAL_CLOSURE_STATUSES = new Set(["Completed", "Cancelled"]);

/* ── helpers ──────────────────────────────────────────────────── */
function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
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
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = new Date(raw.replace(/\//g, "-"));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

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
  if (HANDLING_METHOD_LABELS[englishKey]) {
    return englishKey;
  }

  const normalized = normalizeExcelText(raw);
  if (
    normalized.includes("quyen gop") ||
    normalized.includes("to chuc") ||
    normalized.includes("nhan dao")
  ) {
    return "DonatedToOrganization";
  }
  if (normalized.includes("thanh ly")) {
    return "Liquidated";
  }
  if (normalized.includes("tieu huy")) {
    return "Disposed";
  }
  if (normalized.includes("khac")) {
    return "Other";
  }

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

/* ── Transfer status normalizer ────────────────────────────────
 * API mới trả enum key tiếng Anh; vẫn giữ map tiếng Việt để tương thích.
 */
const TRANSFER_STATUS_KEYS = new Set([
  "AwaitingPreparation",
  "Preparing",
  "Shipping",
  "Completed",
  "Received",
  "Cancelled",
]);

const LEGACY_TRANSFER_STATUS_MAP: Record<string, string> = {
  "Chờ chuẩn bị": "AwaitingPreparation",
  "Đang chuẩn bị": "Preparing",
  "Đang vận chuyển": "Shipping",
  "Đã giao": "Completed",
  "Đã hoàn thành": "Completed",
  "Đã nhận": "Received",
  "Đã hủy": "Cancelled",
};

function normalizeTransferStatus(raw: string | undefined | null): string {
  if (!raw) return "AwaitingPreparation";
  if (TRANSFER_STATUS_KEYS.has(raw)) return raw;
  return LEGACY_TRANSFER_STATUS_MAP[raw] ?? raw;
}

/* ── Transfer step config ─────────────────────────────────────── */
const TRANSFER_STEPS = [
  { key: "AwaitingPreparation", label: "Chờ xử lý" },
  { key: "Preparing", label: "Chuẩn bị" },
  { key: "Shipping", label: "Đang vận chuyển" },
  { key: "Completed", label: "Đã giao" },
  { key: "Received", label: "Đã nhận" },
] as const;

const STEP_ORDER: string[] = TRANSFER_STEPS.map((s) => s.key);
/* ── Page ─────────────────────────────────────────────────────── */
export default function DepotClosurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const depotId = user?.depotId ?? 0;

  /* ── Data ── */
  const {
    data: depot,
    isLoading: depotLoading,
    refetch: refetchDepot,
  } = useDepotById(depotId);
  const routeClosureId = parsePositiveInt(searchParams.get("closureId"));
  const routeTransferId = parsePositiveInt(searchParams.get("transferId"));
  const { data: closureList = [], refetch: refetchClosures } =
    useMyDepotClosures({
      enabled: !!depotId,
    });
  const { data: transferList = [], refetch: refetchTransfers } =
    useMyDepotTransfers({
      enabled: !!depotId,
    });
  const { data: statusMetadata } = useDepotStatuses();

  const selectedTransfer = useMemo(() => {
    if (routeTransferId) {
      return (
        transferList.find((item) => item.transferId === routeTransferId) ?? null
      );
    }

    return (
      [...transferList]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .find(
          (item) =>
            !TERMINAL_TRANSFER_STATUSES.has(normalizeTransferStatus(item.status)),
        ) ?? transferList[0] ?? null
    );
  }, [routeTransferId, transferList]);

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
  const {
    data: activeClosureDetail,
    refetch: refetchClosureDetail,
  } = useMyDepotClosureDetail(activeClosureId ?? 0, {
    enabled: !!activeClosureId,
  });

  const activeTransferId = selectedTransfer?.transferId ?? null;
  const activeTransfer = activeClosureDetail?.transferDetail ?? null;
  const effectiveClosingTimeoutAt = null;

  const currentTransferStatus = normalizeTransferStatus(
    selectedTransfer?.status ?? activeTransfer?.status,
  );
  const sourceDepotName =
    selectedTransfer?.sourceDepotName ??
    activeClosureDetail?.depotName ??
    (activeTransfer?.sourceDepotId ? `Kho #${activeTransfer.sourceDepotId}` : null);
  const targetDepotName =
    selectedTransfer?.targetDepotName ??
    activeClosureDetail?.targetDepotName ??
    (activeTransfer?.targetDepotId ? `Kho #${activeTransfer.targetDepotId}` : null);
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

  /* ── Role detection: source vs target depot manager ── */
  const isSourceManager =
    selectedTransfer?.userRole === "Source" ||
    selectedTransfer?.sourceDepotId === depotId;
  const isTargetManager =
    selectedTransfer?.userRole === "Target" ||
    selectedTransfer?.targetDepotId === depotId;
  const hasExternalResolutionInstruction = Boolean(
    activeClosureDetail?.resolutionType === "ExternalResolution",
  );

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
      ...(activeClosureId ? [refetchClosureDetail()] : []),
    ]).finally(() => setIsRefreshing(false));
  }, [
    activeClosureId,
    refetchClosureDetail,
    refetchClosures,
    refetchDepot,
    refetchTransfers,
  ]);

  function handleTransferAction() {
    if (!activeTransferId || !transferAction) return;
    const action = transferAction;
    const payload = {
      transferId: activeTransferId,
      ...(selectedTransfer?.sourceDepotId
        ? { sourceDepotId: selectedTransfer.sourceDepotId }
        : {}),
      ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
    };
    const labels: Record<typeof action, string> = {
      prepare: "Đã xác nhận chuẩn bị hàng.",
      ship: "Đã xác nhận xuất hàng.",
      complete: "Đã xác nhận hoàn tất xuất hàng.",
      receive: "Đã xác nhận nhận hàng — kho đã đóng chính thức.",
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
      receiveMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
  }

  const resetExternalResolutionState = useCallback(() => {
    setExternalResolutionFileName("");
    setExternalResolutionItems([]);
    if (externalResolutionInputRef.current) {
      externalResolutionInputRef.current.value = "";
    }
  }, []);

  const handleDownloadExternalResolutionTemplate = useCallback(async () => {
    try {
      const { blob, filename } = await downloadExternalResolutionTemplate();
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
  }, [downloadExternalResolutionTemplate]);

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
      { items: externalResolutionItems },
      {
        onSuccess: (res) => {
          toast.success(
            res.message || "Đã ghi nhận kết quả xử lý tồn kho bên ngoài.",
          );
          resetExternalResolutionState();
          handleRefresh();
        },
        onError: (err) => {
          toast.error(getApiError(err, "Gửi kết quả xử lý thất bại."));
        },
      },
    );
  }, [
    externalResolutionItems,
    handleRefresh,
    resetExternalResolutionState,
    submitExternalResolutionMutation,
  ]);

  /* ── No depot assigned ── */
  if (!depotId) {
    return (
      <div className="flex flex-col bg-background min-h-screen">
        <header className="border-b bg-background px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl tracking-tighter font-bold">
              Đóng kho & Chuyển hàng
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground tracking-tighter">
            Bạn chưa được phân công quản lý kho nào.
          </p>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (depotLoading) {
    return (
      <div className="flex flex-col bg-background min-h-screen">
        <header className="border-b bg-background px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </header>
        <div className="p-6 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasActiveTransferPanel = Boolean(
    activeTransferId && selectedTransfer,
  );
  const effectiveClosureStatus =
    activeClosureDetail?.status ??
    selectedClosureSummary?.status ??
    (depot?.status === "Closing" ? "InProgress" : null);

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* ══ Header ══ */}
      <header className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl tracking-tighter font-bold leading-tight mb-1">
                  Đóng kho & Chuyển hàng
                </h1>
                <div className="flex items-center gap-2 text-base tracking-tighter font-medium text-muted-foreground">
                  <span>{depot?.name ?? `Kho #${depotId}`}</span>
                  {depot?.status && (
                    <Badge
                      className={cn(
                        "text-[13px] font-semibold tracking-tighter shrink-0",
                        depot.status === "Closing"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400"
                          : depot.status === "Closed"
                            ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
                            : depot.status === "Created"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                              : depot.status === "PendingAssignment"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : depot.status === "Unavailable"
                                  ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                  : depot.status === "Full"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                    : depot.status === "UnderMaintenance"
                                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      {statusMetadata?.find((s) => s.key === depot.status)?.value ??
                        (depot.status === "Closing"
                          ? "Đang tiến hành đóng kho"
                          : depot.status === "Closed"
                            ? "Đã đóng"
                            : depot.status === "Created"
                              ? "Vừa tạo, chưa có quản lý"
                              : depot.status === "PendingAssignment"
                                ? "Chờ gán lại quản lý"
                                : depot.status === "Unavailable"
                                  ? "Ngưng hoạt động"
                                  : depot.status === "Available"
                                    ? "Đang hoạt động"
                                    : depot.status)}
                    </Badge>
                  )}
                  {isTargetManager && (
                    <Badge
                      variant="outline"
                      className="text-sm border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                    >
                      Kho nhận hàng
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 rounded-xl shrink-0"
          >
            <ArrowClockwise
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </Button>
        </div>
      </header>

      {/* ══ Main ══ */}
      <main className="px-6 py-6 flex flex-col gap-6 flex-1">
        {activeClosureDetail && (
          <div className="order-2 rounded-2xl border border-border/60 bg-card p-5 space-y-4">
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
                  Snapshot tiêu thụ
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-red-600 dark:text-red-400 tabular-nums">
                  {activeClosureDetail.snapshotConsumableUnits.toLocaleString(
                    "vi-VN",
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Snapshot tái sử dụng
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {activeClosureDetail.snapshotReusableUnits.toLocaleString(
                    "vi-VN",
                  )}
                </p>
              </div>
            </div>

            {(activeClosureDetail.externalNote ||
              activeClosureDetail.driftNote ||
              activeClosureDetail.failureReason) && (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Ghi chú bổ sung
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                    {activeClosureDetail.externalNote && (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground tracking-tight">
                          Xử lý bên ngoài
                        </p>
                        <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap break-words">
                          {activeClosureDetail.externalNote}
                        </p>
                      </div>
                    )}
                    {activeClosureDetail.driftNote && (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground tracking-tight">
                          Ghi chú chênh lệch
                        </p>
                        <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap break-words">
                          {activeClosureDetail.driftNote}
                        </p>
                      </div>
                    )}
                    {activeClosureDetail.failureReason && (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 tracking-tight">
                          Nguyên nhân thất bại
                        </p>
                        <p className="mt-1 text-sm font-medium tracking-tight whitespace-pre-wrap break-words text-red-700 dark:text-red-300">
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
                    {activeClosureDetail.externalItems.length.toLocaleString("vi-VN")} mục đã được ghi nhận.
                  </p>
                </div>
                <div className="w-full">
                  <div className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[1.5fr_3fr_2fr_1fr] gap-4 items-center bg-muted/40 border-b border-border/60 text-xs font-medium text-muted-foreground tracking-tight hidden md:grid">
                    <div>Vật phẩm</div>
                    <div>Cách xử lý</div>
                    <div>Người nhận</div>
                    <div>Tổng tiền</div>
                  </div>
                  <div className="divide-y divide-border/60">
                    {activeClosureDetail.externalItems.slice(0, 5).map((item) => {
                      const hm = item.handlingMethod || "";
                      const hmBadgeCls = hm === "DonatedToOrganization"
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
                            <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-md border tracking-tighter", hmBadgeCls)}>
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

        {/* ── Active Transfer Panel ── */}
        {hasActiveTransferPanel ? (
          <div className="order-1 overflow-hidden rounded-[28px] border border-blue-200/80 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 shadow-[0_24px_80px_-46px_rgba(37,99,235,0.45)]">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-blue-200/70 dark:border-blue-800/70 bg-blue-100/40 dark:bg-blue-900/20 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_28px_-16px_rgba(59,130,246,0.9)]">
                  <ArrowsLeftRight size={18} weight="bold" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700/80 dark:text-blue-300/80">
                      Luồng điều phối
                    </span>
                    {(() => {
                      const s = currentTransferStatus;
                      const cls =
                        s === "AwaitingPreparation"
                          ? "bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                          : s === "Preparing"
                            ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300"
                            : s === "Shipping"
                              ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
                              : s === "Completed"
                                ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                                : s === "Received"
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                                  : "bg-muted border-border text-muted-foreground";
                      const lbl: Record<string, string> = {
                        AwaitingPreparation: "Chờ chuẩn bị",
                        Preparing: "Đang chuẩn bị",
                        Shipping: "Đang vận chuyển",
                        Completed: "Chờ xác nhận nhận",
                        Received: "Đã nhận",
                      };
                      return (
                        <span
                          className={cn(
                            "text-sm font-semibold tracking-tighter px-2.5 py-1 rounded-full border bg-white/80 dark:bg-slate-950/50 shadow-sm",
                            cls,
                          )}
                        >
                          {lbl[s] ?? s}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-[1.35rem] leading-none font-black tracking-tighter text-blue-950 dark:text-blue-100">
                      Transfer #{activeTransferId}
                    </span>
                    <span className="text-sm text-blue-800/75 dark:text-blue-200/70 tracking-tight">
                      Khởi tạo{" "}
                      {new Date(
                        selectedTransfer?.createdAt ?? Date.now(),
                      ).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] border border-white/80 dark:border-blue-900/60 bg-white/80 dark:bg-slate-950/35 px-4 py-3 shadow-[0_18px_35px_-30px_rgba(30,64,175,0.35)]">
                <div className="space-y-1 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700/70 dark:text-blue-300/70">
                    Tuyến chuyển
                  </p>
                  {isSourceManager && targetDepotName ? (
                    <p className="text-sm font-semibold tracking-tight text-blue-900 dark:text-blue-100">
                      Từ kho hiện tại đến <span>{targetDepotName}</span>
                    </p>
                  ) : (
                    <p className="text-sm font-semibold tracking-tight text-emerald-800 dark:text-emerald-300">
                      Từ <span>{sourceDepotName ?? "Kho nguồn"}</span> đến kho
                      hiện tại
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm",
                    isTargetManager
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                  )}
                >
                  <Icon
                    icon="fluent:vehicle-truck-cube-20-regular"
                    width="24"
                    height="24"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Step Progress */}
              <div className="rounded-[24px] border border-white/70 dark:border-blue-900/60 bg-white/75 dark:bg-slate-950/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="flex items-start">
                  {TRANSFER_STEPS.map((step, i) => {
                    const cur = STEP_ORDER.indexOf(currentTransferStatus);
                    const me = STEP_ORDER.indexOf(step.key);
                    const done = me < cur;
                    const active = me === cur;
                    return (
                      <React.Fragment key={step.key}>
                        {i > 0 && (
                          <div
                            className={cn(
                              "h-1 flex-1 mt-3.5 mx-1 rounded-full transition-colors",
                              done || active
                                ? "bg-blue-400 dark:bg-blue-500"
                                : "bg-blue-100 dark:bg-blue-950/70",
                            )}
                          />
                        )}
                        <div className="flex flex-col items-center gap-1.5 shrink-0 w-24">
                          <div
                            className={cn(
                              "relative h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                              done
                                ? "bg-blue-500 border-blue-500 text-white shadow-[0_16px_24px_-16px_rgba(59,130,246,0.9)]"
                                : active
                                  ? "bg-white border-blue-500 text-blue-600 dark:bg-blue-950 ring-4 ring-blue-100 dark:ring-blue-900/80 shadow-[0_12px_24px_-18px_rgba(59,130,246,0.9)]"
                                  : "bg-white/80 border-blue-100 text-blue-300 dark:bg-blue-950/50 dark:border-blue-900",
                            )}
                          >
                            {active && (
                              <>
                                <span className="absolute inset-[-8px] rounded-full border border-blue-300/80 dark:border-blue-500/50 animate-ping" />
                                <span
                                  className="absolute inset-[-14px] rounded-full border border-blue-200/60 dark:border-blue-400/30 animate-ping"
                                  style={{ animationDelay: "250ms" }}
                                />
                              </>
                            )}
                            {done ? (
                              <CheckFat size={13} weight="fill" />
                            ) : (
                              <span className="text-xs font-black leading-none">
                                {i + 1}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium text-center leading-tight tracking-tighter whitespace-nowrap",
                              done
                                ? "text-blue-600 dark:text-blue-300 font-semibold"
                                : active
                                  ? "text-blue-800 dark:text-blue-200 font-bold"
                                  : "text-muted-foreground",
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Transfer stats */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
                {[
                  {
                    label: "Vật tư tiêu thụ",
                    value: snapshotConsumableUnits.toLocaleString("vi-VN"),
                    icon: <Package size={16} weight="fill" />,
                    tone: "text-blue-700 dark:text-blue-300",
                  },
                  {
                    label: "Thiết bị tái sử dụng",
                    value: snapshotReusableUnits.toLocaleString("vi-VN"),
                    icon: <ArrowsLeftRight size={16} weight="bold" />,
                    tone: "text-indigo-700 dark:text-indigo-300",
                  },
                  {
                    label: isTargetManager ? "Kho nguồn" : "Kho nhận",
                    value: isTargetManager
                      ? (sourceDepotName ?? "—")
                      : (targetDepotName ?? "—"),
                    icon: <Warehouse size={16} weight="fill" />,
                    tone: "text-sky-700 dark:text-sky-300",
                  },
                  {
                    label: "Mốc xử lý",
                    value:
                      currentTransferStatus === "Received"
                        ? "Hoàn tất"
                        : currentTransferStatus === "Shipping"
                          ? "Đang đi đường"
                          : currentTransferStatus === "Preparing"
                            ? "Đang soạn hàng"
                            : "Sẵn sàng thao tác",
                    icon: <Truck size={16} weight="fill" />,
                    tone: "text-cyan-700 dark:text-cyan-300",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-white/80 dark:border-blue-900/60 bg-white/75 dark:bg-slate-950/25 px-3.5 py-3 shadow-[0_18px_35px_-30px_rgba(59,130,246,0.2)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <span className="block text-xs text-blue-700/80 dark:text-blue-300/80 font-medium tracking-tight">
                          {item.label}
                        </span>
                        <span className="block truncate text-[1.05rem] font-black text-slate-950 dark:text-white tracking-tight tabular-nums leading-snug">
                          {item.value}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/85 dark:bg-slate-900/70 shadow-sm",
                          item.tone,
                        )}
                      >
                        {item.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transfer detail info */}
              {activeTransfer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pt-1">
                  {activeTransfer.shippedAt && (
                    <div className="rounded-[18px] border border-blue-200/70 dark:border-blue-800/60 bg-white/70 dark:bg-slate-950/25 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700/70 dark:text-blue-300/70">
                            Xuất hàng
                          </p>
                          <p className="mt-0.5 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {new Date(activeTransfer.shippedAt).toLocaleString(
                              "vi-VN",
                            )}
                          </p>
                          {activeTransfer.shipNote && (
                            <p className="mt-1 truncate text-sm italic text-slate-600 dark:text-slate-300">
                              {activeTransfer.shipNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTransfer.receivedAt && (
                    <div className="rounded-[18px] border border-emerald-200/70 dark:border-emerald-800/60 bg-white/70 dark:bg-slate-950/25 px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/70 dark:text-emerald-300/70">
                            Nhận hàng
                          </p>
                          <p className="mt-0.5 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {new Date(activeTransfer.receivedAt).toLocaleString(
                              "vi-VN",
                            )}
                          </p>
                          {activeTransfer.receiveNote && (
                            <p className="mt-1 truncate text-sm italic text-slate-600 dark:text-slate-300">
                              {activeTransfer.receiveNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              {(() => {
                /* Source manager actions: Pending→prepare, Preparing→ship, Shipping→complete */
                const sourceCfgMap: Record<
                  string,
                  {
                    label: string;
                    action: "prepare" | "ship" | "complete";
                  }
                > = {
                  AwaitingPreparation: {
                    label: "Bắt đầu chuẩn bị hàng",
                    action: "prepare",
                  },
                  Preparing: {
                    label: "Xác nhận xuất hàng",
                    action: "ship",
                  },
                  Shipping: {
                    label: "Hoàn tất xuất hàng",
                    action: "complete",
                  },
                };
                /* Target manager action: Completed→receive */
                const targetCfgMap: Record<
                  string,
                  {
                    label: string;
                    action: "receive";
                    emerald: boolean;
                  }
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
                  /* Show waiting message for target manager when transfer is not yet Completed */
                  if (isTargetManager && currentTransferStatus !== "Received") {
                    const waitLabel: Record<string, string> = {
                      AwaitingPreparation: "Đang chờ kho nguồn chuẩn bị hàng…",
                      Preparing: "Kho nguồn đang chuẩn bị hàng…",
                      Shipping: "Hàng đang được vận chuyển đến kho bạn…",
                    };
                    const msg = waitLabel[currentTransferStatus];
                    if (msg) {
                      return (
                        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground tracking-tighter">
                          <HourglassHigh size={14} className="animate-pulse" />
                          <span className="font-medium">{msg}</span>
                        </div>
                      );
                    }
                  }
                  return null;
                }
                const isEmerald = "emerald" in cfg && cfg.emerald;
                return (
                  <div className="flex justify-end">
                    {transferAction === cfg.action ? (
                      <div className="flex w-full max-w-3xl items-center justify-end gap-2">
                        <Input
                          id="transfer-note-inline"
                          placeholder="Nhập ghi chú nếu cần..."
                          value={transferNote}
                          onChange={(e) => setTransferNote(e.target.value)}
                          className="h-10 min-w-0 flex-1 bg-white dark:bg-background"
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
                            cfg.action === "receive"
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white",
                          )}
                          disabled={isActionPending}
                          onClick={handleTransferAction}
                        >
                          {isActionPending && (
                            <Spinner size={13} className="animate-spin" />
                          )}
                          {cfg.label}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className={cn(
                          "gap-1.5 py-2 font-semibold tracking-tighter",
                          isEmerald
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
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
          <div className="order-1 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-5">
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
                  Tải template xử lý, điền kết quả theo từng dòng vật tư, rồi
                  tải file Excel lên để gửi vào hệ thống.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2 tracking-tighter border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  onClick={handleDownloadExternalResolutionTemplate}
                  disabled={isDownloadingExternalResolutionTemplate}
                >
                  <DownloadSimple size={16} />
                  Tải file mẫu
                </Button>
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
              <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-amber-950/10 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                  Tồn kho cần xử lý
                </p>
                <p className="text-xl font-bold tracking-tighter text-amber-900 dark:text-amber-100">
                  {(
                    snapshotConsumableUnits + snapshotReusableUnits
                  ).toLocaleString("vi-VN")}{" "}
                  mục
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-amber-950/10 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                  File đã nạp
                </p>
                <p className="text-base font-bold tracking-tighter text-amber-900 dark:text-amber-100 break-all">
                  {externalResolutionFileName || "Chưa chọn file"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-amber-950/10 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                  Dòng hợp lệ đã đọc
                </p>
                <p className="text-xl font-bold tracking-tighter text-amber-900 dark:text-amber-100">
                  {externalResolutionItems.length.toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {effectiveClosingTimeoutAt && (
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 tracking-tighter">
                <HourglassHigh size={14} className="shrink-0" />
                <span>
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
                </span>
              </div>
            )}

            {externalResolutionItems.length > 0 && (
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
                  <table className="min-w-[1500px] w-full text-sm">
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
          </div>
        ) : depot?.status === "Closing" ? (
          <div className="order-1 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2">
              <WarningCircle
                size={15}
                className="text-amber-500 shrink-0"
                weight="fill"
              />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-tighter">
                Kho đang trong quy trình đóng. Đang chờ admin chọn phương án xử
                lý tồn kho.
              </span>
            </div>
            {effectiveClosingTimeoutAt && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 tracking-tighter">
                <HourglassHigh size={13} className="shrink-0" />
                <span>
                  Hết hạn:{" "}
                  <strong>
                    {new Date(effectiveClosingTimeoutAt).toLocaleString(
                      "vi-VN",
                    )}
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
          <div className="order-1 flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
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
          <div className="order-1 flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
            <XCircle size={40} className="text-muted-foreground/20 mb-3" />
            <p className="text-base font-medium text-muted-foreground tracking-tighter">
              Kho đã đóng
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
