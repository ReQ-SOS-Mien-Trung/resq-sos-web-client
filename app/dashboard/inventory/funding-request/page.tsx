"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Wallet,
  Plus,
  Package,
  Spinner,
  FileText,
  Eye,
  PaperPlaneTilt,
  ListBullets,
  WarningCircle,
  UploadSimple,
  FileXls,
  DownloadSimple,
  X,
  CheckCircle,
  Trash,
  ArrowClockwise,
  ClockCounterClockwise,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import {
  useInventoryCategories,
  useInventoryItemTypes,
  useInventoryTargetGroups,
} from "@/services/inventory/hooks";
import { useMyDepotFund, MY_DEPOT_FUND_QUERY_KEY, useMyDepotFundTransactions } from "@/services/depot/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFundingRequests,
  useCreateFundingRequest,
  useDownloadFundingRequestTemplate,
} from "@/services/funding_request";
import type {
  FundingRequestEntity,
  FundingRequestStatus,
  CreateFundingRequestItem,
} from "@/services/funding_request";

/* ── Excel column mapping ─────────────────────────────────── */

const COL = {
  STT: "STT",
  TEN: "Tên vật phẩm",
  DANHMUC: "Danh mục",
  DOITUONG: "Đối tượng",
  LOAI: "Loại vật phẩm",
  DONVI: "Đơn vị",
  GHICHU: "Mô tả vật phẩm",
  SOLUONG: "Số lượng (*)",
  DONGIA: "Đơn giá (VNĐ)",
} as const;

type FundingColumnKey = keyof typeof COL;

const COLUMN_ALIASES: Record<FundingColumnKey, string[]> = {
  STT: ["stt"],
  TEN: ["ten vat pham"],
  DANHMUC: ["danh muc"],
  DOITUONG: ["doi tuong"],
  LOAI: ["loai vat pham"],
  DONVI: ["don vi"],
  GHICHU: ["mo ta vat pham", "ghi chu", "mo ta"],
  SOLUONG: ["so luong", "so luong *", "so luong (*)"],
  DONGIA: ["don gia", "don gia vnd", "don gia (vnd)"],
};

const FALLBACK_CATEGORY_MAP: Record<string, string> = {
  "thuc pham": "Food",
  "nuoc uong": "Water",
  "y te": "Medical",
  "ve sinh ca nhan": "Hygiene",
  "quan ao": "Clothing",
  "noi tru an": "Shelter",
  "cong cu sua chua": "RepairTools",
  "thiet bi cuu ho": "RescueEquipment",
  "suoi am": "Heating",
  khac: "Others",
  food: "Food",
  water: "Water",
  medical: "Medical",
  hygiene: "Hygiene",
  clothing: "Clothing",
  shelter: "Shelter",
  repairtools: "RepairTools",
  rescueequipment: "RescueEquipment",
  heating: "Heating",
  others: "Others",
};

/* ── Status config ────────────────────────────────────────── */

const statusConfig: Record<
  FundingRequestStatus,
  { label: string; className: string; dotColor: string }
> = {
  Pending: {
    label: "Chờ duyệt",
    className:
      "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  Approved: {
    label: "Đã duyệt",
    className:
      "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
  },
  Rejected: {
    label: "Đã từ chối",
    className:
      "bg-rose-500/8 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    dotColor: "bg-rose-500",
  },
};

/* ── Helpers ──────────────────────────────────────────────── */

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

function formatMoneyInput(value: string | number): string {
  const raw =
    typeof value === "string"
      ? value.replace(/\D/g, "")
      : String(Math.round(value));
  const n = parseInt(raw, 10);
  if (!raw || isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
}

/** Auto-detects the real header row (skips title/note rows) and returns parsed data rows. */
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
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findHeaderLayout(rows: unknown[][]): {
  headerRowIndex: number;
  columnIndexes: Partial<Record<FundingColumnKey, number>>;
} | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;

    const columnIndexes: Partial<Record<FundingColumnKey, number>> = {};

    row.forEach((cell, columnIndex) => {
      const normalizedCell = normalizeExcelText(cell);
      if (!normalizedCell) return;

      const matchedKey = (Object.keys(COLUMN_ALIASES) as FundingColumnKey[]).find(
        (key) => COLUMN_ALIASES[key].includes(normalizedCell),
      );

      if (matchedKey && columnIndexes[matchedKey] === undefined) {
        columnIndexes[matchedKey] = columnIndex;
      }
    });

    if (
      columnIndexes.STT !== undefined &&
      columnIndexes.TEN !== undefined &&
      columnIndexes.DANHMUC !== undefined
    ) {
      return { headerRowIndex: rowIndex, columnIndexes };
    }
  }

  return null;
}

function getSheetRows(workbook: XLSX.WorkBook): Record<FundingColumnKey, unknown>[] {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });
    const headerLayout = findHeaderLayout(rawRows);
    if (!headerLayout) continue;

    return rawRows
      .slice(headerLayout.headerRowIndex + 1)
      .map((row) => {
        const rowArray = Array.isArray(row) ? row : [];
        const mappedRow = {} as Record<FundingColumnKey, unknown>;

        (Object.keys(COL) as FundingColumnKey[]).forEach((key) => {
          const columnIndex = headerLayout.columnIndexes[key];
          mappedRow[key] =
            columnIndex === undefined ? "" : rowArray[columnIndex] ?? "";
        });

        return mappedRow;
      })
      .filter((row) =>
        [row.TEN, row.DANHMUC, row.DONVI, row.SOLUONG, row.DONGIA].some(
          (value) => String(value ?? "").trim() !== "",
        ),
      );
  }

  return [];
}

function matchMetadataKey(
  rawValue: string,
  options: { key: string; value: string }[],
): string {
  const parts = rawValue
    .split(/\s*-\s*/)
    .map((part) => normalizeExcelText(part))
    .filter(Boolean);

  const matched = options.find((option) => {
    const normalizedKey = normalizeExcelText(option.key);
    const normalizedValue = normalizeExcelText(option.value);
    return parts.some(
      (part) => part === normalizedKey || part === normalizedValue,
    );
  });

  return matched?.key ?? rawValue.trim();
}

function matchCategoryCode(
  rawCategory: string,
  categories: { key: string; value: string }[],
): string {
  const matched = matchMetadataKey(rawCategory, categories);
  if (matched && matched !== rawCategory.trim()) {
    return matched;
  }

  const parts = rawCategory
    .split(/\s*-\s*/)
    .map((part) => normalizeExcelText(part))
    .filter(Boolean);

  const fallback = parts.find((part) => FALLBACK_CATEGORY_MAP[part]);
  return fallback ? FALLBACK_CATEGORY_MAP[fallback] : "";
}

type TabType = "create" | "history" | "transactions";

/* ── Import row with validation ───────────────────────────── */

interface ImportRow extends CreateFundingRequestItem {
  id: string;
  errors: Record<string, string>;
}

function validateRow(
  row: Omit<ImportRow, "errors">,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!row.itemName.trim()) errors.itemName = "Bắt buộc";
  if (!row.categoryCode) errors.categoryCode = "Bắt buộc";
  if (!row.unit.trim()) errors.unit = "Bắt buộc";
  if (!row.quantity || row.quantity <= 0) errors.quantity = "Phải > 0";
  if (!row.unitPrice || row.unitPrice <= 0) errors.unitPrice = "Phải > 0";
  return errors;
}

function createEmptyRow(rowNum: number): ImportRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    row: rowNum,
    itemName: "",
    categoryCode: "",
    unit: "",
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    itemType: "",
    targetGroup: "",
    notes: "",
    errors: {
      itemName: "Bắt buộc",
      categoryCode: "Bắt buộc",
      unit: "Bắt buộc",
      quantity: "Phải > 0",
      unitPrice: "Phải > 0",
    },
  };
}

/* ── Main Page ────────────────────────────────────────────── */

export default function FundingRequestPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const depotId = user?.depotId ?? 0;
  const depotName = user?.depotName ?? "Kho";

  // ── Categories from API ──
  const { data: categoriesData } = useInventoryCategories();
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(
    () => targetGroupsData ?? [],
    [targetGroupsData],
  );
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.key,
        label: c.value,
      })),
    [categories],
  );
  const categoryMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c) => [c.key, c.value]),
      ) as Record<string, string>,
    [categories],
  );
  const itemTypeOptions = useMemo(
    () =>
      itemTypes.map((itemType) => ({
        value: itemType.key,
        label: itemType.value,
      })),
    [itemTypes],
  );
  const targetGroupOptions = useMemo(
    () =>
      targetGroups.map((targetGroup) => ({
        value: targetGroup.key,
        label: targetGroup.value,
      })),
    [targetGroups],
  );

  // ── My fund balance ──
  const { data: myFund, isLoading: loadingFund } = useMyDepotFund();
  const queryClient = useQueryClient();
  const [txPage, setTxPage] = useState(1);
  const { data: txData, isLoading: loadingTx } = useMyDepotFundTransactions(
    { pageNumber: txPage, pageSize: 20 },
    { enabled: true },
  );

  const [activeTab, setActiveTab] = useState<TabType>("create");

  // ── Create form state ──
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([createEmptyRow(1)]);
  const [excelFileName, setExcelFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"excel" | "manual">(
    "excel",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── History ──
  const { data: requestsData, isLoading: loadingRequests } =
    useFundingRequests({
      params: {
        pageNumber: 1,
        pageSize: 200,
        depotIds: depotId ? [depotId] : undefined,
      },
    });
  const requests = useMemo(
    () => requestsData?.items ?? [],
    [requestsData],
  );

  // Detail dialog
  const [detailItem, setDetailItem] =
    useState<FundingRequestEntity | null>(null);

  const { mutate: createRequest, isPending } = useCreateFundingRequest();
  const {
    mutateAsync: downloadTemplate,
    isPending: isDownloadingTemplate,
  } = useDownloadFundingRequestTemplate();

  /* ── Excel parsing ──────────────────────────────────────── */

  const parseExcel = useCallback(
    (file: File, append = false) => {
      if (
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls")
      ) {
        toast.error("Chỉ chấp nhận file .xlsx hoặc .xls");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(
            e.target?.result as ArrayBuffer,
          );
          const workbook = XLSX.read(data, { type: "array" });
          const jsonData = getSheetRows(workbook);
          if (jsonData.length === 0) {
            toast.error("File Excel không có dữ liệu");
            return;
          }

          setRows((prev) => {
            const offset = append ? prev.length : 0;
            const parsed: ImportRow[] = jsonData.map((raw, idx) => {
              const rawCategory = String(
                raw.DANHMUC ?? "",
              ).trim();
              const categoryCode = matchCategoryCode(
                rawCategory,
                categories,
              );
              const rawItemType = String(raw.LOAI ?? "").trim();
              const itemType = matchMetadataKey(rawItemType, itemTypes);
              const isReusable =
                normalizeExcelText(itemType) === "reusable" ||
                normalizeExcelText(rawItemType) === "tai su dung";
              const rawTargetGroup = String(
                raw.DOITUONG ?? "",
              ).trim();
              const targetGroup = isReusable
                ? "Rescuer"
                : matchMetadataKey(rawTargetGroup, targetGroups);

              const rowData: Omit<ImportRow, "errors"> = {
                id: `row-${offset + idx}-${Date.now()}`,
                row: offset + idx + 1,
                itemName: String(raw.TEN ?? "").trim(),
                categoryCode,
                unit: String(raw.DONVI ?? "").trim(),
                quantity: parseExcelNumber(raw.SOLUONG),
                unitPrice: parseExcelNumber(raw.DONGIA),
                totalPrice: 0,
                itemType,
                targetGroup,
                notes: String(raw.GHICHU ?? "").trim(),
              };
              rowData.totalPrice =
                rowData.quantity * rowData.unitPrice;
              return { ...rowData, errors: validateRow(rowData) };
            });

            const newRows = append
              ? [...prev, ...parsed].map((r, i) => ({
                ...r,
                row: i + 1,
              }))
              : parsed;
            return newRows;
          });

          setExcelFileName(file.name);
          setInputMode("manual");
          toast.success(
            append
              ? `Đã thêm ${jsonData.length} dòng từ Excel`
              : `Đọc ${jsonData.length} dòng thành công`,
          );
        } catch {
          toast.error("Không thể đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [categories, itemTypes, targetGroups],
  );

  /* ── Row management ─────────────────────────────────────── */

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      createEmptyRow(prev.length + 1),
    ]);
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        toast.error("Phải có ít nhất 1 vật tư");
        return prev;
      }
      return prev
        .filter((r) => r.id !== rowId)
        .map((r, i) => ({ ...r, row: i + 1 }));
    });
  }, []);

  const updateRow = useCallback(
    (
      rowId: string,
      field: keyof CreateFundingRequestItem,
      value: string | number,
    ) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const updated = { ...r, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice =
              updated.quantity * updated.unitPrice;
          }
          updated.errors = validateRow(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const handleReset = useCallback(() => {
    setRows([createEmptyRow(1)]);
    setExcelFileName("");
    setInputMode("excel");
  }, []);

  /* ── Download template ──────────────────────────────────── */

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { blob, filename } = await downloadTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file mẫu");
    } catch {
      toast.error("Không thể tải file mẫu");
    }
  }, [downloadTemplate]);

  /* ── Computed ────────────────────────────────────────────── */

  // A row is "empty" (untouched) if user hasn't filled anything
  const filledRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          !(
            r.itemName.trim() === "" &&
            r.categoryCode === "" &&
            r.unit.trim() === "" &&
            r.quantity === 0 &&
            r.unitPrice === 0
          ),
      ),
    [rows],
  );

  const totalAmount = useMemo(
    () => filledRows.reduce((sum, r) => sum + r.totalPrice, 0),
    [filledRows],
  );

  const totalErrors = useMemo(
    () =>
      filledRows.filter((r) => Object.keys(r.errors).length > 0).length,
    [filledRows],
  );

  const validRows = filledRows.length - totalErrors;

  const canSubmit =
    description.trim() !== "" &&
    filledRows.length > 0 &&
    totalErrors === 0;

  /* ── Submit ─────────────────────────────────────────────── */

  const handleSubmit = () => {
    if (description.trim() === "") {
      toast.error("Vui lòng nhập mô tả yêu cầu");
      return;
    }
    if (filledRows.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 vật tư");
      return;
    }
    if (totalErrors > 0) {
      toast.error(
        `Còn ${totalErrors} dòng có lỗi. Vui lòng sửa trước khi gửi.`,
      );
      return;
    }
    const items: CreateFundingRequestItem[] = filledRows.map((r) => ({
      row: r.row,
      itemName: r.itemName,
      categoryCode: r.categoryCode,
      unit: r.unit,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalPrice: r.totalPrice,
      itemType: r.itemType,
      targetGroup: r.targetGroup,
      notes: r.notes,
    }));
    createRequest(
      { description: description.trim(), items },
      {
        onSuccess: () => {
          toast.success("Gửi yêu cầu cấp quỹ thành công!");
          setDescription("");
          handleReset();
          setActiveTab("history");
        },
        onError: () =>
          toast.error("Gửi yêu cầu thất bại. Vui lòng thử lại."),
      },
    );
  };

  /* ── Render helpers for table cells ─────────────────────── */

  const renderInputCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
    placeholder: string,
    type: "text" | "number" = "text",
  ) => {
    const error = row.errors[field];
    const rawValue = row[field];
    const value =
      type === "number" ? (rawValue || "") : String(rawValue ?? "");
    return (
      <div className="space-y-0.5">
        <Input
          type={type}
          min={type === "number" ? 0 : undefined}
          value={value}
          onChange={(e) =>
            updateRow(
              row.id,
              field,
              type === "number"
                ? Number(e.target.value)
                : e.target.value,
            )
          }
          placeholder={placeholder}
          className={cn(
            "h-8 text-sm",
            error && "border-red-400 focus-visible:ring-red-400",
          )}
        />
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderCurrencyCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
  ) => {
    const error = row.errors[field];
    const rawValue = row[field] as number;
    return (
      <div className="space-y-0.5">
        <Input
          type="text"
          inputMode="numeric"
          value={rawValue > 0 ? formatMoneyInput(rawValue) : ""}
          onChange={(e) => {
            const stripped = e.target.value
              .replace(/\./g, "")
              .replace(/[^\d]/g, "");
            updateRow(
              row.id,
              field,
              stripped ? parseInt(stripped, 10) : 0,
            );
          }}
          placeholder="0"
          className={cn(
            "h-8 text-sm",
            error && "border-red-400 focus-visible:ring-red-400",
          )}
        />
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderSelectCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const currentValue = String(row[field] ?? "");
    return (
      <div className="space-y-0.5">
        <Select
          value={currentValue}
          onValueChange={(val) => updateRow(row.id, field, val)}
        >
          <SelectTrigger
            className={cn(
              "h-8 text-sm",
              error && "border-red-400",
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push("/dashboard/inventory")
              }
              className="gap-1.5 text-muted-foreground mb-3 -ml-2"
            >
              <ArrowLeft size={14} />
              Quay lại kho
            </Button>
            <div className="flex items-center gap-2.5 mb-1">
              <Wallet
                size={20}
                weight="bold"
                className="text-emerald-600"
              />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {depotName}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Yêu cầu cấp quỹ
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Gửi yêu cầu cấp quỹ mua vật tư và xem lịch sử yêu
              cầu
            </p>
          </div>
          {activeTab === "create" && inputMode === "manual" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 tracking-tighter shrink-0"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
            >
              {isDownloadingTemplate ? (
                <Spinner size={14} className="animate-spin" />
              ) : (
                <DownloadSimple size={14} />
              )}
              {isDownloadingTemplate
                ? "Đang tải file mẫu..."
                : "Tải file mẫu Excel"}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${activeTab === "create"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <PaperPlaneTilt size={14} />
            Tạo yêu cầu
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${activeTab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ListBullets size={14} />
            Lịch sử
            {requests.length > 0 && (
              <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground ml-1">
                {requests.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${activeTab === "transactions"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ClockCounterClockwise size={14} />
            GD kho
          </button>
        </div>

        {/* ─── CREATE TAB ────────────────────────────────── */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── Right column: Info + Summary ── */}
            <div className="lg:col-span-3 lg:order-2 space-y-4 lg:sticky lg:top-6">
              {/* Fund balance */}
              <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Wallet
                        size={15}
                        weight="fill"
                        className="text-emerald-600"
                      />
                      <span className="text-lg font-semibold tracking-tighter text-emerald-700 dark:text-emerald-400">
                        Số dư quỹ hiện tại
                      </span>
                    </div>
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: MY_DEPOT_FUND_QUERY_KEY })}
                      className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-emerald-600/60 hover:text-emerald-600"
                      title="Làm mới"
                    >
                      <ArrowClockwise size={24} className={loadingFund ? "animate-spin" : ""} />
                    </button>
                  </div>
                  {loadingFund ? (
                    <Skeleton className="h-8 w-32 rounded" />
                  ) : myFund ? (
                    <>
                      <p className={`text-2xl font-bold tracking-tighter ${myFund.balance < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                        {formatMoney(myFund.balance)}
                      </p>
                      {myFund.balance < 0 && (
                        <p className="text-xs font-medium text-red-500 tracking-tighter mt-1">
                          ⚠️ Kho đang ứng trước — hạn mức: {formatMoney(myFund.maxAdvanceLimit)}
                        </p>
                      )}
                      {myFund.balance >= 0 && (
                        <p className="text-xs text-muted-foreground tracking-tighter mt-1">
                          Hạn mức ứng trước: {formatMoney(myFund.maxAdvanceLimit)}
                        </p>
                      )}
                      <p className="text-xs tracking-tighter mt-2">
                        Cập nhật:{" "}
                        {new Date(
                          myFund.lastUpdatedAt,
                        ).toLocaleDateString("vi-VN")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      Không có dữ liệu
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="border border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold tracking-tighter flex items-center gap-1.5">
                    <FileText
                      size={15}
                      className="text-primary"
                    />
                    Mô tả lý do cấp quỹ
                  </h3>
                  <div className="space-y-1.5">
                    <Textarea
                      placeholder="Mô tả lý do cần cấp quỹ mua vật tư..."
                      value={description}
                      onChange={(
                        e: React.ChangeEvent<HTMLTextAreaElement>,
                      ) => setDescription(e.target.value)}
                      className="min-h-24 resize-none text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border border-border/50">
                <CardContent className="px-4 space-y-3">
                  <h3 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                    <Wallet
                      size={20}
                      className="text-emerald-600"
                    />
                    Tổng hợp
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm tracking-tighter">
                      <span className="text-muted-foreground text-sm">
                        Tổng vật tư:
                      </span>
                      <span className="font-semibold text-sm">
                        {rows.length} mục
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle size={11} weight="fill" />
                        {validRows} hợp lệ
                      </div>
                      {totalErrors > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                          <WarningCircle
                            size={11}
                            weight="fill"
                          />
                          {totalErrors} lỗi
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm tracking-tighter">
                      <span className="text-muted-foreground text-sm">
                        Danh mục:
                      </span>
                      <span className="font-semibold text-sm">
                        {
                          new Set(
                            rows
                              .filter((r) => r.categoryCode)
                              .map((r) => r.categoryCode),
                          ).size
                        }{" "}
                        loại
                      </span>
                    </div>
                    <div className="border-t border-border/50 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium tracking-tighter text-muted-foreground">
                          Tổng cộng:
                        </span>
                        <span className="text-lg font-bold tracking-tighter text-emerald-600">
                          {formatMoney(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-10 text-sm"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner
                          size={14}
                          className="animate-spin"
                        />
                        Đang gửi...
                      </span>
                    ) : (
                      <>
                        <PaperPlaneTilt
                          size={14}
                          weight="bold"
                        />
                        Gửi yêu cầu cấp quỹ
                      </>
                    )}
                  </Button>
                  {!canSubmit &&
                    description.trim() === "" && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 tracking-tight">
                        <WarningCircle size={11} />
                        Vui lòng nhập mô tả
                      </p>
                    )}
                  {!canSubmit && totalErrors > 0 && (
                    <p className="text-xs text-red-500 flex items-center gap-1 tracking-tight">
                      <WarningCircle size={11} />
                      Sửa {totalErrors} dòng lỗi trước khi gửi
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Left column: Excel / Manual toggle ── */}
            <div className="lg:col-span-9 lg:order-1">
              <Card className="border border-border/50 overflow-hidden p-0">
                {/* ── Header with mode toggle ── */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2 tracking-tighter">
                    <Package
                      size={15}
                      className="text-primary"
                    />
                    <span className="text-sm font-semibold">
                      Danh sách vật tư
                      {inputMode === "manual" &&
                        ` (${rows.length})`}
                    </span>
                    {inputMode === "manual" && excelFileName && (
                      <span className="text-xs text-muted-foreground">
                        · {excelFileName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Mode toggle pills */}
                    <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5">
                      <button
                        onClick={() => setInputMode("excel")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 text-xs font-medium tracking-tighter rounded-md transition-colors",
                          inputMode === "excel"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <FileXls size={12} />
                        Nhập Excel
                      </button>
                      <button
                        onClick={() => setInputMode("manual")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 text-xs font-medium tracking-tighter rounded-md transition-colors",
                          inputMode === "manual"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Plus size={12} />
                        Nhập thủ công
                      </button>
                    </div>

                    {inputMode === "manual" && (
                      <>
                        <div className="w-px h-5 bg-border/60" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs h-7 px-2 text-muted-foreground tracking-tighter"
                          onClick={addRow}
                        >
                          <Plus size={13} />
                          Thêm dòng
                        </Button>
                        {(rows.length > 1 || excelFileName) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-red-500 tracking-tighter"
                            onClick={handleReset}
                          >
                            <Trash size={13} />
                            Xóa tất cả
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Excel upload area (default) ── */}
                {inputMode === "excel" && (
                  <div className="p-6">
                    <div
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f) parseExcel(f, !!excelFileName);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className={cn(
                        "border-2 border-dashed rounded-2xl py-16 flex flex-col items-center gap-4 text-muted-foreground cursor-pointer transition-all",
                        isDragging
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "border-muted-foreground/25 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10",
                      )}
                    >
                      <div
                        className={cn(
                          "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
                          isDragging
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <UploadSimple
                          size={32}
                          weight="duotone"
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-semibold text-base tracking-tighter">
                          Kéo thả file Excel vào đây
                        </p>
                        <p className="text-sm tracking-tighter">
                          hoặc{" "}
                          <span className="text-emerald-600 font-medium underline underline-offset-2">
                            nhấp để chọn file
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          Hỗ trợ .xlsx, .xls
                        </p>
                      </div>
                    </div>

                    {/* Column hint + template download */}
                    <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground tracking-tighter mb-1.5">
                          Các cột trong file:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.values(COL).map((col) => (
                            <span
                              key={col}
                              className="px-2 py-1 rounded bg-muted border text-xs font-normal tracking-tighter text-muted-foreground"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 text-sm tracking-tighter shrink-0"
                        disabled={isDownloadingTemplate}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTemplate();
                        }}
                      >
                        {isDownloadingTemplate ? (
                          <Spinner size={13} className="animate-spin" />
                        ) : (
                          <DownloadSimple size={13} />
                        )}
                        {isDownloadingTemplate ? "Đang tải..." : "Tải file mẫu"}
                      </Button>
                    </div>

                    {/* Quick switch hint */}
                    <p className="text-xs text-muted-foreground text-center mt-5 tracking-tighter">
                      Hoặc chuyển sang{" "}
                      <button
                        className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
                        onClick={() => setInputMode("manual")}
                      >
                        nhập thủ công từng dòng
                      </button>
                    </p>
                  </div>
                )}

                {/* ── Manual table (when toggled) ── */}
                {inputMode === "manual" && (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-10 text-center text-xs">
                            STT
                          </TableHead>
                          <TableHead className="min-w-44 text-xs">
                            Tên vật phẩm *
                          </TableHead>
                          <TableHead className="min-w-36 text-xs">
                            Danh mục *
                          </TableHead>
                          <TableHead className="min-w-24 text-xs">
                            Đơn vị *
                          </TableHead>
                          <TableHead className="min-w-24 text-xs">
                            Số lượng *
                          </TableHead>
                          <TableHead className="min-w-28 text-xs">
                            Đơn giá *
                          </TableHead>
                          <TableHead className="min-w-28 text-xs">
                            Thành tiền
                          </TableHead>
                          <TableHead className="min-w-32 text-xs">
                            Loại vật phẩm
                          </TableHead>
                          <TableHead className="min-w-32 text-xs">
                            Đối tượng
                          </TableHead>
                          <TableHead className="min-w-32 text-xs">
                            Ghi chú
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const hasErrors =
                            Object.keys(row.errors).length > 0;
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(
                                hasErrors &&
                                "bg-red-50/50 dark:bg-red-950/10",
                              )}
                            >
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {row.row}
                              </TableCell>
                              <TableCell>
                                {renderInputCell(
                                  row,
                                  "itemName",
                                  "Tên vật phẩm",
                                )}
                              </TableCell>
                              <TableCell>
                                {renderSelectCell(
                                  row,
                                  "categoryCode",
                                  categoryOptions,
                                  "Chọn danh mục",
                                )}
                              </TableCell>
                              <TableCell>
                                {renderInputCell(
                                  row,
                                  "unit",
                                  "kg, thùng...",
                                )}
                              </TableCell>
                              <TableCell>
                                {renderInputCell(
                                  row,
                                  "quantity",
                                  "0",
                                  "number",
                                )}
                              </TableCell>
                              <TableCell>
                                {renderCurrencyCell(
                                  row,
                                  "unitPrice",
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-semibold text-emerald-600 tracking-tight whitespace-nowrap">
                                  {formatMoney(row.totalPrice)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {itemTypeOptions.length > 0
                                  ? renderSelectCell(
                                    row,
                                    "itemType",
                                    itemTypeOptions,
                                    "Chọn loại vật phẩm",
                                  )
                                  : renderInputCell(
                                    row,
                                    "itemType",
                                    "Hàng khô...",
                                  )}
                              </TableCell>
                              <TableCell>
                                {targetGroupOptions.length > 0
                                  ? renderSelectCell(
                                    row,
                                    "targetGroup",
                                    targetGroupOptions,
                                    "Chọn đối tượng",
                                  )
                                  : renderInputCell(
                                    row,
                                    "targetGroup",
                                    "Người dân...",
                                  )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.notes}
                                  onChange={(e) =>
                                    updateRow(
                                      row.id,
                                      "notes",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Ghi chú..."
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                  onClick={() =>
                                    deleteRow(row.id)
                                  }
                                >
                                  <X size={13} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="h-32 text-center text-muted-foreground"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <Package
                                  size={28}
                                  weight="duotone"
                                  className="text-muted-foreground/40"
                                />
                                <p className="text-sm tracking-tighter">
                                  Chưa có vật tư
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={addRow}
                                >
                                  <Plus size={12} /> Thêm dòng
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Hidden file input (shared) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseExcel(f, !!excelFileName);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </Card>
            </div>
          </div>
        )}

        {/* ─── HISTORY TAB ───────────────────────────────── */}
        {activeTab === "history" && (
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold tracking-tighter mb-4 flex items-center gap-1.5">
                <ListBullets
                  size={16}
                  className="text-primary"
                />
                Lịch sử yêu cầu cấp quỹ
              </h3>

              {loadingRequests ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-16 w-full rounded-xl"
                    />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="p-10 text-center">
                  <Wallet
                    size={40}
                    className="mx-auto text-muted-foreground/30 mb-3"
                  />
                  <p className="text-sm text-muted-foreground tracking-tight">
                    Chưa có yêu cầu cấp quỹ nào
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const st = statusConfig[req.status];
                    return (
                      <div
                        key={req.id}
                        onClick={() => setDetailItem(req)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/90 hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="text-base font-semibold tracking-tighter truncate">
                              {"Yêu cầu số " + req.id}
                            </p>
                            <Badge
                              className={`${st.className} border gap-1.5 shrink-0 px-2 py-0.5`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`}
                              />
                              {st.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-bold text-base text-emerald-600 tracking-tighter">
                            {formatMoney(req.totalAmount)}
                          </span>
                          <span className="text-sm text-muted-foreground tracking-tighter">
                            {new Date(
                              req.createdAt,
                            ).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailItem(req);
                          }}
                        >
                          <Eye size={15} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── TRANSACTIONS TAB ──────────────────────────────── */}
        {activeTab === "transactions" && (
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold tracking-tighter mb-4 flex items-center gap-1.5">
                <ClockCounterClockwise size={16} className="text-primary" />
                Lịch sử giao dịch kho
              </h3>

              {loadingTx ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : !txData?.items?.length ? (
                <div className="p-10 text-center">
                  <ClockCounterClockwise size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground tracking-tight">
                    Chưa có giao dịch nào
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {txData.items.map((tx) => {
                      const isCredit = tx.amount >= 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                            }`}>
                            {isCredit ? <ArrowDown size={15} weight="bold" /> : <ArrowUp size={15} weight="bold" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold tracking-tighter truncate">
                                {tx.transactionType}
                              </p>
                              <span className={`text-sm font-bold shrink-0 ${isCredit ? "text-emerald-600" : "text-rose-600"
                                }`}>
                                {isCredit ? "+" : ""}{tx.amount.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-tight mt-0.5">
                              {tx.note && <span className="truncate">{tx.note}</span>}
                              {tx.note && <span>·</span>}
                              <span>{new Date(tx.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {txData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                      <p className="text-xs text-muted-foreground tracking-tight">
                        Trang {txData.pageNumber} / {txData.totalPages} &middot; {txData.totalCount} giao dịch
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!txData.hasPreviousPage}
                          onClick={() => setTxPage((p) => p - 1)}
                          className="h-7 px-2 text-xs"
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!txData.hasNextPage}
                          onClick={() => setTxPage((p) => p + 1)}
                          className="h-7 px-2 text-xs"
                        >
                          Tiếp
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Detail Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">
              Chi tiết yêu cầu cấp quỹ
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Yêu cầu số {detailItem?.id}
            </DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-4">
              {/* Status + amount */}
              <div className="flex items-center justify-between">
                <Badge
                  className={`${statusConfig[detailItem.status].className} border`}
                >
                  {statusConfig[detailItem.status].label}
                </Badge>
                <span className="text-lg font-bold text-emerald-600 tracking-tighter">
                  {formatMoney(detailItem.totalAmount)}
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight mb-0.5">
                    Ngày gửi
                  </p>
                  <p className="text-sm tracking-tight">
                    {new Date(
                      detailItem.createdAt,
                    ).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground tracking-tight mb-0.5">
                    Người gửi
                  </p>
                  <p className="text-sm tracking-tight">
                    {detailItem.requestedByUserName}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <p className="text-xs text-muted-foreground tracking-tight mb-0.5">
                  Mô tả
                </p>
                <p className="text-sm tracking-tight">
                  {detailItem.description}
                </p>
              </div>

              {/* Approved info */}
              {detailItem.status === "Approved" &&
                detailItem.approvedCampaignName && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-2.5">
                    <p className="text-xs text-emerald-600 font-medium tracking-tight mb-0.5">
                      Duyệt từ quỹ
                    </p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-tight">
                      {detailItem.approvedCampaignName}
                    </p>
                    {detailItem.reviewedByUserName && (
                      <p className="text-xs text-emerald-600/70 mt-1 tracking-tight">
                        Bởi: {detailItem.reviewedByUserName}
                      </p>
                    )}
                  </div>
                )}

              {/* Rejected info */}
              {detailItem.status === "Rejected" &&
                detailItem.rejectionReason && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800 p-2.5">
                    <p className="text-xs text-rose-600 font-medium tracking-tight mb-0.5">
                      Lý do từ chối
                    </p>
                    <p className="text-sm text-rose-700 dark:text-rose-400 tracking-tight">
                      {detailItem.rejectionReason}
                    </p>
                  </div>
                )}

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold tracking-tighter mb-2 flex items-center gap-1">
                  <Package
                    size={14}
                    className="text-primary"
                  />
                  Vật tư ({detailItem.items.length})
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {detailItem.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-lg border border-border/60 bg-background p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold tracking-tighter">
                          {item.itemName}
                        </p>
                        <span className="text-sm font-bold text-emerald-600 shrink-0">
                          {formatMoney(item.totalPrice)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tracking-tight">
                        <span>
                          SL: {item.quantity} {item.unit}
                        </span>
                        <span>
                          Đơn giá: {formatMoney(item.unitPrice)}
                        </span>
                        <span>
                          Danh mục:{" "}
                          {categoryMap[item.categoryCode] ??
                            item.categoryCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailItem(null)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
